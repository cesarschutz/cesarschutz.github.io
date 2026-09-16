import type { IconName } from "./icons";
import { getSeries, seriesUrl } from "../data/series";

/**
 * Cor e ícone de cada categoria (mesma ideia das categorias do DEV NOTE).
 * Categoria nova sem entrada aqui cai no visual padrão.
 */
export interface CategoryStyle {
  color: string;
  icon: IconName;
  description: string;
}

const STYLES: Record<string, CategoryStyle> = {
  Arquitetura: {
    color: "#6366f1",
    icon: "layers",
    description: "Desenho de sistemas, consistência, integrações e trade-offs.",
  },
  Java: {
    color: "#f8981d",
    icon: "coffee",
    description: "A linguagem, a JVM e o ecossistema Spring.",
  },
  Observabilidade: {
    color: "#f97316",
    icon: "activity",
    description: "Logs, traces e métricas que explicam o sistema em produção.",
  },
  DevOps: {
    color: "#3b82f6",
    icon: "gear",
    description: "Entrega, Kubernetes, build e operação.",
  },
  Segurança: {
    color: "#ef4444",
    icon: "shield",
    description: "Autenticação, tokens e proteção de APIs.",
  },
  Dados: {
    color: "#0ea5e9",
    icon: "database",
    description: "Armazenamento analítico, data lakes e modelagem.",
  },
};

const DEFAULT_STYLE: CategoryStyle = {
  color: "#64748b",
  icon: "folder",
  description: "",
};

export function categoryStyle(name: string | undefined): CategoryStyle {
  return (name && STYLES[name]) || DEFAULT_STYLE;
}

export function categoryUrl(name: string): string {
  return `/categories/${encodeURIComponent(name)}/`;
}

export function tagUrl(name: string): string {
  return `/tags/${encodeURIComponent(name)}/`;
}

/** Rótulo exibido nos cards e no post: a série, se houver; senão a categoria. */
export interface PostLabel {
  kind: "series" | "category";
  name: string;
  url: string;
  color: string;
}

export function postLabel(post: { category?: string; series?: string }): PostLabel | undefined {
  const series = getSeries(post.series);
  if (series) return { kind: "series", name: series.name, url: seriesUrl(series), color: series.color };
  if (post.category) {
    return { kind: "category", name: post.category, url: categoryUrl(post.category), color: categoryStyle(post.category).color };
  }
  return undefined;
}
