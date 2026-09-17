import type { PostSummary } from "./posts";

/**
 * Posts relacionados: pontua tags em comum (2), mesma categoria (1) e mesma
 * série (1); desempata pelo mais recente. Posts sem nada em comum ficam de fora.
 */
export function relatedPosts(current: PostSummary, all: PostSummary[], limit = 3): PostSummary[] {
  const tags = new Set(current.tags);
  return all
    .filter((p) => p.slug !== current.slug)
    .map((p) => ({
      post: p,
      score:
        p.tags.filter((t) => tags.has(t)).length * 2 +
        (current.category && p.category === current.category ? 1 : 0) +
        (current.series && p.series === current.series ? 1 : 0),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.post.published.getTime() - a.post.published.getTime())
    .slice(0, limit)
    .map((r) => r.post);
}
