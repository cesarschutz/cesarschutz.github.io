import { stripInlineMd } from "./format";

/** Meta description com no máximo ~155 caracteres, cortada em fim de palavra. */
export function metaDescription(text: string | undefined, max = 155): string | undefined {
  if (!text) return undefined;
  const clean = stripInlineMd(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : cut.length).replace(/[,;:.\s—-]+$/, "")}…`;
}
