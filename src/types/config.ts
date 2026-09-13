import type I18nKeys from "../locales/keys";

interface Configuration {
  title: string;
  subTitle: string;
  brandTitle: string;

  description: string;

  site: string;

  locale: "en" | "zh-CN" | "pt-BR";

  navigators: { nameKey: I18nKeys; href: string }[];

  username: string;
  sign: string;
  avatarUrl: string;

  /** Linha pequena em caps acima do nome no hero da home (ex.: cargo) */
  heroRole?: string;
  /** Áreas de atuação exibidas abaixo do subtítulo no hero e no rodapé */
  heroTopics?: string[];

  socialLinks: { icon: string; link: string }[];

  maxSidebarCategoryChip: number;
  maxSidebarTagChip: number;
  maxFooterCategoryChip: number;
  maxFooterTagChip: number;

  banners: string[];

  slugMode: "HASH" | "RAW";

  license: {
    name: string;
    url: string;
  };

  bannerStyle: "LOOP";
}

export type { Configuration };
