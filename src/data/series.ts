import type { IconName } from "../utils/icons";

/**
 * Séries de artigos. Um post entra numa série com `series: <key>` no
 * frontmatter (e não usa `category`). Série nova = adicionar um item aqui;
 * sem `url` própria, ela ganha a página genérica /series/<key>/.
 */
export interface Series {
  key: string;
  name: string;
  description: string;
  color: string;
  icon: IconName;
  /** página própria (ex.: /java/ com a grade de versões) */
  url?: string;
}

export const SERIES: Series[] = [
  {
    key: "java",
    name: "Atualizações do Java",
    description: "Cada versão do Java explicada: o que mudou, por que importa e exemplos de código.",
    color: "#f8981d",
    icon: "coffee",
    url: "/java/",
  },
];

export function getSeries(key: string | undefined): Series | undefined {
  return key ? SERIES.find((s) => s.key === key) : undefined;
}

export function seriesUrl(series: Series): string {
  return series.url ?? `/series/${series.key}/`;
}
