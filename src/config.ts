/** Configuração central do site — textos, navegação e links. */
import type { IconName } from "./utils/icons";

export const SITE = {
  name: "Cesar Schutz",
  role: "Arquiteto de Soluções",
  url: "https://cesarschutz.com.br",
  locale: "pt-BR",
  /** título da aba na home */
  homeTitle: "Cesar Schutz · Arquitetura e engenharia de software",
  /** frase do rodapé e do card de identidade em telas pequenas */
  headline:
    "O que eu estudo virando artigo — arquitetura, código, Java, IA e o que mais aparecer.",
  /** apresentação em primeira pessoa, no card de identidade da home */
  intro:
    "Publico aqui o que ando estudando — lançamento do Java, código, arquitetura, IA, o que me despertar interesse. Quando o estudo rende algo que vale guardar, vira artigo.",
  /** meta description padrão (SEO e redes sociais) */
  description:
    "Cesar Schutz, arquiteto de soluções. Artigos sobre arquitetura de software, engenharia de software, Java e IA — o que eu estudo, revisado por mim e com código testado.",
  avatar: "https://github.com/cesarschutz.png",
  github: "https://github.com/cesarschutz",
  /** contatos opcionais — vazio = não aparece no site */
  linkedin: "https://www.linkedin.com/in/cesar-schutz-10341a21/",
  email: "",
  license: {
    name: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/deed.pt-br",
  },
  /** posts por página na home (além do destaque) */
  pageSize: 12,
} as const;

/**
 * Estatísticas de visita (opcional). Com GoatCounter: crie a conta em
 * https://www.goatcounter.com e coloque aqui o código (ex.: "cesarschutz").
 */
export const ANALYTICS = {
  goatcounter: "",
};

/**
 * Comentários com Giscus (opcional, usa as Discussions do GitHub).
 * Passos: habilitar Discussions no repositório, instalar o app Giscus e copiar
 * os valores gerados em https://giscus.app. Vazio = comentários desligados.
 */
export const COMMENTS = {
  repo: "",
  repoId: "",
  category: "",
  categoryId: "",
};

/**
 * Trajetória profissional exibida em /about (opcional). Mais recente primeiro.
 * Ex.: { period: "2022 – atual", role: "Arquiteto de Soluções", company: "Empresa", text: "…" }
 */
export const EXPERIENCE: { period: string; role: string; company: string; text?: string }[] = [];

export const NAV = [
  { label: "Artigos", href: "/archive/" },
  { label: "Séries", href: "/series/" },
  { label: "Projetos", href: "/projects/" },
  { label: "Sobre", href: "/about/" },
] as const;

/** Áreas de atuação — etiquetas do card da home e cards da página Sobre. */
export const AREAS: { icon: IconName; color: string; title: string; text: string }[] = [
  {
    icon: "layers",
    color: "#6366f1",
    title: "Arquitetura de software",
    text: "Como o sistema é dividido por dentro: limites, dependências e as decisões caras de reverter.",
  },
  {
    icon: "network",
    color: "#818cf8",
    title: "Arquitetura de soluções",
    text: "Ligar a necessidade do negócio à escolha técnica, entre sistemas que já existem e prazos que já estão de pé.",
  },
  {
    icon: "code",
    color: "#22c55e",
    title: "Engenharia de software",
    text: "Do código ao que o mantém vivo: design, testes, operação e manutenção ao longo do tempo.",
  },
  {
    icon: "sparkles",
    color: "#a855f7",
    title: "IA",
    text: "Agentes, LLMs e IA usada como ferramenta de engenharia — inclusive na produção deste site.",
  },
];
