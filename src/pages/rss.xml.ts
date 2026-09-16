import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { SITE } from "../config";
import { getPosts } from "../utils/posts";
import { getSeries } from "../data/series";
import { stripInlineMd } from "../utils/format";

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.published,
      description: stripInlineMd(post.data.description),
      categories: [getSeries(post.data.series)?.name ?? post.data.category, ...post.data.tags].filter(
        (c): c is string => Boolean(c),
      ),
      link: `/posts/${post.id}/`,
    })),
    customData: "<language>pt-BR</language>",
  });
}
