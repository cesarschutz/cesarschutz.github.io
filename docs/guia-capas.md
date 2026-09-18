# Guia das capas do blog

Cada post tem **três SVGs** em `src/covers/<slug>/`: `wide.svg`, `card.svg`, `square.svg`.
Eles são embutidos no HTML e pintados pelo CSS do site. Este guia é a regra completa.

## 1. O que é uma boa capa aqui

Arte de **traço**, escura nos dois temas do site, como um desenho técnico luminoso.
Uma pessoa que leu o artigo tem de **reconhecer o assunto no desenho em um segundo**.

Uma capa boa:

- mostra **um motivo concreto** — um objeto ou uma cena que existe no artigo (um cadeado,
  um envelope na fila, um relógio contra um processo, um token cortado em três partes);
- tem **hierarquia**: um protagonista grande, dois a quatro elementos de apoio, nada mais;
- **preenche a tela** com folga nas bordas, sem buracos de um lado e aperto do outro;
- é **legível a 84 pixels** no formato quadrado.

Uma capa ruim — e é isto que estamos consertando:

- três caixinhas iguais penduradas numa barra, que serviriam para qualquer artigo;
- barras e retângulos genéricos ocupando espaço, com cara de tela carregando;
- desenho pequeno no meio de uma tela vazia;
- elementos desalinhados por poucos pixels, espaçamentos irregulares;
- enfeite que não quer dizer nada.

## 2. As três telas

| Arquivo | viewBox | Onde aparece | O que desenhar |
|---|---|---|---|
| `featured.svg` | `0 0 800 1000` (4:5, em pé) | destaque da home no desktop (a coluna ao lado do texto, ~380×475) | o motivo em composição vertical: o que vem antes em cima, o motivo no meio, o resultado embaixo |
| `card.svg` | `0 0 1200 600` | cards da lista, destaque no celular, relacionados, topo do post no celular, imagem de compartilhamento | o motivo completo e confortável — **comece por este** |
| `square.svg` | `0 0 800 800` | miniatura da lista (até 84px) | o mesmo motivo **maior e mais simples**; no máximo ~5 formas, nada de detalhe miúdo |
| `wide.svg` | `0 0 1600 400` | topo do post no tablet e no desktop | o motivo no centro e, nas laterais, **o que vem antes e o que vem depois** na história (quem chamou, o que saiu, a fila, o resultado) |

O `wide` **não é o card esticado**: é uma recomposição, senão sobra vazio nas pontas.
O `square` **não é o card espremido**: é uma simplificação.

## 3. Regras de traço e cor

- O **fundo não vai no SVG**. O contêiner pinta o degradê azul-petróleo, o brilho e os pontos
  de luz. O SVG traz só o desenho, com fundo transparente.
- **Nunca escrever `stroke-width`**. A espessura vem do CSS e muda conforme o tamanho em que a
  capa aparece. Use `cv-bold` no contorno do protagonista, `cv-thin` em detalhes, `cv-dash` no tracejado.
- **Nunca escrever cor**. Só as classes abaixo.

| Classe | Uso |
|---|---|
| `cv-shape` | forma principal: miolo escuro + contorno ciano |
| `cv-line` | traço ciano sem preenchimento |
| `cv-solid` | preenchimento ciano (destaque, selo, barra cheia) |
| `cv-detail` / `cv-detail-line` | detalhe interno, ciano claro |
| `cv-muted` / `cv-muted-line` | secundário (setas, base, "vs") |
| `cv-soft` / `cv-soft-line` | apoio bem apagado, quase fundo |
| `cv-ac` / `cv-ac-line` / `cv-ac-shape` | **a cor de acento** (ver abaixo) |
| `cv-ac-soft` / `cv-ac-soft-line` | acento apagado |
| `cv-cut` | recorte com a cor do fundo (texto sobre `cv-solid`) |
| `cv-white` | branco translúcido |
| `cv-text` / `cv-mono` | fonte (combine com uma classe de cor) |

### A cor de acento

