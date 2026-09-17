# Novo artigo

Crie um novo artigo seguindo este fluxo:

1. **Entenda o tema**: se o Cesar ainda não disse, pergunte o assunto, a profundidade e a categoria.
   Se ele trouxer um texto pronto (gerado em outro lugar), use-o como base: melhore estrutura, tom e
   exemplos, e siga o mesmo fluxo abaixo.

2. **Crie o arquivo** `src/content/posts/<slug>.md` a partir de `.claude/templates/post.md`:
   - slug em kebab-case, sem acentos (vira a URL)
   - `published` = data de hoje
   - **categoria**: verifique se o assunto se encaixa numa existente; se nenhuma servir, crie uma nova dentro do
     escopo do blog (entrada em `src/utils/taxonomy.ts` com cor distinta e ícone) e avise o Cesar.
     Post de série usa `series: <chave>` sem `category`
   - **tags**: 2 a 4, reaproveitando o vocabulário existente; crie nova só se o assunto não estiver coberto e ela
     servir a outros posts; sem repetir o nome da categoria
   - `description` com até ~200 caracteres; `updated` só quando houver revisão relevante
   - terminar o artigo com a seção `## Fontes` (links oficiais/confiáveis)
   - `$` em texto normal precisa de escape (`US\$ 10`)

3. **Crie a capa nos 3 formatos** em `src/covers/<slug>/` (`wide.svg` 4:1, `card.svg` 2:1, `square.svg` 1:1)
   seguindo a seção "Capas" do CLAUDE.md (só classes `cv-*`, sem fundo, cada formato recomposto) e confira com
   `scripts/preview-covers.mjs` nos dois temas. Série Java: `node scripts/java-covers.mjs <versão>`.

4. **Crie os diagramas e desenhos do texto** em `public/posts/<slug>/` (padrão no CLAUDE.md) sempre que
   ajudarem a entender: fluxos, arquitetura, sequência, antes/depois, comparações.
   **Avalie outros recursos**: código com destaque/diff? fórmula? componente
   interativo (post `.mdx`)? Proponha antes de instalar qualquer biblioteca nova.

5. **Escreva em pt-BR**, tom profissional e direto. Termos técnicos em inglês quando for o natural.

6. **Revise tudo para não ter erros**: afirmações técnicas conferidas em fonte oficial, código correto,
   links, português, seção `## Fontes`.

7. **Valide** com `npx astro check` e `npm run build`, confira o post renderizado. Commit/push só quando o Cesar pedir.

$ARGUMENTS
