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
- RSS (`/rss.xml`, texto completo nos 10 posts mais recentes), sitemap com `<lastmod>`, robots.txt
- Busca com relevância (título > tags > resumo > ocorrências) e link compartilhável `/?q=termo`
- Fontes servidas pelo próprio site (`@fontsource`), sem Google Fonts
- Imagens de compartilhamento PNG geradas no build com `sharp`: `/og/<slug>.png` (a partir de `card.svg`, tema escuro)
  e `/og/default.png` (home e demais páginas). JSON-LD `BlogPosting` nos posts e `WebSite`/`Person` na home
- KaTeX só é carregado em posts com fórmula (detectado por `src/plugins/remark-has-math.mjs`).
  Atenção: `$` em texto normal precisa de escape (`US\$ 10`), senão dois `$` na mesma frase viram fórmula
- npm, Node 24 (mínimo 22.12)

```bash
npm run dev      # http://localhost:4321
npm run build    # gera dist/
npm run check    # astro check (tipos)
```

Deploy: push na `main` → `.github/workflows/deploy.yml` publica no GitHub Pages.
Deploy preso na fila: cancelar e reexecutar o workflow pela aba Actions do GitHub (`gh` não está instalado).

## Design (vem do DEV NOTE — manter consistente)

- Paleta: tema escuro preto `#000` com cards `#1c1c1e`, azul `#2997ff`;
  tema claro `#f5f7fb` com cards brancos, azul `#2563eb`. Padrão: preferência do sistema, senão escuro
- Fontes: **Inter** (texto), **Fraunces** (títulos e citações), **JetBrains Mono** (código, chips)
- Cards com borda de 1px e raio 16–22px; pílulas com raio 980px; `:active { scale: .96 }`
- Cada categoria tem cor e ícone em `src/utils/taxonomy.ts` (categoria nova → adicionar lá)
- Tema em `data-theme` no `<html>` (script anti-flash no `BaseLayout`); chave `cs-theme`
- Modo da lista de posts (lista/cards) em `data-post-view`; chave `cs-post-view`
- Respeitar `prefers-reduced-motion` em qualquer animação nova
- Texto na cor da categoria usa `color-mix(in srgb, var(--c, var(--blue)) var(--ink-mix), #000)`
  (escurece no tema claro para ter contraste); nunca redefinir `--c` em `.cat-ico`

### Navegação e home

- Menu do topo (`NAV` em `src/config.ts`): **Artigos** (/archive/), **Séries** (/series/), **Projetos**, **Sobre**.
  Páginas podem forçar o item ativo com `navActive` no `BaseLayout` (posts de série, /java e /series → Séries;
  posts normais, categorias e tags → Artigos)
- Rodapé: grupos "Conteúdo" (Todos os artigos, Séries, Categorias, Tags) e "Autor" (Sobre, Projetos, GitHub,
  LinkedIn/E-mail se configurados) + RSS. Link genérico "Séries", nunca o nome de uma série específica
