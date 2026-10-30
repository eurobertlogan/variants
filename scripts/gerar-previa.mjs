/**
 * Gera public/previa.png (1200x630), a imagem que aparece quando alguém
 * compartilha o link da página. Só precisa rodar quando a arte mudar.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

const navegadores = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((caminho) => caminho && existsSync(caminho));

if (navegadores.length === 0) {
  console.error("Chrome não encontrado. Defina CHROME_PATH.");
  process.exit(1);
}

const resultado = spawnSync(
  navegadores[0],
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,630",
    `--screenshot=${join(raiz, "public", "previa.png")}`,
    pathToFileURL(join(raiz, "scripts", "previa.html")).href,
  ],
  { stdio: "ignore" },
);

if (resultado.status !== 0) {
  console.error("o navegador falhou");
  process.exit(1);
}

console.log("public/previa.png gerada em 1200x630");
