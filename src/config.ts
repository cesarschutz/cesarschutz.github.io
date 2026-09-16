/** Configuração central do site — textos, navegação e links. */
import type { IconName } from "./utils/icons";

export const SITE = {
  name: "Cesar Schutz",
  role: "Arquiteto de Solução",
  url: "https://cesarschutz.github.io",
  locale: "pt-BR",
  /** título da aba na home */
  homeTitle: "Cesar Schutz · Arquitetura de Software",
  /** frase do card de identidade da home e do rodapé */
  headline:
    "Análises sobre arquitetura de software, sistemas distribuídos e o ecossistema Java, a partir de problemas reais e das decisões que eles exigem.",
  /** meta description padrão (SEO e redes sociais) */
  description:
    "Artigos de Cesar Schutz, arquiteto de solução, sobre arquitetura de software, sistemas distribuídos e o ecossistema Java.",
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

/** Áreas de atuação — etiquetas do card da home e cards da página Sobre. */
export const AREAS: { icon: IconName; color: string; title: string; text: string }[] = [
  {
    icon: "layers",
    color: "#6366f1",
    title: "Arquitetura de sistemas",
    text: "Desenho de soluções, integrações e as decisões que custam caro para reverter.",
  },
  {
    icon: "network",
    color: "#818cf8",
    title: "Sistemas distribuídos",
    text: "Concorrência, mensageria, consistência e resiliência em produção.",
  },
  {
    icon: "coffee",
    color: "#f8981d",
    title: "Java e JVM",
    text: "Da linguagem ao runtime, com o ecossistema Spring e a evolução da plataforma.",
  },
  {
    icon: "code",
    color: "#22c55e",
    title: "Engenharia de software",
    text: "Código sustentável: design, testes e manutenção ao longo do tempo.",
  },
  {
    icon: "sparkles",
    color: "#a855f7",
    title: "IA aplicada",
    text: "Agentes, LLMs e IA como ferramenta de engenharia no dia a dia.",
  },
];
