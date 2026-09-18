# cesarschutz.github.io — blog técnico de Cesar Schutz

Blog técnico de Cesar Schutz (arquiteto de soluções): não tem tema único — publica o que o Cesar precisa
estudar no dia a dia (arquitetura, código, Java, IA), mais portfólio de projetos. Publicado no GitHub Pages em
<https://cesarschutz.com.br>. Idioma: **pt-BR**. O nome do site é só **Cesar Schutz**
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
- Card de identidade da home: foto, "ARQUITETO DE SOLUÇÕES", nome, a apresentação em **primeira pessoa**
  (`SITE.intro` — quem escreve, não o que o site é; o `SITE.headline` descritivo fica no rodapé e na meta),
  as 5 áreas (`AREAS`) como etiquetas, números **artigos · séries · categorias** (não trocar por horas de
  leitura) e os ícones de GitHub/LinkedIn ao lado dos botões. No celular fica compacto (foto menor, sem
  etiquetas e números). Sem animação no card

### Peças herdadas do DEV NOTE

- **Ícones subindo** (`src/components/RisingTiles.astro`, dados em `src/data/tiles.ts`): só na
  página 404 (removidos do card da home a pedido). Pausa fora da tela. Para trocar os ícones,
  editar `tiles.ts`
- **Frases de autores** (`src/components/QuoteCard.astro`, dados em `src/data/quotes.json`,
  132 frases): só no topo da home (reembaralhadas a cada carregamento, nunca repetindo a última exibida; setas navegam).
  A **primeira do arquivo** é a que sai no HTML gerado (antes do JS embaralhar), então ela aparece em preview e
  sem JavaScript: manter ali uma frase sobre o assunto do blog, não um chavão

## Estrutura

```
src/config.ts                 # nome, cargo, frases, navegação, links e AREAS (áreas de atuação:
                              # etiquetas do card da home + cards da página Sobre)
src/content/posts/            # artigos (.md/.mdx) — nome do arquivo = slug da URL
src/content.config.ts         # schema do frontmatter
src/data/projects.ts          # página /projects
src/data/tiles.ts             # ícones da animação
src/data/quotes.json          # frases de autores
src/data/decks.json           # posts com resumo visual (infográfico + apresentação)
src/utils/                    # posts, taxonomia (cores/ícones), formatação, frases, ícones
src/components/               # Nav, Sidebar, IdentityCard, QuoteCard, FeaturedPost, PostFeed…
src/pages/                    # home paginada ([...page]), posts/[slug], archive, java,
                              # categories, tags, projects, about, 404, rss, search-index
src/covers/<slug>/            # capas: wide.svg, card.svg, square.svg, featured.svg (ver "Capas")
scripts/                      # java-covers.mjs, check-cover.mjs, render-cover.mjs, center-cover.mjs,
                              # deck-to-web.mjs (infográfico e apresentação do NotebookLM)
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
3. **Todo post tem capa** nos 4 formatos, em `src/covers/<slug>/` (ver "Capas")
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

### Capas (4 formatos, arte escura, traço fino)

**A regra completa está em `docs/guia-capas.md`** — é esse arquivo que vai no briefing dos agentes
que desenham capas. O resumo:

Cada post tem **quatro SVGs** em `src/covers/<slug>/` (pasta com o mesmo nome do arquivo do post),
embutidos no HTML pelo `Cover.astro`. Não há campo `cover` no frontmatter.

| Arquivo | viewBox | Onde aparece |
|---|---|---|
| `wide.svg` | `0 0 1600 400` (4:1) | topo do post no tablet/desktop |
| `card.svg` | `0 0 1200 600` (2:1) | cards, destaque no celular/tablet, relacionados, topo do post no celular, PNG de compartilhamento |
| `square.svg` | `0 0 800 800` (1:1) | miniatura da lista (até 84px) |
| `featured.svg` | `0 0 800 1000` (4:5) | destaque da home no desktop (a coluna ao lado do texto) |

O slot do destaque no desktop **não tem proporção fixa** — a altura vem do texto do card. Medido em
set/2026 ele fica entre 0.75 e 0.96 de proporção (com `min-height: clamp(420px, 33vw, 580px)` em
`.featured`), por isso a capa dedicada é 4:5. Todo post tem as quatro; nenhuma precisa ser apagada
quando o destaque muda.

**Estilo**: arte escura nos dois temas. O fundo **não** vai no SVG — o contêiner `.cover` pinta o
degradê, o brilho e os pontos de luz; o SVG é transparente e exibido com `meet` (nunca é cortado).
Um motivo concreto tirado do artigo, com hierarquia e preenchendo a tela. **Não definir
`stroke-width`** (o CSS calcula pela largura em que a capa aparece; use `cv-bold`/`cv-thin`/`cv-dash`).

**Cor**: a base é ciano e cada capa escolhe **um** acento, declarado na raiz do SVG
(`<svg ... class="ac-violet">`): `ac-amber` (padrão), `ac-violet`, `ac-green`, `ac-coral`, `ac-pink`.
O acento marca um papel só na narrativa (o que falha, o "antes", o que é escolhido) — nunca enfeite.
O CSS, o halo do fundo e o PNG de compartilhamento seguem essa classe sozinhos.

**Proibido**: cores fixas, degradês, filtros, sombras, `<image>`, `style=`, `id`/`<defs>` (os SVGs
convivem na mesma página e ids colidiriam), `stroke-width`. Até 8 KB por arquivo. Espaço entre dois
`<tspan>` some ao embutir — use `&#160;`.

Ferramentas:

- `node scripts/check-cover.mjs [slug]` — valida tudo acima **e mede a capa renderizada**: reprova
  desenho que sai da borda, que desperdiça espaço ou cujas margens opostas diferem mais de 2%
