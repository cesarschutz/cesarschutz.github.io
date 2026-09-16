# Novo artigo

Crie um novo artigo seguindo este fluxo:

1. **Entenda o tema**: se o Cesar ainda não disse, pergunte o assunto, a profundidade e a categoria.

2. **Crie o arquivo** `src/content/posts/<slug>.md` a partir de `.claude/templates/post.md`:
   - slug em kebab-case, sem acentos (vira a URL)
   - `published` = data de hoje
   - categoria entre as existentes (ver CLAUDE.md); tags livres, reaproveitando as que já existem

3. **Crie a capa** `public/covers/<slug>.svg` a partir de `.claude/templates/cover.svg`,
   seguindo a regra das capas do CLAUDE.md (motivo único, centralizado, na zona segura).

4. **Avalie recursos**: diagrama SVG no corpo? código com destaque/diff? fórmula? componente
   interativo (post `.mdx`)? Proponha antes de instalar qualquer biblioteca nova.

5. **Escreva em pt-BR**, tom profissional e direto. Termos técnicos em inglês quando for o natural.

6. **Valide** com `npm run build`.

$ARGUMENTS
