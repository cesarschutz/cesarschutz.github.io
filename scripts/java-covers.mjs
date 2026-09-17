// Gera as capas da série Java (wide, card, square) no padrão fixo:
// xícara + "JAVA NN" + selo LTS. Datas, LTS anterior e versões já lançadas
// vêm de src/data/java.ts. Uso: node scripts/java-covers.mjs <versão>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const version = Number(process.argv[2]);
const data = readFileSync("src/data/java.ts", "utf8");
const rows = [...data.matchAll(/\{\s*version:\s*(\d+),\s*release:\s*"([^"]+)",\s*covers:\s*"([^"]+)"(,\s*upcoming:\s*true)?/g)].map((m) => ({
  version: +m[1],
  release: m[2],
  covers: m[3],
  upcoming: Boolean(m[4]),
}));
const lts = rows.find((r) => r.version === version);
if (!lts) {
  console.error(`versão ${version} não encontrada em JAVA_LTS (src/data/java.ts)`);
  process.exit(1);
}
const prev = rows.map((r) => r.version).filter((v) => v < version).sort((a, b) => b - a)[0];
const from = prev ?? version - 3;
// versões intermediárias; na LTS futura, só as citadas em "covers" já saíram
const released = new Set(lts.upcoming ? [...lts.covers.matchAll(/\d+/g)].map((m) => +m[0]) : []);
const between = Array.from({ length: version - from - 1 }, (_, i) => from + 1 + i).map((v) => ({
  v,
  out: !lts.upcoming || released.has(v),
}));
const date = lts.release.replace("/", " ").toUpperCase();

const cup = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path class="cv-detail-line" d="M75 -48 C58 -80 92 -100 75 -132"/>
    <path class="cv-detail-line" d="M155 -48 C138 -80 172 -100 155 -136"/>
    <path class="cv-shape cv-bold" d="M0 0 H240 V120 a60 60 0 0 1 -60 60 H60 a60 60 0 0 1 -60 -60 Z"/>
    <path class="cv-line cv-bold" d="M240 28 h42 a52 52 0 0 1 0 104 h-42"/>
    <path class="cv-muted-line" d="M-25 222 h290"/>
    <text class="cv-mono cv-detail" x="120" y="108" font-size="56" text-anchor="middle">&lt;/&gt;</text>
  </g>`;

const label = (cx, y, s, withJava = true) => {
  const pill = lts.upcoming
    ? `<rect class="cv-line cv-dash" x="-125" y="250" width="250" height="54" rx="27"/>
    <text class="cv-text cv-detail" x="0" y="286" font-size="28" text-anchor="middle" letter-spacing="2">PRÓXIMA LTS</text>`
    : `<rect class="cv-solid" x="-65" y="250" width="130" height="54" rx="27"/>
    <text class="cv-text cv-cut" x="0" y="288" font-size="34" text-anchor="middle" letter-spacing="1">LTS</text>`;
  return `
  <g transform="translate(${cx} ${y}) scale(${s})">
    ${withJava ? `<text class="cv-text cv-white" x="0" y="44" font-size="56" text-anchor="middle" letter-spacing="16">JAVA</text>` : ""}
    <text class="cv-text cv-solid" x="0" y="228" font-size="220" font-weight="800" text-anchor="middle" letter-spacing="-4">${version}</text>
    ${pill}
  </g>`;
};

// complemento à esquerda do wide: o caminho desde a LTS anterior
const path = (x0, x1, y) => {
  const start = prev ? x0 + 34 : x0;
  const step = (x1 - start - 90) / Math.max(between.length, 1);
  const marks = between
    .map((b, i) => {
      const x = start + 40 + step * i + step / 2;
      const dot = b.out
        ? `<circle class="cv-solid" cx="${x}" cy="${y}" r="10"/>`
        : `<circle class="cv-shape cv-dash" cx="${x}" cy="${y}" r="12"/>`;
      return `${dot}<text class="cv-mono ${b.out ? "cv-detail" : "cv-muted"}" x="${x}" y="${y + 52}" font-size="24" text-anchor="middle">${b.v}</text>`;
    })
    .join("");
  const first = prev
    ? `<circle class="cv-shape" cx="${x0}" cy="${y}" r="34"/><text class="cv-mono cv-detail" x="${x0}" y="${y + 10}" font-size="28" text-anchor="middle">${prev}</text>`
    : "";
  return `
  <line class="cv-muted-line" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>
  <path class="cv-muted-line" d="M${x1 - 14} ${y - 12} L${x1} ${y} L${x1 - 14} ${y + 12}"/>
  ${first}${marks}`;
};

// complemento à direita do wide: data de lançamento (ou previsão)
const calendar = (x, y) => `
  <g transform="translate(${x} ${y})">
    <rect class="cv-shape" x="0" y="0" width="96" height="96" rx="16"/>
    <line class="cv-line" x1="0" y1="30" x2="96" y2="30"/>
    <line class="cv-detail-line cv-bold" x1="26" y1="-12" x2="26" y2="12"/>
    <line class="cv-detail-line cv-bold" x1="70" y1="-12" x2="70" y2="12"/>
    ${[0, 1, 2].map((c) => [0, 1].map((r) => `<circle class="${lts.upcoming && c === 2 && r === 1 ? "cv-solid" : "cv-muted"}" cx="${24 + c * 24}" cy="${52 + r * 22}" r="5"/>`).join("")).join("")}
    <text class="cv-text cv-muted" x="124" y="34" font-size="22" letter-spacing="3">${lts.upcoming ? "PREVISTO" : "LANÇADO"}</text>
    <text class="cv-mono cv-detail" x="122" y="84" font-size="44">${date}</text>
  </g>`;

const files = {
  wide: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 400">
  ${path(120, 500, 200)}
  ${cup(575, 180, 0.66)}
  ${label(975, 56, 0.88)}
  ${calendar(1165, 152)}
</svg>`,
  card: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600">
  ${cup(235, 262, 0.9)}
  ${label(830, 104, 1.14)}
</svg>`,
  square: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  ${cup(255, 200, 0.88)}
  ${label(400, 380, 1.1, false)}
</svg>`,
};

const dir = `src/covers/java-${version}`;
mkdirSync(dir, { recursive: true });
for (const [name, svg] of Object.entries(files)) writeFileSync(`${dir}/${name}.svg`, svg.replace(/\n\s*\n/g, "\n") + "\n");
console.log(`capas geradas em ${dir}/`);
