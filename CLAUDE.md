# Caderno Público — cesarschutz.github.io

Site pessoal do Cesar Schutz (arquiteto de solução), batizado de **Caderno Público**:
blog de estudos + portfólio de projetos. Publicado no GitHub Pages em
<https://cesarschutz.github.io> (o repo mantém o nome exigido pelo Pages para publicar na raiz).

## Stack

- **Astro 5** + tema [Yukina](https://github.com/WhitePaper233/yukina) (adaptado)
- **Tailwind CSS** (v3) + Svelte 5 (componentes interativos)
- **Expressive Code** — blocos de código avançados
- **Diagramas em SVG artesanal** (estilo ByteByteGo) — NÃO usamos Mermaid
  (removido em 13/09/2026 por erros de parse em alguns navegadores)
- **Lightbox** — toda imagem de post abre em tela cheia ao clicar
  (fecha no ×, clicando fora ou com Esc) — `setupLightbox` no ScriptSetup
- **KaTeX** — fórmulas matemáticas
- **MDX** — posts com componentes interativos
- **Busca própria** com frase exata — índice em `src/pages/search-index.json.ts`,
  motor em `src/utils/search.ts` (normaliza acentos; frase exata primeiro,
  fallback por palavras). Funciona também no `npm run dev`. NÃO usa Pagefind.
- Gerenciador de pacotes: **npm**

## Comandos

```bash
npm run dev      # servidor de desenvolvimento (localhost:4321)
npm run build    # build de produção + índice de busca
npm run preview  # serve o build localmente
```

Deploy: automático via GitHub Actions a cada push na `main` (`.github/workflows/deploy.yml`).

## Identidade visual (não mudar sem pedido explícito)

- Paleta inspirada nas **cores oficiais do Grêmio**: azul celeste `#00A0E5`, azul-preto `#01131B`, branco — de forma **sutil e profissional** (sem escudo/brasão: é marca registrada)
- Tudo deriva de `--hue: 230` em `src/components/GlobalStyles.astro`
- **Modo escuro é o padrão** (fallback em `NavBar.astro` e script anti-flash em `BaseHead.astro`)
- Idioma: **pt-BR** (traduções em `src/locales/languages/pt_br.ts`)

## Como criar um post

1. Criar `src/contents/posts/<slug-do-post>.md` (ou `.mdx` se precisar de componentes):

```markdown
---
title: Título do post
published: 2026-01-31
description: Uma frase que resume o post (aparece no card e no SEO).
tags: [Java, Arquitetura]
category: Estudos
cover: /banners/tech-nodes.svg   # opcional; sem cover, usa um banner do rodízio
draft: false                     # true = não publica em produção
---

Conteúdo em Markdown...
```

2. Convenções:
   - Nome do arquivo = slug da URL (`slugMode: RAW`): use kebab-case, sem acentos
   - Categorias em uso: `Arquitetura`, `Java`, `Observabilidade`, `DevOps`,
     `Segurança`, `Dados` (crie novas com moderação; tags são livres)
   - A série "atualizações do Java" (java-8.md … java-26.md + guia-atualizacoes-java.md)
     foi migrada do antigo repo knowledge-base (apagado; backup local em
     `../knowledge-base-backup`) — novas versões do Java entram como java-NN.md
   - Posts da série "Aprendizado de arquitetura" vêm do Notion (página "Aprendizado
     arquitetura Claude") — ATENÇÃO: as URLs de imagem do Notion expiram em ~5 min;
     baixe os SVGs para `public/posts/<slug>/` imediatamente após o fetch e
     **remova `width`/`height` da tag raiz** (mantendo o `viewBox`) — com
     tamanho fixo o lightbox não amplia a imagem
   - **Exercícios resolvidos**: as sessões de arquitetura usam
     `category: Exercícios resolvidos` + campo `enunciado:` no frontmatter
     (resumo curto do desafio). São posts normais (home, tags, busca), mas
     ganham página própria em `/exercicios/` (src/pages/exercicios.astro:
     cards numerados com título + enunciado + explicação do formato) e um
     card destacado no sidebar, acima de Categorias. Os links de categoria
     desses posts apontam para `/exercicios/` via `GetCategoryUrl()` em
     `src/utils/content.ts`. A numeração do card vem do título
     (`Sessão NN — ...`)
   - Imagem própria de capa: colocar em `public/covers/` e referenciar `/covers/arquivo.webp`
   - Template completo em `.claude/templates/post.md`

### ⚠️ Regra das capas (crop-safe)

A capa NUNCA aparece inteira: o banner do post corta topo/base (34vh + ondas) e
o card da home corta em diagonal. Por isso capa é **decoração, não informação**:

- Canvas 1600×800, fundo padrão do site: gradiente `#01131b → #04283d → #01131b`,
  pattern de grid celeste, elipse de glow central
- **UM motivo grande e centralizado** na zona segura (x ≈ 400–1200, y ≈ 200–600);
  nada encostado nas bordas
- Texto só se for grande (≥ 40px) e parte do motivo (ex.: "15", "JWT");
  proibido texto pequeno, legendas ou diagramas com vários rótulos
- Diagramas informativos vão no **corpo do post** (`public/posts/<slug>/`,
  fundo branco, estilo ByteByteGo) — o lightbox amplia no clique
- Exceção que segue outro padrão: `covers/java/*` (xícara + "JAVA NN"; número
  centrado em x=1130 e selo LTS logo abaixo dele — ambos dentro da zona
  segura do card) e `banners/*` (arte do hero da home, nunca cortada em card)

## Recursos disponíveis nos posts (usar sem medo)

- **Código**: ` ```java title="Arquivo.java" {3-5} ` (destaque), `del={}/ins={}` (diff),
  `showLineNumbers`, `collapse={1-10}` (recolher trechos)
- **Diagramas**: SVG artesanal em `public/posts/<slug>/<nome>.svg`, referenciado
  com `![alt descritivo](/posts/<slug>/<nome>.svg)`. Padrão visual (estilo
  ByteByteGo, igual aos das sessões): fundo `#ffffff`, viewBox ~940 de largura,
  título 21px bold `#111827`, caixas rx=12 com pares fill/stroke —
  azul `#eaf3fb`/`#2b7fc4`, laranja `#fdf1e3`/`#e07a1f`, verde `#eaf7ef`/`#2e9e5b`,
  vermelho `#fdecea`/`#d9534f`, cinza `#f3f4f6`/`#6b7280` — setas `#4b5563` com
  marker, fonte Inter/system. O lightbox amplia no clique; NÃO usar Mermaid
- **Matemática**: `$inline$` e `$$bloco$$`
- **Toggle colapsável** (estilo Notion, estilizado em `markdown.css`): use
  `<details>` + `<summary>Título</summary>`, linha em branco, conteúdo em
  Markdown normal, linha em branco, `</details>`
- **Sumário lateral**: gerado automaticamente dos h2/h3 do post (desktop xl+,
  com scrollspy) — nada a fazer, só usar headings bem estruturados
- **Descrições ricas**: o campo `description` do frontmatter aceita `**negrito**`
  e `` `código` `` — aparece no card da home e no cabeçalho do post; a convenção
  da série de arquitetura é terminar com "**Também caiu aqui:** …"
- **MDX + Svelte**: para demos interativas/animadas, criar componente em
  `src/components/interactive/` e usar num post `.mdx`

## ⚠️ Instrução permanente para novos posts

A cada post novo, **avalie ativamente se existe lib, componente ou recurso que
enriqueceria o conteúdo** — e proponha ao Cesar antes de instalar. Exemplos:
diagrama animado (Svelte + CSS/motion), player de demo, visualização de dados,
embed interativo. O site fala de arquitetura e desenvolvimento: diagramas e
código bonito são prioridade. Ao adicionar um recurso novo:

1. Instale e configure
2. Documente a sintaxe neste arquivo (seção "Recursos disponíveis")

## Estrutura de pastas relevante

```
yukina.config.ts              # config central: título, nav, banners, links
src/contents/posts/           # posts do blog (.md/.mdx)
src/contents/specs/about.md   # página Sobre
src/data/projects.ts          # lista de projetos (página /projects)
src/pages/projects.astro      # página de projetos (criada por nós, não é do tema)
src/components/GlobalStyles.astro  # cores/tokens (--hue etc.)
src/plugins/remark-mermaid.mjs     # transforma ```mermaid em <pre class="mermaid">
src/locales/                  # i18n (pt_br.ts é o ativo)
public/banners/               # artes SVG do banner rotativo
.claude/templates/post.md     # template de frontmatter para posts
```

## Operação

- Deploy normal: push na main → Actions publica em ~1 min
- **Deploy preso na fila** (já aconteceu — instabilidade do GitHub): cancele o
  run (`gh run cancel <id>`) e dispare de novo com `gh workflow run deploy.yml`

## Alterações feitas sobre o tema original (para saber onde mexer)

- Página `/projects` + chaves i18n `projects_*` e `nav_bar_projects`
- Locale `pt-BR` completo
- Expressive Code substituiu o Shiki (config em `astro.config.mjs`;
  CSS legado do Shiki escopado em `src/styles/markdown.css`)
- Mermaid client-side (`remark-mermaid.mjs` + `setupMermaid` em `ScriptSetup.astro`)
- Tema escuro padrão + anti-flash
- Banners SVG próprios (Grêmio tech art) + capas por post em `public/covers/`
- Pagefind REMOVIDO — busca própria (ver Stack); os componentes de busca são
  `SearchBar.svelte` e `MobileSearchBar.svelte`
- Posts usam banner "plain" (imagem sem texto por cima, mais baixo) e cabeçalho
  próprio dentro do card (`PostLayout.astro`: título, descrição rica, meta)
- Sumário lateral com scrollspy (`PostLayout.astro` + `setupToc` no `ScriptSetup.astro`)
- `<title>`/description/og:image por página (`BaseHead.astro` recebe props)

## Pendências conhecidas (TODOs do dono)

- Completar a página Sobre (`src/contents/specs/about.md` tem TODOs)
- Adicionar LinkedIn em `yukina.config.ts` (bloco comentado)
- Nota: o card "DEV NOTE" em `src/data/projects.ts` não tem repoUrl de propósito
  (repositório privado) — adicionar se um dia for tornado público
