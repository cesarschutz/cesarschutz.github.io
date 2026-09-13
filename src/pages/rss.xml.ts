import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import YukinaConfig from "../../yukina.config";
import { IdToSlug } from "../utils/hash";
import { stripInlineMd } from "../utils/inline-md";

export async function GET(context: { site: string }) {
  const posts = await getCollection("posts", ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  const sorted = posts.sort(
    (a, b) =>
      new Date(b.data.published).getTime() - new Date(a.data.published).getTime(),
  );
  return rss({
    title: YukinaConfig.title,
    description: YukinaConfig.description,
    site: context.site,
    items: sorted.map((post) => ({
      title: post.data.title,
      pubDate: post.data.published,
      description: stripInlineMd(post.data.description),
      link: `/posts/${IdToSlug(post.id)}/`,
    })),
    customData: `<language>pt-BR</language>`,
  });
}
