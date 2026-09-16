import { defineConfig } from "astro/config";
import { existsSync } from "node:fs";
import { ABSORBED } from "./src/data/java.ts";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import { rehypeTableWrap } from "./src/plugins/rehype-table-wrap.mjs";

export default defineConfig({
  site: "https://cesarschutz.github.io",
  trailingSlash: "ignore",
  // a antiga página de exercícios virou posts normais
  redirects: {
    "/exercicios": "/",
    // série do Java só com LTS: versões intermediárias apontam para a seção na LTS
    ...Object.fromEntries(
      Object.entries(ABSORBED)
        .filter(([v]) => !existsSync(`./src/content/posts/java-${v}.md`))
        .map(([v, lts]) => [`/posts/java-${v}`, `/posts/java-${lts}/#java-${v}`]),
    ),
  },
  integrations: [
    // Expressive Code precisa vir antes do MDX
    expressiveCode({
      themes: ["github-dark", "github-light"],
      plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
      themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
      useDarkModeMediaQuery: false,
      defaultProps: { showLineNumbers: false },
      styleOverrides: {
        borderRadius: "12px",
        borderColor: "var(--border)",
        codeFontFamily: "var(--font-mono)",
        codeFontSize: "0.86rem",
        uiFontFamily: "var(--font-sans)",
        frames: { shadowColor: "transparent" },
      },
    }),
    mdx(),
    sitemap(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkReadingTime, remarkMath],
      rehypePlugins: [
        rehypeSlug,
        rehypeKatex,
        rehypeTableWrap,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "append",
            properties: { className: ["heading-anchor"], ariaLabel: "Link para esta seção" },
            content: { type: "text", value: "#" },
          },
        ],
      ],
    }),
  },
});