- `node scripts/render-cover.mjs <slug> saida.png` — desenha os 4 formatos + destaque + miniatura de
  84px num PNG só, para conferir com os próprios olhos
- `node scripts/center-cover.mjs <slug> [formato]` — mede e desloca o desenho para o centro exato

**Série Java**: não desenhar à mão. `node scripts/java-covers.mjs <versão>` gera os quatro arquivos
no padrão fixo (xícara + JAVA NN + selo LTS; no wide, o caminho desde a LTS anterior e a data), já
centralizados automaticamente. Tudo vem de `src/data/java.ts`.

Referências: `src/covers/bloqueio-otimista-e-pessimista/` (motivo simples, contraste âmbar/ciano) e
`src/covers/wide-events-canonical-log-lines/` (laterais narrativas no wide).

### Apresentação do NotebookLM (e infográfico)

Depois que o post está publicado, o Cesar joga a URL no NotebookLM e pede **apresentação** (e
**infográfico**, hoje desligado enquanto os erros de texto não são corrigidos). A apresentação vira
uma seção do próprio artigo — **a última numerada, logo antes de `## Fontes`** —, em carrossel, com
cada slide abrindo no lightbox.

A seção é inserida no meio do conteúdo a partir de `post.rendered.html` (corte no `<h2 id="fontes">`),
não por JavaScript: ela entra no sumário lateral como qualquer outra seção. O título acompanha o
artigo — `8. Apresentação` onde os h2 são numerados, só `Apresentação` onde não são. Abaixo do título
ficam só o contador e as setas; sem frase de apoio.

Ampliar um slide abre o **lightbox em modo galeria**: setas na tela e as teclas ←/→ trocam a imagem
grande e o carrossel acompanha (evento `deck:go`). Imagem comum do post continua abrindo sozinha,
sem setas.

```bash
node scripts/deck-to-web.mjs <slug> --deck <arquivo.pptx> --titulo "…" [--infografico <img.png>]
```

O script extrai os slides na ordem certa, converte para WebP (1376px, q82), grava em
`public/posts/<slug>/deck/NN.webp` (e o infográfico em `resumo.webp`) e registra o post em
`src/data/decks.json`. O `Deck.astro` aparece sozinho para quem está no manifesto — nada a escrever
no Markdown. Um `.pptx` de 14 MB vira ~1 MB. Para voltar a exibir o infográfico, basta rodar o script
com `--infografico` (a chave volta ao manifesto e o bloco reaparece).

**O que conferir antes de aceitar o material** (o NotebookLM erra e o erro fica gravado no pixel):

- **texto e código nas imagens**: já vieram `SIT` no lugar de `SET`, `stareId` por `storeId`,
  "reteamento", "malúsculas". Publicar isso desmente a promessa da página Sobre ("revisão minha,
  código testado") — se houver erro, pedir para gerar de novo, não publicar
- **os slides são imagens inteiras**, sem texto no arquivo: não há SEO nem leitor de tela neles.
  O artigo escrito continua tendo de se sustentar sozinho; o bloco é complemento, nunca substituto
- **um por artigo**: quando vierem duas apresentações ou dois infográficos, escolher o de linguagem
  visual mais próxima do site e não misturar slides de decks diferentes (a costura aparece)
- **infográfico em 16:9** funciona; peça alta e estreita fica ilegível no celular

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

Os artigos são escritos com apoio de IA (às vezes o texto nasce do Cesar e a IA lapida, às vezes o
contrário), mas **a revisão final é sempre dele** e **todo código publicado foi testado**; quando o
exemplo é grande, o artigo linka o código completo. Há um aviso na página Sobre (seção "Como os artigos
são produzidos") e uma linha no rodapé de cada post (o rodapé do post não mostra licença) orientando a usar as fontes citadas como
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
   - **capa** nos 4 formatos em `src/covers/<slug>/` (obrigatória; ver "Capas"), aprovada no
     `check-cover.mjs` e conferida a olho no `render-cover.mjs`
   - **diagramas e desenhos dentro do texto** (`public/posts/<slug>/`) sempre que ajudarem a leitura e o
     aprendizado: fluxos, arquitetura, sequência, antes/depois, linha do tempo, comparações
5. Avaliar outros recursos (tabela, toggle, código com diff, componente interativo em `.mdx`) e
   **propor antes de instalar** qualquer biblioteca. Recurso novo adotado → documentar em "Recursos disponíveis"
6. Validar com `npx astro check` e build, conferir o post renderizado (claro/escuro, celular) e só
   commitar/publicar quando o Cesar pedir

## Opções em `src/config.ts` (vazias = desligadas)

- `SITE.linkedin` (preenchido), `SITE.email`: aparecem no rodapé, no card da home e na página Sobre
- `EXPERIENCE`: trajetória profissional exibida em /about
- `ANALYTICS.goatcounter`: código do GoatCounter (estatísticas de visita sem cookies)
- `COMMENTS`: Giscus (habilitar Discussions no repo, instalar o app Giscus, copiar os IDs de giscus.app)

Posts: barra de progresso de leitura, "voltar ao topo", botões de compartilhar e navegação no fim —
dentro da série (LTS anterior/próxima) ou, fora dela, **artigo anterior/próximo** por data de
publicação. Não há mais bloco de "Artigos relacionados".
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

- Preencher `EXPERIENCE` (trajetória profissional de /about — a seção já está construída, só está vazia)
  e `SITE.email` em `src/config.ts`
- Foto mais profissional (`SITE.avatar`)
- Ativar estatísticas (`ANALYTICS`) e comentários (`COMMENTS`) se quiser
