import type { APIRoute } from "astro";
import sharp from "sharp";
import { getPosts, type Post } from "../../utils/posts";
import { OG_BACKGROUND, coverAccent, coverStyle, rawCover } from "../../utils/covers";

/**
 * Imagem de compartilhamento (1200×630 PNG) de cada post, gerada a partir da
 * capa card (2:1). Redes sociais não exibem SVG em og:image.
 */
export async function getStaticPaths() {
  const posts = await getPosts();
  return posts.filter((post) => rawCover(post.id, "card")).map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: Post };
  const card = rawCover(post.id, "card")!;
  const viewBox = card.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 1200 600";
  const inner = card.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <style>${coverStyle(3.4, coverAccent(card))}</style>
  ${OG_BACKGROUND}
  <svg x="0" y="15" width="1200" height="600" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${inner}</svg>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
