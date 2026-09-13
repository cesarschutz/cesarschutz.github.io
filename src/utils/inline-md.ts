/**
 * Suporte mínimo a markdown inline (negrito e código) nas descrições dos
 * posts — usado nos cards da home e no cabeçalho do post. O texto é escapado
 * antes, então é seguro para set:html.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Converte **negrito** e `código` em HTML seguro. */
export function renderInlineMd(value: string | undefined): string {
  if (!value) return "";
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Remove marcações inline — para meta tags (SEO) e atributos. */
export function stripInlineMd(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}
