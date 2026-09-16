# cesarschutz.github.io — blog técnico de Cesar Schutz

Blog técnico de Cesar Schutz (arquiteto de solução): artigos sobre arquitetura de software,
sistemas distribuídos e Java, mais portfólio de projetos. Publicado no GitHub Pages em
<https://cesarschutz.github.io>. Idioma: **pt-BR**. O nome do site é só **Cesar Schutz**
(não usar "Caderno Público" nem textos informais como "aprendizado contínuo").

## Stack

- **Astro 7** (site estático) + **TypeScript** — sem framework de UI, sem Tailwind
- CSS próprio com os **tokens de design do DEV NOTE** (`src/styles/global.css`)
- Markdown via processador `unified()` (`@astrojs/markdown-remark`): remark-math, rehype-katex,
  rehype-slug, rehype-autolink-headings, `rehype-table-wrap` (local)
- **Expressive Code** para blocos de código (temas github-dark/light)
- **Busca própria** (sem Pagefind): índice `src/pages/search-index.json.ts`, motor
  `src/scripts/search.ts` (ignora acentos; frase exata primeiro, depois todas as palavras),
  UI em `src/components/SearchDialog.astro` (atalhos ⌘K / Ctrl+K e `/`)
- RSS (`/rss.xml`), sitemap, robots.txt
- npm, Node 24 (mínimo 22.12)

```bash
npm run dev      # http://localhost:4321
npm run build    # gera dist/
npm run check    # astro check (tipos)
```

Deploy: push na `main` → `.github/workflows/deploy.yml` publica no GitHub Pages.
Deploy preso na fila: `gh run cancel <id>` e `gh workflow run deploy.yml`.

## Design (vem do DEV NOTE — manter consistente)

- Paleta: tema escuro preto `#000` com cards `#1c1c1e`, azul `#2997ff`;
  tema claro `#f5f7fb` com cards brancos, azul `#2563eb`. Padrão: preferência do sistema, senão escuro
- Fontes: **Inter** (texto), **Fraunces** (títulos e citações), **JetBrains Mono** (código, chips)
- Cards com borda de 1px e raio 16–22px; pílulas com raio 980px; `:active { scale: .96 }`
- Cada categoria tem cor e ícone em `src/utils/taxonomy.ts` (categoria nova → adicionar lá)
- Tema em `data-theme` no `<html>` (script anti-flash no `BaseLayout`); chave `cs-theme`
- Modo da lista de posts (lista/cards) em `data-post-view`; chave `cs-post-view`
- Respeitar `prefers-reduced-motion` em qualquer animação nova

### Peças herdadas do DEV NOTE

- **Ícones subindo** (`src/components/RisingTiles.astro`, dados em `src/data/tiles.ts`): só na
  página 404 (removidos do card da home a pedido). Pausa fora da tela. Para trocar os ícones,
  editar `tiles.ts`
- **Frases de autores** (`src/components/QuoteCard.astro`, dados em `src/data/quotes.json`,
  132 frases): só no topo da home (reembaralhadas a cada carregamento, nunca repetindo a última exibida; setas navegam)

## Estrutura

```
src/config.ts                 # nome, cargo, frases, navegação, links e AREAS (áreas de atuação:
                              # etiquetas do card da home + cards da página Sobre)
src/content/posts/            # artigos (.md/.mdx) — nome do arquivo = slug da URL
src/content.config.ts         # schema do frontmatter
src/data/projects.ts          # página /projects
src/data/tiles.ts             # ícones da animação
src/data/quotes.json          # frases de autores
src/utils/                    # posts, taxonomia (cores/ícones), formatação, frases, ícones
src/components/               # Nav, Sidebar, IdentityCard, QuoteCard, FeaturedPost, PostFeed…
src/pages/                    # home paginada ([...page]), posts/[slug], archive, java,
                              # categories, tags, projects, about, 404, rss, search-index
public/covers/                # capas SVG dos posts (covers/java/* para a série Java)
public/posts/<slug>/          # diagramas SVG usados dentro dos posts
.claude/templates/            # post.md e cover.svg
```

## Como criar um post

1. Criar `src/content/posts/<slug>.md` a partir de `.claude/templates/post.md`
   (kebab-case, sem acentos). Campos: `title`, `published`, `description`, `tags`,
   `category`, `cover`, `draft`
2. Categorias em uso: `Arquitetura`, `Java`, `Observabilidade`, `DevOps`, `Segurança`, `Dados`
   (criar novas com moderação e registrar em `src/utils/taxonomy.ts`; tags são livres).
   Post de **série** usa `series: <chave>` em vez de `category` (ver "Séries")
3. **Todo post tem capa** no padrão abaixo, em `public/covers/<slug>.svg`
4. O post mais recente vira automaticamente o destaque da home
5. Não há mais "exercícios resolvidos": tudo é post normal. `/exercicios` redireciona para a home

### Séries

Cadastro em `src/data/series.ts` (chave, nome, descrição, cor, ícone, página própria opcional).
Post de série: `series: <chave>` no frontmatter e **sem** `category` — nos cards e no post aparece
"Séries › Nome da série" no lugar da categoria. Índice em `/series/`; série sem página própria
ganha `/series/<chave>/` (lista em ordem de leitura). Série nova = item no cadastro + posts.

### Série "Atualizações do Java" (`series: java`) — só LTS