- Card de identidade da home: foto, "ARQUITETO DE SOLUÇÃO", nome, headline
  "Estudos de arquitetura e engenharia de software, organizados para consulta.", as 5 áreas (`AREAS`)
  como etiquetas e números **artigos · séries · categorias** (não trocar por horas de leitura).
  No celular fica compacto (foto pequena, sem etiquetas e números). Sem animação no card

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
src/covers/<slug>/            # capas: wide.svg, card.svg, square.svg (ver "Capas")
scripts/                      # java-covers.mjs (capas da série Java), preview-covers.mjs
public/posts/<slug>/          # diagramas SVG usados dentro dos posts
.claude/templates/            # post.md
```

## Como criar um post

1. Criar `src/content/posts/<slug>.md` a partir de `.claude/templates/post.md`
   (kebab-case, sem acentos). Campos: `title`, `published`, `description`, `tags`,
   `category`, `draft`; opcionais `updated` (data da última revisão relevante: aparece
   no post como "Atualizado em" e no sitemap)
   - `description`: até ~200 caracteres (aparece inteira nos cards; a meta description é cortada em 155)
2. **Categoria**: verificar se o assunto se encaixa numa das existentes (`Arquitetura`, `Java`,
   `Observabilidade`, `DevOps`, `Segurança`, `Dados`). Se nenhuma servir de verdade, **pode criar uma nova**,
   desde que dentro do escopo do blog (engenharia e arquitetura de software) e com chance de receber outros
   posts. Categoria nova = entrada em `src/utils/taxonomy.ts` com **cor** (usada nas etiquetas e nas capas;
   distinta das demais) e ícone, e avisar o Cesar.
   **Tags**: vocabulário enxuto. Reaproveite as existentes; não repita nomes de categoria;
   2 a 4 tags por post; crie tag nova quando o assunto não estiver coberto e ela for servir a mais de um post.
   Post de **série** usa `series: <chave>` em vez de `category` (ver "Séries")
3. **Todo post tem capa** nos 3 formatos, em `src/covers/<slug>/` (ver "Capas")
4. O destaque da home é sempre o último post publicado
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
criar `java-33.md` como próxima; capas: `node scripts/java-covers.mjs 29` e `node scripts/java-covers.mjs 33 --next`.

### Capas (3 formatos, arte escura, traço fino)

Cada post tem **três SVGs** em `src/covers/<slug>/` (pasta com o mesmo nome do arquivo do post). Eles são
embutidos no HTML pelo componente `Cover.astro`. Não há campo `cover` no frontmatter.

| Arquivo | viewBox | Onde aparece |
|---|---|---|
| `wide.svg` | `0 0 1600 400` (4:1) | topo do post no tablet/desktop |
| `card.svg` | `0 0 1200 600` (2:1) | cards, destaque no celular/tablet, relacionados, topo do post no celular, imagem de compartilhamento (PNG gerado no build) |
| `square.svg` | `0 0 800 800` (1:1) | destaque da home no desktop, miniatura da lista (até 84px no celular) |

**Estilo** (definido em set/2026 — arte escura de traço fino, igual nos dois temas):

- O fundo **não** vai no SVG: o contêiner `.cover` (em `global.css`) pinta o degradê azul-petróleo, o brilho
  central e os pontos de luz. O SVG traz só o desenho, com fundo transparente, e é exibido com `meet`
  (nunca é cortado; a sobra continua o fundo). A capa é escura também no tema claro
- **Um motivo** que represente o assunto do título, ocupando ~55–70% da altura, centrado e com ar em volta.
  Cada formato é **recomposto** (não é só redimensionar):
  - `wide`: o motivo no centro e, nas laterais, **elementos que continuam a história** (de onde vem e para onde
    vai: quem chama, o resultado, a data, a fila). Nada de barras cinza de enfeite — elas parecem tela de carregamento
  - `card`: o motivo completo, confortável
  - `square`: a versão mais simples e maior do motivo (precisa ser legível a 84px); sem detalhes pequenos
- **Não definir `stroke-width` no SVG**: o CSS aplica `vector-effect: non-scaling-stroke` e calcula a espessura
  em px pela largura em que a capa aparece (fina na miniatura, encorpada no topo do post). Use `cv-bold` no
  contorno principal, `cv-thin` em detalhes finos e `cv-dash` para tracejado
- Texto só se for grande e fizer parte do motivo ("JWT", "vs", "1×", "LTS", números); no mínimo 40 unidades no card
- **Proibido**: cores fixas (`fill="#..."`), degradês, filtros, sombras, `<image>`, fontes embutidas, `id`/`<defs>`
  (os SVGs convivem na mesma página e ids colidiriam). Cada arquivo com até ~8 KB
- Cores **só por classe** (o CSS resolve; a cor da categoria fica na etiqueta do card, não na capa):

| Classe | Uso |
|---|---|
| `cv-shape` | forma principal: preenchimento escuro sólido + contorno ciano |
| `cv-line` | traço ciano, sem preenchimento |
| `cv-solid` | preenchimento ciano (destaques, números, selos) |
| `cv-detail` / `cv-detail-line` | detalhes internos em ciano claro |
| `cv-muted` / `cv-muted-line` | elementos secundários (setas, base, "vs") |
| `cv-soft` / `cv-soft-line` | apoio bem discreto |
| `cv-cut` | "recorte" com a cor do fundo (texto sobre `cv-solid`) |
| `cv-white` | texto em branco translúcido |
| `cv-text` / `cv-mono` | fonte do texto (Inter 700 / JetBrains Mono 700); combinar com uma classe de cor |

Pré-visualizar os 3 formatos nos 2 temas (inclui a miniatura de 84px e o tamanho do destaque):
`PLAYWRIGHT_CORE=<caminho>/playwright-core/index.mjs node scripts/preview-covers.mjs <slug> saida.png`
(o `playwright-core` do projeto dev-note serve). Referências: `src/covers/bloqueio-otimista-e-pessimista/`
(motivo simples) e `src/covers/arquitetura-de-ledger/` (com laterais narrativas).

**Série Java**: não desenhar à mão. `node scripts/java-covers.mjs <versão>` gera o padrão fixo (xícara +
JAVA NN + selo LTS; no wide, o caminho desde a LTS anterior e a data de lançamento). Tudo vem de
`src/data/java.ts`, inclusive o selo tracejado "PRÓXIMA LTS" das versões marcadas como `upcoming`.

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

## Instrução permanente — fluxo de todo post

Os posts são criados aqui, de dois jeitos: do zero, ou a partir de um texto que o Cesar gerou em outro
lugar e traz para cá. Nos dois casos o trabalho é o mesmo:

1. **Classificar**: categoria existente ou nova, tags do vocabulário (ver "Como criar um post", item 2)
2. **Melhorar o texto**: estrutura (h2/h3 claros), tom profissional em pt-BR, exemplos de código
   corretos, frontmatter completo (ver "Como criar um post")
3. **Revisar para não ter erros**: conferir cada afirmação técnica contra fonte oficial, código que
   compila/faz sentido, links funcionando, português, `$` escapado, seção `## Fontes` no final
