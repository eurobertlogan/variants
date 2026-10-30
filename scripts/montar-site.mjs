import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

/**
 * Monta a pasta site/ pronta para subir em qualquer host estático.
 */

const raiz = resolve(import.meta.dirname, "..");
const destino = join(raiz, "site");

await rm(destino, { recursive: true, force: true });
await mkdir(destino, { recursive: true });
await cp(join(raiz, "public"), destino, { recursive: true });
// A pasta de teste não vai para o site.
await cp(join(raiz, "dist"), destino, {
  recursive: true,
  filter: (origem) => !origem.includes(`${join("dist", "test")}`),
});

// Sem servidor para resolver rota, o host precisa saber o que entrega.
await writeFile(join(destino, ".nojekyll"), "");

console.log("site/ montado");
