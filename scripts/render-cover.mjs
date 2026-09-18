/**
 * Renderiza as capas de um post num PNG só, do jeito que aparecem no site
 * (fundo escuro, três formatos e a miniatura de 84px), para conferir o desenho.
 *   node scripts/render-cover.mjs <slug> [saida.png]
 */
import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";

const slug = process.argv[2];
const out = process.argv[3] ?? `/tmp/cover-${slug}.png`;
if (!slug) { console.error("uso: node scripts/render-cover.mjs <slug> [saida.png]"); process.exit(1); }

const DIR = new URL("../src/covers/", import.meta.url);
const SIZES = { wide: [1600, 400], card: [1200, 600], square: [800, 800], featured: [800, 1000] };
const ACCENTS = { amber: "#f5a04a", violet: "#a889f7", green: "#4fd69a", coral: "#f4706b", pink: "#f272b8" };

function css(sw, ac) {
  const tint = (() => {
    const to = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [r1, g1, b1] = to(ac), [r2, g2, b2] = to("#01131b");
    const c = (x, y) => Math.round(x * 0.14 + y * 0.86).toString(16).padStart(2, "0");
    return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
  })();
  return `path,line,polyline,rect,circle,ellipse,polygon{stroke-width:${sw}px;stroke-linecap:round;stroke-linejoin:round}
.cv-bold{stroke-width:${sw * 1.5}px}.cv-thin{stroke-width:${sw * 0.6}px}.cv-dash{stroke-dasharray:${sw * 2.2} ${sw * 2.6}}
.cv-line{fill:none;stroke:#00a0e5}.cv-shape{fill:#032c42;stroke:#00a0e5}.cv-solid{fill:#00a0e5}
.cv-detail{fill:#7fd4f5}.cv-detail-line{fill:none;stroke:#7fd4f5}
.cv-muted{fill:#7fd4f5;fill-opacity:.45}.cv-muted-line{fill:none;stroke:#7fd4f5;stroke-opacity:.4}
.cv-soft{fill:#00a0e5;fill-opacity:.14}.cv-soft-line{fill:none;stroke:#00a0e5;stroke-opacity:.3}
.cv-ac-line,.cv-warm-line{fill:none;stroke:${ac}}.cv-ac-shape,.cv-warm-shape{fill:${tint};stroke:${ac}}
.cv-ac,.cv-warm{fill:${ac}}.cv-ac-soft,.cv-warm-soft{fill:${ac};fill-opacity:.16}
.cv-ac-soft-line,.cv-warm-soft-line{fill:none;stroke:${ac};stroke-opacity:.3}
.cv-white{fill:#ffffff;fill-opacity:.78}.cv-cut{fill:#022131}
.cv-text{font-family:Helvetica,Arial,sans-serif;font-weight:700}.cv-mono{font-family:Menlo,monospace;font-weight:700}`;
}

const bg = (w, h, ac) => `<defs>
  <linearGradient id="g${w}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#01131b"/><stop offset=".55" stop-color="#04283d"/><stop offset="1" stop-color="#01131b"/></linearGradient>
  <radialGradient id="c${w}"><stop offset="0" stop-color="#00a0e5" stop-opacity=".2"/><stop offset="1" stop-color="#00a0e5" stop-opacity="0"/></radialGradient>
  <radialGradient id="a${w}"><stop offset="0" stop-color="${ac}" stop-opacity=".13"/><stop offset="1" stop-color="${ac}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#g${w})"/>
<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.42}" ry="${h * 0.58}" fill="url(#c${w})"/>
<ellipse cx="${w * 0.12}" cy="${h * 0.62}" rx="${w * 0.46}" ry="${h * 0.7}" fill="url(#a${w})"/>
<g fill="#7fd4f5"><circle cx="${w * 0.05}" cy="${h * 0.12}" r="${w * 0.0016}" fill-opacity=".55"/><circle cx="${w * 0.95}" cy="${h * 0.1}" r="${w * 0.0014}" fill-opacity=".45"/><circle cx="${w * 0.96}" cy="${h * 0.88}" r="${w * 0.0016}" fill-opacity=".5"/><circle cx="${w * 0.04}" cy="${h * 0.9}" r="${w * 0.0014}" fill-opacity=".4"/></g>`;

/** Uma capa renderizada na largura pedida (como o site faz: traço em px). */
async function shot(format, pxWidth) {
  const file = new URL(`${slug}/${format}.svg`, DIR);
  if (!existsSync(file)) throw new Error(`falta ${format}.svg`);
  const src = readFileSync(file, "utf8");
  const [w, h] = SIZES[format];
  const name = src.match(/<svg[^>]*class="ac-(\w+)/)?.[1];
  const ac = ACCENTS[name] ?? ACCENTS.amber;
  const body = src.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  // mesma conta do CSS: clamp(1.35, 0.3 + 0.88% da largura, 6) px, em unidades do viewBox
  const swPx = Math.min(6, Math.max(1.35, 0.3 + 0.0088 * pxWidth));
  const sw = (swPx * w) / pxWidth;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pxWidth}" height="${Math.round((pxWidth * h) / w)}" viewBox="0 0 ${w} ${h}"><style>${css(sw, ac)}</style>${bg(w, h, ac)}${body}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const label = (t, w) => sharp({ create: { width: w, height: 26, channels: 4, background: "#0b0f14" } })
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="26"><text x="4" y="18" font-family="Helvetica" font-size="14" fill="#9fb3c8">${t}</text></svg>`), top: 0, left: 0 }]).png().toBuffer();

const W = 900, PAD = 16;
const wide = await shot("wide", W);
const card = await shot("card", (W - PAD) / 2);
const square = await shot("square", (W - PAD) / 2);
const thumb = await shot("square", 84);
const feat = await shot("featured", 380);

const hW = Math.round((W * 400) / 1600), hC = Math.round(((W - PAD) / 2) * 600 / 1200);
const rows = [
  { img: await label("wide 1600×400 — topo do post", W), h: 26 },
  { img: wide, h: hW },
  { img: await label("card 1200×600 (esq.) · square 800×800 (dir.)", W), h: 26 },
];
let top = 0;
const layers = [];
for (const r of rows) { layers.push({ input: r.img, top, left: 0 }); top += r.h + 6; }
const rowTop = top;
layers.push({ input: card, top: rowTop, left: 0 });
layers.push({ input: square, top: rowTop, left: Math.round((W + PAD) / 2) });
const rowH = Math.max(hC, Math.round((W - PAD) / 2));
top = rowTop + rowH + 6;
layers.push({ input: await label("destaque 380×475 (formato retrato) · miniatura 84px (tem de ler nesse tamanho)", W), top, left: 0 });
top += 32;
layers.push({ input: feat, top, left: 0 });
layers.push({ input: thumb, top: top + 190, left: 440 });
const H = top + 490;

await sharp({ create: { width: W, height: H, channels: 4, background: "#0b0f14" } })
  .composite(layers).png().toFile(out);
console.log(out);
