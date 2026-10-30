import test from "node:test";
import assert from "node:assert/strict";

import { maiorJanela, melhorRecorte } from "../recorte.js";
import type { MapaInteresse } from "../tipos.js";

function mapaCom(largura: number, altura: number, focos: { x: number; y: number; raio: number }[]): MapaInteresse {
  const valores = new Float32Array(largura * altura);
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const nx = (x + 0.5) / largura;
      const ny = (y + 0.5) / altura;
      let valor = 0;
      for (const foco of focos) {
        const d = Math.hypot(nx - foco.x, ny - foco.y);
        valor += Math.max(0, 1 - d / foco.raio);
      }
      valores[y * largura + x] = Math.min(1, valor);
    }
  }
  return { largura, altura, valores };
}

const SEM_ZONA = { topo: 0, base: 0, esquerda: 0, direita: 0 };

test("a janela usa a maior área possível com a proporção pedida", () => {
  const quadrado = maiorJanela(2000, 1000, 1080, 1080);
  assert.equal(Math.round(quadrado.largura), 1000);
  assert.equal(Math.round(quadrado.altura), 1000);

  const paisagem = maiorJanela(1000, 2000, 1200, 630);
  assert.equal(Math.round(paisagem.largura), 1000);
  assert.equal(Math.round(paisagem.altura), 525);
});

test("não amplia além da fonte", () => {
  const janela = maiorJanela(300, 120, 1200, 630);
  assert.ok(janela.largura <= 300);
  assert.ok(janela.altura <= 120);
});

test("segue o assunto quando ele está fora do centro", () => {
  const mapa = mapaCom(100, 50, [{ x: 0.15, y: 0.5, raio: 0.12 }]);
  const recorte = melhorRecorte(mapa, 400, 200, 1080, 1080, SEM_ZONA);
  const centro = recorte.x + recorte.largura / 2;
  assert.ok(centro < 200, `esperava o recorte à esquerda, veio centro em ${centro}`);
});

test("prefere o assunto que cai na faixa visível do story", () => {
  // Dois assuntos, um em cima e outro colado na base. A janela não cabe nos
  // dois, e o de baixo ficaria coberto pela legenda, então o certo é ficar com
  // o de cima.
  const mapa = mapaCom(50, 100, [
    { x: 0.5, y: 0.2, raio: 0.12 },
    { x: 0.5, y: 0.95, raio: 0.12 },
  ]);
  const zona = { topo: 0.13, base: 0.18, esquerda: 0, direita: 0 };
  const recorte = melhorRecorte(mapa, 400, 900, 1080, 1920, zona);
  assert.ok(recorte.y < 100, `esperava ficar com o assunto de cima, veio y ${recorte.y}`);
});

test("sem assunto claro, fica perto do centro", () => {
  const mapa = mapaCom(100, 50, [{ x: 0.5, y: 0.5, raio: 1.6 }]);
  const recorte = melhorRecorte(mapa, 400, 200, 1000, 1000, SEM_ZONA);
  const centroX = recorte.x + recorte.largura / 2;
  assert.ok(Math.abs(centroX - 200) < 40, `centro em ${centroX}`);
});

test("o recorte sempre cabe na fonte e mantém a proporção", () => {
  const focos = [
    { x: 0.1, y: 0.1, raio: 0.1 },
    { x: 0.9, y: 0.8, raio: 0.2 },
    { x: 0.5, y: 0.3, raio: 0.15 },
  ];
  const mapa = mapaCom(80, 60, focos);
  const alvos: [number, number][] = [
    [1080, 1080],
    [1080, 1920],
    [1200, 630],
    [1000, 1500],
  ];

  for (const [largura, altura] of alvos) {
    const recorte = melhorRecorte(mapa, 800, 600, largura, altura, { topo: 0.1, base: 0.2, esquerda: 0.05, direita: 0.1 });
    assert.ok(recorte.x >= 0 && recorte.y >= 0, "recorte começou fora da imagem");
    assert.ok(recorte.x + recorte.largura <= 800.001, "recorte passou da largura");
    assert.ok(recorte.y + recorte.altura <= 600.001, "recorte passou da altura");
    const proporcao = recorte.largura / recorte.altura;
    assert.ok(Math.abs(proporcao - largura / altura) < 0.01, `proporção saiu ${proporcao}`);
  }
});

test("imagem já na proporção certa devolve a imagem inteira", () => {
  const mapa = mapaCom(40, 40, [{ x: 0.5, y: 0.5, raio: 0.4 }]);
  const recorte = melhorRecorte(mapa, 500, 500, 1000, 1000, SEM_ZONA);
  assert.equal(recorte.largura, 500);
  assert.equal(recorte.altura, 500);
  assert.ok(recorte.x < 0.001 && recorte.y < 0.001);
});
