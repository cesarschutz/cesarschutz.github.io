/**
 * Capas dos posts: três SVGs por post em src/covers/<slug>/ (wide 4:1, card 2:1,
 * square 1:1), embutidos no HTML. As cores vêm das classes cv-* (ver global.css).
 */
const files = import.meta.glob("/src/covers/*/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type CoverFormat = "wide" | "card" | "square" | "featured";

export const COVER_SIZES: Record<CoverFormat, [number, number]> = {
  wide: [1600, 400],
  card: [1200, 600],
  square: [800, 800],
  featured: [800, 1000],
};

/** Segunda cor da capa; o SVG escolhe pela classe na raiz (<svg class="ac-violet">). */
export const ACCENTS = {
  amber: "#f5a04a",
  violet: "#a889f7",
  green: "#4fd69a",
  coral: "#f4706b",
  pink: "#f272b8",
} as const;

export function coverAccent(svg: string): string {
  const name = svg.match(/<svg[^>]*\bclass="[^"]*\bac-(\w+)/)?.[1] as keyof typeof ACCENTS | undefined;
  return (name && ACCENTS[name]) || ACCENTS.amber;
}

export function rawCover(slug: string, format: CoverFormat): string | undefined {
  const file = files[`/src/covers/${slug}/${format}.svg`];
  // só o post em destaque tem a capa retrato; os outros usam a quadrada
  if (!file && format === "featured") return files[`/src/covers/${slug}/square.svg`];
  return file;
}

/** SVG pronto para embutir: sem comentários, decorativo e sem corte. */
export function inlineCover(slug: string, format: CoverFormat): string | undefined {
  const raw = rawCover(slug, format);
  if (!raw) return undefined;
  return raw
    .replace(/<\?xml[^>]*>/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+xmlns="[^"]*"/, "")
    .replace(/>\s+</g, "><")
    .replace(/<svg\b/, '<svg aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet"')
    .trim();
}

/* ───────── PNG de compartilhamento: mesmas regras do CSS com valores fixos ───────── */

/** Fundo da capa (degradê, brilho e pontos de luz) para um SVG avulso de 1200×630. */
export const OG_BACKGROUND = `
  <defs>
    <linearGradient id="og-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#01131b"/><stop offset="0.55" stop-color="#04283d"/><stop offset="1" stop-color="#01131b"/>
    </linearGradient>
    <radialGradient id="og-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#00a0e5" stop-opacity="0.22"/><stop offset="1" stop-color="#00a0e5" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#og-bg)"/>
  <ellipse cx="600" cy="315" rx="600" ry="400" fill="url(#og-glow)"/>
  <g fill="#7fd4f5" fill-opacity="0.5">
    <circle cx="60" cy="76" r="2.5"/><circle cx="1140" cy="63" r="2"/><circle cx="1152" cy="554" r="2.5"/>
    <circle cx="48" cy="567" r="2"/><circle cx="840" cy="32" r="1.8"/><circle cx="336" cy="598" r="1.8"/>
  </g>`;

/** CSS das classes cv-* com cores fixas (para renderizar a capa fora do site). */
export function coverStyle(strokePx = 3.4, accent: string = ACCENTS.amber): string {
  const tint = mix(accent, "#01131b", 0.14);
  return `
  .cv-ac-line,.cv-warm-line{fill:none;stroke:${accent}}
  .cv-ac-shape,.cv-warm-shape{fill:${tint};stroke:${accent}}
  .cv-ac,.cv-warm{fill:${accent}}
  .cv-ac-soft,.cv-warm-soft{fill:${accent};fill-opacity:.16}
  .cv-ac-soft-line,.cv-warm-soft-line{fill:none;stroke:${accent};stroke-opacity:.3}
  path,line,polyline,rect,circle,ellipse,polygon{stroke-width:${strokePx}px;stroke-linecap:round;stroke-linejoin:round}
  .cv-bold{stroke-width:${strokePx * 1.5}px}
  .cv-thin{stroke-width:${strokePx * 0.6}px}
  .cv-dash{stroke-dasharray:${strokePx * 2.2} ${strokePx * 2.6}}
  .cv-line{fill:none;stroke:#00a0e5}
  .cv-shape{fill:#032c42;stroke:#00a0e5}
  .cv-solid{fill:#00a0e5}
  .cv-detail{fill:#7fd4f5}
  .cv-detail-line{fill:none;stroke:#7fd4f5}
  .cv-muted{fill:#7fd4f5;fill-opacity:.45}
  .cv-muted-line{fill:none;stroke:#7fd4f5;stroke-opacity:.4}
  .cv-soft{fill:#00a0e5;fill-opacity:.14}
  .cv-soft-line{fill:none;stroke:#00a0e5;stroke-opacity:.3}
  .cv-white{fill:#ffffff;fill-opacity:.78}
  .cv-cut{fill:#022131}
  .cv-text{font-family:Inter,Helvetica,Arial,sans-serif;font-weight:700}
  .cv-mono{font-family:'JetBrains Mono',Menlo,monospace;font-weight:700}`;
}

/** Mistura duas cores hex (peso de `a`), para o tom escuro do acento no PNG. */
function mix(a: string, b: string, weight: number): string {
  const to = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = to(a);
  const [r2, g2, b2] = to(b);
  const ch = (x: number, y: number) => Math.round(x * weight + y * (1 - weight)).toString(16).padStart(2, "0");
  return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`;
}
