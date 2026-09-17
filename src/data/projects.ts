import type { IconName } from "../utils/icons";

/** Projetos exibidos em /projects — adicionar um item basta. */
export interface Project {
  name: string;
  description: string;
  tags: string[];
  repoUrl?: string;
  demoUrl?: string;
  icon: IconName;
  color: string;
  /** Caminho público do screenshot, ex. "/projects/swagger-agent.webp". */
  image?: string;
  /** Data da última atualização (AAAA-MM-DD). */
  updated?: string;
}

export const projects: Project[] = [
  {
    name: "Swagger Agent",
    description:
      "Agente de IA que lê especificações OpenAPI/Swagger e permite operar qualquer API em linguagem natural. Inclui documentação e chat de demonstração.",
    tags: ["Java 21", "Spring AI", "OpenAPI"],
    repoUrl: "https://github.com/cesarschutz/swagger-agent",
    demoUrl: "https://cesarschutz.github.io/swagger-agent/",
    icon: "bot",
    color: "#a855f7",
    image: "/projects/swagger-agent.webp",
    updated: "2025-06-23",
  },
  {
    name: "BrainAPI",
    description:
      "Transforma especificações OpenAPI em ferramentas para agentes de IA com Google ADK e MCP Toolbox, levando a API até a linguagem natural.",
    tags: ["Java", "Google ADK", "MCP"],
    repoUrl: "https://github.com/cesarschutz/BrainAPI",
    demoUrl: "https://cesarschutz.github.io/BrainAPI/",
    icon: "brain",
    color: "#ec4899",
    image: "/projects/brainapi.webp",
    updated: "2025-06-09",
  },
  {
    name: "CSRFinance",
    description:
      "Sistema de finanças pessoais com dashboard, transações, relatórios em múltiplas visões, categorias, contas e investimentos.",
    tags: ["Angular 19", "TypeScript", "Chart.js"],
    repoUrl: "https://github.com/cesarschutz/CSRFinance",
    demoUrl: "https://cesarschutz.github.io/CSRFinance/",
    icon: "wallet",
    color: "#10b981",
    image: "/projects/csrfinance.webp",
    updated: "2026-03-14",
  },
  {
    name: "DEV NOTE",
    description:
      "Curadoria diária de notícias de desenvolvimento e arquitetura, com cada notícia explicada em camadas de profundidade.",
    tags: ["Angular 21", "Tailwind CSS", "Playwright"],
    demoUrl: "https://dev-note-phi.vercel.app",
    icon: "newspaper",
    color: "#2563eb",
    image: "/projects/dev-note.webp",
    updated: "2026-06-06",
  },
  {
    name: "cesarschutz.github.io",
    description:
      "Este site: blog técnico em Astro com busca própria, Expressive Code, KaTeX e design derivado do DEV NOTE. Publicado no GitHub Pages.",
    tags: ["Astro", "TypeScript", "GitHub Pages"],
    repoUrl: "https://github.com/cesarschutz/cesarschutz.github.io",
    demoUrl: "https://cesarschutz.github.io",
    icon: "globe",
    color: "#0ea5e9",
    image: "/projects/site.webp",
    updated: "2026-09-17",
  },
];
