import test from "node:test";
import assert from "node:assert/strict";

import { lerIco, montarIco } from "../ico.js";
import { PRESETS, nomeArquivo } from "../presets.js";

test("ico guarda todos os tamanhos pedidos", () => {
  const ico = montarIco([
    { tamanho: 16, png: new Uint8Array([1, 1, 1]) },
    { tamanho: 32, png: new Uint8Array([2, 2]) },
    { tamanho: 256, png: new Uint8Array([3]) },
  ]);

  const lido = lerIco(ico);
  assert.deepEqual(
    lido.map((entrada) => entrada.tamanho),
    [16, 32, 256],
  );
  assert.deepEqual([...lido[0]!.png], [1, 1, 1]);
  assert.deepEqual([...lido[2]!.png], [3]);
});

test("ico recusa lista vazia", () => {
  assert.throws(() => montarIco([]));
});

test("identificadores dos presets não se repetem", () => {
  const ids = PRESETS.map((preset) => preset.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("todo preset tem medida válida e proporção possível", () => {
  for (const preset of PRESETS) {
    assert.ok(preset.largura > 0 && preset.altura > 0, preset.id);
    assert.ok(["jpg", "png"].includes(preset.formato), preset.id);
  }
});

test("zona segura fica dentro da imagem", () => {
  for (const preset of PRESETS) {
    const somaVertical = preset.zona.topo + preset.zona.base;
    const somaHorizontal = preset.zona.esquerda + preset.zona.direita;
    assert.ok(somaVertical < 1, preset.id);
    assert.ok(somaHorizontal < 1, preset.id);
    assert.ok(preset.zona.topo >= 0 && preset.zona.base >= 0, preset.id);
  }
});

test("pacote de ícone cobre os tamanhos que o navegador pede", () => {
  const icone = PRESETS.find((preset) => preset.id === "icone");
  assert.ok(icone?.tamanhos);
  const tamanhos = icone.tamanhos!;
  for (const obrigatorio of [16, 32, 48, 180, 192, 512]) {
    assert.ok(tamanhos.includes(obrigatorio), `faltou ${obrigatorio}`);
  }
  assert.deepEqual([...tamanhos].sort((a, b) => a - b), tamanhos);
});

test("nome do arquivo carrega a medida", () => {
  const og = PRESETS.find((preset) => preset.id === "og")!;
  assert.equal(nomeArquivo(og), "og-1200x630.jpg");
  const icone = PRESETS.find((preset) => preset.id === "icone")!;
  assert.equal(nomeArquivo(icone, 180), "icone-180x180.png");
});
