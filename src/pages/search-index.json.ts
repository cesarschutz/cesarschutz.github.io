import { getCollection } from "astro:content";
import { IdToSlug } from "../utils/hash";

/**
 * Índice de busca do site: um JSON com o texto integral de cada post,
 * consumido pela busca do cliente (src/utils/search.ts), que suporta
 * busca por frase exata — algo que o Pagefind não oferece.
 */

function stripMarkdown(md: string): string {
  return (
    md
      // remove delimitadores de code fence, mantendo o conteúdo do bloco
      .replace(/^```.*$/gm, " ")
      // imagens fora, links viram só o texto
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // tags HTML (details, summary etc.)
      .replace(/<[^>]+>/g, " ")
      // marcações inline
      .replace(/[`*_~#>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export async function GET() {
  const posts = await getCollection("posts", ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });

  const docs = posts.map((post) => ({
    title: post.data.title,
    url: `/posts/${IdToSlug(post.id)}`,
    text: stripMarkdown(post.body ?? ""),
  }));

  return new Response(JSON.stringify(docs), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
