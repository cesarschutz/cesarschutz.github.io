/**
 * Converte a apresentação (.pptx) e o infográfico do NotebookLM no material leve
 * que o site publica: WebP em public/posts/<slug>/ e uma entrada em src/data/decks.json.
 *
 *   node scripts/deck-to-web.mjs <slug> --deck <arquivo.pptx> --titulo "…" [--infografico <img.png>]
 *
 * Os slides do NotebookLM são imagens inteiras (não há texto no arquivo), por isso
 * viram imagem mesmo — com alt genérico e o artigo continuando a valer por si só.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const args = process.argv.slice(2);
const slug = args[0];
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i > 0 ? args[i + 1] : undefined;
};
if (!slug || !opt("deck")) {
  console.error('uso: node scripts/deck-to-web.mjs <slug> --deck <a.pptx> --titulo "…" [--infografico <img>]');
  process.exit(1);
}

const SLIDE_W = 1376; // largura nativa das imagens do NotebookLM; ampliar não acrescenta nada
const INFO_W = 2000;
const outDir = `public/posts/${slug}`;
const deckDir = `${outDir}/deck`;

/** Slides na ordem certa: cada slide aponta para a sua imagem pelo arquivo de relações. */
function slideImages(pptx) {
  const tmp = `/tmp/deck-${slug}-${Date.now()}`;
  mkdirSync(tmp, { recursive: true });
  execFileSync("unzip", ["-qq", "-o", pptx, "-d", tmp]);
  const order = readFileSync(`${tmp}/ppt/presentation.xml`, "utf8");
  const relsRoot = readFileSync(`${tmp}/ppt/_rels/presentation.xml.rels`, "utf8");
  const slideFiles = [...order.matchAll(/<p:sldId[^>]*r:id="([^"]+)"/g)].map((m) => {
    const rel = relsRoot.match(new RegExp(`Id="${m[1]}"[^>]*Target="([^"]+)"`));
    return rel[1].replace(/^\.\.\//, "").replace(/^slides\//, "slides/");
  });
  const images = slideFiles.map((f) => {
    const name = f.split("/").pop();
    const rels = readFileSync(`${tmp}/ppt/slides/_rels/${name}.rels`, "utf8");
    const img = rels.match(/Target="\.\.\/media\/([^"]+)"/);
    if (!img) throw new Error(`slide sem imagem: ${name}`);
    return `${tmp}/ppt/media/${img[1]}`;
  });
  return { images, tmp };
}

const { images, tmp } = slideImages(opt("deck"));
rmSync(deckDir, { recursive: true, force: true });
mkdirSync(deckDir, { recursive: true });

let total = 0;
let dim = null;
for (const [i, src] of images.entries()) {
  const out = `${deckDir}/${String(i + 1).padStart(2, "0")}.webp`;
  const info = await sharp(src).resize({ width: SLIDE_W, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  dim ??= { largura: info.width, altura: info.height };
  total += info.size;
}
rmSync(tmp, { recursive: true, force: true });

const entry = { titulo: opt("titulo") ?? "Apresentação", slides: images.length, ...dim };

if (opt("infografico")) {
  const out = `${outDir}/resumo.webp`;
  const info = await sharp(opt("infografico")).resize({ width: INFO_W, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  entry.infografico = { largura: info.width, altura: info.height };
  total += info.size;
}

const manifest = existsSync("src/data/decks.json") ? JSON.parse(readFileSync("src/data/decks.json", "utf8")) : {};
manifest[slug] = entry;
writeFileSync("src/data/decks.json", JSON.stringify(manifest, null, 2) + "\n");

console.log(`${slug}: ${entry.slides} slides${entry.infografico ? " + infográfico" : ""} — ${(total / 1024 / 1024).toFixed(1)} MB (origem: ${(readFileSync(opt("deck")).length / 1024 / 1024).toFixed(0)} MB)`);
