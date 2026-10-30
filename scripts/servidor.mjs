import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

/**
 * Servidor de desenvolvimento: entrega public/ e dist/ na mesma origem, para o
 * app.js importar os módulos compilados sem build de terceiros.
 */

const raiz = resolve(import.meta.dirname, "..");
const pastas = [join(raiz, "public"), join(raiz, "dist")];
const porta = Number(process.env.PORTA ?? 4333);

const tipos = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"],
]);

const servidor = createServer((pedido, resposta) => {
  const url = new URL(pedido.url ?? "/", "http://localhost");
  const caminho = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const relativo = caminho === "/" ? "/index.html" : caminho;

  for (const pasta of pastas) {
    const arquivo = join(pasta, relativo);
    if (!arquivo.startsWith(pasta)) continue;
    if (!existsSync(arquivo) || !statSync(arquivo).isFile()) continue;

    resposta.writeHead(200, {
      "content-type": tipos.get(extname(arquivo)) ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(arquivo).pipe(resposta);
    return;
  }

  resposta.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  resposta.end("não encontrado");
});

servidor.listen(porta, () => {
  console.log(`variants em http://localhost:${porta}`);
});
