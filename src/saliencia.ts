import type { MapaInteresse } from "./tipos.js";

/**
 * Mapa de interesse da imagem, em baixa resolução.
 *
 * A ideia é achar onde está o assunto sem modelo de machine learning: borda
 * forte, tom de pele, cor saturada e uma preferência fraca pelo centro. É o
 * suficiente para não decapitar uma pessoa em um recorte 9:16, e roda em
 * qualquer navegador sem baixar peso.
 *
 * Recebe os pixels já reduzidos (algo perto de 96 px de largura) e devolve
 * valores normalizados de 0 a 1.
 */
export function calcularInteresse(pixels: Uint8ClampedArray, largura: number, altura: number): MapaInteresse {
  if (largura <= 0 || altura <= 0) throw new Error("imagem vazia");
  const total = largura * altura;
  if (pixels.length < total * 4) throw new Error("pixels insuficientes para o tamanho informado");

  const luz = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    const p = i * 4;
    luz[i] = (0.2126 * (pixels[p] ?? 0) + 0.7152 * (pixels[p + 1] ?? 0) + 0.0722 * (pixels[p + 2] ?? 0)) / 255;
  }

  const bruto = new Float32Array(total);
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const i = y * largura + x;
      const p = i * 4;
      const r = pixels[p] ?? 0;
      const g = pixels[p + 1] ?? 0;
      const b = pixels[p + 2] ?? 0;

      // Borda: diferença com os vizinhos, sem Sobel completo porque em 96 px
      // a diferença simples já separa figura de fundo.
      const esquerda = luz[y * largura + Math.max(0, x - 1)] ?? luz[i] ?? 0;
      const direita = luz[y * largura + Math.min(largura - 1, x + 1)] ?? luz[i] ?? 0;
      const cima = luz[Math.max(0, y - 1) * largura + x] ?? luz[i] ?? 0;
      const baixo = luz[Math.min(altura - 1, y + 1) * largura + x] ?? luz[i] ?? 0;
      const borda = Math.min(1, (Math.abs(direita - esquerda) + Math.abs(baixo - cima)) * 2.5);

      // Pele: regra clássica em RGB, sem converter para YCbCr.
      const maior = Math.max(r, g, b);
      const menor = Math.min(r, g, b);
      const pele =
        r > 95 && g > 40 && b > 20 && maior - menor > 15 && Math.abs(r - g) > 15 && r > g && r > b ? 1 : 0;

      const saturacao = maior === 0 ? 0 : (maior - menor) / maior;

      bruto[i] = 0.55 * borda + 0.32 * pele + 0.13 * saturacao;
    }
  }

  const borrado = borrar(borrar(bruto, largura, altura), largura, altura);

  // Preferência fraca pelo centro: ajuda quando não há assunto claro, mas não
  // impede que um assunto forte no canto ganhe.
  const centroX = (largura - 1) / 2;
  const centroY = (altura - 1) / 2;
  const maiorDistancia = Math.hypot(centroX, centroY) || 1;

  let maior = 0;
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const i = y * largura + x;
      const distancia = Math.hypot(x - centroX, y - centroY) / maiorDistancia;
      const valor = (borrado[i] ?? 0) * (1 - 0.3 * distancia);
      borrado[i] = valor;
      if (valor > maior) maior = valor;
    }
  }

  if (maior > 0) {
    for (let i = 0; i < borrado.length; i += 1) borrado[i] = (borrado[i] ?? 0) / maior;
  }

  return { largura, altura, valores: borrado };
}

function borrar(entrada: Float32Array, largura: number, altura: number): Float32Array {
  const saida = new Float32Array(entrada.length);
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      let soma = 0;
      let quantos = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= altura) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= largura) continue;
          soma += entrada[yy * largura + xx] ?? 0;
          quantos += 1;
        }
      }
      saida[y * largura + x] = quantos ? soma / quantos : 0;
    }
  }
  return saida;
}

/** Soma acumulada para consultar qualquer retângulo em tempo constante. */
export function tabelaIntegral(mapa: MapaInteresse): Float64Array {
  const { largura, altura, valores } = mapa;
  const tabela = new Float64Array((largura + 1) * (altura + 1));
  for (let y = 0; y < altura; y += 1) {
    let linha = 0;
    for (let x = 0; x < largura; x += 1) {
      linha += valores[y * largura + x] ?? 0;
      tabela[(y + 1) * (largura + 1) + (x + 1)] = (tabela[y * (largura + 1) + (x + 1)] ?? 0) + linha;
    }
  }
  return tabela;
}

/** Soma dos valores dentro do retângulo, em coordenadas do mapa. */
export function somarRetangulo(
  tabela: Float64Array,
  larguraMapa: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const i = (y: number, x: number): number => tabela[y * (larguraMapa + 1) + x] ?? 0;
  return i(y1, x1) - i(y0, x1) - i(y1, x0) + i(y0, x0);
}
