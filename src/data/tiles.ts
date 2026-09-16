import { ICONS } from "../utils/icons";

/**
 * Ícones que sobem no card de identidade da home (animação herdada do
 * DEV NOTE). São as tecnologias e temas que aparecem nos artigos.
 * - kind "logo": imagem remota (CDNs devicon / simple-icons)
 * - kind "topic": ícone de traço tingido com a cor
 */
export interface Tile {
  kind: "logo" | "topic";
  name: string;
  color: string;
  src?: string;
  svg?: string;
  /** logo branco: inverte no tema claro */
  invertOnLight?: boolean;
}

const devicon = (path: string) => `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${path}`;
const simple = (slug: string, color: string) => `https://cdn.simpleicons.org/${slug}/${color}`;

export const TILES: Tile[] = [
  { kind: "logo", name: "Java", color: "#f8981d", src: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/java.svg" },
  { kind: "logo", name: "Spring", color: "#6DB33F", src: devicon("spring/spring-original.svg") },
  { kind: "logo", name: "Spring Boot", color: "#6DB33F", src: simple("springboot", "6DB33F") },
  { kind: "logo", name: "Gradle", color: "#07a8cb", src: simple("gradle", "07a8cb") },
  { kind: "logo", name: "Kubernetes", color: "#326CE5", src: devicon("kubernetes/kubernetes-plain.svg") },
  { kind: "logo", name: "Docker", color: "#2496ED", src: devicon("docker/docker-original.svg") },
  { kind: "logo", name: "PostgreSQL", color: "#336791", src: devicon("postgresql/postgresql-original.svg") },
  { kind: "logo", name: "Redis", color: "#DC382D", src: devicon("redis/redis-original.svg") },
  { kind: "logo", name: "Kafka", color: "#b0b0b0", src: simple("apachekafka", "ffffff"), invertOnLight: true },
  { kind: "logo", name: "RabbitMQ", color: "#FF6600", src: simple("rabbitmq", "FF6600") },
  { kind: "logo", name: "OpenTelemetry", color: "#F5A800", src: simple("opentelemetry", "F5A800") },
  { kind: "logo", name: "Grafana", color: "#F46800", src: simple("grafana", "F46800") },
  { kind: "logo", name: "Prometheus", color: "#E6522C", src: simple("prometheus", "E6522C") },
  { kind: "logo", name: "Datadog", color: "#632CA6", src: simple("datadog", "632CA6") },
  { kind: "logo", name: "Terraform", color: "#7B42BC", src: devicon("terraform/terraform-original.svg") },
  { kind: "logo", name: "Actions", color: "#2088FF", src: simple("githubactions", "2088FF") },
  { kind: "logo", name: "JWT", color: "#d63aff", src: simple("jsonwebtokens", "d63aff") },
  { kind: "logo", name: "Keycloak", color: "#4D9CF8", src: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/keycloak.svg" },
  { kind: "logo", name: "Anthropic", color: "#d97706", src: simple("anthropic", "ffffff"), invertOnLight: true },
  { kind: "topic", name: "Arquitetura", color: "#6366f1", svg: ICONS.layers },
  { kind: "topic", name: "Distribuídos", color: "#818cf8", svg: ICONS.network },
  { kind: "topic", name: "Observabilidade", color: "#f97316", svg: ICONS.activity },
  { kind: "topic", name: "Dados", color: "#0ea5e9", svg: ICONS.database },
  { kind: "topic", name: "Segurança", color: "#ef4444", svg: ICONS.shield },
  { kind: "topic", name: "IA aplicada", color: "#a855f7", svg: ICONS.sparkles },
  { kind: "topic", name: "Código", color: "#22c55e", svg: ICONS.code },
];
