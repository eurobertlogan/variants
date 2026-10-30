import { calcularInteresse } from "./saliencia.js";
import { melhorRecorte } from "./recorte.js";
import { PRESETS, nomeArquivo } from "./presets.js";
import { montarIco } from "./ico.js";
import { montarZip } from "./zip.js";
import { TEXTOS, idiomaInicial } from "./i18n.js";
const $ = (id) => {
    const elemento = document.getElementById(id);
    if (!elemento)
        throw new Error(`elemento ${id} não existe`);
    return elemento;
};
let idioma = idiomaInicial(navigator.language, localStorage.getItem("variants-idioma"));
let t = TEXTOS[idioma];
let bitmap = null;
let mapa = null;
let nomeFonte = "imagem";
let qualidade = 88;
let mostrarZona = true;
const selecionados = new Set(PRESETS.map((preset) => preset.id));
const manuais = new Map();
const automaticos = new Map();
// No celular não existe arrastar e soltar, então a frase muda.
const semHover = window.matchMedia("(hover: none)");
/* ---------- textos ---------- */
function aplicarTextos() {
    t = TEXTOS[idioma];
    document.documentElement.lang = idioma;
    document.title = t.tituloPagina;
    $("marca").textContent = t.marca;
    $("titulo").textContent = t.titulo;
    $("tituloAcento").textContent = t.tituloAcento;
    $("subtitulo").textContent = t.subtitulo;
    $("selo").textContent = t.selo;
    $("soltar").textContent = semHover.matches ? t.soltarToque : t.soltar;
    $("escolher").textContent = t.escolher;
    $("escolher").setAttribute("aria-label", t.escolher);
    $("rotuloZona").textContent = t.mostrarZona;
    $("rotuloQualidade").textContent = t.qualidade;
    $("todos").textContent = t.selecionarTodos;
    $("nenhum").textContent = t.selecionarNenhum;
    $("baixarTudo").textContent = t.baixarTudo;
    $("limpar").textContent = t.limpar;
    $("comoFunciona").textContent = t.comoFunciona;
    $("explicacao").textContent = t.explicacao;
    $("rodape").textContent = t.rodape(new Date().getFullYear());
    $("vazio").textContent = t.vazio;
    for (const botao of document.querySelectorAll("[data-idioma]")) {
        botao.setAttribute("aria-pressed", String(botao.dataset.idioma === idioma));
    }
    atualizarContador();
    if ($("grade").childElementCount > 0)
        $("grade").innerHTML = "";
    desenharCartoes();
}
function atualizarContador() {
    const total = selecionados.size;
    $("contador").textContent = bitmap ? t.selecionados(total) : "";
    $("baixarTudo").disabled = !bitmap || total === 0;
}
/* ---------- entrada ---------- */
async function carregar(arquivo) {
    try {
        const aberto = await createImageBitmap(arquivo);
        bitmap?.close();
        bitmap = aberto;
        nomeFonte = arquivo.name.replace(/\.[^.]+$/, "") || "imagem";
        mapa = calcularMapa(aberto);
        manuais.clear();
        automaticos.clear();
        $("zona").classList.add("compacta");
        $("soltar").textContent = t.trocar;
        $("escolher").textContent = t.trocar;
        $("painel").hidden = false;
        $("grade").hidden = false;
        $("vazio").hidden = true;
        desenharCartoes();
        atualizarContador();
    }
    catch {
        mostrarAviso(t.naoSuportado, true);
    }
}
function calcularMapa(origem) {
    const largura = 96;
    const altura = Math.max(1, Math.round((origem.height / origem.width) * largura));
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext("2d", { willReadFrequently: true });
    if (!contexto)
        throw new Error("sem canvas 2d");
    contexto.drawImage(origem, 0, 0, largura, altura);
    const dados = contexto.getImageData(0, 0, largura, altura).data;
    return calcularInteresse(dados, largura, altura);
}
/* ---------- recorte ---------- */
function recorteDe(preset) {
    if (!bitmap || !mapa)
        throw new Error("sem imagem");
    const manual = manuais.get(preset.id);
    if (manual)
        return manual;
    return automaticoDe(preset);
}
function automaticoDe(preset) {
    if (!bitmap || !mapa)
        throw new Error("sem imagem");
    const guardado = automaticos.get(preset.id);
    if (guardado)
        return guardado;
    const calculado = melhorRecorte(mapa, bitmap.width, bitmap.height, preset.largura, preset.altura, preset.zona);
    automaticos.set(preset.id, calculado);
    return calculado;
}
/** Desenha o recorte em duas passadas para não serrilhar na redução. */
function desenharRecorte(origem, recorte, largura, altura) {
    const meio = document.createElement("canvas");
    meio.width = Math.max(largura, Math.round(largura * 2));
    meio.height = Math.max(altura, Math.round(altura * 2));
    const contextoMeio = meio.getContext("2d");
    if (!contextoMeio)
        throw new Error("sem canvas 2d");
    contextoMeio.imageSmoothingEnabled = true;
    contextoMeio.imageSmoothingQuality = "high";
    contextoMeio.drawImage(origem, recorte.x, recorte.y, recorte.largura, recorte.altura, 0, 0, meio.width, meio.height);
    const final = document.createElement("canvas");
    final.width = largura;
    final.height = altura;
    const contexto = final.getContext("2d");
    if (!contexto)
        throw new Error("sem canvas 2d");
    contexto.imageSmoothingEnabled = true;
    contexto.imageSmoothingQuality = "high";
    contexto.drawImage(meio, 0, 0, meio.width, meio.height, 0, 0, largura, altura);
    return final;
}
/* ---------- cartões ---------- */
function desenharCartoes() {
    const grade = $("grade");
    if (!bitmap || !mapa)
        return;
    if (grade.childElementCount !== PRESETS.length) {
        grade.innerHTML = "";
        for (const preset of PRESETS)
            grade.append(montarCartao(preset));
    }
    for (const preset of PRESETS)
        desenharPrevia(preset);
}
function desenharPrevia(preset) {
    if (!bitmap)
        return;
    const cartao = $("grade").querySelector(`[data-id="${preset.id}"]`);
    if (!cartao)
        return;
    const canvas = cartao.querySelector("canvas");
    if (!canvas)
        return;
    const recorte = recorteDe(preset);
    const caixa = 420;
    const proporcao = preset.largura / preset.altura;
    const largura = proporcao >= 1 ? caixa : Math.round(caixa * proporcao);
    const altura = Math.round(largura / proporcao);
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext("2d");
    if (!contexto)
        return;
    contexto.imageSmoothingEnabled = true;
    contexto.imageSmoothingQuality = "high";
    contexto.drawImage(bitmap, recorte.x, recorte.y, recorte.largura, recorte.altura, 0, 0, largura, altura);
    if (mostrarZona && (preset.zona.topo || preset.zona.base || preset.zona.esquerda || preset.zona.direita)) {
        pintarZona(contexto, largura, altura, preset);
    }
    const medida = cartao.querySelector(".medida");
    if (medida) {
        medida.textContent = preset.tamanhos
            ? t.tamanhos(preset.tamanhos.length, preset.tamanhos[0] ?? 0, preset.tamanhos[preset.tamanhos.length - 1] ?? 0)
            : `${preset.largura} × ${preset.altura}`;
    }
    const marcaManual = cartao.querySelector(".manual");
    if (marcaManual)
        marcaManual.hidden = !manuais.has(preset.id);
}
function montarCartao(preset) {
    const cartao = document.createElement("article");
    cartao.className = "cartao";
    cartao.dataset.id = preset.id;
    const previa = document.createElement("div");
    previa.className = "previa";
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", preset.nome[idioma]);
    previa.append(canvas);
    const topo = document.createElement("header");
    topo.className = "cartao-topo";
    const nome = document.createElement("h3");
    nome.textContent = preset.nome[idioma];
    const medida = document.createElement("span");
    medida.className = "mono medida";
    topo.append(nome, medida);
    const nota = document.createElement("p");
    nota.className = "nota";
    nota.textContent = preset.nota?.[idioma] ?? "";
    const rodape = document.createElement("div");
    rodape.className = "cartao-rodape";
    const incluir = document.createElement("label");
    incluir.className = "incluir mono";
    const caixa = document.createElement("input");
    caixa.type = "checkbox";
    caixa.checked = selecionados.has(preset.id);
    caixa.addEventListener("change", () => {
        if (caixa.checked)
            selecionados.add(preset.id);
        else
            selecionados.delete(preset.id);
        atualizarContador();
    });
    const textoIncluir = document.createElement("span");
    textoIncluir.textContent = t.incluir;
    incluir.append(caixa, textoIncluir);
    const baixar = document.createElement("button");
    baixar.type = "button";
    baixar.className = "botao pequeno";
    baixar.textContent = preset.tamanhos ? "favicon.ico" : t.baixar;
    baixar.addEventListener("click", () => {
        void baixarUm(preset);
    });
    rodape.append(incluir, baixar);
    const manual = document.createElement("span");
    manual.className = "manual mono";
    manual.textContent = t.arraste;
    manual.hidden = !manuais.has(preset.id);
    cartao.append(previa, topo, nota, manual, rodape);
    ligarArraste(canvas, preset);
    return cartao;
}
function ligarArraste(canvas, preset) {
    let arrastando = false;
    let inicio = { x: 0, y: 0 };
    let recorteInicial = null;
    canvas.addEventListener("pointerdown", (evento) => {
        if (!bitmap)
            return;
        arrastando = true;
        canvas.setPointerCapture(evento.pointerId);
        inicio = { x: evento.clientX, y: evento.clientY };
        recorteInicial = { ...recorteDe(preset) };
    });
    canvas.addEventListener("pointermove", (evento) => {
        if (!arrastando || !bitmap || !recorteInicial)
            return;
        // A imagem é desenhada com object-fit contain, então a área útil é menor
        // que a caixa do canvas em um dos eixos. O arraste usa a área visível.
        const caixa = canvas.getBoundingClientRect();
        const proporcao = preset.largura / preset.altura;
        const visivel = Math.min(caixa.width, caixa.height * proporcao);
        const escalaX = recorteInicial.largura / visivel;
        const escalaY = recorteInicial.altura / (visivel / proporcao);
        const livreX = bitmap.width - recorteInicial.largura;
        const livreY = bitmap.height - recorteInicial.altura;
        const x = Math.max(0, Math.min(livreX, recorteInicial.x - (evento.clientX - inicio.x) * escalaX));
        const y = Math.max(0, Math.min(livreY, recorteInicial.y - (evento.clientY - inicio.y) * escalaY));
        // Só marca como manual quando o recorte realmente saiu do lugar; em formato
        // sem folga (story de uma foto 3:4, por exemplo) arrastar não muda nada.
        const automatico = automaticoDe(preset);
        if (Math.abs(x - automatico.x) > 0.5 || Math.abs(y - automatico.y) > 0.5) {
            manuais.set(preset.id, { ...recorteInicial, x, y });
            desenharPrevia(preset);
        }
    });
    const soltar = () => {
        arrastando = false;
        recorteInicial = null;
    };
    canvas.addEventListener("pointerup", soltar);
    canvas.addEventListener("pointercancel", soltar);
}
function pintarZona(contexto, largura, altura, preset) {
    const { topo, base, esquerda, direita } = preset.zona;
    const x0 = Math.round(esquerda * largura);
    const y0 = Math.round(topo * altura);
    const x1 = Math.round((1 - direita) * largura);
    const y1 = Math.round((1 - base) * altura);
    contexto.save();
    contexto.fillStyle = "rgba(11, 11, 12, 0.62)";
    contexto.fillRect(0, 0, largura, y0);
    contexto.fillRect(0, y1, largura, altura - y1);
    contexto.fillRect(0, y0, x0, y1 - y0);
    contexto.fillRect(x1, y0, largura - x1, y1 - y0);
    contexto.strokeStyle = "#cdd67f";
    contexto.lineWidth = 1.5;
    contexto.setLineDash([6, 4]);
    contexto.strokeRect(x0 + 0.75, y0 + 0.75, Math.max(0, x1 - x0 - 1.5), Math.max(0, y1 - y0 - 1.5));
    contexto.restore();
}
/* ---------- exportação ---------- */
function tipoDe(preset) {
    return preset.formato === "png" ? "image/png" : "image/jpeg";
}
async function paraBytes(canvas, tipo, qualidadeJpg = qualidade / 100) {
    const blob = await new Promise((resolver) => canvas.toBlob(resolver, tipo, qualidadeJpg));
    if (!blob)
        throw new Error("falha ao gerar a imagem");
    return new Uint8Array(await blob.arrayBuffer());
}
async function baixarUm(preset) {
    if (!bitmap)
        return;
    const base = recorteDe(preset);
    if (preset.tamanhos) {
        const entradas = [];
        for (const tamanho of preset.tamanhos.filter((valor) => valor <= 256)) {
            const canvas = desenharRecorte(bitmap, base, tamanho, tamanho);
            entradas.push({ tamanho, png: await paraBytes(canvas, "image/png") });
        }
        const ico = montarIco(entradas);
        baixar(blobDe(ico, "image/x-icon"), "favicon.ico");
        return;
    }
    const canvas = desenharRecorte(bitmap, base, preset.largura, preset.altura);
    const tipo = tipoDe(preset);
    const dados = await paraBytes(canvas, tipo);
    baixar(blobDe(dados, tipo), nomeArquivo(preset));
}
async function baixarTudo() {
    if (!bitmap || !mapa)
        return;
    const botao = $("baixarTudo");
    botao.disabled = true;
    const anterior = botao.textContent;
    botao.textContent = "…";
    try {
        const arquivos = [];
        const manifesto = [];
        for (const preset of PRESETS) {
            if (!selecionados.has(preset.id))
                continue;
            const recorte = recorteDe(preset);
            if (preset.tamanhos) {
                const entradas = [];
                for (const tamanho of preset.tamanhos) {
                    const canvas = desenharRecorte(bitmap, recorte, tamanho, tamanho);
                    const dados = await paraBytes(canvas, "image/png");
                    const nome = nomeArquivo(preset, tamanho);
                    arquivos.push({ nome, tipo: "image/png", dados });
                    manifesto.push({ preset: preset.id, arquivo: nome, largura: tamanho, altura: tamanho });
                    if (tamanho <= 48)
                        entradas.push({ tamanho, png: dados });
                }
                const ico = montarIco(entradas);
                arquivos.push({ nome: "favicon.ico", tipo: "image/x-icon", dados: ico });
                manifesto.push({
                    preset: preset.id,
                    arquivo: "favicon.ico",
                    largura: 48,
                    altura: 48,
                    tamanhos: entradas.map((entrada) => entrada.tamanho),
                });
                continue;
            }
            const canvas = desenharRecorte(bitmap, recorte, preset.largura, preset.altura);
            const tipo = tipoDe(preset);
            const dados = await paraBytes(canvas, tipo);
            const nome = nomeArquivo(preset);
            arquivos.push({ nome, tipo, dados });
            manifesto.push({
                preset: preset.id,
                arquivo: nome,
                largura: preset.largura,
                altura: preset.altura,
                recorte: {
                    x: Math.round(recorte.x),
                    y: Math.round(recorte.y),
                    largura: Math.round(recorte.largura),
                    altura: Math.round(recorte.altura),
                },
                zonaSegura: preset.zona,
            });
        }
        const relatorio = {
            fonte: nomeFonte,
            largura: bitmap.width,
            altura: bitmap.height,
            geradoEm: new Date().toISOString(),
            arquivos: manifesto,
        };
        arquivos.push({
            nome: "manifesto.json",
            tipo: "application/json",
            dados: new TextEncoder().encode(JSON.stringify(relatorio, null, 2)),
        });
        arquivos.push({
            nome: "indice.html",
            tipo: "text/html",
            dados: new TextEncoder().encode(indiceHtml(manifesto)),
        });
        const zip = montarZip(arquivos);
        baixar(blobDe(zip, "application/zip"), t.nomeArquivoZip);
    }
    catch {
        mostrarAviso(t.naoSuportado, true);
    }
    finally {
        botao.textContent = anterior;
        botao.disabled = false;
    }
}
function indiceHtml(itens) {
    const linhas = itens
        .map((item) => {
        const arquivo = String(item.arquivo ?? "");
        const largura = Number(item.largura ?? 0);
        const altura = Number(item.altura ?? 0);
        const tamanhos = Array.isArray(item.tamanhos) ? item.tamanhos : null;
        const medida = tamanhos ? tamanhos.join(" · ") : `${largura} × ${altura}`;
        return `<li><figure><img src="${arquivo}" alt="${arquivo}" loading="lazy" /><figcaption><strong>${arquivo}</strong><span>${medida}</span></figcaption></figure></li>`;
    })
        .join("\n");
    return `<!doctype html>
<html lang="${idioma}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t.indice}</title>
<style>
  body { margin: 0; padding: 40px; background: #0b0b0c; color: #f2efea; font-family: ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 20px; font-weight: 500; letter-spacing: -0.02em; margin: 0 0 4px; }
  p { margin: 0 0 32px; color: #9c9991; font-size: 13px; }
  ul { list-style: none; padding: 0; display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
  figure { margin: 0; background: #111113; border: 1px solid rgba(242,239,234,.1); border-radius: 8px; overflow: hidden; }
  img { display: block; width: 100%; height: 180px; object-fit: contain; background: #16161a; }
  figcaption { padding: 10px 12px; display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
  figcaption span { color: #9c9991; font-family: ui-monospace, monospace; }
</style>
</head>
<body>
  <h1>${t.indice}</h1>
  <p>${t.fonte}: ${nomeFonte} · ${t.geradoEm} ${new Date().toLocaleString(idioma === "pt" ? "pt-BR" : "en-US")}</p>
  <ul>
${linhas}
  </ul>
</body>
</html>`;
}
/**
 * O TypeScript 5.7 marca Uint8Array como possível SharedArrayBuffer, e o Blob
 * não aceita esse tipo no papel. Na prática o buffer é sempre ArrayBuffer.
 */
