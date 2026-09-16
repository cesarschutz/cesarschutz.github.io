import { getPosts } from "../utils/posts";

/**
 * Índice da busca: texto integral de cada post, consumido no cliente por
 * src/scripts/search.ts (frase exata primeiro, depois todas as palavras).
 */
function stripMarkdown(md: string): string {
  return md
    .replace(/^```.*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_~#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  const posts = await getPosts();
  const docs = posts.map((post) => ({
    title: post.data.title,
    url: `/posts/${post.id}/`,
    category: post.data.category,
    text: stripMarkdown(post.body ?? ""),
  }));
  return new Response(JSON.stringify(docs), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