4. **Criar as imagens**:
   - **capa** nos 3 formatos em `src/covers/<slug>/` (obrigatória; ver "Capas"), conferida com `preview-covers.mjs`
   - **diagramas e desenhos dentro do texto** (`public/posts/<slug>/`) sempre que ajudarem a leitura e o
     aprendizado: fluxos, arquitetura, sequência, antes/depois, linha do tempo, comparações
5. Avaliar outros recursos (tabela, toggle, código com diff, componente interativo em `.mdx`) e
   **propor antes de instalar** qualquer biblioteca. Recurso novo adotado → documentar em "Recursos disponíveis"
6. Validar com `npx astro check` e build, conferir o post renderizado (claro/escuro, celular) e só
   commitar/publicar quando o Cesar pedir

## Opções em `src/config.ts` (vazias = desligadas)

- `SITE.linkedin`, `SITE.email`: aparecem no rodapé e na página Sobre
- `EXPERIENCE`: trajetória profissional exibida em /about
- `ANALYTICS.goatcounter`: código do GoatCounter (estatísticas de visita sem cookies)
- `COMMENTS`: Giscus (habilitar Discussions no repo, instalar o app Giscus, copiar os IDs de giscus.app)

Posts: barra de progresso de leitura, "voltar ao topo", botões de compartilhar, navegação dentro da
série (LTS anterior/próxima) e "Artigos relacionados" (tags e categoria em comum; `src/utils/related.ts`).
Projetos (`src/data/projects.ts`): `image` (screenshot em `public/projects/`) e `updated`.

## Ambiente de desenvolvimento (armadilhas)

- A pasta `~/Documents` é sincronizada pelo iCloud: surgem cópias `arquivo 2.ts`, arquivos apagados voltam
  e `node_modules`/build ficam muito lentos. Antes de commitar, conferir `git status --untracked-files=all`
  e **nunca** commitar arquivos com " 2" no nome nem componentes do tema antigo (Banner, NavBar, PostCard…)
- Para build/dev rápido: `git clone` (ou rsync) para uma pasta fora do iCloud, `npm ci` e rodar lá;
  depois sincronizar os arquivos alterados de volta para este repo
- macOS não diferencia maiúsculas: renomear só a caixa de um arquivo exige `git mv` em dois passos
  (senão o build quebra no Linux do GitHub Actions)
- Sempre rodar `npx astro check` (0 erros) antes de publicar. Commit/push só quando o Cesar pedir

## Pendências do dono

- Preencher `EXPERIENCE`, `SITE.linkedin` e `SITE.email` em `src/config.ts`
- Foto mais profissional (`SITE.avatar`)
- Ativar estatísticas (`ANALYTICS`) e comentários (`COMMENTS`) se quiser
