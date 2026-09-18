import type { APIRoute } from "astro";
import sharp from "sharp";
import { SITE } from "../../config";

/** Imagem de compartilhamento padrão (home e páginas sem capa). */
const escape = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async () => {
  const font = "Helvetica, Arial, 'DejaVu Sans', sans-serif";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#01131b"/><stop offset="0.55" stop-color="#04283d"/><stop offset="1" stop-color="#01131b"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.3" r="0.6">
      <stop offset="0" stop-color="#2997ff" stop-opacity="0.28"/><stop offset="1" stop-color="#2997ff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M60 0 H0 V60" fill="none" stroke="#00a0e5" stroke-opacity="0.07" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <text x="90" y="170" font-family="${font}" font-size="26" font-weight="700" letter-spacing="6" fill="#2997ff">${escape(SITE.role.toUpperCase())}</text>
  <text x="90" y="280" font-family="${font}" font-size="96" font-weight="800" fill="#ffffff">${escape(SITE.name)}</text>
  <text x="90" y="350" font-family="${font}" font-size="34" fill="#c7d2e0">Estudos de arquitetura e engenharia de software,</text>
  <text x="90" y="398" font-family="${font}" font-size="34" fill="#c7d2e0">organizados para consulta.</text>
  <rect x="90" y="470" width="4" height="70" rx="2" fill="#2997ff"/>
  <text x="112" y="500" font-family="${font}" font-size="26" fill="#8fa3b8">Arquitetura · Sistemas distribuídos · Java · IA aplicada</text>
  <text x="112" y="536" font-family="${font}" font-size="26" fill="#8fa3b8">cesarschutz.com.br</text>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
