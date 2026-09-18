/**
 * Mede o desenho de uma capa e o desloca para o centro exato da tela.
 *   node scripts/center-cover.mjs <slug> [formato ...]     (sem formato: os quatro)
 * Reescreve o SVG envolvendo o conteúdo num <g transform="translate(dx dy)">.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import sharp from "sharp";

const DIR = new URL("../src/covers/", import.meta.url);
const slug = process.argv[2];
const formats = process.argv.slice(3).length ? process.argv.slice(3) : ["wide", "card", "square", "featured"];
if (!slug) { console.error("uso: node scripts/center-cover.mjs <slug> [formato ...]"); process.exit(1); }

for (const format of formats) {
  const path = new URL(`${slug}/${format}.svg`, DIR);
  if (!existsSync(path)) { console.log(`— ${format}: não existe`); continue; }
  const svg = readFileSync(path, "utf8");
  const [w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number);
  const root = svg.match(/<svg[^>]*>/)[0];
  const body = svg.slice(root.length).replace(/<\/svg>\s*$/, "");

  const px = 560, py = Math.round((560 * h) / w);
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${py}" viewBox="0 0 ${w} ${h}"><style>path,line,polyline,rect,circle,ellipse,polygon{stroke-width:4px;stroke-linecap:round;stroke-linejoin:round}text{font-family:Helvetica,Arial,sans-serif;font-weight:700}*{stroke:#fff;fill:#fff}</style>${body}</svg>`;
  const { data, info } = await sharp(Buffer.from(probe)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * info.channels + 3] > 24) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  if (x1 < 0) { console.log(`— ${format}: desenho vazio`); continue; }

  const dx = Math.round((w - ((x0 + x1 + 1) * w) / info.width) / 2 * 10) / 10;
  const dy = Math.round((h - ((y0 + y1 + 1) * h) / info.height) / 2 * 10) / 10;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { console.log(`✓ ${format}: já centrado`); continue; }

  const out = `${root}\n  <g transform="translate(${dx} ${dy})">${body}</g>\n</svg>\n`;
  writeFileSync(path, out);
  console.log(`✓ ${format}: deslocado ${dx}, ${dy}`);
}