A base é sempre o **ciano**. Cada capa escolhe **uma** segunda cor, declarada na raiz do SVG:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600" class="ac-violet">
```

`ac-amber` (padrão, âmbar) · `ac-violet` · `ac-green` · `ac-coral` · `ac-pink`

Escolha pelo sentido do artigo: âmbar para alerta e espera, coral para falha e risco,
verde para confirmação e saúde, violeta para transformação e abstração, rosa para
identidade e roteamento. **A mesma cor nos três arquivos do post.**

O acento marca **um papel só** na narrativa — o caminho que falha, o "antes", o que está
bloqueado, o que é escolhido. Nunca espalhe acento como enfeite: se tudo é destaque,
nada é. Regra prática: entre um quinto e um terço do desenho.

## 4. Composição

- **Alinhe de verdade.** Elementos que parecem alinhados têm de dividir exatamente a mesma
  coordenada. Trabalhe em múltiplos de 10. Espaçamento entre irmãos sempre igual.
- **Centre.** O centro do conjunto desenhado fica em 50%, 50% da tela.
- **Preencha.** Ocupação mínima medida pelo validador: `wide` 80% × 62%, `card` 76% × 66%,
  `square` 70% × 70%. E não encoste na borda (mínimo ~2% de margem).
- **Reaproveite as formas entre os três arquivos**: o mesmo cadeado, o mesmo envelope, só
  reposicionado e reescalado. Use `<g transform="translate(x y) scale(s)">`.
- **Texto**: no máximo duas palavras ou um número curto, e só quando o desenho não se explica.
  Tamanho mínimo: 24 no `wide`, 40 no `card`, 56 no `square`.

## 5. Proibido

Cores fixas (`fill="#..."`), degradês, filtros, sombras, `<image>`, `<script>`, `style="..."`,
`id=` e `<defs>` (os SVGs convivem na mesma página e os ids colidiriam), `stroke-width`.
Máximo de 8 KB por arquivo.

## 6. Como trabalhar

1. **Leia o post inteiro** em `src/content/posts/<slug>.md`.
2. Escreva para si mesmo, em uma frase, a ideia que o leitor tem de levar.
3. Escolha **um motivo concreto** que represente essa frase — algo que apareça no texto.
4. Escolha o acento e decida qual papel ele marca.
5. Desenhe `card.svg`, depois `square.svg`, depois `wide.svg`, depois `featured.svg`.
6. Valide: `node scripts/check-cover.mjs <slug>` — tem de sair **sem nenhum erro**.
7. **Olhe o resultado**: `node scripts/render-cover.mjs <slug> /tmp/<slug>.png` e abra o PNG
   com a ferramenta de leitura de arquivo. Veja se está torto, vazio, ilegível na miniatura,
   se o acento está no lugar certo. Corrija e repita até ficar bom de verdade.
8. Repita o passo 7 pelo menos uma vez depois de qualquer correção.

## 7. Referência

`src/covers/bloqueio-otimista-e-pessimista/` é o padrão aprovado: dois cadeados, o aberto em
âmbar (otimista, aposta que ninguém vai mexer) e o fechado em ciano (pessimista), com T1 e T2
chegando pela esquerda no `wide` e a linha da tabela disputada à direita. Leia esses três
arquivos antes de começar.

## 8. Erros que já foram reprovados

O dono do blog reprovou capas por estes motivos — evite-os desde o começo:

- **Desalinhado**: o desenho mais perto de uma borda do que da outra. As margens opostas têm de
  ser iguais; o validador reprova diferença maior que 2%.
- **Elemento solto flutuando**: uma peça pairando sem ligação com o resto (um relógio no ar
  acima de um cubo, por exemplo). Tudo o que está na capa tem de estar **ligado** ao motivo —
  encostado, apontando, cercando ou alinhado a um eixo comum.
- **Desenho que não tem a ver com o texto**: se o motivo serviria para qualquer outro artigo,
  está errado. Tem de vir de algo concreto que o artigo discute.
- **Formas genéricas**: caixas com linhas dentro, repetidas, sem sentido próprio. Se o desenho
  é só "N retângulos com listras", procure outro motivo.
- **Espaço em branco no texto**: ao embutir o SVG, espaços entre tags são removidos. Se precisar
  de um espaço entre dois `<tspan>`, use `&#160;` dentro do primeiro, nunca um espaço solto.
