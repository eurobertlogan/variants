import type { Idioma } from "./i18n.js";
import type { Preset, ZonaSegura } from "./tipos.js";

/**
 * Medidas reais de cada destino, com a faixa que a interface da plataforma
 * costuma cobrir.
 *
 * Plataforma muda de medida sem avisar. O README diz a data da conferência e
 * como ajustar: os números ficam todos aqui, em um lugar só.
 */

const SEM_ZONA: ZonaSegura = { topo: 0, base: 0, esquerda: 0, direita: 0 };
type Texto = Record<Idioma, string>;

export interface PresetLocalizado extends Omit<Preset, "nome" | "nota"> {
  nome: Texto;
  nota?: Texto;
}

export const PRESETS: PresetLocalizado[] = [
  {
    id: "og",
    grupo: "site",
    nome: { pt: "Open Graph", en: "Open Graph" },
    largura: 1200,
    altura: 630,
    formato: "jpg",
    zona: SEM_ZONA,
    nota: {
      pt: "Serve para Facebook, LinkedIn, WhatsApp e X. Proporção 1,91:1.",
      en: "Covers Facebook, LinkedIn, WhatsApp and X. Ratio 1.91:1.",
    },
  },
  {
    id: "twitter",
    grupo: "social",
    nome: { pt: "X (timeline)", en: "X (timeline)" },
    largura: 1600,
    altura: 900,
    formato: "jpg",
    zona: SEM_ZONA,
    nota: {
      pt: "16:9. Em tela larga a timeline corta para 2:1, então mantenha o assunto no miolo.",
      en: "16:9. On wide screens the timeline trims to 2:1, so keep the subject near the middle.",
    },
  },
  {
    id: "instagram-feed",
    grupo: "social",
    nome: { pt: "Instagram feed", en: "Instagram feed" },
    largura: 1080,
    altura: 1080,
    formato: "jpg",
    zona: SEM_ZONA,
  },
  {
    id: "instagram-retrato",
    grupo: "social",
    nome: { pt: "Instagram retrato", en: "Instagram portrait" },
    largura: 1080,
    altura: 1350,
    formato: "jpg",
    zona: SEM_ZONA,
    nota: {
      pt: "4:5 ocupa mais tela no feed do que o quadrado.",
      en: "4:5 takes more of the feed than the square.",
    },
  },
  {
    id: "story",
    grupo: "social",
    nome: { pt: "Story e Reels", en: "Story and Reels" },
    largura: 1080,
    altura: 1920,
    formato: "jpg",
    zona: { topo: 0.13, base: 0.18, esquerda: 0, direita: 0 },
    nota: {
      pt: "O topo tem o cabeçalho e a base tem a legenda e os botões. O assunto precisa ficar no meio.",
      en: "The header sits on top and the caption and buttons sit at the bottom. The subject has to stay in between.",
    },
  },
  {
    id: "tiktok",
    grupo: "video",
    nome: { pt: "TikTok", en: "TikTok" },
    largura: 1080,
    altura: 1920,
    formato: "jpg",
    zona: { topo: 0.07, base: 0.25, esquerda: 0, direita: 0.12 },
    nota: {
      pt: "A legenda e a coluna de botões ficam na base e na direita.",
      en: "The caption and the button column sit at the bottom and on the right.",
    },
  },
  {
    id: "youtube",
    grupo: "video",
    nome: { pt: "YouTube", en: "YouTube" },
    largura: 1280,
    altura: 720,
    formato: "jpg",
    zona: { topo: 0, base: 0.12, esquerda: 0, direita: 0.22 },
    nota: {
      pt: "O tempo do vídeo aparece no canto inferior direito.",
      en: "The video time sits in the bottom right corner.",
    },
  },
  {
    id: "linkedin-capa",
    grupo: "site",
    nome: { pt: "Capa de perfil", en: "Profile banner" },
    largura: 1584,
    altura: 396,
    formato: "jpg",
    zona: { topo: 0, base: 0.28, esquerda: 0.16, direita: 0 },
    nota: {
      pt: "4:1, usado no topo do LinkedIn. A foto de perfil cobre o canto inferior esquerdo.",
      en: "4:1, used at the top of LinkedIn. The profile photo covers the bottom left corner.",
    },
  },
  {
    id: "pinterest",
    grupo: "social",
    nome: { pt: "Pinterest", en: "Pinterest" },
    largura: 1000,
    altura: 1500,
    formato: "jpg",
    zona: SEM_ZONA,
    nota: {
      pt: "2:3. O pin mostra a imagem inteira, sem corte.",
      en: "2:3. The pin shows the whole image, no crop.",
    },
  },
  {
    id: "email",
    grupo: "site",
    nome: { pt: "Cabeçalho de e-mail", en: "Email header" },
    largura: 600,
    altura: 200,
    formato: "jpg",
    zona: SEM_ZONA,
    nota: {
      pt: "3:1. Largura de 600 px é o que sobrevive na maioria dos clientes.",
      en: "3:1. 600 px wide is what survives in most email clients.",
    },
  },
  {
    id: "google-business",
    grupo: "site",
    nome: { pt: "Perfil de empresa", en: "Business profile" },
    largura: 1200,
    altura: 900,
    formato: "jpg",
    zona: SEM_ZONA,
    nota: {
      pt: "4:3, usado no perfil do Google e em cartões de local.",
      en: "4:3, used on the Google profile and location cards.",
    },
  },
  {
    id: "icone",
    grupo: "icone",
    nome: { pt: "Ícone", en: "Icon" },
    largura: 512,
    altura: 512,
    formato: "png",
    zona: { topo: 0.17, base: 0.17, esquerda: 0.17, direita: 0.17 },
    tamanhos: [16, 32, 48, 180, 192, 512],
    nota: {
      pt: "O ícone adaptativo do Android recorta em círculo, então o miolo de 66% precisa bastar sozinho.",
      en: "Android adaptive icons crop into a circle, so the inner 66% has to work on its own.",
    },
  },
];

export function porId(id: string): PresetLocalizado | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

export function proporcao(preset: Pick<Preset, "largura" | "altura">): number {
  return preset.largura / preset.altura;
}

/** Nome do arquivo exportado, sempre com a medida na frente. */
export function nomeArquivo(preset: Pick<Preset, "id" | "formato" | "largura" | "altura">, tamanho?: number): string {
  const extensao = preset.formato === "png" ? "png" : "jpg";
  if (tamanho) return `icone-${tamanho}x${tamanho}.${extensao}`;
  return `${preset.id}-${preset.largura}x${preset.altura}.${extensao}`;
}
