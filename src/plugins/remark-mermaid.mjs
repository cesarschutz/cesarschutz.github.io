/**
 * Transforma blocos de código ```mermaid em <pre class="mermaid"> ANTES do
 * Expressive Code processar os code fences. A renderização acontece no
 * cliente (ver setupMermaid em ScriptSetup.astro), então o build não precisa
 * de Playwright/navegador headless.
 */

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function walk(node, callback) {
  if (!node.children) return;
  for (let i = 0; i < node.children.length; i++) {
    callback(node.children[i], i, node);
    walk(node.children[i], callback);
  }
}

export function remarkMermaid() {
  return (tree) => {
    walk(tree, (node, index, parent) => {
      if (node.type !== "code" || node.lang !== "mermaid") return;
      parent.children[index] = {
        type: "html",
        value: `<pre class="mermaid">${escapeHtml(node.value)}</pre>`,
      };
    });
  };
}
