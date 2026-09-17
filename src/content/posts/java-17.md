---
title: "Java 17 (LTS) — records, sealed classes, text blocks e switch expressions"
published: 2025-07-02T01:30:00Z
updated: 2026-09-16
description: "Do Java 12 ao 17, versão a versão: records, sealed classes, text blocks, switch expressions, pattern matching para `instanceof`, ZGC e Shenandoah em produção e o que quebra vindo do Java 11."
tags: [LTS, Linguagem, JVM, Migração]
series: java
draft: false
---

O Java 17 chegou em disponibilidade geral em **14 de setembro de 2021** ([JDK 17](https://openjdk.org/projects/jdk/17/)) e é uma versão de suporte de longo prazo (LTS). A LTS anterior é o Java 11, então quem migra atravessa de uma vez **seis releases**: Java 12 (março de 2019), 13 (setembro de 2019), 14 (março de 2020), 15 (setembro de 2020), 16 (março de 2021) e 17 (setembro de 2021). As datas estão nas páginas de cada release no OpenJDK ([12](https://openjdk.org/projects/jdk/12/), [13](https://openjdk.org/projects/jdk/13/), [14](https://openjdk.org/projects/jdk/14/), [15](https://openjdk.org/projects/jdk/15/), [16](https://openjdk.org/projects/jdk/16/), [17](https://openjdk.org/projects/jdk/17/)). Ao todo, foram 74 JEPs nesse período.

Sobre o suporte: no [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html), a Oracle informa Premier Support até setembro de 2026 e Extended Support até setembro de 2029 para o Java 17 (as duas datas com a ressalva "ou mais tarde"), e diz que dispensa a taxa do Extended Support de outubro de 2026 a setembro de 2029. A mesma página classifica como LTS as versões 8, 11, 17, 21 e 25. As versões 12 a 16 não são LTS: cada uma é substituída pela seguinte assim que ela sai.

Este artigo é para quem conhece o [Java 11](/posts/java-11/) e quer saber o que ganha e o que quebra ao subir para o 17. A ordem é esta: linha do tempo; recursos agrupados por tema (linguagem, APIs, JVM e GC, ferramentas, segurança, remoções); o que ainda estava em preview ou incubadora; os cuidados na migração; e, no fim, todas as JEPs por versão e as fontes. Cada recurso começa com a linha **Chegou em**, que mostra por quais versões ele passou até ficar pronto, e segue com o problema que resolve, o exemplo e os cuidados. O passo seguinte da série é o [Java 21](/posts/java-21/); estratégia de migração, distribuições e custos estão no [guia de atualizações do Java](/posts/guia-atualizacoes-java/).

## Linha do tempo

Boa parte dos recursos do Java 17 não chegou pronta de uma vez. O OpenJDK usa três estágios para colher feedback antes de tornar algo permanente:

- **Preview** (recursos de linguagem): pela [JEP 12](https://openjdk.org/jeps/12), o recurso está totalmente especificado e implementado, mas ainda não é permanente. Fica desligado por padrão, exige `--enable-preview` e pode mudar ou sumir na versão seguinte.
- **Incubadora** (APIs e ferramentas): pela [JEP 11](https://openjdk.org/jeps/11), a API vem num módulo `jdk.incubator.*` que, para aplicações no classpath, só é carregado com `--add-modules`.
- **Experimental** (recursos da JVM, como coletores novos): só funciona com `-XX:+UnlockExperimentalVMOptions`, como descrevem as JEPs [377](https://openjdk.org/jeps/377) e [379](https://openjdk.org/jeps/379).

O diagrama mostra por quais estágios passaram os principais recursos até o Java 17:

![Linha do tempo do Java 12 ao 17: switch expressions preview no 12 e 13 e final no 14; text blocks preview no 13 e 14 e final no 15; records e pattern matching para instanceof preview no 14 e 15 e finais no 16; sealed classes preview no 15 e 16 e final no 17; pattern matching para switch em preview no 17; Shenandoah e ZGC em produção no 15; jpackage final no 16; encapsulamento forte por padrão no 16 e definitivo no 17; foreign memory e Vector API ainda em incubadora no 17](/posts/java-17/linha-do-tempo-java-12-a-17.svg)

Na prática, tudo o que aparece como **final** ou **produção** até o Java 17 funciona sem flag de liberação (`--enable-preview`, `--add-modules` ou `-XX:+UnlockExperimentalVMOptions`). O que ainda estava em preview ou incubadora no 17 tem [seção própria](#recursos-em-preview-ou-incubadora-nesta-lts).

## Linguagem

### Switch expressions

**Chegou em:** Java 12 (preview, [JEP 325](https://openjdk.org/jeps/325)) → Java 13 (2ª preview, [JEP 354](https://openjdk.org/jeps/354)) → Java 14 (final, [JEP 361](https://openjdk.org/jeps/361))

O `switch` herdado do C tem três problemas conhecidos, todos listados na JEP 361:

- ***fall-through* por padrão**: esquecer um `break` faz a execução continuar no caso seguinte;
- **escopo único** para o bloco inteiro: uma variável declarada em um `case` é visível nos outros;
- **só existe como instrução**: muito `switch` serve apenas para atribuir um valor a uma variável, e o compilador não tem como checar se todos os casos fizeram a atribuição.

A JEP 361 traz duas mudanças independentes:

- **Rótulo `case L ->`**: executa só o que está à direita da seta, sem *fall-through*, e aceita várias constantes separadas por vírgula. À direita pode vir uma expressão, um bloco ou um `throw`.
- **`switch` como expressão**: o `switch` produz um valor. Quando o braço precisa de um bloco, o valor sai com a instrução `yield`.

```java title="SwitchExpressions.java" {28-36,39-49}
import java.time.DayOfWeek;

public class SwitchExpressions {

    // Antes (Java 11): switch como instrução, com break e variável mutável
    static int letrasAntes(DayOfWeek dia) {
        int letras;
        switch (dia) {
            case MONDAY:
            case FRIDAY:
            case SUNDAY:
                letras = 6;
                break;
            case TUESDAY:
                letras = 7;
                break;
            case THURSDAY:
            case SATURDAY:
                letras = 8;
                break;
            default:
                letras = 9;
        }
        return letras;
    }

    // Depois (Java 14+): switch como expressão, sem fall-through
    static int letras(DayOfWeek dia) {
        return switch (dia) {
            case MONDAY, FRIDAY, SUNDAY -> 6;
            case TUESDAY                -> 7;
            case THURSDAY, SATURDAY     -> 8;
            case WEDNESDAY              -> 9;
            // sem default: o compilador verifica que todas as constantes do enum foram cobertas
        };
    }

    // yield devolve o valor quando o braço precisa de um bloco
    static String classificar(int codigoHttp) {
        return switch (codigoHttp / 100) {
            case 2 -> "sucesso";
            case 4 -> {
                String tipo = codigoHttp == 404 ? "não encontrado" : "erro do cliente";
                yield tipo;
            }
            case 5 -> "erro do servidor";
            default -> throw new IllegalArgumentException("código inesperado: " + codigoHttp);
        };
    }

    public static void main(String[] args) {
        for (DayOfWeek d : DayOfWeek.values()) {
            if (letrasAntes(d) != letras(d)) throw new AssertionError(d);
        }
        System.out.println(letras(DayOfWeek.WEDNESDAY)); // 9
        System.out.println(classificar(404));            // não encontrado
    }
}
```

Dois detalhes da especificação merecem atenção:

- **Exaustividade.** Uma *switch expression* precisa cobrir todos os valores possíveis. Com `enum`, se todas as constantes estiverem listadas, o `default` pode ficar de fora. Nesse caso, o compilador insere um `default` implícito, que lança `IncompatibleClassChangeError` se o enum ganhar uma constante nova depois que o `switch` foi compilado ([JLS 17, §15.28.2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.28.2)). A JEP observa que confiar nesse `default` implícito é mais robusto do que escrever um à mão: quando o código for recompilado, o compilador acusa o caso esquecido.
- **`yield` é um identificador restrito**, como `var`: continua valendo como nome de variável, mas classes chamadas `yield` ficam proibidas, e uma chamada não qualificada a um método chamado `yield` deixa de compilar. Isso afeta, por exemplo, uma subclasse de `Thread` que chame `yield();`. O `javac` 17 responde com `invalid use of a restricted identifier 'yield'`; a correção, indicada pela JEP, é qualificar a chamada (`Thread.yield()`).

Use a forma com seta sempre que puder: ela elimina o *fall-through* acidental e deixa o compilador verificar a cobertura dos casos. No Java 17, os rótulos ainda só aceitam constantes; `case` com tipos e padrões ficou pronto no Java 21 ([pattern matching para `switch`](/posts/java-21/#pattern-matching-para-switch)).

### Text blocks

**Chegou em:** Java 13 (preview, [JEP 355](https://openjdk.org/jeps/355)) → Java 14 (2ª preview, [JEP 368](https://openjdk.org/jeps/368)) → Java 15 (final, [JEP 378](https://openjdk.org/jeps/378))

Colar JSON, SQL ou HTML num literal `"..."` exige concatenação, `\n` e escape de aspas. O text block é um literal de várias linhas delimitado por `"""`. O resultado continua sendo uma `String` comum; não existe tipo novo.

Como funciona:

- O `"""` de abertura precisa ser seguido de quebra de linha. O conteúdo começa na linha de baixo.
- A **indentação incidental**, que existe só para alinhar o texto ao código Java, é removida; a indentação além dela (a **essencial**) fica. A referência é a linha menos indentada, e a linha do `"""` de fechamento também conta.
- Os espaços no fim das linhas são removidos, e as quebras de linha são normalizadas para `\n`.
- Os escapes são processados depois da remoção da indentação. A segunda preview ([JEP 368](https://openjdk.org/jeps/368)) acrescentou dois: `\` no fim da linha, que junta a linha com a seguinte, e `\s`, que vira um espaço e impede que os espaços finais sejam cortados.

O diagrama mostra essas regras no JSON do exemplo abaixo e o efeito de mover o `"""` de fechamento:

![Diagrama: num text block com JSON, os oito espaços que alinham o texto ao código são removidos e os dois espaços extras das linhas internas são mantidos; embaixo, três casos do delimitador de fechamento: alinhado ao texto gera "olá\n", recuado duas colunas à esquerda gera dois espaços antes de "olá\n", e na mesma linha do texto gera "olá" sem quebra de linha](/posts/java-17/text-block-indentacao.svg)

Na prática, a posição do `"""` de fechamento decide duas coisas. Numa linha própria, ele faz o texto terminar com `\n` e, se ficar mais à esquerda que o texto, a diferença vira indentação no resultado. Colado à última linha, o texto termina sem quebra de linha.

```java title="TextBlocks.java"
public class TextBlocks {
    public static void main(String[] args) {
        // Antes: concatenação e escapes
        String jsonAntes = "{\n" +
                           "  \"id\": 42,\n" +
                           "  \"nome\": \"Ana\"\n" +
                           "}\n";

        // Depois (Java 15+): text block
        String json = """
                {
                  "id": 42,
                  "nome": "Ana"
                }
                """;
        System.out.println(json.equals(jsonAntes)); // true

        // \ no fim da linha junta as linhas; \s preserva o espaço final
        String sql = """
                SELECT id, nome \
                FROM cliente \
                WHERE status = ?""";
        System.out.println(sql); // SELECT id, nome FROM cliente WHERE status = ?

        String colunas = """
                id  \s
                nome\s
                """;
        System.out.print(colunas.replace(' ', '.')); // id... e nome. (em duas linhas)

        // String::formatted (Java 15) ajuda a preencher valores
        String saudacao = """
                Olá, %s!
                Seu pedido %d foi confirmado.
                """.formatted("Ana", 1234);
        System.out.print(saudacao); // Olá, Ana! e Seu pedido 1234 foi confirmado. (em duas linhas)
    }
}
```

A JEP 378 deixa claro que text blocks **não fazem interpolação** de variáveis. Para preencher valores, ela aponta `String::formatted`, que chegou no mesmo Java 15. (Os String Templates, que tentaram trazer interpolação, foram preview no Java 21 e 22 e acabaram retirados; veja o [post do Java 25](/posts/java-25/#string-templates-foram-retirados).)

### Records

**Chegou em:** Java 14 (preview, [JEP 359](https://openjdk.org/jeps/359)) → Java 15 (2ª preview, [JEP 384](https://openjdk.org/jeps/384)) → Java 16 (final, [JEP 395](https://openjdk.org/jeps/395))

Uma classe que só carrega dados costuma precisar de construtor, getters, `equals`, `hashCode` e `toString`. É código repetitivo e fácil de dessincronizar quando alguém inclui um campo e esquece do `equals`. A JEP 395 define records como classes que são **portadores transparentes de dados imutáveis**: a declaração diz qual é o estado (os **componentes**, listados entre parênteses), e o compilador deriva o resto, como mostra o diagrama.

![Diagrama: a declaração record Dinheiro(BigDecimal valor, String moeda) gera classe final que estende java.lang.Record, campos private final, construtor canônico, acessores valor() e moeda(), e equals, hashCode e toString; restrições: sem extends, final, sem campos de instância extras, campos final, sem métodos native](/posts/java-17/record-o-que-o-compilador-gera.svg)

O **construtor canônico** é o que recebe todos os componentes, na ordem da declaração. Para validar ou normalizar valores, você não precisa reescrevê-lo inteiro: basta um **construtor compacto**, que é o canônico sem a lista de parâmetros. Os parâmetros ficam implícitos, e as atribuições aos campos acontecem sozinhas no fim do construtor. Desde a segunda preview, atribuir a um campo de instância dentro dele é erro de compilação; para normalizar, reatribua o parâmetro, como `moeda` no exemplo.

```java title="Records.java" {11-18}
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

public class Records {

    // Um record declara o estado; o compilador gera construtor, acessores, equals, hashCode e toString
    record Dinheiro(BigDecimal valor, String moeda) implements Comparable<Dinheiro> {

        // Construtor compacto: valida (e pode normalizar) os parâmetros antes da atribuição implícita
        Dinheiro {
            Objects.requireNonNull(valor, "valor");
            Objects.requireNonNull(moeda, "moeda");
            if (valor.signum() < 0) {
                throw new IllegalArgumentException("valor negativo: " + valor);
            }
            moeda = moeda.toUpperCase();
        }

        // Métodos estáticos de fábrica e métodos de instância são permitidos
        static Dinheiro reais(String valor) {
            return new Dinheiro(new BigDecimal(valor), "brl");
        }

        Dinheiro somar(Dinheiro outro) {
            if (!moeda.equals(outro.moeda)) {
                throw new IllegalArgumentException("moedas diferentes");
            }
            return new Dinheiro(valor.add(outro.valor), moeda);
        }

        @Override
        public int compareTo(Dinheiro outro) {
            return valor.compareTo(outro.valor);
        }
    }

    public static void main(String[] args) {
        Dinheiro a = Dinheiro.reais("10.50");
        Dinheiro b = new Dinheiro(new BigDecimal("10.50"), "BRL");

        System.out.println(a);             // Dinheiro[valor=10.50, moeda=BRL]
        System.out.println(a.equals(b));   // true
        System.out.println(a.valor());     // 10.50 (acessor sem o prefixo get)
        System.out.println(a.somar(b));    // Dinheiro[valor=21.00, moeda=BRL]

        // Record local (declarado dentro do método): útil para resultados intermediários
        record Linha(String produto, int quantidade) {}
        List<Linha> linhas = List.of(new Linha("café", 2), new Linha("pão", 5));
        System.out.println(linhas.stream().mapToInt(Linha::quantidade).sum()); // 7
    }
}
```

O que mudou entre as previews e a versão final, segundo o histórico da JEP 395:

- A **segunda preview** (Java 15) passou a permitir records, enums e interfaces **locais**, ampliou `@Override` para acessores declarados explicitamente e relaxou a regra que obrigava o construtor canônico a ser `public`.
- A **versão final** (Java 16) passou a permitir membros `static` em classes internas, o que inclui declarar um record dentro de uma classe interna.

Records não servem para classes que precisam de estado mutável ou de herança: pela própria JEP, os campos são `final` e o record não pode estender outra classe. E a imutabilidade é **rasa**, porque `final` protege a referência e não o objeto: um componente `List` continua mutável se a lista recebida for mutável. Quando isso importa, faça cópia defensiva no construtor compacto (por exemplo, com `List.copyOf`).

A reflexão ganhou `Class::isRecord` e `Class::getRecordComponents`, ambos desde o Java 16 ([Javadoc de `Class`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Class.html)). No Java 21, os records ganharam também os [record patterns](/posts/java-21/#record-patterns), que extraem os componentes direto num `instanceof` ou num `switch`.

### Pattern matching para `instanceof`

**Chegou em:** Java 14 (preview, [JEP 305](https://openjdk.org/jeps/305)) → Java 15 (2ª preview, [JEP 375](https://openjdk.org/jeps/375)) → Java 16 (final, [JEP 394](https://openjdk.org/jeps/394))

O idioma "testa o tipo, faz o cast e guarda numa variável" repete o nome do tipo três vezes e abre espaço para cast errado. Com a JEP 394, o `instanceof` aceita um **padrão de tipo**: se o teste passa, a variável já está declarada com o tipo certo.

```java title="PatternInstanceof.java" {21-25,35-38}
public class PatternInstanceof {

    static final class Ponto {
        private final int x;
        private final int y;

        Ponto(int x, int y) {
            this.x = x;
            this.y = y;
        }

        // Antes (Java 11)
        boolean equalsAntes(Object o) {
            if (!(o instanceof Ponto)) return false;
            Ponto outro = (Ponto) o;
            return x == outro.x && y == outro.y;
        }

        // Depois (Java 16+): teste, cast e declaração em um só passo
        @Override
        public boolean equals(Object o) {
            return o instanceof Ponto outro
                    && x == outro.x
                    && y == outro.y;
        }

        @Override
        public int hashCode() {
            return 31 * x + y;
        }
    }

    static String descrever(Object valor) {
        // Escopo por fluxo: depois do return, 's' está garantidamente definido
        if (!(valor instanceof String s)) {
            return "não é texto";
        }
        return "texto com " + s.length() + " caracteres";
    }

    public static void main(String[] args) {
        Ponto p = new Ponto(1, 2);
        System.out.println(p.equals(new Ponto(1, 2)) && p.equalsAntes(new Ponto(1, 2))); // true
        System.out.println(descrever("Java 17")); // texto com 7 caracteres
        System.out.println(descrever(17));        // não é texto
    }
}
```

A variável de padrão tem **escopo por fluxo**: existe só onde o compilador consegue provar que o teste passou. Por isso `o instanceof Ponto outro && x == outro.x` compila, e com `||` não compilaria. Em `descrever`, a negação seguida de `return` faz `s` valer no restante do método.

A versão final trouxe dois refinamentos em relação às previews. A variável de padrão deixou de ser implicitamente `final`. E virou erro de compilação usar um padrão cujo tipo a expressão já garante, porque o teste seria sempre verdadeiro: com `String s`, o `javac` 17 rejeita `s instanceof CharSequence cs` com `expression type String is a subtype of pattern type CharSequence`.

### Sealed classes

**Chegou em:** Java 15 (preview, [JEP 360](https://openjdk.org/jeps/360)) → Java 16 (2ª preview, [JEP 397](https://openjdk.org/jeps/397)) → Java 17 (final, [JEP 409](https://openjdk.org/jeps/409))

Antes do Java 17, uma hierarquia ficava entre dois extremos: `final` (ninguém estende) ou aberta (qualquer um estende). Não havia como dizer "uma `Forma` é um círculo, um quadrado ou um polígono, e mais nada". A JEP 409 permite que o autor de uma classe ou interface declare exatamente quais subtipos ela aceita. O diagrama mostra a hierarquia do exemplo abaixo:

![Diagrama: sealed interface Forma permite Circulo e Quadrado (records, final) e Poligono (non-sealed, que reabre a hierarquia para Triangulo e qualquer outra classe); um record Hexagono fora de permits causa erro de compilação](/posts/java-17/sealed-hierarquia.svg)

```java title="Sealed.java" {6,9,11,14}
import java.util.Arrays;

public class Sealed {

    // Só as classes listadas em permits podem implementar Forma
    sealed interface Forma permits Circulo, Quadrado, Poligono {}

    // Records são implicitamente final
    record Circulo(double raio) implements Forma {}

    record Quadrado(double lado) implements Forma {}

    // non-sealed reabre a hierarquia a partir deste ponto
    non-sealed static abstract class Poligono implements Forma {
        abstract double area();
    }

    static final class Triangulo extends Poligono {
        private final double base;
        private final double altura;

        Triangulo(double base, double altura) {
            this.base = base;
            this.altura = altura;
        }

        @Override
        double area() {
            return base * altura / 2;
        }
    }

    // No Java 17 (sem preview) ainda usamos instanceof; o compilador não exige exaustividade aqui
    static double area(Forma forma) {
        if (forma instanceof Circulo c) return Math.PI * c.raio() * c.raio();
        if (forma instanceof Quadrado q) return q.lado() * q.lado();
        if (forma instanceof Poligono p) return p.area();
        throw new AssertionError("inalcançável: " + forma);
    }

    public static void main(String[] args) {
        System.out.println(area(new Quadrado(3)));         // 9.0
        System.out.println(area(new Triangulo(4, 5)));     // 10.0
        System.out.println(Forma.class.isSealed());        // true
        System.out.println(Arrays.toString(
                Forma.class.getPermittedSubclasses())); // [class Sealed$Circulo, class Sealed$Quadrado, class Sealed$Poligono]
    }
}
```

As regras da JEP 409:

- Cada subtipo permitido declara **exatamente um** entre `final`, `sealed` e `non-sealed`. Records já são `final`.
- A classe selada e seus subtipos precisam estar no **mesmo módulo** ou, no módulo sem nome (classpath), no **mesmo pacote**.
- Se os subtipos estiverem no mesmo arquivo-fonte, `permits` pode ser omitido e o compilador infere a lista.
- Classes anônimas e locais não podem ser subtipos permitidos.
- Na reflexão, `Class::isSealed` e `Class::getPermittedSubclasses` existem desde o Java 17.

Quando usar: em hierarquias fechadas por natureza, como os resultados possíveis de uma operação, os eventos de um domínio ou os nós de uma árvore de expressões. Juntos, records e sealed classes descrevem dados do tipo "é um destes casos, e cada caso tem estes campos" (o que a literatura chama de tipos algébricos).

A JEP apresenta sealed classes também como base para a **exaustividade** no pattern matching: se o compilador conhece todos os subtipos, pode acusar erro quando um deles não foi tratado. No Java 17 essa parte ainda não estava pronta, porque o `switch` com padrões era preview ([veja abaixo](#pattern-matching-para-switch)). Por isso o exemplo usa `instanceof` e termina com um `throw` que o compilador não consegue provar inalcançável. A combinação completa ficou final no Java 21 ([pattern matching para `switch`](/posts/java-21/#pattern-matching-para-switch)).

### Semântica de ponto flutuante sempre estrita

**Chegou em:** Java 17 (final, [JEP 306](https://openjdk.org/jeps/306))

Desde o Java 1.2 havia dois modos de ponto flutuante: o padrão e o estrito (`strictfp`). A diferença existia por limitações dos coprocessadores x87 da época, segundo a JEP. A JEP 306 volta a ter um só modo, o estrito, que é a semântica original da linguagem. O modificador `strictfp` continua válido, mas não muda mais nada, e a JEP prevê um aviso de lint do `javac` para usos desnecessários dele. No Temurin 17.0.20, esse aviso aparece sem nenhuma opção extra: `warning: [strictfp] as of release 17, all floating-point expressions are evaluated strictly and 'strictfp' is not required`.

## APIs da biblioteca padrão

Nem toda mudança de API vem de JEP. As abaixo estão confirmadas pelo `@since` no [Javadoc do Java 17](https://docs.oracle.com/en/java/javase/17/docs/api/) e, quando indicado, pelas release notes da Oracle.

### Novos métodos em `String` e `CharSequence`

**Chegou em:** Java 12 (final) e Java 15 (final), sem JEP

`indent` e `transform` são do Java 12; `stripIndent`, `translateEscapes`, `formatted` e `CharSequence.isEmpty` são do Java 15 ([Javadoc de `String`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/String.html), [Javadoc de `CharSequence`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/CharSequence.html) e [release notes do JDK 15](https://www.oracle.com/java/technologies/javase/15-relnote-issues.html)). `stripIndent` e `translateEscapes` expõem os algoritmos que o compilador aplica nos text blocks, o que é útil quando o texto vem de fora do código-fonte. `Collectors.teeing` ([Javadoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Collectors.html), Java 12) aplica dois coletores sobre o mesmo stream e combina os resultados.

```java title="NovasApisString.java"
import java.util.List;
import java.util.function.Predicate;
import java.util.stream.Collectors;

public class NovasApisString {
    public static void main(String[] args) {
        // Java 12: indent ajusta a indentação de cada linha (e normaliza o fim de linha para \n)
        System.out.print("linha 1\nlinha 2".indent(4)); // "    linha 1" e "    linha 2" (em duas linhas)

        // Java 12: transform aplica uma função à própria String, útil para encadear
        int tamanho = "  java  ".transform(String::strip).transform(String::length);
        System.out.println(tamanho); // 4

        // Java 15: stripIndent e translateEscapes, os mesmos algoritmos usados nos text blocks
        System.out.println("   a\n     b".stripIndent().replace(' ', '.')); // a e ..b (em duas linhas)
        System.out.println("coluna1\\tcoluna2".translateEscapes());          // coluna1<TAB>coluna2

        // Java 15: CharSequence.isEmpty como default method, útil em method references
        List<StringBuilder> buffers = List.of(new StringBuilder(), new StringBuilder("x"));
        System.out.println(buffers.stream().filter(Predicate.not(StringBuilder::isEmpty)).count()); // 1

        // Java 12: Collectors.teeing combina dois coletores em um único resultado
        record Resumo(long quantidade, double media) {}
        Resumo resumo = List.of(10, 20, 30).stream()
                .collect(Collectors.teeing(
                        Collectors.counting(),
                        Collectors.averagingInt(Integer::intValue),
                        Resumo::new));
        System.out.println(resumo); // Resumo[quantidade=3, media=20.0]
    }
}
```

### `Stream.toList` e `Stream.mapMulti`

**Chegou em:** Java 16 (final), sem JEP

Os dois métodos estão no [Javadoc de `Stream`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Stream.html) e nas [release notes do JDK 16](https://www.oracle.com/java/technologies/javase/16-relnote-issues.html). `toList()` substitui o `collect(Collectors.toList())` na maior parte dos casos, com uma diferença importante: pelo Javadoc, a lista devolvida é **não modificável**, e qualquer método de mutação lança `UnsupportedOperationException`. Já o Javadoc de `Collectors.toList()` não dá garantia nenhuma sobre tipo ou mutabilidade da lista. Na prática, código que adiciona elementos à lista depois de coletar vai falhar se a troca for feita às cegas.

`mapMulti` é uma alternativa ao `flatMap`: em vez de devolver um `Stream` por elemento, você recebe um `Consumer` e emite quantos elementos quiser. Pelo Javadoc, ele é preferível quando cada elemento vira poucos elementos (ou nenhum), porque evita criar um `Stream` por grupo, e quando é mais fácil gerar os resultados com código imperativo. Com lambda, às vezes é preciso informar o tipo de saída, como o `<String>` no exemplo.

```java title="NovasApisStream.java"
import java.util.List;
import java.util.stream.Collectors;

public class NovasApisStream {
    record Pedido(String id, List<String> itens) {}

    public static void main(String[] args) {
        List<Pedido> pedidos = List.of(
                new Pedido("p1", List.of("café", "pão")),
                new Pedido("p2", List.of()),
                new Pedido("p3", List.of("leite")));

        // Java 11: collect(Collectors.toList())
        List<String> idsAntes = pedidos.stream().map(Pedido::id).collect(Collectors.toList());

        // Java 16: Stream.toList() devolve uma lista não modificável
        List<String> ids = pedidos.stream().map(Pedido::id).toList();
        System.out.println(ids.equals(idsAntes)); // true
        try {
            ids.add("p4");
        } catch (UnsupportedOperationException e) {
            System.out.println("lista não modificável");
        }

        // Java 16: mapMulti emite zero ou mais elementos por entrada, sem criar Streams intermediários
        List<String> itens = pedidos.stream()
                .<String>mapMulti((pedido, emitir) -> {
                    for (String item : pedido.itens()) {
                        emitir.accept(pedido.id() + ":" + item);
                    }
                })
                .toList();
        System.out.println(itens); // [p1:café, p1:pão, p3:leite]
    }
}
```

### `Files.mismatch`, formatação compacta de números e período do dia

**Chegou em:** Java 12 (final) e Java 16 (final), sem JEP

`Files.mismatch` e `CompactNumberFormat` são do Java 12; o padrão `B` (período do dia) em `DateTimeFormatter` é do Java 16. Fontes: [Javadoc de `Files`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/file/Files.html), [Javadoc de `CompactNumberFormat`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/text/CompactNumberFormat.html), [release notes do JDK 12](https://www.oracle.com/java/technologies/javase/12-relnote-issues.html) e [do JDK 16](https://www.oracle.com/java/technologies/javase/16-relnote-issues.html).

```java title="NovasApisDiversas.java"
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.NumberFormat;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class NovasApisDiversas {
    public static void main(String[] args) throws IOException {
        // Java 12: formatação compacta de números
        NumberFormat curto = NumberFormat.getCompactNumberInstance(Locale.US, NumberFormat.Style.SHORT);
        System.out.println(curto.format(1_500));      // 2K (arredonda)
        System.out.println(curto.format(2_000_000));  // 2M

        // Java 12: Files.mismatch devolve -1 se os arquivos forem iguais, ou a posição do primeiro byte diferente
        Path a = Files.writeString(Files.createTempFile("a", ".txt"), "java 17");
        Path b = Files.writeString(Files.createTempFile("b", ".txt"), "java 11");
        System.out.println(Files.mismatch(a, a)); // -1
        System.out.println(Files.mismatch(a, b)); // 6

        // Java 16: padrão "B" (período do dia)
        DateTimeFormatter periodo = DateTimeFormatter.ofPattern("h:mm B", Locale.US);
        System.out.println(periodo.format(LocalTime.of(15, 30))); // 3:30 in the afternoon
    }
}
```

### `HexFormat`, `InstantSource` e novos geradores pseudoaleatórios

**Chegou em:** Java 17 (final, [JEP 356](https://openjdk.org/jeps/356))

A JEP 356 cobre os geradores pseudoaleatórios. `HexFormat` e `InstantSource` chegaram no mesmo Java 17 sem JEP e estão nas [release notes do JDK 17](https://www.oracle.com/java/technologies/javase/17-relnote-issues.html).

- **`java.util.HexFormat`** converte bytes e primitivos de e para hexadecimal, com delimitador, prefixo, sufixo e maiúsculas configuráveis. Dispensa os utilitários caseiros de conversão para hexadecimal.
- **`java.time.InstantSource`** é a parte do `Clock` que só sabe dizer o instante atual, sem fuso horário. `Clock` passou a implementá-la. Serve como dependência de código que precisa do "agora" e deve ser testável.
- **JEP 356** cria a interface `RandomGenerator`, implementada por `Random`, `SecureRandom`, `SplittableRandom` e `ThreadLocalRandom`. Também cria as especializações aninhadas `RandomGenerator.StreamableGenerator`, `SplittableGenerator`, `JumpableGenerator`, `LeapableGenerator` e `ArbitrarilyJumpableGenerator` ([Javadoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/random/RandomGenerator.html)), a fábrica `RandomGeneratorFactory` e a família de algoritmos LXM. Trocar de algoritmo vira questão de nome.

```java title="NovasApisJava17.java"
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.InstantSource;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.random.RandomGenerator;
import java.util.random.RandomGeneratorFactory;

public class NovasApisJava17 {

    // InstantSource: dependa só do "agora", sem fuso horário; em teste injete um relógio fixo
    static final class Token {
        private final InstantSource relogio;

        Token(InstantSource relogio) {
            this.relogio = relogio;
        }

        boolean expirado(Instant expiraEm) {
            return relogio.instant().isAfter(expiraEm);
        }
    }

    public static void main(String[] args) {
        // HexFormat
        HexFormat hex = HexFormat.ofDelimiter(":").withUpperCase();
        String formatado = hex.formatHex("Java".getBytes(StandardCharsets.UTF_8));
        System.out.println(formatado);                                   // 4A:61:76:61
        System.out.println(new String(hex.parseHex(formatado), StandardCharsets.UTF_8)); // Java
        System.out.println(HexFormat.of().toHexDigits((byte) 255));      // ff

        // InstantSource
        Instant fixo = Instant.parse("2021-09-14T12:00:00Z");
        Token token = new Token(InstantSource.fixed(fixo));
        System.out.println(token.expirado(fixo.minusSeconds(1)));        // true
        new Token(InstantSource.system());                               // em produção

        // Clock também é um InstantSource
        InstantSource clock = java.time.Clock.fixed(fixo, ZoneOffset.UTC);
        System.out.println(clock.millis() == fixo.toEpochMilli());      // true

        // RandomGenerator (JEP 356)
        RandomGenerator padrao = RandomGenerator.getDefault();
        RandomGenerator lxm = RandomGenerator.of("L64X128MixRandom");
        System.out.println(padrao.nextInt(1, 7) >= 1);                   // true
        System.out.println(lxm.getClass().getSimpleName());              // L64X128MixRandom
        RandomGeneratorFactory.all()
                .map(RandomGeneratorFactory::name)
                .sorted()
                .forEach(nome -> System.out.print(nome + " "));
        System.out.println();
    }
}
```

Na execução deste exemplo com o Temurin 17.0.20, `RandomGeneratorFactory.all()` listou `L128X1024MixRandom`, `L128X128MixRandom`, `L128X256MixRandom`, `L32X64MixRandom`, `L64X1024MixRandom`, `L64X128MixRandom`, `L64X128StarStarRandom`, `L64X256MixRandom`, `Random`, `SecureRandom`, `SplittableRandom`, `Xoroshiro128PlusPlus` e `Xoshiro256PlusPlus`.

### Unix-domain sockets

**Chegou em:** Java 16 (final, [JEP 380](https://openjdk.org/jeps/380))

A JEP 380 adiciona suporte a sockets `AF_UNIX` em `SocketChannel` e `ServerSocketChannel`, com a nova classe `UnixDomainSocketAddress` e a constante `StandardProtocolFamily.UNIX`. A motivação da JEP: para comunicação entre processos na mesma máquina, esses sockets são mais seguros e mais eficientes que conexões TCP/IP de loopback, aceitam só conexões locais e são protegidos pelo controle de acesso do sistema de arquivos. A JEP cita também a comunicação entre contêineres no mesmo host, por meio de volumes compartilhados.

```java title="UnixSocket.java"
import java.net.StandardProtocolFamily;
import java.net.UnixDomainSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class UnixSocket {
    public static void main(String[] args) throws Exception {
        Path arquivo = Path.of(System.getProperty("java.io.tmpdir"), "app.sock");
        Files.deleteIfExists(arquivo);
        var endereco = UnixDomainSocketAddress.of(arquivo);

        try (var servidor = ServerSocketChannel.open(StandardProtocolFamily.UNIX)) {
            servidor.bind(endereco);

            try (var cliente = SocketChannel.open(endereco);
                 var conexao = servidor.accept()) {
                cliente.write(StandardCharsets.UTF_8.encode("ping"));
                ByteBuffer buffer = ByteBuffer.allocate(16);
                conexao.read(buffer);
                buffer.flip();
                System.out.println(StandardCharsets.UTF_8.decode(buffer)); // ping
            }
        } finally {
            Files.deleteIfExists(arquivo);
        }
    }
}
```

### Hidden classes e JVM Constants API

**Chegou em:** Java 15 (final, [JEP 371](https://openjdk.org/jeps/371)) e Java 12 (final, [JEP 334](https://openjdk.org/jeps/334))

Os dois recursos interessam mais a quem escreve frameworks e compiladores do que ao código de aplicação:

- **Hidden classes (JEP 371)** são classes que o bytecode de outras classes não consegue referenciar diretamente. São criadas com `MethodHandles.Lookup::defineHiddenClass` e podem ser descarregadas de forma independente. Servem para frameworks que geram classes em tempo de execução e as usam por reflexão. A mesma JEP depreciou o não padrão `sun.misc.Unsafe::defineAnonymousClass`, que foi removido no Java 17 ([release notes do JDK 17](https://www.oracle.com/java/technologies/javase/17-relnote-issues.html)).
- **JVM Constants API (JEP 334)** cria o pacote `java.lang.constant`, com tipos que descrevem as constantes de um *class file* só pelo nome, sem carregar classes: `ClassDesc`, `MethodTypeDesc` e afins. Serve a ferramentas que leem ou geram bytecode. `String`, `Class` e outros tipos passaram a implementar `Constable`.

### Avisos para value-based classes

**Chegou em:** Java 16 (depreciado para remoção, [JEP 390](https://openjdk.org/jeps/390))

Pela JEP 390, classes *value-based* representam objetos imutáveis cuja identidade não importa para o comportamento da classe, como `Optional` e `LocalDate`. Código que depende da identidade dessas instâncias, com `==` ou `synchronized`, está usando a classe de forma errada. A JEP prepara o terreno para o Project Valhalla, que pretende migrar essas classes para tipos sem identidade ([Project Valhalla](https://openjdk.org/projects/valhalla/)).

O que a JEP 390 muda:

- **Wrappers primitivos** (`Integer`, `Long` etc.) passam a ser *value-based*, e os seus construtores ficam depreciados **para remoção**. `new Integer(42)` gera aviso de remoção; o caminho é `Integer.valueOf(42)` ou autoboxing.
- **No compilador**, a nova categoria de lint `synchronization`, ligada por padrão, avisa quando se usa `synchronized` sobre uma instância de classe value-based.
- **Em tempo de execução**, `-XX:DiagnoseSyncOnValueBasedClasses=1` transforma essa sincronização em erro fatal, e `=2` liga o registro no console e em eventos do JFR. É uma opção de diagnóstico: no Java 17, a JVM só a aceita junto com `-XX:+UnlockDiagnosticVMOptions`.

## JVM, GC e desempenho

A tabela resume o que mudou na coleta de lixo. O G1 continua sendo o coletor padrão: as JEPs [377](https://openjdk.org/jeps/377) e [379](https://openjdk.org/jeps/379) dizem explicitamente que não mudam isso.

| Coletor | Mudança | Versão | Fonte |
| --- | --- | --- | --- |
| G1 | Coletas mistas abortáveis quando podem estourar a meta de pausa | 12 | [344](https://openjdk.org/jeps/344) |
| G1 | Devolve ao SO a memória não usada quando a aplicação está ociosa | 12 | [346](https://openjdk.org/jeps/346) |
| G1 | Alocação consciente de NUMA, ativada com `-XX:+UseNUMA` | 14 | [345](https://openjdk.org/jeps/345) |
| G1 | *Uncommit* feito de forma concorrente, fora da pausa | 16 | [release notes](https://www.oracle.com/java/technologies/javase/16-relnote-issues.html) |
| Shenandoah | Entra como experimental | 12 | [189](https://openjdk.org/jeps/189) |
| Shenandoah | Vira recurso de produção | 15 | [379](https://openjdk.org/jeps/379) |
| ZGC | Devolve memória não usada ao SO (ainda experimental) | 13 | [351](https://openjdk.org/jeps/351) |
| ZGC | Portado para macOS e Windows (experimental) | 14 | [364](https://openjdk.org/jeps/364), [365](https://openjdk.org/jeps/365) |
| ZGC | Vira recurso de produção | 15 | [377](https://openjdk.org/jeps/377) |
| ZGC | Processamento de pilhas de threads concorrente | 16 | [376](https://openjdk.org/jeps/376) |
| CMS | Removido | 14 | [363](https://openjdk.org/jeps/363) |
| Parallel | Combinação ParallelScavenge + SerialOld depreciada | 14 | [366](https://openjdk.org/jeps/366) |
| Parallel | Opção `UseParallelOldGC` removida: a combinação deixa de poder ser selecionada | 16 | [manual do `java` 16](https://docs.oracle.com/en/java/javase/16/docs/specs/man/java.html) |

### ZGC e Shenandoah em produção

**Chegou em:** Java 15 (final, [JEP 377](https://openjdk.org/jeps/377) e [JEP 379](https://openjdk.org/jeps/379))

A JEP 377 torna o ZGC recurso de produção, e a JEP 379 faz o mesmo com o Shenandoah. O ZGC tinha entrado como experimental no Java 11 ([JEP 333](https://openjdk.org/jeps/333) e [post do Java 11](/posts/java-11/#recursos-em-preview-ou-incubadora-nesta-lts)); o Shenandoah, no Java 12 ([JEP 189](https://openjdk.org/jeps/189)). Os dois são coletores concorrentes de baixa latência: fazem quase todo o trabalho com a aplicação rodando, em vez de pará-la.

Pela JEP 189, as pausas do Shenandoah não dependem do tamanho do heap, e o coletor é indicado para aplicações que priorizam tempo de resposta e pausas curtas e previsíveis; outros algoritmos priorizam vazão (*throughput*) ou uso de memória. Como o G1 continua sendo o padrão, adotar um dos dois é uma escolha explícita, que vale medir com a carga real da aplicação. No Java 11, usar o ZGC exigia `-XX:+UnlockExperimentalVMOptions -XX:+UseZGC`. A partir do Java 15, basta a flag do coletor:

```bash
# Java 15+: sem UnlockExperimentalVMOptions
java -XX:+UseZGC -jar app.jar
java -XX:+UseShenandoahGC -jar app.jar
```

Atenção à distribuição: o Shenandoah não vem em todo JDK. Pela [página do Shenandoah na wiki do OpenJDK](https://wiki.openjdk.org/display/shenandoah/Main), a Oracle não o inclui em nenhuma versão, nem nos builds OpenJDK nem nos proprietários; a mesma página lista distribuições que o incluem, como Amazon Corretto, Azul Zulu e os binários da AdoptOpenJDK. No Temurin 17.0.20, a JVM inicia normalmente com `-XX:+UseShenandoahGC`. Confira a distribuição antes de adotar a flag.

No Java 16, a [JEP 376](https://openjdk.org/jeps/376) reduziu ainda mais as pausas do ZGC. Uma *safepoint* é um ponto em que a JVM para todas as threads da aplicação para fazer um trabalho que exige o estado congelado. As operações do ZGC que crescem com o tamanho do heap e do metaspace já rodavam fora delas; faltava o processamento por thread, como a varredura das pilhas, que cresce com o número de threads. A JEP 376 levou esse trabalho para uma fase concorrente. A meta declarada é gastar menos de um milissegundo dentro das safepoints do ZGC em máquinas típicas. É uma meta de projeto, não um benchmark.

Os dois coletores continuaram evoluindo: o ZGC ganhou um modo geracional no [Java 21](/posts/java-21/#zgc-geracional), e o modo geracional do Shenandoah virou recurso de produção no [Java 25](/posts/java-25/#shenandoah-geracional).

### G1 devolvendo memória

**Chegou em:** Java 12 (final, [JEP 346](https://openjdk.org/jeps/346))

Antes desta JEP, o G1 só devolvia memória do heap numa full GC ou num ciclo concorrente, o que podia não acontecer por muito tempo. A motivação da JEP destaca o custo disso em contêineres cobrados por uso. A JEP 346 faz o G1 disparar coletas periódicas quando a aplicação está ociosa e devolver ao sistema operacional a memória que sobrou. O recurso vem **desligado**: é ativado com `-XX:G1PeriodicGCInterval=<ms>`, e `-XX:G1PeriodicGCSystemLoadThreshold` evita a coleta quando a carga do sistema está alta. No Java 16, esse *uncommit* passou a rodar numa thread concorrente, fora da pausa ([release notes do JDK 16](https://www.oracle.com/java/technologies/javase/16-relnote-issues.html)).

### Class Data Sharing padrão e dinâmico

**Chegou em:** Java 12 (final, [JEP 341](https://openjdk.org/jeps/341)) e Java 13 (final, [JEP 350](https://openjdk.org/jeps/350))

O Class Data Sharing (CDS) guarda num arquivo classes já carregadas e processadas, que a JVM reaproveita na partida em vez de repetir o trabalho. A JEP 350 cita ganhos de tempo de inicialização e de memória, mas não publica números. Duas mudanças simplificaram o uso:

- **Java 12 (JEP 341):** o próprio build do JDK passa a gerar um arquivo com as classes de uma lista padrão. Ele é usado automaticamente, porque `-Xshare:auto` já era o padrão desde o Java 11. Para desligar, use `-Xshare:off`.
- **Java 13 (JEP 350):** um arquivo com as classes da **sua** aplicação pode ser gerado ao fim de uma execução. No Java 11, o AppCDS exigia três passos, com uma lista de classes intermediária ([post do Java 11](/posts/java-11/#application-class-data-sharing-appcds)); agora são dois:

```bash
# 1. gera o arquivo ao encerrar a aplicação (JEP 350)
java -XX:ArchiveClassesAtExit=app.jsa -jar app.jar

# 2. usa o arquivo nas execuções seguintes
java -XX:SharedArchiveFile=app.jsa -jar app.jar
```

A mesma ideia de reaproveitar trabalho feito antes da partida foi ampliada pelo Projeto Leyden no Java 24 e 25, com o cache AOT ([post do Java 25](/posts/java-25/#cache-aot-inicialização-e-warmup-mais-rápidos-projeto-leyden)).

### Outras mudanças na JVM

- **Elastic Metaspace** (Java 16, [JEP 387](https://openjdk.org/jeps/387)): devolve ao SO mais rápido a memória de metadados de classes (metaspace) e reduz o consumo dessa área. A motivação da JEP cita aplicações com muitos class loaders pequenos e com carga e descarga intensa de classes.
- **Biased locking desligado** (Java 15, [JEP 374](https://openjdk.org/jeps/374)): *biased locking* é uma otimização da HotSpot que reduz o custo de um lock sem disputa, supondo que ele continua com a mesma thread até outra tentar adquiri-lo. Ela deixa de ser habilitada por padrão, e as flags relacionadas ficam depreciadas. `-XX:+UseBiasedLocking` ainda funciona, mas gera aviso. A JEP argumenta que os ganhos eram de aplicações antigas, que sincronizam em toda operação (`Hashtable`, `Vector`), e que o código de biased locking era caro de manter. No Java 18, as flags ficaram obsoletas: geram aviso e são ignoradas ([release notes do JDK 18](https://www.oracle.com/java/technologies/javase/18-relnote-issues.html) e [post do Java 21](/posts/java-21/#outras-remoções-e-depreciações)).
- **Novas implementações de `Socket` e `DatagramSocket`** (Java 13, [JEP 353](https://openjdk.org/jeps/353); Java 15, [JEP 373](https://openjdk.org/jeps/373)): o código antigo, uma mistura de Java e C, foi substituído por implementações mais simples e fáceis de manter, que as JEPs descrevem como fáceis de adaptar às threads leves do Project Loom. Essas threads chegaram como [virtual threads no Java 21](/posts/java-21/#virtual-threads). Para reduzir o risco, as JEPs mantiveram as implementações antigas acessíveis pelas propriedades `jdk.net.usePlainSocketImpl` (Java 13) e `jdk.net.usePlainDatagramSocketImpl` (Java 15).

## Ferramentas

### NullPointerException com mensagem útil

**Chegou em:** Java 14 (final, [JEP 358](https://openjdk.org/jeps/358))

No Java 11, um NPE em `cliente.endereco().cidade().toUpperCase()` não diz qual parte da cadeia era `null`. A JEP 358 faz a JVM analisar o bytecode no momento da exceção e montar uma mensagem com a ação que falhou e o caminho que produziu o `null`. No Java 14 era preciso ligar com `-XX:+ShowCodeDetailsInExceptionMessages`; no Java 15 a flag passou a vir ligada ([release notes do JDK 15](https://www.oracle.com/java/technologies/javase/15-relnote-issues.html)).

```java title="HelpfulNpe.java"
public class HelpfulNpe {
    record Endereco(String cidade) {}
    record Cliente(String nome, Endereco endereco) {}

    public static void main(String[] args) {
        Cliente cliente = new Cliente("Ana", null);
        // Java 11: apenas "java.lang.NullPointerException"
        // Java 15+: a mensagem aponta exatamente o que era null
        System.out.println(cliente.endereco().cidade().toUpperCase());
    }
}
```

Saída no Java 17:

```text
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "HelpfulNpe$Endereco.cidade()" because the return value of "HelpfulNpe$Cliente.endereco()" is null
	at HelpfulNpe.main(HelpfulNpe.java:9)
```

Cuidados apontados pela JEP:

- A mensagem só aparece em NPEs lançados pela própria JVM. Um `throw new NullPointerException()` explícito não ganha nada.
- Nomes de variáveis locais só aparecem se a classe foi compilada com a tabela de variáveis locais (`javac -g`); sem ela, a mensagem mostra algo como `<local4>`.
- A mensagem revela detalhes do código-fonte. A JEP admite que ela poderia ser desligada, mas recomenda outro caminho quando expor essa informação não for aceitável: a aplicação não imprime a mensagem, captura a exceção e a descarta.

### JFR Event Streaming

**Chegou em:** Java 14 (final, [JEP 349](https://openjdk.org/jeps/349))

O JDK Flight Recorder (JFR) registra eventos da JVM e da aplicação com baixo custo e chegou ao OpenJDK no Java 11 ([post do Java 11](/posts/java-11/#flight-recorder-no-openjdk)). Até o Java 13, porém, consumir esses dados exigia iniciar uma gravação, pará-la, gravar o conteúdo em disco e só então ler o arquivo. Isso serve para análise de desempenho, mas não para monitoramento. A JEP 349 adiciona ao pacote `jdk.jfr.consumer` a assinatura de eventos em tempo real, lidos direto do repositório em disco, sem gerar um arquivo de gravação. Com isso, a própria aplicação pode acompanhar CPU, GC e outros eventos enquanto roda.

```java title="MonitorJfr.java"
import java.time.Duration;
import jdk.jfr.consumer.RecordingStream;

public class MonitorJfr {
    public static void main(String[] args) throws InterruptedException {
        try (var stream = new RecordingStream()) {
            stream.enable("jdk.CPULoad").withPeriod(Duration.ofSeconds(1));
            stream.enable("jdk.GarbageCollection");

            stream.onEvent("jdk.CPULoad", evento ->
                    System.out.printf("CPU da máquina: %.1f%%%n", evento.getFloat("machineTotal") * 100));
            stream.onEvent("jdk.GarbageCollection", evento ->
                    System.out.println("GC: " + evento.getString("name") + " em " + evento.getDuration("sumOfPauses")));

            stream.startAsync();          // consome os eventos em outra thread
            System.gc();
            Thread.sleep(2_500);
        }
    }
}
```

Os valores mudam a cada execução. Um exemplo de saída no Temurin 17.0.20:

```text
GC: G1Full em PT0.014564125S
CPU da máquina: 100.0%
CPU da máquina: 41.9%
```

`EventStream.openRepository()` e `EventStream.openFile(Path)` oferecem a mesma API para ler de outro repositório ou de um arquivo `.jfr` já gravado.

### jpackage

**Chegou em:** Java 14 (incubadora, [JEP 343](https://openjdk.org/jeps/343)) → Java 16 (final, [JEP 392](https://openjdk.org/jeps/392))

Pela JEP 343, muitas aplicações Java precisam ser instaladas como programas nativos do sistema, e entregar só um JAR não basta. O Oracle JDK 8 tinha o `javapackager`, mas ele saiu no JDK 11 junto com o JavaFX ([JEP 343](https://openjdk.org/jeps/343)). O `jpackage` retoma a ideia sem o suporte a Java Web Start: gera instaladores nativos de aplicações Java autocontidas, nos formatos `msi` e `exe` no Windows, `pkg` e `dmg` no macOS, e `deb` e `rpm` no Linux. Pela JEP 392, a ferramenta ficou em incubação no 14 e no 15 e virou recurso de produção no 16.

"Autocontida" quer dizer que o pacote leva junto um runtime do Java: por padrão, o `jpackage` chama o `jlink` ([post do Java 11](/posts/java-11/#jlink-runtime-sob-medida)) para montar esse runtime, e a máquina de destino não precisa ter Java instalado. A [JEP 367](https://openjdk.org/jeps/367) indica essa dupla a quem usava o Pack200 para reduzir o tamanho de aplicações.

```bash
# empacota todos os arquivos de target/ num instalador .deb; app.jar tem a classe principal
jpackage --name minha-app --input target/ --main-jar app.jar --type deb
```

Não há compilação cruzada: pela JEP 392, para gerar um pacote do Windows é preciso rodar o `jpackage` no Windows, e o mesmo vale para os outros sistemas.

## Segurança

### Filtros de desserialização por contexto

**Chegou em:** Java 17 (final, [JEP 415](https://openjdk.org/jeps/415))

A JEP 415 abre lembrando que desserializar dados não confiáveis é uma atividade inerentemente perigosa: um stream montado com cuidado pode executar código de classes arbitrárias. Um **filtro de desserialização** (`ObjectInputFilter`) decide quais classes podem ser lidas. O Java 9 criou dois tipos ([JEP 290](https://openjdk.org/jeps/290)), e a JEP 415 aponta o limite de cada um:

- o **filtro por stream** depende de quem cria cada `ObjectInputStream` lembrar de configurá-lo;
- o **filtro global estático** precisa servir a todos os contextos da aplicação, por isso acaba permissivo demais ou restritivo demais.

A JEP 415 adiciona uma **fábrica de filtros** para a JVM inteira. Ela é chamada a cada `ObjectInputStream` criado e a cada `setObjectInputFilter`, e decide qual filtro vale naquele contexto, por exemplo combinando o filtro pedido pelo código com uma regra mínima da aplicação. A classe `ObjectInputFilter` ganhou também `merge`, `allowFilter`, `rejectFilter` e `rejectUndecidedClass` para montar essas combinações ([Javadoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/io/ObjectInputFilter.html)).

```java title="FiltroDesserializacao.java" {19-21}
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InvalidClassException;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.util.ArrayList;
import java.util.function.BinaryOperator;

public class FiltroDesserializacao {

    public static void main(String[] args) throws Exception {
        // Filtro permitido: apenas java.base; o resto é rejeitado
        ObjectInputFilter somenteJavaBase = ObjectInputFilter.Config.createFilter("java.base/*;!*");

        // Fábrica JVM-wide (JEP 415): chamada para cada ObjectInputStream criado
        // 'proximo' é o filtro estático da JVM (pode ser null) ou o passado em setObjectInputFilter
        BinaryOperator<ObjectInputFilter> fabrica = (atual, proximo) ->
                proximo == null ? somenteJavaBase : ObjectInputFilter.merge(proximo, somenteJavaBase);
        ObjectInputFilter.Config.setSerialFilterFactory(fabrica);

        System.out.println(ler(serializar(new ArrayList<>(java.util.List.of("ok"))))); // [ok]
        try {
            ler(serializar(new Suspeito()));
        } catch (InvalidClassException e) {
            System.out.println("rejeitado: " + e.getMessage());
        }
    }

    static class Suspeito implements java.io.Serializable {}

    static byte[] serializar(Object o) throws IOException {
        var bytes = new ByteArrayOutputStream();
        try (var out = new ObjectOutputStream(bytes)) {
            out.writeObject(o);
        }
        return bytes.toByteArray();
    }

    static Object ler(byte[] dados) throws Exception {
        try (var in = new ObjectInputStream(new ByteArrayInputStream(dados))) {
            return in.readObject();
        }
    }
}
```

Pelo [Javadoc de `ObjectInputFilter.Config`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/io/ObjectInputFilter.Config.html), a fábrica só pode ser definida uma vez (pela API ou pela propriedade `jdk.serialFilterFactory`) e antes de criar qualquer `ObjectInputStream`. Se o filtro atual não for `null`, a fábrica também não pode devolver `null`. A saída do exemplo é `[ok]` seguido de `rejeitado: filter status: REJECTED`.

### EdDSA

**Chegou em:** Java 15 (final, [JEP 339](https://openjdk.org/jeps/339))

A JEP 339 implementa assinaturas com o Edwards-Curve Digital Signature Algorithm (RFC 8032) no provider SunEC, com os nomes padrão `Ed25519` e `Ed448`:

```java title="EdDsa.java"
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;

public class EdDsa {
    public static void main(String[] args) throws Exception {
        KeyPair par = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
        byte[] mensagem = "mensagem".getBytes(StandardCharsets.UTF_8);

        Signature assinador = Signature.getInstance("Ed25519");
        assinador.initSign(par.getPrivate());
        assinador.update(mensagem);
        byte[] assinatura = assinador.sign();
        System.out.println(assinatura.length); // 64

        Signature verificador = Signature.getInstance("Ed25519");
        verificador.initVerify(par.getPublic());
        verificador.update(mensagem);
        System.out.println(verificador.verify(assinatura)); // true
    }
}
```

### Padrões de segurança mais restritos

Mudanças de configuração que não são JEPs, mas podem quebrar integrações antigas:

- **Java 12: propriedade `java.security.manager`** passa a aceitar `allow` e `disallow`, que controlam se um Security Manager pode ser instalado em tempo de execução ([release notes do JDK 12](https://www.oracle.com/java/technologies/javase/12-relnote-issues.html)).
- **Java 16: TLS 1.0 e 1.1 desabilitados por padrão.** Podem ser reabilitados, por sua conta e risco, removendo `TLSv1` e `TLSv1.1` de `jdk.tls.disabledAlgorithms` no `java.security` ([release notes do JDK 16](https://www.oracle.com/java/technologies/javase/16-relnote-issues.html)).
- **Java 17: JARs assinados com SHA-1 passam a ser tratados como não assinados.** Nas [release notes do JDK 17](https://www.oracle.com/java/technologies/javase/17-relnote-issues.html), a Oracle lista duas exceções: JARs com carimbo de tempo anterior a 1º de janeiro de 2019 e certificados que não encadeiam até uma CA do `cacerts` padrão. A atualização 17.0.5 endureceu a regra e manteve só a exceção do carimbo de tempo ([release notes do JDK 17.0.5](https://www.oracle.com/java/technologies/javase/17-0-5-relnotes.html)). Nos builds do OpenJDK, a restrição não estava no 17 original e entrou justamente no 17.0.5 (compare o `java.security` das tags [jdk-17-ga](https://github.com/openjdk/jdk/blob/jdk-17-ga/src/java.base/share/conf/security/java.security) e [jdk-17.0.5-ga](https://github.com/openjdk/jdk17u/blob/jdk-17.0.5-ga/src/java.base/share/conf/security/java.security)). Em qualquer atualização recente do 17, vale a regra mais rígida.

## Removidos e depreciados

Cada linha traz a fonte oficial. "Depreciado para remoção" significa que o recurso ainda existe no Java 17, mas o compilador ou a JVM já avisam. Nas flags da JVM, o [manual do comando `java`](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html) separa as opções obsoletas, aceitas mas ignoradas com aviso, das removidas, que fazem a JVM falhar na partida com `Unrecognized VM option`.

| Item | Situação no Java 17 | Versão | Fonte | Alternativa |
| --- | --- | --- | --- | --- |
| Coletor CMS | Removido no 14, quando `-XX:+UseConcMarkSweepGC` passou a ser ignorado com aviso; desde o 15, a flag impede a JVM de iniciar | 14 | [JEP 363](https://openjdk.org/jeps/363), [manual do `java` 15](https://docs.oracle.com/en/java/javase/15/docs/specs/man/java.html) | G1, ZGC ou Shenandoah |
| Pack200 (`pack200`, `unpack200`, `java.util.jar.Pack200`) | Removido | 14 | [JEP 367](https://openjdk.org/jeps/367) | `jlink` e `jpackage` ([JEP 392](https://openjdk.org/jeps/392)) |
| Nashorn (motor JavaScript e `jjs`) | Removido | 15 | [JEP 372](https://openjdk.org/jeps/372) | — |
| `rmic` | Removido | 15 | [release notes 13](https://www.oracle.com/java/technologies/javase/13-relnote-issues.html) e [15](https://www.oracle.com/java/technologies/javase/15-relnote-issues.html) | Stubs gerados dinamicamente (desde o Java 5) |
| Ports Solaris/SPARC, Solaris/x64 e Linux/SPARC | Removidos | 15 | [JEP 381](https://openjdk.org/jeps/381) | — |
| RMI Activation (e `rmid`) | Removido | 17 | [JEP 407](https://openjdk.org/jeps/407) | O restante do RMI continua |
| Compilador experimental AOT/JIT em Java (`jaotc`, Graal) | Removido; a interface JVMCI continua | 17 | [JEP 410](https://openjdk.org/jeps/410) | Graal externo via JVMCI |
| `sun.misc.Unsafe::defineAnonymousClass` | Removido | 17 | [release notes 17](https://www.oracle.com/java/technologies/javase/17-relnote-issues.html) | `Lookup::defineHiddenClass` |
| `--illegal-access` | Opção obsoleta: só gera aviso | 17 | [JEP 403](https://openjdk.org/jeps/403) | `--add-opens` pontual |
| Biased locking | Desligado e flags depreciadas | 15 | [JEP 374](https://openjdk.org/jeps/374) | — |
| ParallelScavenge + SerialOld | Depreciada no 14; desde o 16, `-XX:-UseParallelOldGC` impede a JVM de iniciar | 14 | [JEP 366](https://openjdk.org/jeps/366), [manual do `java` 16](https://docs.oracle.com/en/java/javase/16/docs/specs/man/java.html) | `-XX:+UseParallelGC` sozinho |
| `-XX:PermSize`, `-XX:MaxPermSize`, `-XX:+TraceClassLoading` e outras flags `Trace*` de carga de classes | Removidas; impedem a JVM de iniciar | 17 | [manual do `java` 17](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html) | Remover as flags de PermGen; `-Xlog:class+load` e afins |
| Construtores de `Integer`, `Long` etc. | Depreciados para remoção | 16 | [JEP 390](https://openjdk.org/jeps/390) | `valueOf` ou autoboxing |
| Applet API | Depreciada para remoção | 17 | [JEP 398](https://openjdk.org/jeps/398) | — |
| Security Manager | Depreciado para remoção, com aviso em tempo de execução | 17 | [JEP 411](https://openjdk.org/jeps/411) | — |

Sobre o Security Manager, a JEP 411 define os avisos. Se ele for ligado pela linha de comando (`-Djava.security.manager`), a JVM avisa na partida. Se a aplicação chamar `System.setSecurityManager`, o aviso sai uma vez para cada classe chamadora. Nos dois casos, o aviso não pode ser suprimido. O fim dessa história está nos posts seguintes: o Security Manager foi desativado permanentemente no Java 24 ([post do Java 25](/posts/java-25/#security-manager-desativado-permanentemente)), e a Applet API foi removida no Java 26 ([post do Java 29](/posts/java-29/#applet-api-removida)).

## Recursos em preview ou incubadora nesta LTS

Nada desta seção é final no Java 17. Recursos em preview exigem `--enable-preview` com `--release 17` (ou `--source 17`) na compilação e `--enable-preview` na execução ([JEP 12](https://openjdk.org/jeps/12)). Módulos de incubadora exigem `--add-modules` ([JEP 11](https://openjdk.org/jeps/11)). A JEP 12 avisa que código que usa recursos em preview de uma versão não necessariamente compila ou roda em outra.

### Pattern matching para `switch`

**Chegou em:** Java 17 (preview, [JEP 406](https://openjdk.org/jeps/406))

A JEP 406 leva os padrões de tipo, os mesmos do `instanceof`, para os rótulos `case`. Com isso:

- o valor avaliado pelo `switch` (o **seletor**) pode ser de qualquer tipo de referência, e `case null` passa a ser permitido;
- com um tipo selado, o compilador verifica se todos os subtipos foram cobertos (**exaustividade**);
- um **guarded pattern** junta um padrão e uma condição, como `case String s && s.isBlank()`; a JEP também traz padrões entre parênteses para resolver ambiguidades;
- vale a regra de **dominância**: um `case` que nunca poderia ser alcançado, como `case String s` depois de `case CharSequence cs`, é erro de compilação.

O recurso passou por mais rodadas de preview e só se tornou final no Java 21 ([JEP 441](https://openjdk.org/jeps/441)), com sintaxe diferente para as guardas (`when` no lugar de `&&`). Os detalhes da versão final estão no [post do Java 21](/posts/java-21/#pattern-matching-para-switch).

```java title="PatternSwitch.java"
public class PatternSwitch {

    sealed interface Forma permits Circulo, Quadrado, Retangulo {}
    record Circulo(double raio) implements Forma {}
    record Quadrado(double lado) implements Forma {}
    record Retangulo(double largura, double altura) implements Forma {}

    // Java 17 com --enable-preview (JEP 406)
    static double area(Forma forma) {
        return switch (forma) {
            case Circulo c   -> Math.PI * c.raio() * c.raio();
            case Quadrado q  -> q.lado() * q.lado();
            case Retangulo r -> r.largura() * r.altura();
            // sem default: Forma é selada e todos os subtipos foram cobertos
        };
    }

    static String descrever(Object o) {
        return switch (o) {
            case null -> "nulo";
            case String s && s.isBlank() -> "texto vazio";   // guarded pattern (sintaxe do Java 17)
            case String s -> "texto: " + s;
            case Integer i -> "inteiro: " + i;
            default -> "outro: " + o;
        };
    }

    public static void main(String[] args) {
        System.out.println(area(new Retangulo(2, 3))); // 6.0
        System.out.println(descrever(null));           // nulo
        System.out.println(descrever("  "));           // texto vazio
        System.out.println(descrever(42));             // inteiro: 42
    }
}
```

```bash
# no Java 17, via launcher de arquivo único
java --enable-preview --source 17 PatternSwitch.java
```

### Foreign Function & Memory API

**Chegou em:** Java 14 (incubadora, [JEP 370](https://openjdk.org/jeps/370)) → Java 15 (2ª incubadora, [JEP 383](https://openjdk.org/jeps/383)) → Java 16 (3ª incubadora, [JEP 393](https://openjdk.org/jeps/393)) → Java 17 (incubadora, [JEP 412](https://openjdk.org/jeps/412))

A proposta é substituir o JNI e o uso de `ByteBuffer` direto ou `Unsafe` para acessar memória fora do heap e chamar bibliotecas nativas, com uma API em Java puro. Até o Java 16 eram duas APIs em incubadora: a de acesso à memória (JEPs 370, 383 e 393) e a Foreign Linker API ([JEP 389](https://openjdk.org/jeps/389)). A JEP 412 junta as duas numa só, que no Java 17 ainda está no módulo de incubadora `jdk.incubator.foreign`. A API só se tornou final no Java 22 ([JEP 454](https://openjdk.org/jeps/454)), com exemplos no [post do Java 25](/posts/java-25/#foreign-function--memory-api). Como uma API em incubadora pode mudar ou ser removida antes de virar final ([JEP 11](https://openjdk.org/jeps/11)), este artigo não traz exemplo de código para ela.

### Vector API

**Chegou em:** Java 16 (incubadora, [JEP 338](https://openjdk.org/jeps/338)) → Java 17 (2ª incubadora, [JEP 414](https://openjdk.org/jeps/414))

A Vector API expressa cálculos vetoriais que a JVM compila, em tempo de execução, para instruções vetoriais das arquiteturas de CPU suportadas. Essas instruções (SIMD, *single instruction, multiple data*) aplicam a mesma operação a vários valores de uma vez. No Java 17, a API fica no módulo `jdk.incubator.vector` e precisa de `--add-modules jdk.incubator.vector`. Ela continuou em incubadora nas LTS seguintes; a situação mais recente está no [post do Java 29](/posts/java-29/#vector-api).

## O que observar na migração a partir do Java 11

### Encapsulamento forte dos internos do JDK

**Chegou em:** Java 16 (final, [JEP 396](https://openjdk.org/jeps/396)) → Java 17 (final, [JEP 403](https://openjdk.org/jeps/403))

A JEP 396 tornou o encapsulamento forte o padrão; a JEP 403 removeu a opção que permitia relaxá-lo.

O contexto: desde o Java 9, o JDK é dividido em módulos (o sistema de módulos, ou JPMS), e cada módulo declara quais pacotes expõe. Os elementos internos, como os pacotes não exportados e os campos privados de `java.lang.String` usados no exemplo abaixo, não deveriam ser acessíveis de fora ([post do Java 11](/posts/java-11/#encapsulamento-das-apis-internas-do-jdk)). Para não quebrar tudo de uma vez, até o Java 15 o padrão era `--illegal-access=permit`: código no classpath (o chamado *módulo sem nome*) continuava acessando por reflexão os membros não públicos dos pacotes que já existiam no JDK 8, com um único aviso no primeiro acesso. No Java 16, o padrão virou `deny`. No Java 17, a opção `--illegal-access` ficou obsoleta: qualquer valor é ignorado com um aviso. Pelas [release notes do JDK 16](https://www.oracle.com/java/technologies/javase/16-relnote-issues.html), código existente que usa a maioria das classes, métodos ou campos internos do JDK deixa de rodar com essa mudança.

O diagrama compara o que acontece com a mesma chamada em cada versão:

![Diagrama: a mesma chamada setAccessible(true) em String.value funciona com aviso no Java 9 a 15, falha por padrão no Java 16 e falha sempre no Java 17; só sun.misc e sun.reflect continuam abertos e --add-opens libera pacotes específicos](/posts/java-17/encapsulamento-forte.svg)

```java title="Encapsulamento.java"
import java.lang.reflect.Field;

public class Encapsulamento {
    public static void main(String[] args) throws Exception {
        // Acesso reflexivo a um campo privado de java.lang.String
        Field value = String.class.getDeclaredField("value");
        value.setAccessible(true); // Java 17: InaccessibleObjectException, a menos que use --add-opens
        System.out.println("acesso liberado");
    }
}
```

Executando no Java 17:

```text
$ java --illegal-access=permit Encapsulamento.java
OpenJDK 64-Bit Server VM warning: Ignoring option --illegal-access=permit; support was removed in 17.0
Exception in thread "main" java.lang.reflect.InaccessibleObjectException: Unable to make field private final byte[] java.lang.String.value accessible: module java.base does not "opens java.lang" to unnamed module @4d1b0d2a
	at java.base/java.lang.reflect.AccessibleObject.checkCanSetAccessible(AccessibleObject.java:354)
	...

$ java --add-opens java.base/java.lang=ALL-UNNAMED Encapsulamento.java
acesso liberado
```

O que a JEP 403 mantém:

- `sun.misc` e `sun.reflect` continuam exportados e abertos pelo módulo `jdk.unsupported`, então `sun.misc.Unsafe` segue disponível.
- `--add-opens` na linha de comando e o atributo `Add-Opens` no manifesto de um JAR executável continuam abrindo pacotes específicos.

A correção duradoura é eliminar o acesso: **atualizar a biblioteca** que o faz ou trocar o elemento interno por uma API padrão, que é o objetivo declarado das JEPs 396 e 403. O `--add-opens` fica como paliativo pontual e documentado. Dá para mapear os acessos **ainda no Java 11**, como sugere a JEP 396: rode os testes com `--illegal-access=warn` para listar os elementos internos acessados por reflexão, use `--illegal-access=debug` para achar o código responsável e, por fim, teste com `--illegal-access=deny`, que reproduz o comportamento do Java 16 e 17.

### Remoções que quebram build ou execução

- **Flags da JVM.** O Java 11 ainda aceita, no máximo com aviso, `-XX:+UseConcMarkSweepGC`, `-XX:-UseParallelOldGC`, `-XX:PermSize`, `-XX:MaxPermSize` e `-XX:+TraceClassLoading`. No Java 17, essas flags fazem a JVM encerrar na partida com `Unrecognized VM option` (manuais do comando `java` [15](https://docs.oracle.com/en/java/javase/15/docs/specs/man/java.html), [16](https://docs.oracle.com/en/java/javase/16/docs/specs/man/java.html) e [17](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)). As flags de biased locking ainda são aceitas no Java 17, mas geram aviso de depreciação ([JEP 374](https://openjdk.org/jeps/374)).
- **Ferramentas e APIs removidas.** Nashorn ([JEP 372](https://openjdk.org/jeps/372)), Pack200 ([JEP 367](https://openjdk.org/jeps/367)), `rmic` ([release notes 15](https://www.oracle.com/java/technologies/javase/15-relnote-issues.html)), RMI Activation ([JEP 407](https://openjdk.org/jeps/407)) e `jaotc` ([JEP 410](https://openjdk.org/jeps/410)). Sem o Nashorn, `new ScriptEngineManager().getEngineByName("js")` devolve `null` em vez de lançar exceção, como documenta o [Javadoc de `ScriptEngineManager`](https://docs.oracle.com/en/java/javase/17/docs/api/java.scripting/javax/script/ScriptEngineManager.html) para quando não há motor com aquele nome.
- **Internos removidos.** `Unsafe::defineAnonymousClass` saiu no Java 17 ([release notes 17](https://www.oracle.com/java/technologies/javase/17-relnote-issues.html)). Código que gera classes em tempo de execução com essa API precisa migrar para `Lookup::defineHiddenClass` ([JEP 371](https://openjdk.org/jeps/371)).

### Incompatibilidades de código-fonte

- **`yield`** virou identificador restrito ([JEP 361](https://openjdk.org/jeps/361)). Uma chamada não qualificada a `yield()` não compila mais; use `Thread.yield()`.
- **`Stream.toList()`** pode conflitar com um `import static` de outro método `toList`, como `Collectors.toList`, em classes que implementam ou estendem `Stream` ([release notes 16](https://www.oracle.com/java/technologies/javase/16-relnote-issues.html)).
- **`CharSequence.isEmpty()`** virou método default. Classes que implementam `CharSequence` e outra interface com `isEmpty` podem precisar sobrescrevê-lo ([release notes 15](https://www.oracle.com/java/technologies/javase/15-relnote-issues.html)).
- **`record`, `sealed` e `permits`** ganharam significado nas declarações de tipo ([JEP 395](https://openjdk.org/jeps/395), [JEP 409](https://openjdk.org/jeps/409)) e não podem mais ser usados como nome de classe. `class record {}` compila no Java 11 e, no Java 17, falha com `'record' not allowed here` (o mesmo vale para `sealed` e `permits`). Variáveis e métodos com esses nomes continuam permitidos.
- **Construtores de wrappers** (`new Integer(...)`) geram aviso de remoção ([JEP 390](https://openjdk.org/jeps/390)). Com `-Werror`, o build quebra.

### Mudanças de comportamento padrão

- **Mensagens de NPE** mais longas desde o Java 15 ([release notes 15](https://www.oracle.com/java/technologies/javase/15-relnote-issues.html)). Testes que comparam `getMessage()` de NPE lançado pela JVM precisam de ajuste.
- **TLS 1.0/1.1 desabilitados** (Java 16) e **JARs assinados com SHA-1 tratados como não assinados** (Java 17). Integrações com servidores legados e JARs assinados há muito tempo podem falhar.
- **Novas implementações de socket** ([JEP 353](https://openjdk.org/jeps/353), [JEP 373](https://openjdk.org/jeps/373)). A JEP 353 lista diferenças de comportamento em casos extremos entre a implementação antiga e a nova.
- **Security Manager** passa a emitir avisos que não podem ser suprimidos ([JEP 411](https://openjdk.org/jeps/411)).

### Sequência sugerida

1. Atualize o build (Maven, Gradle, plugins de compilação e de testes) e as dependências para versões que declaram suporte ao Java 17.
2. Compile com `--release 17` e trate os avisos de depreciação para remoção.
3. Rode os testes no Java 17 e procure `InaccessibleObjectException`. Para cada ocorrência, atualize a biblioteca responsável antes de recorrer a `--add-opens`.
4. Revise as flags da JVM em Dockerfiles, scripts e manifests de deploy (CMS, `UseParallelOldGC`, PermGen, `Trace*`, biased locking, `--illegal-access`).
5. Só então adote recursos novos como records, sealed classes e text blocks. Deixe recursos em preview fora do código de produção.

Para planejar a migração como projeto, com análise, preparação, testes e implantação gradual, veja [o processo de migração em cinco fases](/posts/guia-atualizacoes-java/#o-processo-de-migração-em-cinco-fases) no guia da série.

## Todas as JEPs, versão a versão

Listas conferidas nas páginas oficiais de cada release no OpenJDK; os títulos seguem as páginas das JEPs. Tipos: **Final** (recurso permanente ou mudança de implementação), **Preview**, **Incubadora**, **Experimental**, **Depreciação**, **Remoção**, **Plataforma** (port para sistema operacional ou arquitetura) e **Interno** (mudança no desenvolvimento do próprio OpenJDK, sem efeito para quem usa o JDK).

### Java 12

<details>
<summary>Ver as 8 JEPs do Java 12</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [189](https://openjdk.org/jeps/189) | Shenandoah: A Low-Pause-Time Garbage Collector (Experimental) | Experimental |
| [230](https://openjdk.org/jeps/230) | Microbenchmark Suite | Interno |
| [325](https://openjdk.org/jeps/325) | Switch Expressions (Preview) | Preview |
| [334](https://openjdk.org/jeps/334) | JVM Constants API | Final |
| [340](https://openjdk.org/jeps/340) | One AArch64 Port, Not Two | Plataforma |
| [341](https://openjdk.org/jeps/341) | Default CDS Archives | Final |
| [344](https://openjdk.org/jeps/344) | Abortable Mixed Collections for G1 | Final |
| [346](https://openjdk.org/jeps/346) | Promptly Return Unused Committed Memory from G1 | Final |

</details>

### Java 13

<details>
<summary>Ver as 5 JEPs do Java 13</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [350](https://openjdk.org/jeps/350) | Dynamic CDS Archives | Final |
| [351](https://openjdk.org/jeps/351) | ZGC: Uncommit Unused Memory (Experimental) | Experimental |
| [353](https://openjdk.org/jeps/353) | Reimplement the Legacy Socket API | Final |
| [354](https://openjdk.org/jeps/354) | Switch Expressions (Second Preview) | Preview |
| [355](https://openjdk.org/jeps/355) | Text Blocks (Preview) | Preview |

</details>

### Java 14

<details>
<summary>Ver as 16 JEPs do Java 14</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [305](https://openjdk.org/jeps/305) | Pattern Matching for instanceof (Preview) | Preview |
| [343](https://openjdk.org/jeps/343) | Packaging Tool (Incubator) | Incubadora |
| [345](https://openjdk.org/jeps/345) | NUMA-Aware Memory Allocation for G1 | Final |
| [349](https://openjdk.org/jeps/349) | JFR Event Streaming | Final |
| [352](https://openjdk.org/jeps/352) | Non-Volatile Mapped Byte Buffers | Final |
| [358](https://openjdk.org/jeps/358) | Helpful NullPointerExceptions | Final |
| [359](https://openjdk.org/jeps/359) | Records (Preview) | Preview |
| [361](https://openjdk.org/jeps/361) | Switch Expressions | Final |
| [362](https://openjdk.org/jeps/362) | Deprecate the Solaris and SPARC Ports | Depreciação |
| [363](https://openjdk.org/jeps/363) | Remove the Concurrent Mark Sweep (CMS) Garbage Collector | Remoção |
| [364](https://openjdk.org/jeps/364) | ZGC on macOS (Experimental) | Experimental |
| [365](https://openjdk.org/jeps/365) | ZGC on Windows (Experimental) | Experimental |
| [366](https://openjdk.org/jeps/366) | Deprecate the ParallelScavenge + SerialOld GC Combination | Depreciação |
| [367](https://openjdk.org/jeps/367) | Remove the Pack200 Tools and API | Remoção |
| [368](https://openjdk.org/jeps/368) | Text Blocks (Second Preview) | Preview |
| [370](https://openjdk.org/jeps/370) | Foreign-Memory Access API (Incubator) | Incubadora |

</details>

### Java 15

<details>
<summary>Ver as 14 JEPs do Java 15</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [339](https://openjdk.org/jeps/339) | Edwards-Curve Digital Signature Algorithm (EdDSA) | Final |
| [360](https://openjdk.org/jeps/360) | Sealed Classes (Preview) | Preview |
| [371](https://openjdk.org/jeps/371) | Hidden Classes | Final |
| [372](https://openjdk.org/jeps/372) | Remove the Nashorn JavaScript Engine | Remoção |
| [373](https://openjdk.org/jeps/373) | Reimplement the Legacy DatagramSocket API | Final |
| [374](https://openjdk.org/jeps/374) | Deprecate and Disable Biased Locking | Depreciação |
| [375](https://openjdk.org/jeps/375) | Pattern Matching for instanceof (Second Preview) | Preview |
| [377](https://openjdk.org/jeps/377) | ZGC: A Scalable Low-Latency Garbage Collector (Production) | Final |
| [378](https://openjdk.org/jeps/378) | Text Blocks | Final |
| [379](https://openjdk.org/jeps/379) | Shenandoah: A Low-Pause-Time Garbage Collector (Production) | Final |
| [381](https://openjdk.org/jeps/381) | Remove the Solaris and SPARC Ports | Remoção |
| [383](https://openjdk.org/jeps/383) | Foreign-Memory Access API (Second Incubator) | Incubadora |
| [384](https://openjdk.org/jeps/384) | Records (Second Preview) | Preview |
| [385](https://openjdk.org/jeps/385) | Deprecate RMI Activation for Removal | Depreciação |

</details>

### Java 16

<details>
<summary>Ver as 17 JEPs do Java 16</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [338](https://openjdk.org/jeps/338) | Vector API (Incubator) | Incubadora |
| [347](https://openjdk.org/jeps/347) | Enable C++14 Language Features | Interno |
| [357](https://openjdk.org/jeps/357) | Migrate from Mercurial to Git | Interno |
| [369](https://openjdk.org/jeps/369) | Migrate to GitHub | Interno |
| [376](https://openjdk.org/jeps/376) | ZGC: Concurrent Thread-Stack Processing | Final |
| [380](https://openjdk.org/jeps/380) | Unix-Domain Socket Channels | Final |
| [386](https://openjdk.org/jeps/386) | Alpine Linux Port | Plataforma |
| [387](https://openjdk.org/jeps/387) | Elastic Metaspace | Final |
| [388](https://openjdk.org/jeps/388) | Windows/AArch64 Port | Plataforma |
| [389](https://openjdk.org/jeps/389) | Foreign Linker API (Incubator) | Incubadora |
| [390](https://openjdk.org/jeps/390) | Warnings for Value-Based Classes | Depreciação |
| [392](https://openjdk.org/jeps/392) | Packaging Tool | Final |
| [393](https://openjdk.org/jeps/393) | Foreign-Memory Access API (Third Incubator) | Incubadora |
| [394](https://openjdk.org/jeps/394) | Pattern Matching for instanceof | Final |
| [395](https://openjdk.org/jeps/395) | Records | Final |
| [396](https://openjdk.org/jeps/396) | Strongly Encapsulate JDK Internals by Default | Final |
| [397](https://openjdk.org/jeps/397) | Sealed Classes (Second Preview) | Preview |

</details>

### Java 17

<details>
<summary>Ver as 14 JEPs do Java 17</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [306](https://openjdk.org/jeps/306) | Restore Always-Strict Floating-Point Semantics | Final |
| [356](https://openjdk.org/jeps/356) | Enhanced Pseudo-Random Number Generators | Final |
| [382](https://openjdk.org/jeps/382) | New macOS Rendering Pipeline | Final |
| [391](https://openjdk.org/jeps/391) | macOS/AArch64 Port | Plataforma |
| [398](https://openjdk.org/jeps/398) | Deprecate the Applet API for Removal | Depreciação |
| [403](https://openjdk.org/jeps/403) | Strongly Encapsulate JDK Internals | Final |
| [406](https://openjdk.org/jeps/406) | Pattern Matching for switch (Preview) | Preview |
| [407](https://openjdk.org/jeps/407) | Remove RMI Activation | Remoção |
| [409](https://openjdk.org/jeps/409) | Sealed Classes | Final |
| [410](https://openjdk.org/jeps/410) | Remove the Experimental AOT and JIT Compiler | Remoção |
| [411](https://openjdk.org/jeps/411) | Deprecate the Security Manager for Removal | Depreciação |
| [412](https://openjdk.org/jeps/412) | Foreign Function & Memory API (Incubator) | Incubadora |
| [414](https://openjdk.org/jeps/414) | Vector API (Second Incubator) | Incubadora |
| [415](https://openjdk.org/jeps/415) | Context-Specific Deserialization Filters | Final |

</details>

## Fontes

**Releases e suporte**

- [JDK 12](https://openjdk.org/projects/jdk/12/), [JDK 13](https://openjdk.org/projects/jdk/13/), [JDK 14](https://openjdk.org/projects/jdk/14/), [JDK 15](https://openjdk.org/projects/jdk/15/), [JDK 16](https://openjdk.org/projects/jdk/16/) e [JDK 17](https://openjdk.org/projects/jdk/17/) (OpenJDK: listas de JEPs e datas de GA)
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
- Release notes da Oracle: [JDK 12](https://www.oracle.com/java/technologies/javase/12-relnote-issues.html), [JDK 13](https://www.oracle.com/java/technologies/javase/13-relnote-issues.html), [JDK 14](https://www.oracle.com/java/technologies/javase/14-relnote-issues.html), [JDK 15](https://www.oracle.com/java/technologies/javase/15-relnote-issues.html), [JDK 16](https://www.oracle.com/java/technologies/javase/16-relnote-issues.html) e [JDK 17](https://www.oracle.com/java/technologies/javase/17-relnote-issues.html)

**Outras JEPs citadas**

- [JEP 11: Incubator Modules](https://openjdk.org/jeps/11)
- [JEP 12: Preview Features](https://openjdk.org/jeps/12)
- [JEP 290: Filter Incoming Serialization Data](https://openjdk.org/jeps/290)
- [JEP 333: ZGC: A Scalable Low-Latency Garbage Collector (Experimental)](https://openjdk.org/jeps/333)
- [JEP 441: Pattern Matching for switch](https://openjdk.org/jeps/441)
- [JEP 454: Foreign Function & Memory API](https://openjdk.org/jeps/454)

**Manual do comando `java`**

- [JDK 15](https://docs.oracle.com/en/java/javase/15/docs/specs/man/java.html), [JDK 16](https://docs.oracle.com/en/java/javase/16/docs/specs/man/java.html) e [JDK 17](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html) (seções "Obsolete Java Options" e "Removed Java Options")

**JEPs do período (Java 12 a 17)**

- Java 12: [189](https://openjdk.org/jeps/189), [230](https://openjdk.org/jeps/230), [325](https://openjdk.org/jeps/325), [334](https://openjdk.org/jeps/334), [340](https://openjdk.org/jeps/340), [341](https://openjdk.org/jeps/341), [344](https://openjdk.org/jeps/344), [346](https://openjdk.org/jeps/346)
- Java 13: [350](https://openjdk.org/jeps/350), [351](https://openjdk.org/jeps/351), [353](https://openjdk.org/jeps/353), [354](https://openjdk.org/jeps/354), [355](https://openjdk.org/jeps/355)
- Java 14: [305](https://openjdk.org/jeps/305), [343](https://openjdk.org/jeps/343), [345](https://openjdk.org/jeps/345), [349](https://openjdk.org/jeps/349), [352](https://openjdk.org/jeps/352), [358](https://openjdk.org/jeps/358), [359](https://openjdk.org/jeps/359), [361](https://openjdk.org/jeps/361), [362](https://openjdk.org/jeps/362), [363](https://openjdk.org/jeps/363), [364](https://openjdk.org/jeps/364), [365](https://openjdk.org/jeps/365), [366](https://openjdk.org/jeps/366), [367](https://openjdk.org/jeps/367), [368](https://openjdk.org/jeps/368), [370](https://openjdk.org/jeps/370)
- Java 15: [339](https://openjdk.org/jeps/339), [360](https://openjdk.org/jeps/360), [371](https://openjdk.org/jeps/371), [372](https://openjdk.org/jeps/372), [373](https://openjdk.org/jeps/373), [374](https://openjdk.org/jeps/374), [375](https://openjdk.org/jeps/375), [377](https://openjdk.org/jeps/377), [378](https://openjdk.org/jeps/378), [379](https://openjdk.org/jeps/379), [381](https://openjdk.org/jeps/381), [383](https://openjdk.org/jeps/383), [384](https://openjdk.org/jeps/384), [385](https://openjdk.org/jeps/385)
- Java 16: [338](https://openjdk.org/jeps/338), [347](https://openjdk.org/jeps/347), [357](https://openjdk.org/jeps/357), [369](https://openjdk.org/jeps/369), [376](https://openjdk.org/jeps/376), [380](https://openjdk.org/jeps/380), [386](https://openjdk.org/jeps/386), [387](https://openjdk.org/jeps/387), [388](https://openjdk.org/jeps/388), [389](https://openjdk.org/jeps/389), [390](https://openjdk.org/jeps/390), [392](https://openjdk.org/jeps/392), [393](https://openjdk.org/jeps/393), [394](https://openjdk.org/jeps/394), [395](https://openjdk.org/jeps/395), [396](https://openjdk.org/jeps/396), [397](https://openjdk.org/jeps/397)
- Java 17: [306](https://openjdk.org/jeps/306), [356](https://openjdk.org/jeps/356), [382](https://openjdk.org/jeps/382), [391](https://openjdk.org/jeps/391), [398](https://openjdk.org/jeps/398), [403](https://openjdk.org/jeps/403), [406](https://openjdk.org/jeps/406), [407](https://openjdk.org/jeps/407), [409](https://openjdk.org/jeps/409), [410](https://openjdk.org/jeps/410), [411](https://openjdk.org/jeps/411), [412](https://openjdk.org/jeps/412), [414](https://openjdk.org/jeps/414), [415](https://openjdk.org/jeps/415)

**Javadoc do Java 17**

- [`String`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/String.html), [`CharSequence`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/CharSequence.html), [`Class`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Class.html)
- [`Stream`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Stream.html), [`Collectors`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Collectors.html), [`Files`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/file/Files.html), [`CompactNumberFormat`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/text/CompactNumberFormat.html)
- [`HexFormat`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HexFormat.html), [`InstantSource`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/time/InstantSource.html), [`RandomGenerator`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/random/RandomGenerator.html), [`ObjectInputFilter`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/io/ObjectInputFilter.html), [`ObjectInputFilter.Config`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/io/ObjectInputFilter.Config.html), [`ScriptEngineManager`](https://docs.oracle.com/en/java/javase/17/docs/api/java.scripting/javax/script/ScriptEngineManager.html), [`UnixDomainSocketAddress`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/net/UnixDomainSocketAddress.html)
