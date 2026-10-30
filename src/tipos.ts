/**
 * Tipos do projeto.
 *
 * Tudo em fração (0 a 1) para não depender do tamanho final: o mesmo preset
 * serve para qualquer imagem de entrada.
 */

export type Grupo = "social" | "video" | "site" | "icone";

/** Faixas da imagem que a interface da plataforma cobre ou corta. */
export interface ZonaSegura {
  topo: number;
  base: number;
  esquerda: number;
  direita: number;
}

export interface Preset {
  id: string;
  grupo: Grupo;
  nome: string;
  largura: number;
  altura: number;
  formato: "jpg" | "png";
  zona: ZonaSegura;
  /** Para pacotes de ícone: cada tamanho vira um arquivo. */
  tamanhos?: number[];
  nota?: string;
}

export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/** Mapa de interesse em baixa resolução, valores normalizados de 0 a 1. */
export interface MapaInteresse {
  largura: number;
  altura: number;
  valores: Float32Array;
}

export interface ArquivoGerado {
  nome: string;
  tipo: string;
  dados: Uint8Array;
}

export const ZONA_ZERADA: ZonaSegura = { topo: 0, base: 0, esquerda: 0, direita: 0 };
