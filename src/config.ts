/** Configuração central do site — textos, navegação e links. */
export const SITE = {
  name: "Cesar Schutz",
  role: "Arquiteto de Solução",
  url: "https://cesarschutz.github.io",
  locale: "pt-BR",
  /** título da aba na home */
  homeTitle: "Cesar Schutz · Arquitetura de Software",
  /** frase do card de identidade da home */
  headline:
    "Artigos técnicos sobre arquitetura de software, sistemas distribuídos e engenharia Java.",
  /** meta description padrão (SEO e redes sociais) */
  description:
    "Artigos técnicos de Cesar Schutz, arquiteto de solução, sobre arquitetura de software, sistemas distribuídos e a plataforma Java.",
  topics: [
    "Arquitetura de Software",
    "Sistemas Distribuídos",
    "Java",
    "Observabilidade",
    "IA aplicada",
  ],
  avatar: "https://github.com/cesarschutz.png",
  github: "https://github.com/cesarschutz",
  license: {
    name: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/deed.pt-br",
  },
  /** posts por página na home (além do destaque) */
  pageSize: 12,
} as const;

export const NAV = [
  { label: "Artigos", href: "/archive/" },
  { label: "Java", href: "/java/" },
  { label: "Projetos", href: "/projects/" },
  { label: "Sobre", href: "/about/" },
] as const;
