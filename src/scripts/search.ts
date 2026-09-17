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
  title: string;
  category?: string;
  excerpt: string;
}

interface RawDoc {
  title: string;
  url: string;
  category?: string;
  description?: string;
  tags?: string[];
  text: string;
}

interface IndexedDoc extends RawDoc {
  /** texto normalizado (minúsculas, sem acentos) */
  normText: string;
  /** normText[i] veio de text[map[i]] — permite recortar o trecho original */
  map: number[];
  normTitle: string;
  normTags: string;
  normMeta: string;
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
  return {
    ...doc,
    normText,
    map,
    normTitle: normalizeQuery(doc.title),
    normTags: normalizeQuery((doc.tags ?? []).join(" | ")),
    normMeta: normalizeQuery(`${doc.category ?? ""} ${doc.description ?? ""}`),
  };
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

function occurrences(haystack: string, needle: string, cap = 8): number {
  let count = 0;
  let from = haystack.indexOf(needle);
  while (from >= 0 && count < cap) {
    count++;
    from = haystack.indexOf(needle, from + needle.length);
  }
  return count;
}

/**
 * Relevância: título (12), tags (8), categoria/resumo (4) e ocorrências no
 * texto (até 12). Assim o post que trata do assunto vem antes do que só o cita.
 */
function score(doc: IndexedDoc, term: string): number {
  return (
    (doc.normTitle.includes(term) ? 12 : 0) +
    (doc.normTags.includes(term) ? 8 : 0) +
    (doc.normMeta.includes(term) ? 4 : 0) +
    occurrences(doc.normText, term, 12)
  );
}

export async function searchPosts(keyword: string): Promise<SearchResult[]> {
  const query = normalizeQuery(keyword.trim());
  if (query.length < 2) return [];

  const docs = await loadIndex();

  // etapa 1: frase exata
  const exact = docs
    .map((doc) => ({ doc, pos: doc.normText.indexOf(query), score: score(doc, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  if (exact.length > 0) {
    return exact.slice(0, 10).map(({ doc, pos }) => ({
      url: doc.url,
      title: doc.title,
      category: doc.category,
      excerpt:
        pos >= 0 ? buildExcerpt(doc, pos, query.length) : escapeHtml((doc.description ?? doc.text).slice(0, CONTEXT * 2)) + "…",
    }));
  }

  // etapa 2: todas as palavras, em qualquer ordem
  const words = query.split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];
  const partial = docs
    .filter((doc) =>
      words.every((w) => doc.normText.includes(w) || doc.normTitle.includes(w) || doc.normTags.includes(w) || doc.normMeta.includes(w)),
    )
    .map((doc) => {
      const positions = words.map((w) => doc.normText.indexOf(w)).filter((p) => p >= 0);
      return {
        doc,
        firstPos: positions.length ? Math.min(...positions) : -1,
        score: words.reduce((acc, w) => acc + score(doc, w), 0),
      };
    })
    .sort((a, b) => b.score - a.score);
  return partial.slice(0, 10).map(({ doc, firstPos }) => ({
    url: doc.url,
    title: doc.title,
    category: doc.category,
    excerpt:
      firstPos >= 0
        ? buildExcerpt(doc, firstPos, words.find((w) => doc.normText.indexOf(w) === firstPos)?.length ?? words[0].length)
        : escapeHtml((doc.description ?? "").slice(0, CONTEXT * 2)),
  }));
}