function blobDe(dados, tipo) {
    return new Blob([dados], { type: tipo });
}
function baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function mostrarAviso(mensagem, erro = false) {
    const aviso = $("aviso");
    aviso.textContent = mensagem;
    aviso.hidden = false;
    aviso.classList.toggle("erro", erro);
}
/* ---------- eventos ---------- */
function ligarEventos() {
    const entrada = $("entrada");
    const zona = $("zona");
    $("escolher").addEventListener("click", (evento) => {
        evento.stopPropagation();
        entrada.click();
    });
    zona.addEventListener("click", () => entrada.click());
    zona.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            entrada.click();
        }
    });
    entrada.addEventListener("change", () => {
        const arquivo = entrada.files?.[0];
        if (arquivo)
            void carregar(arquivo);
        entrada.value = "";
    });
    zona.addEventListener("dragover", (evento) => {
        evento.preventDefault();
        zona.classList.add("ativo");
        $("soltar").textContent = t.soltarAtivo;
    });
    for (const tipo of ["dragleave", "drop"]) {
        zona.addEventListener(tipo, (evento) => {
            evento.preventDefault();
            zona.classList.remove("ativo");
            $("soltar").textContent = semHover.matches ? t.soltarToque : t.soltar;
        });
    }
    zona.addEventListener("drop", (evento) => {
        const arquivo = evento.dataTransfer?.files?.[0];
        if (arquivo)
            void carregar(arquivo);
    });
    document.addEventListener("paste", (evento) => {
        const item = [...(evento.clipboardData?.items ?? [])].find((candidato) => candidato.type.startsWith("image/"));
        const arquivo = item?.getAsFile();
        if (arquivo)
            void carregar(arquivo);
    });
    for (const botao of document.querySelectorAll("[data-idioma]")) {
        botao.addEventListener("click", () => {
            const escolhido = botao.dataset.idioma;
            if (escolhido !== "pt" && escolhido !== "en")
                return;
            idioma = escolhido;
            localStorage.setItem("variants-idioma", idioma);
            aplicarTextos();
        });
    }
    $("zonaToggle").addEventListener("change", () => {
        mostrarZona = $("zonaToggle").checked;
        desenharCartoes();
    });
    $("qualidade").addEventListener("input", () => {
        qualidade = Number($("qualidade").value);
        $("qualidadeValor").textContent = String(qualidade);
    });
    $("todos").addEventListener("click", () => {
        for (const preset of PRESETS)
            selecionados.add(preset.id);
        sincronizarCaixas();
    });
    $("nenhum").addEventListener("click", () => {
        selecionados.clear();
        sincronizarCaixas();
    });
    $("baixarTudo").addEventListener("click", () => void baixarTudo());
    $("limpar").addEventListener("click", () => {
        bitmap?.close();
        bitmap = null;
        mapa = null;
        manuais.clear();
        automaticos.clear();
        $("zona").classList.remove("compacta");
        $("soltar").textContent = semHover.matches ? t.soltarToque : t.soltar;
        $("escolher").textContent = t.escolher;
        $("painel").hidden = true;
        $("grade").hidden = true;
        $("vazio").hidden = false;
        $("aviso").hidden = true;
        $("grade").innerHTML = "";
        atualizarContador();
    });
    semHover.addEventListener("change", () => {
        $("soltar").textContent = semHover.matches ? t.soltarToque : t.soltar;
    });
    const topbar = document.getElementById("topbar");
    if (topbar) {
        const atualizar = () => {
            topbar.classList.toggle("rolou", window.scrollY > 4);
        };
        atualizar();
        window.addEventListener("scroll", atualizar, { passive: true });
    }
}
function sincronizarCaixas() {
    for (const caixa of document.querySelectorAll(".incluir input")) {
        const cartao = caixa.closest(".cartao");
        if (cartao)
            caixa.checked = selecionados.has(cartao.dataset.id ?? "");
    }
    atualizarContador();
}
aplicarTextos();
ligarEventos();
