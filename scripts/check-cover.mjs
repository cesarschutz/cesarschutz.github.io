/**
 * Confere as capas de um post contra as regras do CLAUDE.md.
 *   node scripts/check-cover.mjs <slug>        (sem slug: confere todos)
 * Sai com código 1 se algo estiver fora do padrão.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import sharp from "sharp";

const DIR = new URL("../src/covers/", import.meta.url);
const FORMATS = { wide: [1600, 400], card: [1200, 600], square: [800, 800], featured: [800, 1000] };
const MAX_BYTES = 8192;
/** ocupação mínima do desenho em cada eixo (fração do viewBox) */
const FILL = { wide: [0.8, 0.62], card: [0.76, 0.66], square: [0.7, 0.7], featured: [0.72, 0.74] };

const CLASSES = new Set([
  "cv-bold", "cv-thin", "cv-dash",
  "cv-line", "cv-shape", "cv-solid",
  "cv-detail", "cv-detail-line",
  "cv-muted", "cv-muted-line",
  "cv-soft", "cv-soft-line",
  "cv-ac", "cv-ac-line", "cv-ac-shape", "cv-ac-soft", "cv-ac-soft-line",
  "cv-warm", "cv-warm-line", "cv-warm-shape", "cv-warm-soft", "cv-warm-soft-line",
  "cv-white", "cv-cut", "cv-text", "cv-mono",
]);
const ACCENTS = new Set(["ac-amber", "ac-violet", "ac-green", "ac-coral", "ac-pink"]);

const CSS = `path,line,polyline,rect,circle,ellipse,polygon{stroke-width:4px;stroke-linecap:round;stroke-linejoin:round}
.cv-bold{stroke-width:6px}.cv-thin{stroke-width:2.4px}
.cv-line,.cv-detail-line,.cv-muted-line,.cv-soft-line,.cv-ac-line,.cv-ac-soft-line,.cv-warm-line,.cv-warm-soft-line{fill:none;stroke:#00a0e5}
.cv-shape,.cv-ac-shape,.cv-warm-shape{fill:#032c42;stroke:#00a0e5}
.cv-solid,.cv-detail,.cv-muted,.cv-soft,.cv-ac,.cv-ac-soft,.cv-warm,.cv-warm-soft,.cv-white,.cv-cut{fill:#00a0e5}
.cv-text,.cv-mono{font-family:Helvetica,Arial,sans-serif;font-weight:700}`;

/** Onde o desenho realmente começa e termina, em fração do viewBox. */
async function inkBox(body, w, h) {
  const W = 320, H = Math.round((320 * h) / w);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${w} ${h}"><style>${CSS}</style>${body}</svg>`;
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * info.channels + 3] > 24) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  return { x0: x0 / info.width, x1: (x1 + 1) / info.width, y0: y0 / info.height, y1: (y1 + 1) / info.height };
}

async function checkFile(slug, format) {
  const path = new URL(`${slug}/${format}.svg`, DIR);
  const err = [];
  if (!existsSync(path)) return [`${format}.svg não existe`];
  const svg = readFileSync(path, "utf8");
  const [w, h] = FORMATS[format];

  if (Buffer.byteLength(svg) > MAX_BYTES) err.push(`${format}: ${Buffer.byteLength(svg)} bytes (máx ${MAX_BYTES})`);
  if (!svg.includes(`viewBox="0 0 ${w} ${h}"`)) err.push(`${format}: viewBox tem de ser "0 0 ${w} ${h}"`);

  for (const [re, msg] of [
    [/\b(?:fill|stroke)="#/, 'cor fixa (fill="#..." / stroke="#...")'],
    [/<defs\b/, "<defs>"],
    [/\bid="/, 'id="..."'],
    [/Gradient\b/, "degradê"],
    [/<filter\b|filter="/, "filtro"],
    [/<image\b/, "<image>"],
    [/\bstyle="/, 'style="..."'],
    [/stroke-width=/, "stroke-width (a espessura vem do CSS)"],
    [/<script\b/, "<script>"],
  ]) if (re.test(svg)) err.push(`${format}: proibido — ${msg}`);

  const root = svg.match(/<svg[^>]*>/)[0];
  const rootClass = root.match(/class="([^"]*)"/)?.[1]?.trim();
  if (rootClass && !ACCENTS.has(rootClass)) err.push(`${format}: classe na raiz "${rootClass}" — use uma de ${[...ACCENTS].join(", ")}`);

  const body = svg.slice(root.length).replace(/<\/svg>\s*$/, "");
  for (const m of body.matchAll(/class="([^"]*)"/g))
    for (const c of m[1].split(/\s+/).filter(Boolean))
      if (!CLASSES.has(c)) err.push(`${format}: classe desconhecida "${c}"`);

  // tamanho bruto; grupos com scale() aumentam o efetivo, por isso o mínimo é conservador
  const min = format === "wide" ? 22 : format === "card" ? 30 : 40;
  for (const m of body.matchAll(/<text[^>]*font-size="([\d.]+)"/g))
    if (Number(m[1]) < min) err.push(`${format}: font-size ${m[1]} (mínimo ${min})`);
  if (/<text\b(?![^>]*font-size)/.test(body)) err.push(`${format}: <text> sem font-size`);

  // geometria medida no desenho renderizado
  const box = await inkBox(body, w, h);
  if (!box) { err.push(`${format}: desenho vazio`); return err; }
  const pct = (v) => `${Math.round(v * 100)}%`;
  if (box.x0 < 0.015 || box.x1 > 0.985 || box.y0 < 0.015 || box.y1 > 0.985)
    err.push(`${format}: desenho encosta/sai da borda (x ${pct(box.x0)}–${pct(box.x1)}, y ${pct(box.y0)}–${pct(box.y1)})`);
  const [fw, fh] = FILL[format];
  if (box.x1 - box.x0 < fw) err.push(`${format}: ocupa só ${pct(box.x1 - box.x0)} da largura (mínimo ${pct(fw)}) — espaço desperdiçado`);
  if (box.y1 - box.y0 < fh) err.push(`${format}: ocupa só ${pct(box.y1 - box.y0)} da altura (mínimo ${pct(fh)}) — espaço desperdiçado`);
  // margens opostas iguais: é o que faz o desenho parecer alinhado
  const left = box.x0, right = 1 - box.x1, up = box.y0, down = 1 - box.y1;
  if (Math.abs(left - right) > 0.02)
    err.push(`${format}: margens laterais diferentes (${pct(left)} à esquerda, ${pct(right)} à direita) — desenho puxado para um lado`);
  if (Math.abs(up - down) > 0.02)
    err.push(`${format}: margens diferentes em cima (${pct(up)}) e embaixo (${pct(down)}) — desenho puxado para um lado`);

  return err;
}

const slugs = process.argv[2] ? [process.argv[2]] : readdirSync(DIR).filter((d) => !d.startsWith("."));
let bad = 0;
for (const slug of slugs) {
  const err = (await Promise.all(Object.keys(FORMATS).map((f) => checkFile(slug, f)))).flat();
  if (err.length) { bad++; console.log(`✗ ${slug}`); err.forEach((e) => console.log(`   ${e}`)); }
  else console.log(`✓ ${slug}`);
}
if (bad) { console.log(`\n${bad} post(s) fora do padrão.`); process.exit(1); }
console.log(`\nTudo certo (${slugs.length}).`);
