/**
 * Escritor de ZIP próprio, sem dependência.
 *
 * Usa só o método "guardar" (sem compressão): JPEG e PNG já vêm comprimidos,
 * então recomprimir não ganha quase nada e custaria memória em lote grande.
 */
const TABELA_CRC = (() => {
    const tabela = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1)
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        tabela[n] = c >>> 0;
    }
    return tabela;
})();
export function crc32(dados) {
    let crc = 0xffffffff;
    for (let i = 0; i < dados.length; i += 1)
        crc = (TABELA_CRC[(crc ^ (dados[i] ?? 0)) & 0xff] ?? 0) ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
/** Data e hora no formato do ZIP, com a hora local do momento. */
export function horaZip(data = new Date()) {
    const hora = ((data.getHours() & 0x1f) << 11) | ((data.getMinutes() & 0x3f) << 5) | ((data.getSeconds() >> 1) & 0x1f);
    const dia = (((data.getFullYear() - 1980) & 0x7f) << 9) | (((data.getMonth() + 1) & 0x0f) << 5) | (data.getDate() & 0x1f);
    return { hora, dia };
}
export function montarZip(arquivos, data = new Date()) {
    const { hora, dia } = horaZip(data);
    const pedacos = [];
    const centrais = [];
    let deslocamento = 0;
    for (const arquivo of arquivos) {
        const nome = new TextEncoder().encode(arquivo.nome);
        const crc = crc32(arquivo.dados);
        const tamanho = arquivo.dados.length;
        const local = new Uint8Array(30 + nome.length);
        const lv = new DataView(local.buffer);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0x0800, true); // nomes em UTF-8
        lv.setUint16(8, 0, true); // método: guardar
        lv.setUint16(10, hora, true);
        lv.setUint16(12, dia, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, tamanho, true);
        lv.setUint32(22, tamanho, true);
        lv.setUint16(26, nome.length, true);
        lv.setUint16(28, 0, true);
        local.set(nome, 30);
        pedacos.push(local, arquivo.dados);
        const central = new Uint8Array(46 + nome.length);
        const cv = new DataView(central.buffer);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0x0800, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, hora, true);
        cv.setUint16(14, dia, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, tamanho, true);
        cv.setUint32(24, tamanho, true);
        cv.setUint16(28, nome.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, deslocamento, true);
        central.set(nome, 46);
        centrais.push(central);
        deslocamento += local.length + arquivo.dados.length;
    }
    const tamanhoCentral = centrais.reduce((soma, pedaco) => soma + pedaco.length, 0);
    const fim = new Uint8Array(22);
    const fv = new DataView(fim.buffer);
    fv.setUint32(0, 0x06054b50, true);
    fv.setUint16(4, 0, true);
    fv.setUint16(6, 0, true);
    fv.setUint16(8, arquivos.length, true);
    fv.setUint16(10, arquivos.length, true);
    fv.setUint32(12, tamanhoCentral, true);
    fv.setUint32(16, deslocamento, true);
    fv.setUint16(20, 0, true);
    return juntar([...pedacos, ...centrais, fim]);
}
export function juntar(pedacos) {
    const total = pedacos.reduce((soma, pedaco) => soma + pedaco.length, 0);
    const saida = new Uint8Array(total);
    let posicao = 0;
    for (const pedaco of pedacos) {
        saida.set(pedaco, posicao);
        posicao += pedaco.length;
    }
    return saida;
}
