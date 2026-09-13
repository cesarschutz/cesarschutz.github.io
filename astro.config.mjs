import { defineConfig } from "astro/config";

import icon from "astro-icon";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import svelte from "@astrojs/svelte";
import swup from "@swup/astro";
import mdx from "@astrojs/mdx";

import expressiveCode from "astro-expressive-code";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";

import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkMath from "remark-math";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import { remarkMermaid } from "./src/plugins/remark-mermaid.mjs";

import YukinaConfig from "./yukina.config";

// https://astro.build/config
export default defineConfig({
  site: YukinaConfig.site,
  integrations: [
    tailwind(),
    svelte(),
    icon(),
    // Expressive Code precisa vir antes do MDX
    expressiveCode({
      themes: ["github-dark", "github-light"],
      plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
      themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
      useDarkModeMediaQuery: false,
      defaultProps: {
        showLineNumbers: false,
      },
      styleOverrides: {
        borderRadius: "0.75rem",
        codeFontFamily: "var(--code-font)",
        uiFontFamily: "var(--primary-font)",
      },
    }),
    mdx(),
    swup({
      theme: false,
      containers: ["main", "footer", ".banner-inner"],
      smoothScrolling: true,
      progress: true,
      cache: true,
      preload: true,
      updateHead: true,
      updateBodyClass: false,
      globalInstance: true,
    }),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime, remarkMath, remarkMermaid],
    rehypePlugins: [
      rehypeSlug,
      rehypeKatex,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "prepend",
        },
      ],
    ],
  },
});
