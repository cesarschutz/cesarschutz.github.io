/**
 * Lista de projetos exibidos em /projects.
 * Para adicionar um projeto, basta acrescentar um item aqui — a página se
 * monta sozinha. Campos opcionais podem ser omitidos.
 */
export interface Project {
  /** Nome do projeto */
  name: string;
  /** Descrição curta (1–2 frases) */
  description: string;
  /** Tecnologias/temas — viram chips no card */
  tags: string[];
  /** Link do repositório (opcional) */
  repoUrl?: string;
  /** Link de demo/produção (opcional) */
  demoUrl?: string;
  /** Emoji exibido como ícone do card */
  emoji?: string;
}

// TODO: substitua os placeholders pelos seus projetos reais
export const projects: Project[] = [
  {
    name: "Projeto Exemplo 1",
    description:
      "Descrição placeholder de um projeto. Troque por algo real: o que faz, qual problema resolve e o que você aprendeu construindo.",
    tags: ["Java", "Spring Boot", "PostgreSQL"],
    repoUrl: "https://github.com/cesarschutz",
    emoji: "⚙️",
  },
  {
    name: "Projeto Exemplo 2",
    description:
      "Outro placeholder. Dica: projetos com demo online geram mais interesse — inclua o link quando tiver.",
    tags: ["Arquitetura", "Eventos", "Kafka"],
    repoUrl: "https://github.com/cesarschutz",
    demoUrl: "https://cesarschutz.github.io",
    emoji: "📡",
  },
  {
    name: "Este site",
    description:
      "Meu site pessoal: Astro + tema Yukina adaptado com as cores do Imortal Tricolor, Expressive Code, MDX e diagramas Mermaid. Publicado no GitHub Pages.",
    tags: ["Astro", "TypeScript", "GitHub Pages"],
    repoUrl: "https://github.com/cesarschutz/cesarschutz.github.io",
    demoUrl: "https://cesarschutz.github.io",
    emoji: "🔵⚫⚪",
  },
];
