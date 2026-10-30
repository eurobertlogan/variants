import test from "node:test";
import assert from "node:assert/strict";

import { crc32, montarZip } from "../zip.js";

const texto = new TextEncoder();

test("crc32 bate com o valor de referência", () => {
  assert.equal(crc32(texto.encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test("zip tem fim de diretório com a contagem certa", () => {
  const zip = montarZip([
    { nome: "og-1200x630.jpg", tipo: "image/jpeg", dados: new Uint8Array([1, 2, 3]) },
    { nome: "ícone-32x32.png", tipo: "image/png", dados: new Uint8Array([4, 5]) },
  ]);

  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const fim = zip.length - 22;
  assert.equal(dv.getUint32(fim, true), 0x06054b50);
  assert.equal(dv.getUint16(fim + 8, true), 2);
  assert.equal(dv.getUint16(fim + 10, true), 2);
});

test("cada arquivo guarda nome, tamanho e conteúdo", () => {
  const conteudoA = new Uint8Array([10, 20, 30, 40]);
  const conteudoB = new Uint8Array([50, 60]);
  const zip = montarZip([
    { nome: "a.jpg", tipo: "image/jpeg", dados: conteudoA },
    { nome: "b.png", tipo: "image/png", dados: conteudoB },
  ]);

  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  assert.equal(dv.getUint32(0, true), 0x04034b50);
  const nomeA = new TextDecoder().decode(zip.slice(30, 30 + 5));
  assert.equal(nomeA, "a.jpg");
  assert.equal(dv.getUint32(14, true), crc32(conteudoA));
  assert.deepEqual([...zip.slice(35, 39)], [...conteudoA]);

  const segundo = 35 + conteudoA.length;
  assert.equal(dv.getUint32(segundo, true), 0x04034b50);
  const nomeB = dv.getUint16(segundo + 26, true);
  const inicioB = segundo + 30 + nomeB;
  assert.equal(new TextDecoder().decode(zip.slice(segundo + 30, inicioB)), "b.png");
  assert.deepEqual([...zip.slice(inicioB, inicioB + conteudoB.length)], [...conteudoB]);
});

test("nomes com acento viajam em UTF-8", () => {
  const zip = montarZip([{ nome: "ícone-ção.png", tipo: "image/png", dados: new Uint8Array([9]) }]);
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const tamanhoNome = dv.getUint16(26, true);
  const bandeira = dv.getUint16(6, true);
  const nome = new TextDecoder().decode(zip.slice(30, 30 + tamanhoNome));
  assert.equal(nome, "ícone-ção.png");
  assert.equal(bandeira & 0x0800, 0x0800);
});
