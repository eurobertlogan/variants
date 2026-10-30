import test from "node:test";
import assert from "node:assert/strict";

import { calcularInteresse } from "../saliencia.js";

function imagem(largura: number, altura: number, cor: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  const dados = new Uint8ClampedArray(largura * altura * 4);
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const [r, g, b] = cor(x, y);
      const i = (y * largura + x) * 4;
      dados[i] = r;
      dados[i + 1] = g;
      dados[i + 2] = b;
      dados[i + 3] = 255;
    }
  }
  return dados;
}

function maiorEm(mapa: { largura: number; altura: number; valores: Float32Array }): { x: number; y: number } {
  let maior = -1;
  let posicao = { x: 0, y: 0 };
  for (let y = 0; y < mapa.altura; y += 1) {
    for (let x = 0; x < mapa.largura; x += 1) {
      const valor = mapa.valores[y * mapa.largura + x] ?? 0;
      if (valor > maior) {
        maior = valor;
        posicao = { x, y };
      }
    }
  }
  return posicao;
}

test("acha um bloco claro no canto superior esquerdo", () => {
  const pixels = imagem(96, 64, (x, y) => {
    const dentro = x > 6 && x < 26 && y > 6 && y < 26;
    return dentro ? [250, 250, 250] : [12, 12, 12];
  });
  const mapa = calcularInteresse(pixels, 96, 64);
  const pico = maiorEm(mapa);
  assert.ok(pico.x < 40 && pico.y < 35, `pico em ${pico.x},${pico.y}`);
});

test("tom de pele conta como interesse mesmo sem borda forte", () => {
  const pixels = imagem(80, 60, (x, y) => {
    const dentro = x > 45 && x < 70 && y > 15 && y < 45;
    return dentro ? [205, 150, 120] : [40, 40, 40];
  });
  const mapa = calcularInteresse(pixels, 80, 60);
  const pico = maiorEm(mapa);
  assert.ok(pico.x > 40, `esperava o pico à direita, veio ${pico.x}`);
});

test("valores ficam normalizados entre 0 e 1", () => {
  const pixels = imagem(48, 32, (x, y) => (x < 10 ? [255, 0, 0] : [0, 0, 0]));
  const mapa = calcularInteresse(pixels, 48, 32);
  for (const valor of mapa.valores) {
    assert.ok(valor >= 0 && valor <= 1.000001, `valor fora da faixa: ${valor}`);
  }
  assert.ok(Math.max(...mapa.valores) > 0.99, "o maior valor deveria chegar perto de 1");
});

test("imagem lisa e uniforme não inventa interesse", () => {
  const pixels = imagem(40, 40, () => [200, 200, 200]);
  const mapa = calcularInteresse(pixels, 40, 40);
  const maior = Math.max(...mapa.valores);
  const menor = Math.min(...mapa.valores);
  assert.ok(maior - menor < 0.35, `contraste inesperado: ${maior} contra ${menor}`);
});

test("recusa entrada inconsistente", () => {
  assert.throws(() => calcularInteresse(new Uint8ClampedArray(8), 10, 10));
  assert.throws(() => calcularInteresse(new Uint8ClampedArray(0), 0, 0));
});
