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
  /** Link do repositório (opcional — omita em projetos privados) */
  repoUrl?: string;
  /** Link de demo/produção (opcional) */
  demoUrl?: string;
  /** Emoji exibido como ícone do card */
  emoji?: string;
}

export const projects: Project[] = [
  {
    name: "Swagger Agent",
    description:
      "Converse com qualquer API: agente de IA que lê especificações OpenAPI/Swagger e permite operá-las em linguagem natural. Com documentação e chat de demonstração online.",
    tags: ["Java 21", "Spring AI", "OpenAPI"],
    repoUrl: "https://github.com/cesarschutz/swagger-agent",
    demoUrl: "https://cesarschutz.github.io/swagger-agent/",
    emoji: "🤖",
  },
  {
    name: "BrainAPI",
    description:
      "Transforma specs OpenAPI em tools para agentes de IA usando Google ADK e MCP Toolbox — o caminho da sua API até a linguagem natural.",
    tags: ["Java", "Google ADK", "MCP"],
    repoUrl: "https://github.com/cesarschutz/BrainAPI",
    demoUrl: "https://cesarschutz.github.io/BrainAPI/",
    emoji: "🧠",
  },
  {
    name: "CSRFinance",
    description:
      "Sistema de finanças pessoais com dashboard, transações, relatórios em múltiplas visões, categorias, contas e investimentos.",
    tags: ["Angular 19", "TypeScript", "Chart.js"],
    repoUrl: "https://github.com/cesarschutz/CSRFinance",
    demoUrl: "https://cesarschutz.github.io/CSRFinance/",
    emoji: "💰",
  },
  {
    name: "DEV NOTE",
    description:
      "Notícias técnicas que viram aprendizado: transforma o noticiário de desenvolvimento e arquitetura em notas de estudo. Em evolução ativa.",
    tags: ["Angular 21", "Tailwind CSS", "Playwright"],
    demoUrl: "https://dev-note-phi.vercel.app",
    emoji: "📰",
  },
  {
    name: "Caderno Público",
    description:
      "Este site: Astro + tema Yukina adaptado com as cores do Imortal Tricolor, Expressive Code, MDX e diagramas Mermaid. Publicado no GitHub Pages.",
    tags: ["Astro", "TypeScript", "GitHub Pages"],
    repoUrl: "https://github.com/cesarschutz/cesarschutz.github.io",
    demoUrl: "https://cesarschutz.github.io",
    emoji: "🔵⚫⚪",
  },
];
