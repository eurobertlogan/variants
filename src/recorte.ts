import { somarRetangulo, tabelaIntegral } from "./saliencia.js";
import type { MapaInteresse, Retangulo, ZonaSegura } from "./tipos.js";

/**
 * Escolhe o recorte que mantém o assunto inteiro e dentro da zona visível.
 *
 * A janela tem sempre a maior área possível com a proporção pedida, então a
 * única decisão é onde ela começa. Para cada posição possível o cálculo soma o
 * interesse que cai na zona segura, soma com peso menor o que cai fora dela e
 * desconta o que ficaria cortado na borda.
 */
export function melhorRecorte(
  mapa: MapaInteresse,
  fonteLargura: number,
  fonteAltura: number,
  alvoLargura: number,
  alvoAltura: number,
  zona: ZonaSegura,
): Retangulo {
  const janela = maiorJanela(fonteLargura, fonteAltura, alvoLargura, alvoAltura);
  const livreX = fonteLargura - janela.largura;
  const livreY = fonteAltura - janela.altura;

  if (livreX < 1 && livreY < 1) {
    return { x: livreX / 2, y: livreY / 2, largura: janela.largura, altura: janela.altura };
  }

  const tabela = tabelaIntegral(mapa);
  const celulaX = fonteLargura / mapa.largura;
  const celulaY = fonteAltura / mapa.altura;

  const colunasLivres = livreX / celulaX;
  const linhasLivres = livreY / celulaY;
  const passo = Math.max(1, Math.floor(Math.min(colunasLivres, linhasLivres) / 36));

  const candidatosX = posicoes(colunasLivres, passo);
  const candidatosY = posicoes(linhasLivres, passo);

  let melhor = { x: livreX / 2, y: livreY / 2, pontos: -Infinity };

  for (const cx of candidatosX) {
    for (const cy of candidatosY) {
      const x = cx * celulaX;
      const y = cy * celulaY;
      const pontos = pontuar(tabela, mapa, x, y, janela.largura, janela.altura, zona, fonteLargura, fonteAltura);
      if (pontos > melhor.pontos) melhor = { x, y, pontos };
    }
  }

  return {
    x: Math.max(0, Math.min(livreX, melhor.x)),
    y: Math.max(0, Math.min(livreY, melhor.y)),
    largura: janela.largura,
    altura: janela.altura,
  };
}

/** Maior retângulo com a proporção pedida que cabe na fonte, sem ampliar. */
export function maiorJanela(
  fonteLargura: number,
  fonteAltura: number,
  alvoLargura: number,
  alvoAltura: number,
): { largura: number; altura: number } {
  const proporcao = alvoLargura / alvoAltura;
  let largura = fonteLargura;
  let altura = largura / proporcao;
  if (altura > fonteAltura) {
    altura = fonteAltura;
    largura = altura * proporcao;
  }
  return { largura, altura };
}

function posicoes(espaco: number, passo: number): number[] {
  if (espaco <= 0) return [0];
  const lista: number[] = [];
  for (let p = 0; p <= espaco; p += passo) lista.push(p);
  const ultimo = lista[lista.length - 1] ?? 0;
  if (Math.abs(ultimo - espaco) > 0.5) lista.push(espaco);
  // O centro sempre entra, porque é o palpite razoável quando não há assunto.
  if (!lista.some((p) => Math.abs(p - espaco / 2) < 0.5)) lista.push(espaco / 2);
  return lista.sort((a, b) => a - b);
}

function pontuar(
  tabela: Float64Array,
  mapa: MapaInteresse,
  x: number,
  y: number,
  largura: number,
  altura: number,
  zona: ZonaSegura,
  fonteLargura: number,
  fonteAltura: number,
): number {
  const escalaX = mapa.largura / fonteLargura;
  const escalaY = mapa.altura / fonteAltura;

  const x0 = x * escalaX;
  const y0 = y * escalaY;
  const x1 = (x + largura) * escalaX;
  const y1 = (y + altura) * escalaY;

  const seguro = {
    x0: Math.floor(x0 + largura * escalaX * zona.esquerda),
    y0: Math.floor(y0 + altura * escalaY * zona.topo),
    x1: Math.ceil(x1 - largura * escalaX * zona.direita),
    y1: Math.ceil(y1 - altura * escalaY * zona.base),
  };

  const area = Math.max(1, (x1 - x0) * (y1 - y0));
  const somaTotal = somarRetangulo(tabela, mapa.largura, Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1));

  // Interesse que cai na faixa coberta pela plataforma vale pouco: na prática
  // aquela parte da imagem não aparece. Peso 0,2, para ainda servir de desempate
  // quando não existe composição que salve o assunto.
  const fora =
    somaTotal -
    somarRetangulo(
      tabela,
      mapa.largura,
      Math.max(0, seguro.x0),
      Math.max(0, seguro.y0),
      Math.min(mapa.largura, seguro.x1),
      Math.min(mapa.altura, seguro.y1),
    );

  // Interesse logo além da borda: cortar um assunto ao meio custa caro.
  const margem = Math.max(1, Math.round(Math.min(x1 - x0, y1 - y0) * 0.06));
  const aoRedor =
    somarRetangulo(tabela, mapa.largura, Math.floor(x0 - margem), Math.floor(y0 - margem), Math.ceil(x1 + margem), Math.ceil(y0)) +
    somarRetangulo(tabela, mapa.largura, Math.floor(x0 - margem), Math.ceil(y1), Math.ceil(x1 + margem), Math.ceil(y1 + margem)) +
    somarRetangulo(tabela, mapa.largura, Math.floor(x0 - margem), Math.floor(y0), Math.floor(x0), Math.ceil(y1)) +
    somarRetangulo(tabela, mapa.largura, Math.ceil(x1), Math.floor(y0), Math.ceil(x1 + margem), Math.ceil(y1));

  return (somaTotal - 0.8 * fora) / area - (0.6 * aoRedor) / area;
}

/** Limita um recorte à area da fonte e mantém a proporção. */
export function limitarRecorte(recorte: Retangulo, fonteLargura: number, fonteAltura: number): Retangulo {
  const largura = Math.min(recorte.largura, fonteLargura);
  const altura = Math.min(recorte.altura, fonteAltura);
  return {
    x: Math.max(0, Math.min(recorte.x, fonteLargura - largura)),
    y: Math.max(0, Math.min(recorte.y, fonteAltura - altura)),
    largura,
    altura,
  };
}
