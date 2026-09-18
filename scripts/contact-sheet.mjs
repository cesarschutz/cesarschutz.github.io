/**
 * Folha de contato: um formato de todos os posts numa grade, para comparar o conjunto.
 *   node scripts/contact-sheet.mjs <formato> [saida.png] [col]
 */
import { readdirSync, existsSync, readFileSync } from "node:fs";
import sharp from "sharp";

const DIR = new URL("../src/covers/", import.meta.url);
const SIZES = { wide: [1600, 400], card: [1200, 600], square: [800, 800], featured: [800, 1000] };
const ACCENTS = { amber: "#f5a04a", violet: "#a889f7", green: "#4fd69a", coral: "#f4706b", pink: "#f272b8" };
const format = process.argv[2] ?? "card";
const out = process.argv[3] ?? `/tmp/folha-${format}.png`;
const cols = Number(process.argv[4] ?? (format === "wide" ? 2 : 4));
const [vw, vh] = SIZES[format];

const css = (sw, ac) => {
  const to = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = to(ac), [r2, g2, b2] = to("#01131b");
  const c = (x, y) => Math.round(x * 0.14 + y * 0.86).toString(16).padStart(2, "0");
  const tint = `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
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
};

const bg = (w, h, ac, k) => `<defs>
<linearGradient id="g${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#01131b"/><stop offset=".55" stop-color="#04283d"/><stop offset="1" stop-color="#01131b"/></linearGradient>
<radialGradient id="c${k}"><stop offset="0" stop-color="#00a0e5" stop-opacity=".2"/><stop offset="1" stop-color="#00a0e5" stop-opacity="0"/></radialGradient>
<radialGradient id="a${k}"><stop offset="0" stop-color="${ac}" stop-opacity=".13"/><stop offset="1" stop-color="${ac}" stop-opacity="0"/></radialGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g${k})"/>
<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * .42}" ry="${h * .58}" fill="url(#c${k})"/>
<ellipse cx="${w * .12}" cy="${h * .62}" rx="${w * .46}" ry="${h * .7}" fill="url(#a${k})"/>`;

const slugs = readdirSync(DIR).filter((d) => !d.startsWith(".") && existsSync(new URL(`${d}/${format}.svg`, DIR)));
const CW = format === "wide" ? 640 : 340;
const CH = Math.round((CW * vh) / vw);
const LBL = 22, GAP = 10;
const rows = Math.ceil(slugs.length / cols);
const W = cols * CW + (cols + 1) * GAP;
const H = rows * (CH + LBL + GAP) + GAP;

const layers = [];
for (const [i, slug] of slugs.entries()) {
  const src = readFileSync(new URL(`${slug}/${format}.svg`, DIR), "utf8");
  const ac = ACCENTS[src.match(/<svg[^>]*class="ac-(\w+)/)?.[1]] ?? ACCENTS.amber;
  const body = src.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const swPx = Math.min(6, Math.max(1.35, 0.3 + 0.0088 * CW));
  const sw = (swPx * vw) / CW;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${vw} ${vh}"><style>${css(sw, ac)}</style>${bg(vw, vh, ac, i)}${body}</svg>`;
  const x = GAP + (i % cols) * (CW + GAP);
  const y = GAP + Math.floor(i / cols) * (CH + LBL + GAP);
  layers.push({ input: await sharp(Buffer.from(svg)).png().toBuffer(), top: y, left: x });
  layers.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${LBL}"><text x="0" y="15" font-family="Helvetica" font-size="12" fill="#9fb3c8">${slug}</text></svg>`),
    top: y + CH + 3, left: x,
  });
}
await sharp({ create: { width: W, height: H, channels: 4, background: "#0b0f14" } }).composite(layers).png().toFile(out);
console.log(`${out} — ${slugs.length} capas`);
