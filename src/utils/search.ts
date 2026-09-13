/**
 * Busca do site, no cliente. Duas etapas:
 * 1. FRASE EXATA — o termo digitado é procurado como substring contígua
 *    (ignorando maiúsculas e acentos) no título e no corpo de cada post.
 * 2. Fallback POR PALAVRAS — se nenhuma frase exata for encontrada, valem os
 *    posts que contêm todas as palavras, em qualquer ordem.
 * O resultado traz um trecho com o termo destacado (<mark>).
 */

export interface SearchResult {
  url: string;
  meta: { title: string };
  excerpt: string;
}

interface RawDoc {
  title: string;
  url: string;
  text: string;
}

interface IndexedDoc extends RawDoc {
  /** texto normalizado (minúsculas, sem acentos) */
  normText: string;
  /** normText[i] veio de text[map[i]] — permite recortar o trecho original */
  map: number[];
  normTitle: string;
}

let indexPromise: Promise<IndexedDoc[]> | null = null;

function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function indexDoc(doc: RawDoc): IndexedDoc {
  let normText = "";
  const map: number[] = [];
  for (let i = 0; i < doc.text.length; i++) {
    const norm = doc.text[i]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    for (const ch of norm) {
      normText += ch;
      map.push(i);
    }
  }
  return { ...doc, normText, map, normTitle: normalizeQuery(doc.title) };
}

async function loadIndex(): Promise<IndexedDoc[]> {
  if (!indexPromise) {
    indexPromise = fetch("/search-index.json")
      .then((res) => res.json())
      .then((docs: RawDoc[]) => docs.map(indexDoc))
      .catch(() => {
        indexPromise = null;
        return [];
      });
  }
  return indexPromise;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const CONTEXT = 60;

function buildExcerpt(doc: IndexedDoc, normStart: number, normLength: number): string {
  const start = doc.map[normStart];
  const end = doc.map[Math.min(normStart + normLength, doc.map.length) - 1] + 1;
  const from = Math.max(0, start - CONTEXT);
  const to = Math.min(doc.text.length, end + CONTEXT);
  const prefix = (from > 0 ? "…" : "") + doc.text.slice(from, start);
  const match = doc.text.slice(start, end);
  const suffix = doc.text.slice(end, to) + (to < doc.text.length ? "…" : "");
  return `${escapeHtml(prefix)}<mark>${escapeHtml(match)}</mark>${escapeHtml(suffix)}`;
}

export async function searchPosts(keyword: string): Promise<SearchResult[]> {
  const query = normalizeQuery(keyword.trim());
  if (query.length < 2) return [];

  const docs = await loadIndex();

  // etapa 1: frase exata (título pesa mais)
  const exact: { doc: IndexedDoc; pos: number; inTitle: boolean }[] = [];
  for (const doc of docs) {
    const inTitle = doc.normTitle.includes(query);
    const pos = doc.normText.indexOf(query);
    if (inTitle || pos >= 0) exact.push({ doc, pos, inTitle });
  }
  if (exact.length > 0) {
    exact.sort((a, b) => Number(b.inTitle) - Number(a.inTitle));
    return exact.slice(0, 10).map(({ doc, pos }) => ({
      url: doc.url,
      meta: { title: doc.title },
      excerpt:
        pos >= 0
          ? buildExcerpt(doc, pos, query.length)
          : escapeHtml(doc.text.slice(0, CONTEXT * 2)) + "…",
    }));
  }

  // etapa 2: todas as palavras, em qualquer ordem
  const words = query.split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];
  const partial: { doc: IndexedDoc; firstPos: number; titleHits: number }[] = [];
  for (const doc of docs) {
    const positions = words.map((w) => doc.normText.indexOf(w));
    if (positions.some((p) => p < 0)) continue;
    const titleHits = words.filter((w) => doc.normTitle.includes(w)).length;
    partial.push({ doc, firstPos: Math.min(...positions), titleHits });
  }
  partial.sort((a, b) => b.titleHits - a.titleHits);
  return partial.slice(0, 10).map(({ doc, firstPos }) => ({
    url: doc.url,
    meta: { title: doc.title },
    excerpt: buildExcerpt(doc, firstPos, words[0].length),
  }));
}
