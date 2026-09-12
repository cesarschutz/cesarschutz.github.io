import I18nKeys from "./src/locales/keys";
import type { Configuration } from "./src/types/config";

const YukinaConfig: Configuration = {
  title: "Cesar Schutz",
  subTitle: "Caderno Público — arquitetura, código e aprendizado contínuo",
  brandTitle: "Cesar Schutz",

  description:
    "Caderno Público de Cesar Schutz — arquitetura de solução, desenvolvimento de software e anotações de estudo.",

  site: "https://cesarschutz.github.io",

  locale: "pt-BR", // set for website language and date format

  navigators: [
    {
      nameKey: I18nKeys.nav_bar_home,
      href: "/",
    },
    {
      nameKey: I18nKeys.nav_bar_archive,
      href: "/archive",
    },
    {
      nameKey: I18nKeys.nav_bar_projects,
      href: "/projects",
    },
    {
      nameKey: I18nKeys.nav_bar_about,
      href: "/about",
    },
    {
      nameKey: I18nKeys.nav_bar_github,
      href: "https://github.com/cesarschutz",
    },
  ],

  username: "Cesar Schutz",
  sign: "Arquitetura, código e aprendizado contínuo.",
  avatarUrl: "https://github.com/cesarschutz.png",
  socialLinks: [
    {
      icon: "line-md:github-loop",
      link: "https://github.com/cesarschutz",
    },
    // TODO: descomente e ajuste quando quiser exibir o LinkedIn
    // {
    //   icon: "mingcute:linkedin-line",
    //   link: "https://www.linkedin.com/in/SEU-USUARIO",
    // },
  ],
  maxSidebarCategoryChip: 6, // It is recommended to set it to a common multiple of 2 and 3
  maxSidebarTagChip: 12,
  maxFooterCategoryChip: 6,
  maxFooterTagChip: 24,

  banners: [
    "/banners/tech-nodes.svg",
    "/banners/tech-circuit.svg",
    "/banners/tech-layers.svg",
  ],

  slugMode: "RAW", // 'RAW' | 'HASH'

  license: {
    name: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },

  // WIP functions
  bannerStyle: "LOOP", // 'loop' | 'static' | 'hidden'
};

export default YukinaConfig;
