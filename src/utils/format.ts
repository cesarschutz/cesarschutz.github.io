const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "13 set 2026" — sempre em UTC (datas do frontmatter são meia-noite UTC). */
export function formatDate(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "2026-09-13" — para o atributo datetime. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Converte **negrito** e `código` das descrições em HTML seguro. */
export function renderInlineMd(value: string | undefined): string {
  if (!value) return "";
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Remove marcações inline — para meta tags e RSS. */
export function stripInlineMd(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}
