import { getCollection, type CollectionEntry } from "astro:content";
import getReadingTime from "reading-time";

export type Post = CollectionEntry<"posts">;

export interface PostSummary {
  slug: string;
  url: string;
  title: string;
  description?: string;
  published: Date;
  category?: string;
  series?: string;
  tags: string[];
  cover?: string;
  minutes: number;
}

let cache: Post[] | null = null;

/** Posts publicados, do mais recente ao mais antigo (rascunhos só no dev). */
export async function getPosts(): Promise<Post[]> {
  if (cache) return cache;
  const posts = await getCollection("posts", ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  cache = posts.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
  return cache;
}

export function readingMinutes(post: Post): number {
  return Math.max(1, Math.round(getReadingTime(post.body ?? "").minutes));
}

export function summarize(post: Post): PostSummary {
  return {
    slug: post.id,
    url: `/posts/${post.id}/`,
    title: post.data.title,
    description: post.data.description,
    published: post.data.published,
    category: post.data.category,
    series: post.data.series,
    tags: post.data.tags,
    cover: post.data.cover,
    minutes: readingMinutes(post),
  };
}

let summaries: PostSummary[] | null = null;

export async function getSummaries(): Promise<PostSummary[]> {
  summaries ??= (await getPosts()).map(summarize);
  return summaries;
}

export interface Group {
  name: string;
  posts: PostSummary[];
}

function groupBy(posts: PostSummary[], keys: (p: PostSummary) => string[]): Group[] {
  const map = new Map<string, PostSummary[]>();
  for (const post of posts) {
    for (const key of keys(post)) {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    }
  }
  return [...map.entries()]
    .map(([name, list]) => ({ name, posts: list }))
    .sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name, "pt-BR"));
}

export async function getCategories(): Promise<Group[]> {
  return groupBy(await getSummaries(), (p) => (p.category ? [p.category] : []));
}

export async function getTags(): Promise<Group[]> {
  return groupBy(await getSummaries(), (p) => p.tags);
}

/** Posts de uma série, do mais recente ao mais antigo. */
export async function getSeriesPosts(key: string): Promise<PostSummary[]> {
  return (await getSummaries()).filter((p) => p.series === key);
}
