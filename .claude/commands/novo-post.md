# Novo post do blog

Crie um novo post para o blog seguindo este fluxo:

1. **Entenda o tema**: pergunte ao Cesar sobre o assunto do post se ele ainda não disse (tema, profundidade, se é nota rápida ou artigo longo).

2. **Crie o arquivo** em `src/contents/posts/<slug>.md` usando o template `.claude/templates/post.md`:
   - Slug em kebab-case, sem acentos (vira a URL)
   - `published` = data de hoje
   - Escolha tags e categoria coerentes com as existentes (veja outros posts)
   - Cover: use um banner existente de `public/banners/`, ou pergunte se ele quer uma arte nova para este post

3. **Avalie recursos** (instrução permanente do CLAUDE.md): o conteúdo pediria diagrama Mermaid? Bloco de código com destaque/diff? Fórmula? Componente Svelte interativo (post `.mdx`)? Alguma lib nova? Proponha antes de instalar qualquer coisa nova.

4. **Escreva em pt-BR**, tom pessoal e direto (primeira pessoa). Código e termos técnicos em inglês quando for o natural.

5. **Valide**: rode `npm run build` para confirmar que nada quebrou. Se o dev server estiver rodando, confira o visual.

$ARGUMENTS
