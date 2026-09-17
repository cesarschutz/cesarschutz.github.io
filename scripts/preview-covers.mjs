// Pré-visualização das capas de um post (3 formatos × tema escuro/claro) em PNG.
// Uso: node scripts/preview-covers.mjs <slug> [saida.png]
// Requer playwright-core e Chrome instalados (ferramenta local, fora do build).
import { readFileSync, existsSync } from "node:fs";

const [slug, out = `/tmp/cover-${slug}.png`] = process.argv.slice(2);
const pwPath = process.env.PLAYWRIGHT_CORE ?? "playwright-core";
const { chromium } = await import(pwPath);

const md = readFileSync(`src/content/posts/${slug}.md`, "utf8");
const category = md.match(/^category:\s*(.+)$/m)?.[1]?.trim();
const series = md.match(/^series:\s*(.+)$/m)?.[1]?.trim();
const taxonomy = readFileSync("src/utils/taxonomy.ts", "utf8");
const seriesFile = readFileSync("src/data/series.ts", "utf8");
let color = "#64748b";
if (series) color = seriesFile.match(new RegExp(`key: "${series}"[\\s\\S]*?color: "(#[0-9a-f]{6})"`, "i"))?.[1] ?? color;
else if (category) color = taxonomy.match(new RegExp(`${category}: \\{\\s*color: "(#[0-9a-f]{6})"`, "i"))?.[1] ?? color;

const css = readFileSync("src/styles/global.css", "utf8");
const coverCss = css.slice(css.indexOf("/* ───────── Capas dos posts"));
const svg = (f) => {
  const p = `src/covers/${slug}/${f}.svg`;
  return existsSync(p) ? readFileSync(p, "utf8").replace(/<svg\b/, '<svg preserveAspectRatio="xMidYMid meet"') : "<b style='color:red'>faltando</b>";
};
const block = (theme) => `
<div data-theme="${theme}" class="t ${theme}">
  <div class="wide"><span class="cover">${svg("wide")}</span></div>
  <div class="row">
    <div class="card"><span class="cover">${svg("card")}</span></div>
    <div class="square"><span class="cover">${svg("square")}</span></div>
    <div class="thumb"><span class="cover">${svg("square")}</span></div>
    <div class="feat"><span class="cover">${svg("square")}</span></div>
  </div>
</div>`;
const html = `<!doctype html><html data-theme="dark"><head><style>
:root{--font-sans:Inter,-apple-system,Helvetica,Arial,sans-serif;--font-mono:"JetBrains Mono",Menlo,monospace;--ease-out:ease}
${coverCss}
body{margin:0;padding:16px;background:#777;font:12px sans-serif}
.t{padding:14px;border-radius:12px;margin-bottom:14px}.dark{background:#000}.light{background:#f5f7fb}
.wide{aspect-ratio:4/1;width:1400px;border-radius:12px;overflow:hidden;margin-bottom:12px}
.row{display:flex;gap:12px;align-items:flex-start}
.card{aspect-ratio:2/1;width:440px;border-radius:12px;overflow:hidden}
.square{aspect-ratio:1;width:210px;border-radius:12px;overflow:hidden}
.thumb{aspect-ratio:1;width:84px;border-radius:10px;overflow:hidden}
.feat{aspect-ratio:1;width:420px;border-radius:12px;overflow:hidden}
</style></head><body>${block("dark")}${block("light")}</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
await page.setContent(html);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
