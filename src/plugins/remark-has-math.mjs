/** Marca `hasMath` no frontmatter quando o post usa fórmulas ($…$ ou $$…$$). */
export function remarkHasMath() {
  return (tree, file) => {
    let found = false;
    const visit = (node) => {
      if (found) return;
      if (node.type === "math" || node.type === "inlineMath") {
        found = true;
        return;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
    file.data.astro.frontmatter.hasMath = found;
  };
}
