import { juntar } from "./zip.js";
export function montarIco(entradas) {
    if (entradas.length === 0)
        throw new Error("o ícone precisa de pelo menos um tamanho");
    if (entradas.length > 255)
        throw new Error("formato ICO aceita no máximo 255 tamanhos");
    const cabecalho = new Uint8Array(6);
    const cv = new DataView(cabecalho.buffer);
    cv.setUint16(0, 0, true);
    cv.setUint16(2, 1, true);
    cv.setUint16(4, entradas.length, true);
    const diretorios = new Uint8Array(entradas.length * 16);
    let deslocamento = cabecalho.length + diretorios.length;
    entradas.forEach((entrada, indice) => {
        const base = indice * 16;
        const dv = new DataView(diretorios.buffer, base, 16);
        // 256 é representado por zero no campo de um byte.
        dv.setUint8(0, entrada.tamanho >= 256 ? 0 : entrada.tamanho);
        dv.setUint8(1, entrada.tamanho >= 256 ? 0 : entrada.tamanho);
        dv.setUint8(2, 0);
        dv.setUint8(3, 0);
        dv.setUint16(4, 1, true);
        dv.setUint16(6, 32, true);
        dv.setUint32(8, entrada.png.length, true);
        dv.setUint32(12, deslocamento, true);
        deslocamento += entrada.png.length;
    });
    return juntar([cabecalho, diretorios, ...entradas.map((entrada) => entrada.png)]);
}
/** Lê o cabeçalho do ICO montado, útil para teste e para conferência. */
export function lerIco(dados) {
    const dv = new DataView(dados.buffer, dados.byteOffset, dados.byteLength);
    if (dv.getUint16(0, true) !== 0 || dv.getUint16(2, true) !== 1)
        throw new Error("não é um ICO");
    const quantos = dv.getUint16(4, true);
    const saida = [];
    for (let i = 0; i < quantos; i += 1) {
        const base = 6 + i * 16;
        const largura = dv.getUint8(base) || 256;
        const tamanho = dv.getUint32(base + 8, true);
        const inicio = dv.getUint32(base + 12, true);
        saida.push({ tamanho: largura, png: dados.slice(inicio, inicio + tamanho) });
    }
    return saida;
}