Um post por LTS (`java-8`, `java-11`, `java-17`, `java-21`, `java-25`) + `java-29` ("Rumo à próxima
LTS", atualizado a cada release intermediária) + `guia-atualizacoes-java.md`. Cada post reúne o que
as versões intermediárias trouxeram desde a LTS anterior e segue o mesmo esqueleto:

- introdução (data, período coberto, para quem migra de qual LTS) e `## Linha do tempo` com diagrama
- seções por tema; em cada recurso a linha `**Chegou em:** Java 14 (preview, [JEP 359](…)) → Java 16 (final, [JEP 395](…))`,
  explicação, código e diagrama quando ajudar
- recursos ainda em preview/incubadora, cuidados de migração
- `## Todas as JEPs, versão a versão` com h3 **exatamente** `### Java NN` (âncoras `#java-NN` usadas
  pelos redirecionamentos) e tabela `| JEP | Título | Tipo |` — célula JEP só com o número linkado,
  título oficial em inglês, Tipo com vocabulário fechado: Final, Preview, Incubadora, Experimental,
  Depreciação, Remoção, Plataforma, Interno
- rótulos da linha "Chegou em": final, preview, 2ª preview…, incubadora, experimental, depreciado, removido
- exceção: o Java 8 (primeiro da série) usa `## Visão geral` no lugar da linha do tempo e tabela com coluna Área
- `## Fontes` — toda afirmação sustentada por fonte oficial (openjdk.org/jeps, páginas do projeto JDK,
  release notes, Javadoc, roadmap da Oracle)

Dados da página `/java/` em `src/data/java.ts` (`JAVA_LTS` e `ABSORBED`). Os posts antigos das
versões intermediárias foram removidos; `/posts/java-NN/` redireciona para `/posts/java-<LTS>/#java-NN`
(gerado em `astro.config.mjs` a partir de `ABSORBED`).

**Nova release intermediária** (ex.: Java 28): atualizar `java-29.md` (seções + `### Java 28` na
tabela), adicionar `28: 29` em `ABSORBED` e ajustar `covers` em `JAVA_LTS`.
**Nova LTS lançada** (ex.: Java 29): tirar `upcoming` em `JAVA_LTS`, revisar `java-29.md` como LTS e
criar `java-33.md` como próxima, com capa `covers/java/java-33.svg` (copiar de `java-29.svg`).

### ⚠️ Regra das capas (crop-safe)

A capa aparece cortada em proporções diferentes: 4:1 no topo do post, ~1:1 no destaque da home,
16:10 e 1:1 na lista, 2:1 nos cards. Por isso a capa é **decoração, não informação**:

- Canvas **1600×800**, `preserveAspectRatio="xMidYMid slice"`, fundo padrão: gradiente
  `#01131b → #04283d → #01131b`, grid `#00a0e5` a 7% (80px), elipse de brilho central —
  copiar de `.claude/templates/cover.svg`
- **Um motivo grande e centralizado dentro da zona segura x 400–1200 / y 200–600**; nada
  importante fora dela
- Traço `#00a0e5` (10–13px), preenchimento `#032c42`, detalhes `#7fd4f5`
- Texto só se for grande (≥ 40px) e parte do motivo (ex.: "JWT", "1×"); nada de legendas
- Exceção: `covers/java/*` (xícara + "JAVA NN" + selo LTS)

## Recursos disponíveis nos posts

- **Código**: ` ```java title="Arquivo.java" {3-5} `, `ins={}`/`del={}`, `showLineNumbers`, `collapse={1-10}`
- **Diagramas**: SVG próprio em `public/posts/<slug>/`, `![alt descritivo](/posts/<slug>/nome.svg)`.
  Padrão: fundo `#ffffff`, largura ~940, título 21px bold `#111827`, caixas `rx=12` com pares
  fill/stroke — azul `#eaf3fb`/`#2b7fc4`, laranja `#fdf1e3`/`#e07a1f`, verde `#eaf7ef`/`#2e9e5b`,
  vermelho `#fdecea`/`#d9534f`, cinza `#f3f4f6`/`#6b7280`; setas `#4b5563`. Remover
  `width`/`height` da tag raiz (manter `viewBox`). Clique abre o lightbox. **Não usar Mermaid**
- **Matemática**: `$inline$` e `$$bloco$$`
- **Toggle**: `<details><summary>Título</summary>` + linha em branco + Markdown + `</details>`
- **Tabelas**: Markdown normal (rolam na horizontal no celular)
- **Sumário**: gerado dos h2/h3 quando há 3 ou mais (lateral no desktop, recolhível no celular)
- **Descrição**: aceita `` `código` `` e `**negrito**`

## Aviso sobre IA

Os artigos são escritos com apoio de IA. Há um aviso na página Sobre (seção "Como os artigos são
produzidos") e uma linha no rodapé de cada post (o rodapé do post não mostra licença) orientando a usar as fontes citadas como
referência. Todo artigo deve terminar com uma seção **Fontes** com links confiáveis.

## Instrução permanente

A cada post novo, avaliar se algum recurso (diagrama, componente interativo em `.mdx`,
visualização) enriqueceria o conteúdo e **propor antes de instalar** qualquer biblioteca.
Recurso novo adotado → documentar a sintaxe na seção acima.

## Pendências do dono

- Completar a trajetória profissional e contatos (LinkedIn/e-mail) em `src/pages/about.astro`
