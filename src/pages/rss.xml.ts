import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { SITE } from "../config";
import { getPosts } from "../utils/posts";
import { getSeries } from "../data/series";
import { stripInlineMd } from "../utils/format";

/** Conteúdo completo do post, com links e imagens em URL absoluta (leitores de RSS). */
function fullContent(html: string | undefined, site: URL): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/(href|src)="\/(?!\/)/g, `$1="${site.origin}/`)
    .replace(/<button[^>]*>[\s\S]*?<\/button>/g, "");
}

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    // texto completo nos 10 mais recentes; os demais levam só o resumo (mantém o feed leve)
    items: posts.map((post, i) => ({
      title: post.data.title,
      pubDate: post.data.published,
      description: stripInlineMd(post.data.description),
      categories: [getSeries(post.data.series)?.name ?? post.data.category, ...post.data.tags].filter(
        (c): c is string => Boolean(c),
      ),
      link: `/posts/${post.id}/`,
      content: i < 10 ? fullContent(post.rendered?.html, context.site!) : undefined,
    })),
    customData: "<language>pt-BR</language>",
  });
}
