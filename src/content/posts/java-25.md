---
title: "Java 25 (LTS) — Arquivos compactos, Scoped Values, cache AOT e criptografia pós-quântica"
published: 2025-07-02T02:50:00Z
description: "O que chegou do Java 22 ao Java 25 para quem vem do Java 21: arquivos compactos, `import module`, construtores flexíveis, Scoped Values, cache AOT, headers compactos, criptografia pós-quântica e as 66 JEPs versão a versão."
tags: [Java, LTS, JVM, Concorrência, Segurança]
series: java
cover: /covers/java/java-25.svg
draft: false
---

O Java 25 chegou à disponibilidade geral (GA) em **16 de setembro de 2025** e é uma release de suporte de longo prazo (LTS) na maioria dos fornecedores ([página do JDK 25](https://openjdk.org/projects/jdk/25/)). No roadmap da Oracle, o Java 25 tem Premier Support até setembro de 2030 e Extended Support até setembro de 2033; a próxima LTS planejada é o Java 29, em setembro de 2027 ([Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)). Outros fornecedores de builds do OpenJDK publicam seus próprios prazos.

Este artigo é para quem está no **Java 21**, a LTS anterior, e quer saber o que muda ao subir para o 25. Ele cobre tudo o que foi integrado nas releases **22, 23, 24 e 25**: 66 JEPs no total (12 + 12 + 24 + 18), conferidas nas páginas oficiais de cada release. Para cada recurso relevante há a trajetória de versões, a explicação, um exemplo de código e, quando ajuda, um diagrama. No fim estão os cuidados de migração e a tabela completa de JEPs.

Antes de começar, três termos que aparecem o tempo todo:

- **Preview**: recurso de linguagem ou API completo, mas ainda sujeito a mudanças. Só funciona com `--enable-preview` na compilação e na execução.
- **Incubadora**: API em módulo `jdk.incubator.*`, que precisa ser adicionado com `--add-modules`.
- **Experimental**: recurso da JVM ainda em avaliação. Em geral exige `-XX:+UnlockExperimentalVMOptions` além da flag do próprio recurso; os eventos experimentais do JFR são exceção e basta ativá-los na gravação.

Todos os exemplos de código Java deste artigo foram compilados e executados no Temurin 25.0.4, com as flags indicadas em cada caso.

## Linha do tempo

![Linha do tempo do Java 21 ao Java 25 mostrando, por recurso, em quais versões ele foi preview, experimental, final, depreciado ou removido](/posts/java-25/linha-do-tempo.svg)

O padrão que se repete é claro: boa parte do que era preview no Java 21 amadureceu ao longo de três ou quatro releases e ficou final no 25. As datas de cada release vêm das páginas oficiais: Java 22 em 19/03/2024 ([JDK 22](https://openjdk.org/projects/jdk/22/)), Java 23 em 17/09/2024 ([JDK 23](https://openjdk.org/projects/jdk/23/)), Java 24 em 18/03/2025 ([JDK 24](https://openjdk.org/projects/jdk/24/)) e Java 25 em 16/09/2025 ([JDK 25](https://openjdk.org/projects/jdk/25/)).

Em resumo, o que muda para quem vem do Java 21:

| Tema | Principais mudanças finais até o Java 25 |
| --- | --- |
| Linguagem | arquivos compactos e `main` de instância, `import module`, construtores flexíveis, `_` para variáveis sem nome |
| Concorrência | `synchronized` não prende mais virtual threads, Scoped Values |
| Bibliotecas | Stream Gatherers, Foreign Function & Memory API, Class-File API |
| JVM e desempenho | cache AOT, compact object headers, Shenandoah geracional, ZGC só geracional |
| Segurança | ML-KEM e ML-DSA (pós-quântico), KDF API, Security Manager desativado |
| Integridade | avisos para JNI e para os métodos de memória de `sun.misc.Unsafe` |

## Linguagem

### Arquivos compactos e métodos `main` de instância

**Chegou em:** Java 21 (preview, [JEP 445](https://openjdk.org/jeps/445)) → Java 22 (2ª preview, [JEP 463](https://openjdk.org/jeps/463)) → Java 23 (3ª preview, [JEP 477](https://openjdk.org/jeps/477)) → Java 24 (4ª preview, [JEP 495](https://openjdk.org/jeps/495)) → Java 25 (final, [JEP 512](https://openjdk.org/jeps/512))

Um programa pequeno em Java sempre exigiu construções pensadas para sistemas grandes: classe, `public`, `static`, `String[] args` e `System.out.println`. O [JEP 512](https://openjdk.org/jeps/512) reduz essa cerimônia sem criar um dialeto separado da linguagem. São quatro mudanças:

1. **Métodos `main` de instância.** O `main` pode deixar de ser `public` e `static` e pode não receber parâmetros. O launcher prefere um `main(String[])`; se não houver, usa um `main()` sem parâmetros. Se o método escolhido não for estático, a JVM instancia a classe pelo construtor sem argumentos e chama o método.
2. **Arquivos-fonte compactos.** Se um arquivo tem campos e métodos fora de qualquer classe, o compilador declara uma classe implícita: `final`, no pacote sem nome, com esses campos e métodos como membros. Essa classe não tem nome utilizável no código e precisa ter um `main` executável.
3. **Classe `java.lang.IO`.** Traz `print`, `println` e `readln` para E/S de console. Por estar em `java.lang`, está disponível em qualquer programa, não só em arquivos compactos.
4. **Import automático de `java.base`.** Todo arquivo compacto se comporta como se começasse com `import module java.base;`.

A versão final mudou um detalhe em relação às previews: os métodos de `IO` **não** são mais importados estaticamente de forma implícita. É preciso escrever `IO.println(...)`. A classe também saiu de `java.io` e foi para `java.lang` ([JEP 512, seção History](https://openjdk.org/jeps/512)). Exemplos antigos com `println("...")` solto não compilam no Java 25.

Antes, no Java 21 sem preview:

```java title="Antes.java"
import java.util.List;

public class Antes {
    public static void main(String[] args) {
        List<String> linguagens = List.of("Java", "Kotlin", "Scala");
        for (String nome : linguagens) {
            System.out.println(nome + ": " + nome.length());
        }
    }
}
```

No Java 25, como arquivo compacto:

```java title="Tamanhos.java"
// Sem declaração de classe, sem public static, sem String[] args.
// List vem do import automático de java.base; IO fica em java.lang.
void main() {
    var linguagens = List.of("Java", "Kotlin", "Scala");
    for (var nome : linguagens) {
        IO.println(nome + ": " + nome.length());
    }
    IO.println(saudacao());
}

// Campos e métodos viram membros da classe implícita
String saudacao() {
    return "Olá do Java " + Runtime.version().feature();
}
```

Execute com `java Tamanhos.java`. Para transformar o arquivo em uma classe comum, basta envolver os membros em `class Tamanhos { ... }` e adicionar `import module java.base;`; o `main` continua igual. O público-alvo não é só quem está aprendendo: scripts, utilitários de linha de comando e protótipos também ficam mais curtos.

### Import de módulos

**Chegou em:** Java 23 (preview, [JEP 476](https://openjdk.org/jeps/476)) → Java 24 (2ª preview, [JEP 494](https://openjdk.org/jeps/494)) → Java 25 (final, [JEP 511](https://openjdk.org/jeps/511))

A declaração `import module M;` importa sob demanda todas as classes e interfaces públicas de nível superior dos pacotes que o módulo `M` exporta, mais os pacotes exportados pelos módulos que `M` requer de forma transitiva. `import module java.base` equivale a 54 imports do tipo `pacote.*`. O código que usa a declaração **não precisa ser modular**: funciona no class path normalmente ([JEP 511](https://openjdk.org/jeps/511)).

Como vários pacotes entram de uma vez, nomes simples podem ficar ambíguos (`java.util.List` e `java.awt.List`, `java.util.Date` e `java.sql.Date`). O uso ambíguo gera erro de compilação, e a solução é um import mais específico. A regra de sombreamento segue a especificidade: import de tipo único vence import sob demanda (`pacote.*`), que vence `import module`. A capacidade de um `pacote.*` sombrear um `import module` foi adicionada na segunda preview, junto com a mudança que faz `import module java.se` importar toda a API do Java SE ([JEP 494](https://openjdk.org/jeps/494)).

```java title="Relatorio.java" {1-4}
import module java.base;   // java.util, java.io, java.time, java.util.stream...
import module java.sql;    // java.sql, javax.sql e os módulos que java.sql requer transitivamente

import java.sql.Date;      // desfaz a ambiguidade: java.util.Date x java.sql.Date

public class Relatorio {
    public static void main(String[] args) {
        Map<String, List<Integer>> vendas = new TreeMap<>();
        vendas.put("norte", List.of(10, 20));
        vendas.put("sul", List.of(5));

        String resumo = vendas.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue().stream().mapToInt(Integer::intValue).sum())
                .collect(Collectors.joining(", "));

        Date hoje = Date.valueOf(LocalDate.of(2025, 9, 16)); // java.sql.Date
        System.out.println(hoje + " -> " + resumo);
    }
}
```

Em código de produção com muitas dependências, imports explícitos continuam deixando mais claro de onde vem cada tipo. `import module` brilha em scripts, protótipos, testes e em código que usa intensamente uma API modular, como `java.xml` ou `java.net.http`.

### Corpos de construtor flexíveis

**Chegou em:** Java 22 (preview, [JEP 447](https://openjdk.org/jeps/447)) → Java 23 (2ª preview, [JEP 482](https://openjdk.org/jeps/482)) → Java 24 (3ª preview, [JEP 492](https://openjdk.org/jeps/492)) → Java 25 (final, [JEP 513](https://openjdk.org/jeps/513))

Desde a primeira versão da linguagem, a primeira instrução de um construtor tinha de ser `super(...)` ou `this(...)`. Isso causava dois problemas descritos no [JEP 513](https://openjdk.org/jeps/513):

- **Falta de expressividade:** não dava para validar argumentos antes de chamar o construtor da superclasse; o jeito era esconder a validação em um método estático dentro da chamada `super(verificar(x))`.
- **Integridade:** se o construtor da superclasse chama um método sobrescrito, esse método roda antes de a subclasse inicializar seus campos e enxerga valores padrão (`null`, `0`), inclusive em campos `final`.

Agora o corpo do construtor tem duas fases. O **prólogo** é o código antes de `super(...)`/`this(...)`; o **epílogo** é o código depois. No prólogo não se pode usar a instância em construção (ler campos, chamar métodos de instância, passar `this` adiante), mas é permitido validar argumentos, calcular valores e **atribuir campos da própria classe** que não tenham inicializador.

```java title="Construtores.java" {19-25}
class Pessoa {
    final int idade;

    Pessoa(int idade) {
        if (idade < 0) throw new IllegalArgumentException("idade negativa");
        this.idade = idade;
        mostrar(); // má prática, mas comum: chama método sobrescrevível
    }

    void mostrar() {
        System.out.println("Idade: " + idade);
    }
}

class Funcionario extends Pessoa {
    final String escritorio;

    Funcionario(int idade, String escritorio) {
        // Prólogo: roda ANTES do construtor da superclasse
        if (idade < 18 || idade > 67) {
            throw new IllegalArgumentException("idade fora da faixa: " + idade);
        }
        this.escritorio = escritorio; // atribuir campo antes de super(...) é permitido
        super(idade);
        // Epílogo: aqui o objeto já está inicializado e this pode ser usado livremente
    }

    @Override
    void mostrar() {
        System.out.println("Idade: " + idade + ", escritório: " + escritorio);
    }
}

public class Construtores {
    public static void main(String[] args) {
        new Funcionario(42, "POA-01"); // imprime o escritório, não null
        try {
            new Funcionario(15, "POA-01");
        } catch (IllegalArgumentException e) {
            System.out.println("Falhou cedo: " + e.getMessage());
        }
    }
}
```

Saída:

```text
Idade: 42, escritório: POA-01
Falhou cedo: idade fora da faixa: 15
```

No Java 21, com `super(idade)` obrigatoriamente na primeira linha, o mesmo código imprimiria `escritório: null`, porque `Pessoa` chamaria `mostrar()` antes da atribuição. Na primeira preview, no Java 22, o recurso se chamava "Statements before super(...)".

### Variáveis e padrões sem nome

**Chegou em:** Java 21 (preview, [JEP 443](https://openjdk.org/jeps/443)) → Java 22 (final, [JEP 456](https://openjdk.org/jeps/456))

O caractere `_` passa a indicar uma variável ou um padrão que precisa existir sintaticamente, mas não é usado: parâmetro de lambda ignorado, exceção capturada e não lida, componente de record que não interessa em um padrão ([JEP 456](https://openjdk.org/jeps/456)). O ganho é de legibilidade (fica explícito que o valor é descartado) e evita avisos de variável não usada.

```java title="Unnamed.java"
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class Unnamed {
    sealed interface Forma permits Circulo, Retangulo {}
    record Ponto(int x, int y) {}
    record Circulo(Ponto centro, double raio) implements Forma {}
    record Retangulo(Ponto canto, double largura, double altura) implements Forma {}

    static String descrever(Forma forma) {
        return switch (forma) {
            // só interessa o raio: o centro vira um padrão sem nome
            case Circulo(_, double raio) -> "círculo de raio " + raio;
            case Retangulo(_, double l, double a) -> "retângulo " + l + "x" + a;
        };
    }

    static int paraInt(String texto) {
        try {
            return Integer.parseInt(texto);
        } catch (NumberFormatException _) { // exceção não usada
            return -1;
        }
    }

    public static void main(String[] args) {
        System.out.println(descrever(new Circulo(new Ponto(0, 0), 2.5)));
        System.out.println(paraInt("abc"));

        Map<String, Integer> contagem = List.of("a", "b", "a").stream()
                .collect(Collectors.toMap(s -> s, _ -> 1, Integer::sum)); // parâmetro de lambda sem nome
        System.out.println(contagem);
    }
}
```

### String Templates foram retirados

**Chegou em:** Java 21 (preview, [JEP 430](https://openjdk.org/jeps/430)) → Java 22 (2ª preview, [JEP 459](https://openjdk.org/jeps/459)) → Java 23 (removido)

Quem experimentou `STR."Olá \{nome}"` com `--enable-preview` no Java 21 precisa reescrever esse código. As [notas de release do JDK 23](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html) informam que, após feedback e discussão, o recurso foi considerado inadequado na forma atual e retirado, sem consenso ainda sobre um desenho melhor. Não há substituto no Java 25; continue com concatenação, `String.format`/`formatted` ou `StringBuilder`.

## Concorrência

A API `StructuredTaskScope` mudou bastante desde o Java 21 e **ainda não é final** no Java 25; ela está em [Recursos em preview ou incubadora nesta LTS](#recursos-em-preview-ou-incubadora-nesta-lts).

### `synchronized` não prende mais virtual threads

**Chegou em:** Java 24 (final, [JEP 491](https://openjdk.org/jeps/491))

No Java 21, uma virtual thread que bloqueasse dentro de um método ou bloco `synchronized` (I/O, `Object.wait()` ou espera por um monitor ocupado) ficava **presa** (pinned) à thread da plataforma que a executava, a carrier. O motivo, descrito no [JEP 491](https://openjdk.org/jeps/491): a JVM registrava como dona do monitor a carrier, não a virtual thread. Se a virtual thread desmontasse, outra virtual thread montada na mesma carrier pareceria dona do monitor e a exclusão mútua se perderia. Como o número de carriers é pequeno, bastavam algumas virtual threads presas para limitar severamente quantas tarefas a aplicação conseguia atender.

A partir do Java 24, a JVM permite que virtual threads adquiram, segurem e liberem monitores independentemente da carrier. Ao bloquear para adquirir um monitor ou em `Object.wait()`, a virtual thread desmonta e libera a carrier; quando pode continuar, volta ao scheduler e remonta, possivelmente em outra carrier.

![Comparação entre Java 21 a 23, em que a virtual thread bloqueada em synchronized prende a carrier, e Java 24 e 25, em que ela desmonta e libera a carrier](/posts/java-25/synchronized-sem-pinning.svg)

Consequências práticas para quem migra:

- A recomendação de trocar `synchronized` por `ReentrantLock` só por causa de pinning deixa de ser necessária. O JEP recomenda escolher entre os dois pelo que o problema pede e diz que não é preciso reverter código já migrado.
- A propriedade `jdk.tracePinnedThreads` foi removida; defini-la não tem efeito.
- Ainda há pinning em casos menos comuns: código nativo que chama de volta código Java e bloqueia, e bloqueios durante carregamento ou inicialização de classe. O evento JFR `jdk.VirtualThreadPinned` continua existindo para esses casos.

```java title="Estoque.java"
import java.util.concurrent.Executors;

public class Estoque {
    private int disponivel = 1_000;

    // No Java 21, bloquear aqui dentro prendia a carrier.
    // No Java 24+, a virtual thread desmonta enquanto espera.
    synchronized void reservar() throws InterruptedException {
        Thread.sleep(10); // simula uma chamada remota feita com o lock
        disponivel--;
    }

    public static void main(String[] args) throws Exception {
        var estoque = new Estoque();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 1_000; i++) {
                executor.submit(() -> { estoque.reservar(); return null; });
            }
        }
        System.out.println("restante: " + estoque.disponivel);
    }
}
```

O exemplo continua serializando o acesso (é para isso que serve o lock); a diferença é que as carriers ficam livres para outras tarefas enquanto as virtual threads esperam.

### Scoped Values

**Chegou em:** Java 20 (incubadora, [JEP 429](https://openjdk.org/jeps/429)) → Java 21 (preview, [JEP 446](https://openjdk.org/jeps/446)) → Java 22 (2ª preview, [JEP 464](https://openjdk.org/jeps/464)) → Java 23 (3ª preview, [JEP 481](https://openjdk.org/jeps/481)) → Java 24 (4ª preview, [JEP 487](https://openjdk.org/jeps/487)) → Java 25 (final, [JEP 506](https://openjdk.org/jeps/506))

`ThreadLocal` tem três problemas conhecidos: é mutável de qualquer ponto (`set` pode ser chamado por código distante), tem tempo de vida ilimitado (vaza se ninguém chamar `remove`) e a herança para threads filhas copia valores, o que custa caro com muitas virtual threads. Um `ScopedValue` resolve isso compartilhando um valor **imutável** com os métodos chamados, direta ou indiretamente, durante um escopo bem delimitado ([JEP 506](https://openjdk.org/jeps/506)):

- `ScopedValue.where(CHAVE, valor).run(...)` ou `.call(...)` associa o valor apenas durante a execução do lambda;
- não existe `set`; um método chamado pode criar uma **reassociação aninhada**, que vale só para quem ele chamar;
- ao sair do escopo, o valor deixa de estar associado, sem `remove`;
- subtarefas criadas com `StructuredTaskScope` herdam as associações.

```java title="Contexto.java"
public class Contexto {
    record Usuario(String nome, boolean admin) {}

    // Normalmente private static final: quem tem a referência controla leitura e escrita
    private static final ScopedValue<Usuario> USUARIO_ATUAL = ScopedValue.newInstance();

    public static void main(String[] args) throws Exception {
        var ana = new Usuario("ana", true);

        // O valor só existe durante a execução de run(...)
        ScopedValue.where(USUARIO_ATUAL, ana).run(() -> atenderRequisicao());

        System.out.println("fora do escopo, ligado? " + USUARIO_ATUAL.isBound()); // false

        // call(...) devolve um valor e pode lançar exceção checada
        String saudacao = ScopedValue.where(USUARIO_ATUAL, new Usuario("bia", false))
                .call(() -> "olá, " + USUARIO_ATUAL.get().nome());
        System.out.println(saudacao);
    }

    static void atenderRequisicao() {
        excluirPedido(99);
        // reassociação aninhada: vale só para quem for chamado dentro dela
        ScopedValue.where(USUARIO_ATUAL, new Usuario("sistema", false)).run(() -> excluirPedido(100));
        System.out.println("de volta: " + USUARIO_ATUAL.get().nome()); // ana
    }

    static void excluirPedido(int id) {
        Usuario u = USUARIO_ATUAL.get(); // lido em qualquer ponto da pilha de chamadas
        System.out.println(u.nome() + (u.admin() ? " excluiu " : " não pode excluir ") + id);
    }
}
```

Saída:

```text
ana excluiu 99
sistema não pode excluir 100
de volta: ana
fora do escopo, ligado? false
olá, bia
```

A única mudança da versão final em relação à quarta preview: `ScopedValue.orElse` não aceita mais `null` como argumento ([JEP 506](https://openjdk.org/jeps/506)). A API está documentada no [Javadoc de `ScopedValue`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ScopedValue.html).

`ThreadLocal` continua existindo e continua sendo a escolha quando o valor precisa ser mutável ou quando há cache por thread. Scoped Values são para o caso de "passar contexto adiante sem parâmetro", como usuário autenticado, ID de transação ou contexto de framework.

## APIs da biblioteca padrão

### Stream Gatherers

**Chegou em:** Java 22 (preview, [JEP 461](https://openjdk.org/jeps/461)) → Java 23 (2ª preview, [JEP 473](https://openjdk.org/jeps/473)) → Java 24 (final, [JEP 485](https://openjdk.org/jeps/485))

A Stream API tem um conjunto fixo de operações intermediárias (`map`, `filter`, `flatMap`, `distinct`...). Operações como "agrupar em lotes de N", "janela deslizante" ou "soma acumulada" exigiam truques com estado externo ou coletar tudo antes. O [JEP 485](https://openjdk.org/jeps/485) adiciona `Stream::gather(Gatherer)`, que aceita **operações intermediárias personalizadas**, com estado, capazes de transformar um-para-um, um-para-muitos, muitos-para-um ou muitos-para-muitos e de encerrar o stream mais cedo.

A classe [`java.util.stream.Gatherers`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Gatherers.html) traz cinco gatherers prontos: `fold`, `mapConcurrent`, `scan`, `windowFixed` e `windowSliding`.

```java title="Janelas.java"
import java.util.List;
import java.util.stream.Gatherers;
import java.util.stream.Stream;

public class Janelas {
    public static void main(String[] args) {
        // Lotes de tamanho fixo
        List<List<Integer>> lotes = Stream.of(1, 2, 3, 4, 5, 6, 7)
                .gather(Gatherers.windowFixed(3))
                .toList();
        System.out.println(lotes); // [[1, 2, 3], [4, 5, 6], [7]]

        // Janela deslizante: variação entre leituras consecutivas
        List<Integer> deltas = Stream.of(10, 12, 9, 15)
                .gather(Gatherers.windowSliding(2))
                .map(par -> par.get(1) - par.get(0))
                .toList();
        System.out.println(deltas); // [2, -3, 6]

        // Soma acumulada
        List<Integer> acumulado = Stream.of(1, 2, 3, 4)
                .gather(Gatherers.scan(() -> 0, Integer::sum))
                .toList();
        System.out.println(acumulado); // [1, 3, 6, 10]

        // Até 4 chamadas simultâneas (em virtual threads), preservando a ordem
        List<String> respostas = Stream.of("a", "b", "c", "d", "e")
                .gather(Gatherers.mapConcurrent(4, id -> consultar(id)))
                .toList();
        System.out.println(respostas); // [A, B, C, D, E]
    }

    static String consultar(String id) {
        try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        return id.toUpperCase();
    }
}
```

`mapConcurrent` é especialmente útil para chamadas de I/O em paralelo com limite de concorrência: o Javadoc de `Gatherers` informa que ele usa virtual threads e preserva a ordem dos elementos. Para operações próprias, implemente a interface `Gatherer` com `initializer`, `integrator`, `combiner` e `finisher`.

### Foreign Function & Memory API

**Chegou em:** Java 19 (preview, [JEP 424](https://openjdk.org/jeps/424)) → Java 20 (2ª preview, [JEP 434](https://openjdk.org/jeps/434)) → Java 21 (3ª preview, [JEP 442](https://openjdk.org/jeps/442)) → Java 22 (final, [JEP 454](https://openjdk.org/jeps/454))

A FFM API, do Projeto Panama, substitui JNI para chamar bibliotecas nativas e manipular memória fora do heap de forma segura, em Java puro, sem código C de cola. Os blocos principais ([JEP 454](https://openjdk.org/jeps/454)):

- `Arena`: controla o tempo de vida da memória nativa (liberada ao fechar a arena);
- `MemorySegment`: região de memória com limites verificados;
- `Linker` e `FunctionDescriptor`: criam um `MethodHandle` para uma função nativa (downcall) ou expõem código Java para ser chamado pelo nativo (upcall);
- `SymbolLookup`: localiza símbolos em bibliotecas.

```java title="Strlen.java"
import java.lang.foreign.Arena;
import java.lang.foreign.FunctionDescriptor;
import java.lang.foreign.Linker;
import java.lang.foreign.MemorySegment;
import java.lang.invoke.MethodHandle;

import static java.lang.foreign.ValueLayout.ADDRESS;
import static java.lang.foreign.ValueLayout.JAVA_LONG;

public class Strlen {
    public static void main(String[] args) throws Throwable {
        Linker linker = Linker.nativeLinker();
        // size_t strlen(const char *s);
        MethodHandle strlen = linker.downcallHandle(
                linker.defaultLookup().find("strlen").orElseThrow(),
                FunctionDescriptor.of(JAVA_LONG, ADDRESS));

        try (Arena arena = Arena.ofConfined()) {                  // memória nativa com escopo definido
            MemorySegment texto = arena.allocateFrom("Olá, FFM"); // string C terminada em \0 (UTF-8)
            long tamanho = (long) strlen.invokeExact(texto);
            System.out.println("strlen = " + tamanho);            // 9: conta bytes, e "á" ocupa 2
        } // a memória é liberada aqui
    }
}
```

Métodos como `Linker::downcallHandle` são **restritos**. Sem `--enable-native-access`, o Java 25 executa, mas imprime um aviso de que chamadas assim serão bloqueadas no futuro (veja [Avisos no uso de JNI](#avisos-no-uso-de-jni)). Rode com `java --enable-native-access=ALL-UNNAMED Strlen.java` ou declare o atributo `Enable-Native-Access` no manifesto do JAR executável.

### Class-File API

**Chegou em:** Java 22 (preview, [JEP 457](https://openjdk.org/jeps/457)) → Java 23 (2ª preview, [JEP 466](https://openjdk.org/jeps/466)) → Java 24 (final, [JEP 484](https://openjdk.org/jeps/484))

O pacote `java.lang.classfile` oferece uma API padrão para ler, gerar e transformar arquivos `.class` ([JEP 484](https://openjdk.org/jeps/484)). Frameworks e ferramentas costumam embutir bibliotecas como ASM, que precisam ser atualizadas a cada nova versão do formato de classe; com uma API que evolui junto com o JDK, esse descompasso tende a sumir. É uma API para autores de frameworks, agentes e ferramentas de build, não para código de aplicação comum.

```java title="ListarMetodos.java"
import java.io.InputStream;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.MethodModel;

public class ListarMetodos {
    public static void main(String[] args) throws Exception {
        byte[] bytes;
        try (InputStream in = Object.class.getResourceAsStream("/java/lang/Object.class")) {
            bytes = in.readAllBytes();
        }
        ClassModel modelo = ClassFile.of().parse(bytes); // parse sem ASM nem bibliotecas externas
        System.out.println(modelo.thisClass().asInternalName() + " (versão " + modelo.majorVersion() + ")");
        for (MethodModel m : modelo.methods()) {
            System.out.println("  " + m.methodName().stringValue() + m.methodType().stringValue());
        }
    }
}
```

No Temurin 25, a primeira linha impressa é `java/lang/Object (versão 69)`: 69 é a versão de formato de classe do Java 25.

## JVM, GC e desempenho

### Cache AOT: inicialização e warmup mais rápidos (Projeto Leyden)

**Chegou em:** Java 24 (final, [JEP 483](https://openjdk.org/jeps/483)) → Java 25 (final, [JEP 514](https://openjdk.org/jeps/514) e [JEP 515](https://openjdk.org/jeps/515))

Toda vez que uma aplicação Java sobe, a JVM lê, faz parse, carrega e linka milhares de classes, e o JIT precisa observar a execução antes de otimizar o código quente. O Projeto Leyden desloca parte desse trabalho para antes da execução, gravando-o em um **cache AOT** (ahead-of-time) reaproveitado nas execuções seguintes. Não é preciso mudar o código.

- **Java 24, [JEP 483](https://openjdk.org/jeps/483):** o cache guarda classes já carregadas e linkadas. O fluxo tem três passos: execução de treino (`-XX:AOTMode=record`), criação do cache (`-XX:AOTMode=create`) e produção (`-XX:AOTCache`). O JEP cita o Spring PetClinic 3.2.0 subindo em 4,486 s no JDK 23 e em 2,604 s no JDK 24 com o cache, 42% menos.
- **Java 25, [JEP 514](https://openjdk.org/jeps/514):** a opção `-XX:AOTCacheOutput` faz treino e criação em um único comando. A variável `JDK_AOT_VM_OPTIONS` passa opções só para a fase de criação.
- **Java 25, [JEP 515](https://openjdk.org/jeps/515):** o cache passa a guardar também **perfis de execução de métodos** coletados no treino, então o JIT compila o código quente mais cedo. A JVM continua perfilando em produção. No exemplo do JEP, um programa curto cai de 90 ms para 73 ms (19%), com 250 KB a mais de cache.

![Fluxo do cache AOT: três passos no Java 24 e um comando de treino e criação no Java 25, com o que o cache traz e as regras para reaproveitá-lo](/posts/java-25/cache-aot.svg)

```bash title="Java 25: criar e usar o cache"
# 1. Treino + criação do cache em um único comando
java -XX:AOTCacheOutput=app.aot -cp app.jar com.exemplo.App

# 2. Produção usando o cache
java -XX:AOTCache=app.aot -cp app.jar com.exemplo.App
```

O treino deve exercitar os caminhos comuns da aplicação, por exemplo, um conjunto de testes de integração ou uma carga sintética. Pontos de atenção do [JEP 483](https://openjdk.org/jeps/483): todas as execuções precisam usar a mesma release do JDK, o mesmo sistema operacional e a mesma arquitetura; o class path de produção deve ser igual ao do treino (ou acrescentar entradas no fim) e conter apenas JARs; as opções de módulo precisam ser consistentes, e algumas, como `--add-opens` e `--patch-module`, não podem ser usadas. Classes carregadas por class loaders customizados não entram no cache. Se o cache não puder ser usado, a JVM emite um aviso e segue sem ele.

### Compact object headers

**Chegou em:** Java 24 (experimental, [JEP 450](https://openjdk.org/jeps/450)) → Java 25 (final, [JEP 519](https://openjdk.org/jeps/519))

Cada objeto no heap tem um cabeçalho com metadados: hash de identidade, idade para o GC, estado de lock e ponteiro para a classe. Na HotSpot de 64 bits esse cabeçalho ocupa entre 96 bits (12 bytes) e 128 bits (16 bytes). Segundo o [JEP 450](https://openjdk.org/jeps/450), experimentos do Projeto Lilliput mostram objetos médios de 32 a 64 bytes em muitas cargas, o que faz o cabeçalho representar mais de 20% dos dados vivos. Com headers compactos, o cabeçalho cai para **64 bits (8 bytes)**: o ponteiro de classe comprimido passa para dentro do mark word e é reduzido de 32 para 22 bits.

![Layout do cabeçalho de objeto: padrão de 96 bits com mark word e class pointer comprimido, e compacto de 64 bits com class pointer de 22 bits, hash, bits reservados para Valhalla, idade, self-forwarding e tag](/posts/java-25/object-headers-compactos.svg)

No Java 25 a opção deixou de ser experimental e **continua desligada por padrão** ([JEP 519](https://openjdk.org/jeps/519), [notas de release do JDK 25](https://www.oracle.com/java/technologies/javase/25-relnote-issues.html)):

```bash
# Java 24 (experimental)
java -XX:+UnlockExperimentalVMOptions -XX:+UseCompactObjectHeaders -jar app.jar

# Java 25 (produto)
java -XX:+UseCompactObjectHeaders -jar app.jar
```

Os números citados no [JEP 519](https://openjdk.org/jeps/519): em um cenário, o SPECjbb2015 usou 22% menos heap e 8% menos tempo de CPU; em outro, fez 15% menos coletas com G1 e com Parallel; um benchmark de parser JSON altamente paralelo rodou em 10% menos tempo. O mesmo JEP relata que o recurso foi testado na Amazon em centenas de serviços em produção, a maioria com backports para JDK 21 e 17. Uma limitação do [JEP 450](https://openjdk.org/jeps/450): com coletores que não sejam o ZGC, os headers compactos não são compatíveis com heaps acima de 8 TB. Meça na sua carga antes de ativar em produção.

### Shenandoah geracional

**Chegou em:** Java 24 (experimental, [JEP 404](https://openjdk.org/jeps/404)) → Java 25 (final, [JEP 521](https://openjdk.org/jeps/521))

O Shenandoah é um coletor de pausas curtas que compacta o heap concorrentemente com a aplicação. O modo geracional aplica a hipótese geracional (a maioria dos objetos morre jovem) para concentrar o trabalho na geração jovem, com o objetivo de melhorar throughput sustentável, resistência a picos de carga e uso de memória ([JEP 404](https://openjdk.org/jeps/404)). No Java 25 ele deixa de exigir `-XX:+UnlockExperimentalVMOptions`, mas o modo padrão do Shenandoah continua sendo o de geração única ([JEP 521](https://openjdk.org/jeps/521)).

```bash
java -XX:+UseShenandoahGC -XX:ShenandoahGCMode=generational -jar app.jar
```

### ZGC passa a ser só geracional

**Chegou em:** Java 23 (depreciado, [JEP 474](https://openjdk.org/jeps/474)) → Java 24 (removido, [JEP 490](https://openjdk.org/jeps/490))

No Java 21, o ZGC geracional existia ([JEP 439](https://openjdk.org/jeps/439)), mas precisava de `-XX:+ZGenerational`. O Java 23 tornou o modo geracional o padrão e depreciou o não geracional; o Java 24 removeu o não geracional para reduzir o custo de manter dois modos. Quem usa `-XX:+UseZGC` já recebe o modo geracional. No Temurin 25.0.4, passar `-XX:+ZGenerational` ou `-XX:-ZGenerational` gera o aviso `Ignoring option ZGenerational; support was removed in 24.0` e a JVM segue com o modo geracional. Remova a opção dos scripts.

### Melhorias no G1

**Chegou em:** Java 22 (final, [JEP 423](https://openjdk.org/jeps/423)) e Java 24 (final, [JEP 475](https://openjdk.org/jeps/475))

- **Region pinning** — Java 22, [JEP 423](https://openjdk.org/jeps/423): antes, enquanto uma thread estava em uma região crítica de JNI (por exemplo, `GetPrimitiveArrayCritical`), o G1 desativava a coleta. Agora ele "fixa" apenas as regiões com objetos em uso por código nativo e continua coletando as demais, reduzindo latência em aplicações que usam JNI.
- **Late barrier expansion** — Java 24, [JEP 475](https://openjdk.org/jeps/475): mudança interna que move a expansão das barreiras do G1 para uma fase mais tardia do pipeline do compilador C2, simplificando a implementação. Não exige ação.

### JDK Flight Recorder

**Chegou em:** Java 25 (final, [JEP 518](https://openjdk.org/jeps/518) e [JEP 520](https://openjdk.org/jeps/520)) e Java 25 (experimental, [JEP 509](https://openjdk.org/jeps/509))

O Java 25 trouxe três melhorias ao JFR:

- **Cooperative sampling** — [JEP 518](https://openjdk.org/jeps/518): a amostragem de pilhas passa a percorrer as pilhas apenas em safepoints, minimizando o viés de safepoint, para aumentar a estabilidade do profiler.
- **CPU-time profiling** (experimental, só Linux) — [JEP 509](https://openjdk.org/jeps/509): usa o temporizador de CPU do Linux para amostrar threads em intervalos de tempo de CPU, no novo evento `jdk.CPUTimeSample`, desligado por padrão. Por ser um evento experimental do JFR, não exige `-XX:+UnlockExperimentalVMOptions`.
- **Method timing & tracing** — [JEP 520](https://openjdk.org/jeps/520): novos eventos `jdk.MethodTiming` e `jdk.MethodTrace`, baseados em instrumentação de bytecode e filtrados por método, classe ou anotação.

```bash
# Tempo de todos os inicializadores estáticos (útil para investigar startup lento)
java '-XX:StartFlightRecording:method-timing=::<clinit>,filename=clinit.jfr' -jar app.jar
jfr view method-timing clinit.jfr

# Amostragem por tempo de CPU (experimental, Linux)
java -XX:StartFlightRecording=jdk.CPUTimeSample#enabled=true,filename=profile.jfr -jar app.jar
```

## Ferramentas

### Executar programas com vários arquivos-fonte

**Chegou em:** Java 22 (final, [JEP 458](https://openjdk.org/jeps/458))

Desde o Java 11 o launcher executa um único arquivo `.java` sem compilação explícita. O [JEP 458](https://openjdk.org/jeps/458) estende esse modo a programas com vários arquivos: ao rodar `java Prog.java`, o launcher encontra no sistema de arquivos (seguindo a estrutura de diretórios dos pacotes) e compila em memória os outros `.java` referenciados. Só são compilados os arquivos realmente usados pelo programa.

```java title="Prog.java"
// Prog.java
class Prog {
    public static void main(String[] args) {
        Helper.run(); // Helper.java é encontrado e compilado em memória
    }
}
```

```java title="Helper.java"
// Helper.java
class Helper {
    static void run() {
        System.out.println("Olá de outro arquivo!");
    }
}
```

```bash
java Prog.java
# com bibliotecas: todos os JARs do diretório no class path
java --class-path '*' Prog.java
```

Junto com arquivos compactos e `import module`, isso permite começar um projeto sem ferramenta de build e adotá-la só quando fizer sentido.

### Comentários de documentação em Markdown

**Chegou em:** Java 23 (final, [JEP 467](https://openjdk.org/jeps/467))

Comentários iniciados por `///` em cada linha são interpretados como **Markdown** (CommonMark) pelo javadoc, em vez da mistura de HTML e tags `@`. As block tags (`@param`, `@return`...) continuam funcionando, e links para elementos da API usam a sintaxe de referência do Markdown com colchetes ([JEP 467](https://openjdk.org/jeps/467)).

````java title="Calculadora.java"
/// Operações aritméticas simples.
///
/// Exemplo de uso:
///
/// ```java
/// int total = Calculadora.somar(2, 3); // 5
/// ```
///
/// Veja também [Math#addExact(int, int)] para detectar overflow.
public class Calculadora {

    /// Soma dois inteiros.
    ///
    /// - O resultado **não** verifica overflow.
    /// - Use `Math.addExact` quando isso importar.
    ///
    /// @param a primeiro valor
    /// @param b segundo valor
    /// @return a soma de `a` e `b`
    public static int somar(int a, int b) {
        return a + b;
    }
}
````

### jlink sem arquivos JMOD

**Chegou em:** Java 24 (final, [JEP 493](https://openjdk.org/jeps/493))

O `jlink` pode criar imagens de runtime customizadas sem os arquivos JMOD do JDK, o que reduz o tamanho do JDK em cerca de 25%. A capacidade precisa ser habilitada **na compilação do próprio JDK** (`--enable-linkable-runtime`), não vem ativada por padrão e alguns fornecedores podem optar por não ativá-la ([JEP 493](https://openjdk.org/jeps/493)). Verifique a documentação da sua distribuição.

## Segurança

### Criptografia resistente a computação quântica: ML-KEM e ML-DSA

**Chegou em:** Java 24 (final, [JEP 496](https://openjdk.org/jeps/496) e [JEP 497](https://openjdk.org/jeps/497))

Computadores quânticos de grande escala tornariam vulneráveis algoritmos como RSA e Diffie-Hellman. O [JEP 496](https://openjdk.org/jeps/496) lembra que a ameaça já existe hoje: um adversário pode capturar dados cifrados agora e decifrá-los quando esses computadores existirem. O Java 24 implementa os dois padrões do NIST baseados em reticulados:

- **ML-KEM** ([JEP 496](https://openjdk.org/jeps/496), FIPS 203): mecanismo de encapsulamento de chaves, usado para combinar uma chave simétrica por um canal inseguro. Parâmetros `ML-KEM-512`, `ML-KEM-768` (padrão) e `ML-KEM-1024`, via `KeyPairGenerator`, `KEM` e `KeyFactory`.
- **ML-DSA** ([JEP 497](https://openjdk.org/jeps/497), FIPS 204): assinatura digital. Parâmetros `ML-DSA-44`, `ML-DSA-65` (padrão) e `ML-DSA-87`, via `KeyPairGenerator`, `Signature` e `KeyFactory`.

O `keytool` também gera pares de chaves dos dois algoritmos.

### Key Derivation Function API

**Chegou em:** Java 24 (preview, [JEP 478](https://openjdk.org/jeps/478)) → Java 25 (final, [JEP 510](https://openjdk.org/jeps/510))

Funções de derivação de chave (KDFs) geram chaves criptográficas a partir de um segredo e de dados adicionais. O JEP cita como usos implementações de KEM como o ML-KEM, a troca de chaves híbrida no TLS 1.3 e o HPKE. A nova classe `javax.crypto.KDF` tem `deriveKey` (devolve uma `SecretKey`) e `deriveData` (devolve bytes). A implementação incluída é o **HKDF**, configurado por `HKDFParameterSpec` ([JEP 510](https://openjdk.org/jeps/510)). Atenção: a KDF API não substitui `SecretKeyFactory` com PBKDF2 para hash de senhas; o foco é derivar chaves a partir de material de chave.

O exemplo abaixo junta as três APIs: combina uma chave com ML-KEM, deriva dela uma chave AES com HKDF e assina dados com ML-DSA.

```java title="PosQuantico.java"
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.util.Arrays;
import javax.crypto.KDF;
import javax.crypto.KEM;
import javax.crypto.SecretKey;
import javax.crypto.spec.HKDFParameterSpec;

public class PosQuantico {
    public static void main(String[] args) throws Exception {
        // ML-KEM (JEP 496): combinar uma chave simétrica usando a chave pública do receptor
        KeyPair receptor = KeyPairGenerator.getInstance("ML-KEM").generateKeyPair(); // ML-KEM-768 por padrão

        KEM.Encapsulator enc = KEM.getInstance("ML-KEM").newEncapsulator(receptor.getPublic());
        KEM.Encapsulated encapsulado = enc.encapsulate();
        SecretKey chaveEmissor = encapsulado.key();
        byte[] mensagem = encapsulado.encapsulation(); // enviada ao receptor

        KEM.Decapsulator dec = KEM.getInstance("ML-KEM").newDecapsulator(receptor.getPrivate());
        SecretKey chaveReceptor = dec.decapsulate(mensagem);
        System.out.println("mesma chave? " + Arrays.equals(chaveEmissor.getEncoded(), chaveReceptor.getEncoded()));

        // KDF API (JEP 510): derivar uma chave AES de 32 bytes com HKDF
        KDF hkdf = KDF.getInstance("HKDF-SHA256");
        var params = HKDFParameterSpec.ofExtract()
                .addIKM(chaveReceptor)
                .addSalt("sal-da-aplicacao".getBytes())
                .thenExpand("canal-de-pagamentos".getBytes(), 32);
        SecretKey aes = hkdf.deriveKey("AES", params);
        System.out.println("chave derivada: " + aes.getAlgorithm() + ", " + aes.getEncoded().length + " bytes");

        // ML-DSA (JEP 497): assinatura digital resistente a computação quântica
        KeyPair assinante = KeyPairGenerator.getInstance("ML-DSA").generateKeyPair(); // ML-DSA-65 por padrão
        byte[] dados = "pedido #42".getBytes();

        Signature s = Signature.getInstance("ML-DSA");
        s.initSign(assinante.getPrivate());
        s.update(dados);
        byte[] assinatura = s.sign();

        Signature v = Signature.getInstance("ML-DSA");
        v.initVerify(assinante.getPublic());
        v.update(dados);
        System.out.println("assinatura válida? " + v.verify(assinatura));
    }
}
```

Saída:

```text
mesma chave? true
chave derivada: AES, 32 bytes
assinatura válida? true
```

### Security Manager desativado permanentemente

**Chegou em:** Java 17 (depreciado para remoção, [JEP 411](https://openjdk.org/jeps/411)) → Java 24 (removido, [JEP 486](https://openjdk.org/jeps/486))

A partir do Java 24 não é mais possível ativar o Security Manager ([JEP 486](https://openjdk.org/jeps/486)):

- iniciar a JVM com `-Djava.security.manager` (vazio, `allow`, `default` ou nome de classe) é **erro fatal na inicialização**, sem opção de rebaixar para aviso;
- `System.setSecurityManager(...)` lança `UnsupportedOperationException`;
- a API continua existindo, mas se comporta como se nenhum Security Manager estivesse ativo; `-Djava.security.manager=disallow` continua aceito.

```text
$ java -Djava.security.manager -version
Error occurred during initialization of VM
java.lang.Error: A command line option has attempted to allow or enable the Security Manager. Enabling a Security Manager is not supported.
```

O JEP não oferece substituto para sandboxing. No Java 25, várias classes de permissão que só faziam sentido com o Security Manager (como `RuntimePermission`, `FilePermission` e `PropertyPermission`) foram depreciadas para remoção ([notas de release do JDK 25](https://www.oracle.com/java/technologies/javase/25-relnote-issues.html)).

## Removidos e depreciados

Remoções que afetam recursos já citados estão nas próprias seções: [String Templates](#string-templates-foram-retirados), [ZGC não geracional](#zgc-passa-a-ser-só-geracional) e [Security Manager](#security-manager-desativado-permanentemente). A lista completa de APIs e opções removidas está em [O que observar na migração](#o-que-observar-na-migração-a-partir-do-java-21).

As duas mudanças abaixo preparam a plataforma para restringir, por padrão, operações que podem quebrar as garantias da JVM (integridade por padrão). Elas afetam principalmente **bibliotecas** que sua aplicação usa e aparecem como avisos no log.

### Métodos de acesso a memória de `sun.misc.Unsafe`

**Chegou em:** Java 23 (depreciado para remoção, [JEP 471](https://openjdk.org/jeps/471)) → Java 24 (depreciado para remoção, [JEP 498](https://openjdk.org/jeps/498))

O Java 23 depreciou para remoção os métodos de acesso a memória de `sun.misc.Unsafe`, o que gera avisos de compilação. Os substitutos são `VarHandle` e a FFM API. Desde o Java 24, o primeiro uso de qualquer um desses métodos em tempo de execução também emite um aviso ([JEP 498](https://openjdk.org/jeps/498)). Por exemplo, para uma classe `com.exemplo.Cache`, empacotada em `cache.jar`, que chama `allocateMemory`, o Temurin 25.0.4 imprime:

```text
WARNING: A terminally deprecated method in sun.misc.Unsafe has been called
WARNING: sun.misc.Unsafe::allocateMemory has been called by com.exemplo.Cache (file:/app/cache.jar)
WARNING: Please consider reporting this to the maintainers of class com.exemplo.Cache
WARNING: sun.misc.Unsafe::allocateMemory will be removed in a future release
```

A opção `--sun-misc-unsafe-memory-access={allow|warn|debug|deny}` controla o comportamento. Use `debug` para descobrir qual biblioteca faz a chamada e `deny` para testar como a aplicação se comportará quando os métodos forem removidos (com `deny`, a chamada lança `UnsupportedOperationException`). A solução definitiva é atualizar a biblioteca.

### Avisos no uso de JNI

**Chegou em:** Java 24 (final, [JEP 472](https://openjdk.org/jeps/472))

Carregar bibliotecas nativas (`System.loadLibrary`), vincular métodos `native` e chamar métodos restritos da FFM API sem permissão explícita gera aviso. O modo padrão no Java 24 e no 25 é `--illegal-native-access=warn`; o JEP informa que uma release futura passará a lançar exceções por padrão. Habilite o acesso só para quem precisa:

```bash
java --enable-native-access=ALL-UNNAMED -jar app.jar     # código no class path
java --enable-native-access=com.exemplo.nativo -jar app.jar  # módulo específico
java --illegal-native-access=deny -jar app.jar           # teste antecipado da restrição futura
```

## Recursos em preview ou incubadora nesta LTS

Os recursos abaixo **não são finais no Java 25**. APIs e sintaxe ainda podem mudar em releases seguintes, então não os use em código de produção que precise compilar em futuras versões sem ajustes. A evolução deles depois do Java 25 está no artigo [Java 29](/posts/java-29/).

| Recurso | Situação no Java 25 | JEP | Como habilitar |
| --- | --- | --- | --- |
| Structured Concurrency | 5ª preview | [JEP 505](https://openjdk.org/jeps/505) | `--enable-preview` |
| Tipos primitivos em padrões, `instanceof` e `switch` | 3ª preview | [JEP 507](https://openjdk.org/jeps/507) | `--enable-preview` |
| Stable Values | preview | [JEP 502](https://openjdk.org/jeps/502) | `--enable-preview` |
| Codificação PEM de objetos criptográficos | preview | [JEP 470](https://openjdk.org/jeps/470) | `--enable-preview` |
| Vector API | 10ª incubadora | [JEP 508](https://openjdk.org/jeps/508) | `--add-modules jdk.incubator.vector` |
| CPU-time profiling no JFR | experimental | [JEP 509](https://openjdk.org/jeps/509) | evento `jdk.CPUTimeSample` |

Para recursos em preview, a flag vai na compilação e na execução:

```bash
javac --release 25 --enable-preview Main.java
java --enable-preview Main

# modo arquivo-fonte
java --enable-preview Main.java
```

### Structured Concurrency

**Chegou em:** Java 21 (preview, [JEP 453](https://openjdk.org/jeps/453)) → Java 22 (2ª preview, [JEP 462](https://openjdk.org/jeps/462)) → Java 23 (3ª preview, [JEP 480](https://openjdk.org/jeps/480)) → Java 24 (4ª preview, [JEP 499](https://openjdk.org/jeps/499)) → Java 25 (5ª preview, [JEP 505](https://openjdk.org/jeps/505))

A concorrência estruturada trata um grupo de subtarefas concorrentes como uma unidade: elas começam e terminam dentro de um bloco léxico, falhas cancelam as irmãs, a interrupção do dono se propaga e o thread dump mostra a hierarquia. A 5ª preview mudou a API de forma **incompatível** com a do Java 21 ([JEP 505](https://openjdk.org/jeps/505)):

- o escopo é aberto por fábricas estáticas `StructuredTaskScope.open(...)`, e não mais por construtores;
- as subclasses `ShutdownOnFailure` e `ShutdownOnSuccess` deixaram de existir; as políticas agora são objetos `Joiner`;
- `open()` sem argumentos espera todas as subtarefas terem sucesso e falha na primeira exceção, com `join()` lançando `FailedException`;
- `Joiner.anySuccessfulResultOrThrow()`, `allSuccessfulOrThrow()`, `awaitAll()`, `awaitAllSuccessfulOrThrow()` e `allUntil(...)` cobrem os casos comuns, e é possível implementar um `Joiner` próprio;
- nome, `ThreadFactory` e timeout são configurados por uma função passada a `open`.

```java title="Pedido.java"
import java.time.Duration;
import java.util.List;
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.Joiner;
import java.util.concurrent.StructuredTaskScope.Subtask;

public class Pedido {
    record Resposta(String usuario, int pedido) {}

    static String buscarUsuario() throws InterruptedException { Thread.sleep(100); return "ana"; }
    static int buscarPedido() throws InterruptedException { Thread.sleep(150); return 42; }

    // Política padrão: espera todas terminarem com sucesso ou falha na primeira exceção
    static Resposta tratar() throws InterruptedException {
        try (var scope = StructuredTaskScope.open()) {
            Subtask<String> usuario = scope.fork(() -> buscarUsuario());
            Subtask<Integer> pedido = scope.fork(() -> buscarPedido());

            scope.join(); // lança FailedException se alguma subtarefa falhar (e cancela a outra)

            return new Resposta(usuario.get(), pedido.get());
        } // ao sair do bloco, nenhuma thread filha continua viva
    }

    // Outra política: o primeiro resultado com sucesso vence e as demais são canceladas
    static String maisRapido() throws InterruptedException {
        try (var scope = StructuredTaskScope.open(Joiner.<String>anySuccessfulResultOrThrow(),
                cf -> cf.withTimeout(Duration.ofSeconds(2)))) {
            scope.fork(() -> { Thread.sleep(300); return "réplica lenta"; });
            scope.fork(() -> { Thread.sleep(50); return "réplica rápida"; });
            return scope.join();
        }
    }

    public static void main(String[] args) throws InterruptedException {
        System.out.println(tratar());      // Resposta[usuario=ana, pedido=42]
        System.out.println(maisRapido());  // réplica rápida

        try (var scope = StructuredTaskScope.open(Joiner.<Integer>allSuccessfulOrThrow())) {
            List.of(1, 2, 3).forEach(n -> scope.fork(() -> n * n));
            System.out.println(scope.join().map(Subtask::get).toList()); // [1, 4, 9]
        }
    }
}
```

Código escrito para a preview do Java 21 com `new StructuredTaskScope.ShutdownOnFailure()` não compila no Java 25 (`cannot find symbol: class ShutdownOnFailure`).

### Tipos primitivos em padrões, `instanceof` e `switch`

**Chegou em:** Java 23 (preview, [JEP 455](https://openjdk.org/jeps/455)) → Java 24 (2ª preview, [JEP 488](https://openjdk.org/jeps/488)) → Java 25 (3ª preview, [JEP 507](https://openjdk.org/jeps/507))

Pattern matching passa a aceitar tipos primitivos em qualquer contexto de padrão, e `instanceof` e `switch` passam a funcionar com todos os tipos primitivos, inclusive `boolean`, `long`, `float` e `double` no `switch` ([JEP 507](https://openjdk.org/jeps/507)). Um padrão primitivo só casa se a conversão for **exata**, ou seja, sem perda de informação. Assim, `instanceof byte b` funciona como um teste seguro de faixa.

```java title="Primitivos.java"
public class Primitivos {
    static String faixa(int codigo) {
        // padrões de tipo primitivo: casam só se a conversão for exata
        return switch (codigo) {
            case byte b -> "cabe em byte: " + b;
            case short s -> "cabe em short: " + s;
            case int i -> "precisa de int: " + i;
        };
    }

    public static void main(String[] args) {
        int grande = 1_000;
        if (grande instanceof byte b) {
            System.out.println("byte " + b);
        } else {
            System.out.println(grande + " não cabe em byte sem perda");
        }

        System.out.println(faixa(42));      // cabe em byte: 42
        System.out.println(faixa(1_000));   // cabe em short: 1000
        System.out.println(faixa(100_000)); // precisa de int: 100000

        boolean logado = false;
        int id = switch (logado) { // switch em boolean
            case true -> 123;
            case false -> -1;
        };
        System.out.println("id = " + id);

        long v = 10_000_000_000L;
        switch (v) { // switch em long
            case 1L -> System.out.println("um");
            case 10_000_000_000L -> System.out.println("dez bilhões");
            default -> System.out.println("outro");
        }
    }
}
```

### Stable Values

**Chegou em:** Java 25 (preview, [JEP 502](https://openjdk.org/jeps/502))

Campos `final` precisam ser inicializados no construtor ou no inicializador estático, o que força inicialização antecipada (e startup mais lento); campos não `final` permitem inicialização preguiçosa, mas a JVM não consegue tratá-los como constantes. Um `StableValue` é definido **no máximo uma vez**, a qualquer momento, com garantia de execução única mesmo sob concorrência, e depois a JVM pode tratá-lo como constante ([JEP 502](https://openjdk.org/jeps/502)). O exemplo abaixo usa a API do Java 25; no Java 26, ela foi renomeada de `StableValue` para `LazyConstant` e continuou em preview ([JEP 526](https://openjdk.org/jeps/526)).

```java title="Configuracao.java"
import java.util.List;
import java.util.function.Supplier;

public class Configuracao {
    static class Cliente {
        Cliente() { System.out.println("criando cliente (caro)"); }
    }

    // Conteúdo definido no máximo uma vez, sob demanda, com segurança entre threads
    private static final StableValue<Cliente> CLIENTE = StableValue.of();

    static Cliente cliente() {
        return CLIENTE.orElseSet(Cliente::new);
    }

    // Variante que já declara como inicializar
    private static final Supplier<String> URL =
            StableValue.supplier(() -> {
                System.out.println("lendo configuração...");
                return "https://api.exemplo.com";
            });

    // Lista cujos elementos são inicializados individualmente
    private static final List<String> SHARDS = StableValue.list(4, i -> "shard-" + i);

    public static void main(String[] args) {
        cliente();
        cliente(); // não cria de novo
        System.out.println(URL.get());
        System.out.println(URL.get()); // não lê de novo
        System.out.println(SHARDS.get(2));
    }
}
```

### Codificação PEM de objetos criptográficos

**Chegou em:** Java 25 (preview, [JEP 470](https://openjdk.org/jeps/470))

Chaves e certificados costumam circular em formato PEM (`-----BEGIN PUBLIC KEY-----`), mas o JDK não tinha API para converter diretamente entre PEM e objetos como `PublicKey`, `PrivateKey` ou `X509Certificate`. As classes `PEMEncoder` e `PEMDecoder`, imutáveis e reutilizáveis, fazem essa conversão, inclusive com cifragem de chave privada por senha ([JEP 470](https://openjdk.org/jeps/470)).

```java title="Pem.java"
import java.security.KeyPairGenerator;
import java.security.PEMDecoder;
import java.security.PEMEncoder;
import java.security.PublicKey;

public class Pem {
    public static void main(String[] args) throws Exception {
        var par = KeyPairGenerator.getInstance("EC").generateKeyPair();

        // Objeto criptográfico -> texto PEM
        String pem = PEMEncoder.of().encodeToString(par.getPublic());
        System.out.println(pem);

        // Texto PEM -> objeto criptográfico, já com o tipo esperado
        PublicKey lida = PEMDecoder.of().decode(pem, PublicKey.class);
        System.out.println("igual? " + lida.equals(par.getPublic()));
    }
}
```

### Vector API

**Chegou em:** Java 21 (6ª incubadora, [JEP 448](https://openjdk.org/jeps/448)) → Java 22 (7ª incubadora, [JEP 460](https://openjdk.org/jeps/460)) → Java 23 (8ª incubadora, [JEP 469](https://openjdk.org/jeps/469)) → Java 24 (9ª incubadora, [JEP 489](https://openjdk.org/jeps/489)) → Java 25 (10ª incubadora, [JEP 508](https://openjdk.org/jeps/508))

Em incubação desde o Java 16 ([JEP 338](https://openjdk.org/jeps/338)), a Vector API expressa cálculos vetoriais que o JIT compila para instruções SIMD da CPU. Segundo o [JEP 508](https://openjdk.org/jeps/508), ela permanecerá em incubação até que recursos necessários do Projeto Valhalla estejam disponíveis como preview; só então será adaptada e promovida a preview.

```java title="Soma.java"
import jdk.incubator.vector.FloatVector;
import jdk.incubator.vector.VectorSpecies;

public class Soma {
    static final VectorSpecies<Float> ESPECIE = FloatVector.SPECIES_PREFERRED;

    static void multiplicar(float[] a, float[] b, float[] c) {
        int i = 0;
        int limite = ESPECIE.loopBound(a.length);
        for (; i < limite; i += ESPECIE.length()) {  // blocos do tamanho do registrador SIMD
            var va = FloatVector.fromArray(ESPECIE, a, i);
            var vb = FloatVector.fromArray(ESPECIE, b, i);
            va.mul(vb).intoArray(c, i);
        }
        for (; i < a.length; i++) {                  // sobra que não completa um bloco
            c[i] = a[i] * b[i];
        }
    }

    public static void main(String[] args) {
        float[] a = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
        float[] b = {2, 2, 2, 2, 2, 2, 2, 2, 2, 2};
        float[] c = new float[a.length];
        multiplicar(a, b, c);
        System.out.println(java.util.Arrays.toString(c));
    }
}
```

```bash
java --add-modules jdk.incubator.vector Soma.java
# WARNING: Using incubator modules: jdk.incubator.vector
```

## O que observar na migração a partir do Java 21

A lista abaixo reúne mudanças que podem quebrar build ou execução, ou gerar avisos novos. Ela não substitui as notas de release de cada versão ([22](https://www.oracle.com/java/technologies/javase/22-relnote-issues.html), [23](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html), [24](https://www.oracle.com/java/technologies/javase/24-relnote-issues.html), [25](https://www.oracle.com/java/technologies/javase/25-relnote-issues.html)) nem o [guia de migração da Oracle](https://docs.oracle.com/en/java/javase/25/migrate/index.html).

**Build e compilação**

- **Annotation processing desligado por padrão (Java 23).** O `javac` só executa processadores de anotação com configuração explícita (`-processor`, `--processor-path`, `-proc:full` etc.). Builds que dependiam da descoberta automática de processadores no class path deixam de executá-los e, portanto, de gerar o código correspondente. Configure o processor path no Maven/Gradle ou passe `-proc:full` ([notas do JDK 23](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html)).
- **Código escrito para previews do Java 21 precisa ser revisado:** String Templates foram retirados; `StructuredTaskScope` mudou de API; o `main` implícito agora exige `IO.println` em vez de `println` solto.
- **Suporte a 32 bits x86 acabou:** o port Windows 32 bits foi removido no Java 24 ([JEP 479](https://openjdk.org/jeps/479)) e o port 32 bits x86 restante (Linux) foi depreciado no 24 ([JEP 501](https://openjdk.org/jeps/501)) e removido no 25 ([JEP 503](https://openjdk.org/jeps/503)). Nessa arquitetura resta o port Zero, independente de arquitetura.

**Execução e opções da JVM**

- **Security Manager:** qualquer `-Djava.security.manager` que tente ativá-lo impede a JVM de subir; `System.setSecurityManager` lança exceção ([JEP 486](https://openjdk.org/jeps/486)).
- **ZGC:** `-XX:+ZGenerational`/`-XX:-ZGenerational` são ignorados com aviso; o ZGC é sempre geracional ([JEP 490](https://openjdk.org/jeps/490)).
- **Opções removidas no Java 24:** `-t`, `-tm`, `-Xfuture`, `-checksource`, `-cs` e `-noasyncgc` foram removidas do comando `java`; `-verbosegc`, `-noclassgc`, `-verify`, `-verifyremote`, `-ss`, `-ms` e `-mx` foram depreciadas para remoção. A flag `LockingMode` e os modos `LM_LEGACY` e `LM_MONITOR` foram depreciados ([notas do JDK 24](https://www.oracle.com/java/technologies/javase/24-relnote-issues.html)).
- **Java 25:** `UseCompressedClassPointers` foi depreciada (o modo sem ponteiros comprimidos será removido); o mecanismo `VFORK` de `jdk.lang.Process.launchMechanism` foi depreciado no Linux; a amostragem periódica de PerfData e os contadores `sun.rt._sync*` foram removidos, e a flag `-XX:PerfDataSamplingInterval` ficou obsoleta ([notas do JDK 25](https://www.oracle.com/java/technologies/javase/25-relnote-issues.html)).
- **`jdk.tracePinnedThreads`** foi removida; use o evento JFR `jdk.VirtualThreadPinned` ([JEP 491](https://openjdk.org/jeps/491)).

**APIs removidas ou depreciadas**

- **Java 22:** removidos `Thread.countStackFrames`, `sun.misc.Unsafe.shouldBeInitialized`/`ensureClassInitialized` e a implementação antiga de core reflection; depreciados o módulo `jdk.crypto.ec` e as opções `-Xdebug`/`-debug` ([notas do JDK 22](https://www.oracle.com/java/technologies/javase/22-relnote-issues.html)).
- **Java 23:** removidos `Thread.suspend`/`resume`, `ThreadGroup.suspend`/`resume`/`stop`, o módulo `jdk.random`, os dados de locale legados (COMPAT), JMX Subject Delegation e o recurso m-let do JMX ([notas do JDK 23](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html)).
- **Java 24:** removido o suporte a GTK2 no Linux; o download remoto de código via JNDI foi desativado permanentemente; `jstatd`, `jrunscript`, `jhsdb debugd` e o módulo `jdk.jsobject` foram depreciados para remoção ([notas do JDK 24](https://www.oracle.com/java/technologies/javase/24-relnote-issues.html)).
- **Java 25:** diversas classes de permissão ligadas ao Security Manager foram depreciadas para remoção; os construtores de `java.net.Socket` com o parâmetro `stream` lançam `IllegalArgumentException` com `stream=false`; o `Console` padrão deixou de ser baseado em JLine ([notas do JDK 25](https://www.oracle.com/java/technologies/javase/25-relnote-issues.html)).

**Avisos novos no log**

- Uso de métodos de memória de `sun.misc.Unsafe` (Java 24, [JEP 498](https://openjdk.org/jeps/498)) e acesso nativo via JNI ou FFM sem `--enable-native-access` (Java 24, [JEP 472](https://openjdk.org/jeps/472)). Normalmente vêm de bibliotecas; atualize-as antes de silenciar os avisos.

Uma ordem prática: primeiro atualize plugins de build e bibliotecas que manipulam bytecode, usam `Unsafe` ou código nativo para versões que declarem suporte ao Java 25; depois rode a suíte de testes no JDK 25 mantendo o `--release` antigo; por fim mude o `--release` para 25.

## Todas as JEPs, versão a versão

Listas conferidas nas páginas oficiais de cada release no OpenJDK; os títulos seguem as páginas das JEPs. Tipos: **Final** (recurso permanente ou mudança de implementação), **Preview**, **Incubadora**, **Experimental**, **Depreciação**, **Remoção**, **Plataforma** (port para sistema operacional ou arquitetura) e **Interno** (mudança no desenvolvimento do próprio OpenJDK, sem efeito para quem usa o JDK).

### Java 22

Lançado em 19 de março de 2024, com 12 JEPs ([JDK 22](https://openjdk.org/projects/jdk/22/)).

| JEP | Título | Tipo |
| --- | --- | --- |
| [423](https://openjdk.org/jeps/423) | Region Pinning for G1 | Final |
| [447](https://openjdk.org/jeps/447) | Statements before super(...) (Preview) | Preview |
| [454](https://openjdk.org/jeps/454) | Foreign Function & Memory API | Final |
| [456](https://openjdk.org/jeps/456) | Unnamed Variables & Patterns | Final |
| [457](https://openjdk.org/jeps/457) | Class-File API (Preview) | Preview |
| [458](https://openjdk.org/jeps/458) | Launch Multi-File Source-Code Programs | Final |
| [459](https://openjdk.org/jeps/459) | String Templates (Second Preview) | Preview |
| [460](https://openjdk.org/jeps/460) | Vector API (Seventh Incubator) | Incubadora |
| [461](https://openjdk.org/jeps/461) | Stream Gatherers (Preview) | Preview |
| [462](https://openjdk.org/jeps/462) | Structured Concurrency (Second Preview) | Preview |
| [463](https://openjdk.org/jeps/463) | Implicitly Declared Classes and Instance Main Methods (Second Preview) | Preview |
| [464](https://openjdk.org/jeps/464) | Scoped Values (Second Preview) | Preview |

### Java 23

Lançado em 17 de setembro de 2024, com 12 JEPs ([JDK 23](https://openjdk.org/projects/jdk/23/)).

| JEP | Título | Tipo |
| --- | --- | --- |
| [455](https://openjdk.org/jeps/455) | Primitive Types in Patterns, instanceof, and switch (Preview) | Preview |
| [466](https://openjdk.org/jeps/466) | Class-File API (Second Preview) | Preview |
| [467](https://openjdk.org/jeps/467) | Markdown Documentation Comments | Final |
| [469](https://openjdk.org/jeps/469) | Vector API (Eighth Incubator) | Incubadora |
| [471](https://openjdk.org/jeps/471) | Deprecate the Memory-Access Methods in sun.misc.Unsafe for Removal | Depreciação |
| [473](https://openjdk.org/jeps/473) | Stream Gatherers (Second Preview) | Preview |
| [474](https://openjdk.org/jeps/474) | ZGC: Generational Mode by Default | Final |
| [476](https://openjdk.org/jeps/476) | Module Import Declarations (Preview) | Preview |
| [477](https://openjdk.org/jeps/477) | Implicitly Declared Classes and Instance Main Methods (Third Preview) | Preview |
| [480](https://openjdk.org/jeps/480) | Structured Concurrency (Third Preview) | Preview |
| [481](https://openjdk.org/jeps/481) | Scoped Values (Third Preview) | Preview |
| [482](https://openjdk.org/jeps/482) | Flexible Constructor Bodies (Second Preview) | Preview |

### Java 24

Lançado em 18 de março de 2025, com 24 JEPs ([JDK 24](https://openjdk.org/projects/jdk/24/)).

| JEP | Título | Tipo |
| --- | --- | --- |
| [404](https://openjdk.org/jeps/404) | Generational Shenandoah (Experimental) | Experimental |
| [450](https://openjdk.org/jeps/450) | Compact Object Headers (Experimental) | Experimental |
| [472](https://openjdk.org/jeps/472) | Prepare to Restrict the Use of JNI | Final |
| [475](https://openjdk.org/jeps/475) | Late Barrier Expansion for G1 | Final |
| [478](https://openjdk.org/jeps/478) | Key Derivation Function API (Preview) | Preview |
| [479](https://openjdk.org/jeps/479) | Remove the Windows 32-bit x86 Port | Remoção |
| [483](https://openjdk.org/jeps/483) | Ahead-of-Time Class Loading & Linking | Final |
| [484](https://openjdk.org/jeps/484) | Class-File API | Final |
| [485](https://openjdk.org/jeps/485) | Stream Gatherers | Final |
| [486](https://openjdk.org/jeps/486) | Permanently Disable the Security Manager | Remoção |
| [487](https://openjdk.org/jeps/487) | Scoped Values (Fourth Preview) | Preview |
| [488](https://openjdk.org/jeps/488) | Primitive Types in Patterns, instanceof, and switch (Second Preview) | Preview |
| [489](https://openjdk.org/jeps/489) | Vector API (Ninth Incubator) | Incubadora |
| [490](https://openjdk.org/jeps/490) | ZGC: Remove the Non-Generational Mode | Remoção |
| [491](https://openjdk.org/jeps/491) | Synchronize Virtual Threads without Pinning | Final |
| [492](https://openjdk.org/jeps/492) | Flexible Constructor Bodies (Third Preview) | Preview |
| [493](https://openjdk.org/jeps/493) | Linking Run-Time Images without JMODs | Final |
| [494](https://openjdk.org/jeps/494) | Module Import Declarations (Second Preview) | Preview |
| [495](https://openjdk.org/jeps/495) | Simple Source Files and Instance Main Methods (Fourth Preview) | Preview |
| [496](https://openjdk.org/jeps/496) | Quantum-Resistant Module-Lattice-Based Key Encapsulation Mechanism | Final |
| [497](https://openjdk.org/jeps/497) | Quantum-Resistant Module-Lattice-Based Digital Signature Algorithm | Final |
| [498](https://openjdk.org/jeps/498) | Warn upon Use of Memory-Access Methods in sun.misc.Unsafe | Depreciação |
| [499](https://openjdk.org/jeps/499) | Structured Concurrency (Fourth Preview) | Preview |
| [501](https://openjdk.org/jeps/501) | Deprecate the 32-bit x86 Port for Removal | Depreciação |

### Java 25

Lançado em 16 de setembro de 2025, com 18 JEPs ([JDK 25](https://openjdk.org/projects/jdk/25/)).

| JEP | Título | Tipo |
| --- | --- | --- |
| [470](https://openjdk.org/jeps/470) | PEM Encodings of Cryptographic Objects (Preview) | Preview |
| [502](https://openjdk.org/jeps/502) | Stable Values (Preview) | Preview |
| [503](https://openjdk.org/jeps/503) | Remove the 32-bit x86 Port | Remoção |
| [505](https://openjdk.org/jeps/505) | Structured Concurrency (Fifth Preview) | Preview |
| [506](https://openjdk.org/jeps/506) | Scoped Values | Final |
| [507](https://openjdk.org/jeps/507) | Primitive Types in Patterns, instanceof, and switch (Third Preview) | Preview |
| [508](https://openjdk.org/jeps/508) | Vector API (Tenth Incubator) | Incubadora |
| [509](https://openjdk.org/jeps/509) | JFR CPU-Time Profiling (Experimental) | Experimental |
| [510](https://openjdk.org/jeps/510) | Key Derivation Function API | Final |
| [511](https://openjdk.org/jeps/511) | Module Import Declarations | Final |
| [512](https://openjdk.org/jeps/512) | Compact Source Files and Instance Main Methods | Final |
| [513](https://openjdk.org/jeps/513) | Flexible Constructor Bodies | Final |
| [514](https://openjdk.org/jeps/514) | Ahead-of-Time Command-Line Ergonomics | Final |
| [515](https://openjdk.org/jeps/515) | Ahead-of-Time Method Profiling | Final |
| [518](https://openjdk.org/jeps/518) | JFR Cooperative Sampling | Final |
| [519](https://openjdk.org/jeps/519) | Compact Object Headers | Final |
| [520](https://openjdk.org/jeps/520) | JFR Method Timing & Tracing | Final |
| [521](https://openjdk.org/jeps/521) | Generational Shenandoah | Final |

## Fontes

**Páginas oficiais das releases**

- [OpenJDK — JDK 22](https://openjdk.org/projects/jdk/22/)
- [OpenJDK — JDK 23](https://openjdk.org/projects/jdk/23/)
- [OpenJDK — JDK 24](https://openjdk.org/projects/jdk/24/)
- [OpenJDK — JDK 25](https://openjdk.org/projects/jdk/25/)
- [OpenJDK — JDK 26](https://openjdk.org/projects/jdk/26/)
- [OpenJDK — JEPs in JDK 25 integrated since JDK 21](https://openjdk.org/projects/jdk/25/jeps-since-jdk-21)
- [Oracle — Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
- [Oracle — JDK 22 Release Notes](https://www.oracle.com/java/technologies/javase/22-relnote-issues.html)
- [Oracle — JDK 23 Release Notes](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html)
- [Oracle — JDK 24 Release Notes](https://www.oracle.com/java/technologies/javase/24-relnote-issues.html)
- [Oracle — JDK 25 Release Notes](https://www.oracle.com/java/technologies/javase/25-relnote-issues.html)
- [Oracle — Java 25 Migration Guide](https://docs.oracle.com/en/java/javase/25/migrate/index.html)

**JEPs explicadas no texto**

- Linguagem: [JEP 512](https://openjdk.org/jeps/512), [JEP 511](https://openjdk.org/jeps/511), [JEP 494](https://openjdk.org/jeps/494), [JEP 513](https://openjdk.org/jeps/513), [JEP 456](https://openjdk.org/jeps/456), [JEP 459](https://openjdk.org/jeps/459), [JEP 430](https://openjdk.org/jeps/430), [JEP 507](https://openjdk.org/jeps/507)
- Concorrência: [JEP 491](https://openjdk.org/jeps/491), [JEP 506](https://openjdk.org/jeps/506), [JEP 505](https://openjdk.org/jeps/505), [JEP 502](https://openjdk.org/jeps/502)
- Bibliotecas: [JEP 485](https://openjdk.org/jeps/485), [JEP 454](https://openjdk.org/jeps/454), [JEP 484](https://openjdk.org/jeps/484), [JEP 508](https://openjdk.org/jeps/508)
- JVM e desempenho: [JEP 483](https://openjdk.org/jeps/483), [JEP 514](https://openjdk.org/jeps/514), [JEP 515](https://openjdk.org/jeps/515), [JEP 450](https://openjdk.org/jeps/450), [JEP 519](https://openjdk.org/jeps/519), [JEP 404](https://openjdk.org/jeps/404), [JEP 521](https://openjdk.org/jeps/521), [JEP 474](https://openjdk.org/jeps/474), [JEP 490](https://openjdk.org/jeps/490), [JEP 423](https://openjdk.org/jeps/423), [JEP 475](https://openjdk.org/jeps/475), [JEP 518](https://openjdk.org/jeps/518), [JEP 509](https://openjdk.org/jeps/509), [JEP 520](https://openjdk.org/jeps/520)
- Ferramentas: [JEP 458](https://openjdk.org/jeps/458), [JEP 467](https://openjdk.org/jeps/467), [JEP 493](https://openjdk.org/jeps/493)
- Segurança e integridade: [JEP 496](https://openjdk.org/jeps/496), [JEP 497](https://openjdk.org/jeps/497), [JEP 478](https://openjdk.org/jeps/478), [JEP 510](https://openjdk.org/jeps/510), [JEP 470](https://openjdk.org/jeps/470), [JEP 486](https://openjdk.org/jeps/486), [JEP 411](https://openjdk.org/jeps/411), [JEP 471](https://openjdk.org/jeps/471), [JEP 498](https://openjdk.org/jeps/498), [JEP 472](https://openjdk.org/jeps/472)
- Plataformas: [JEP 479](https://openjdk.org/jeps/479), [JEP 501](https://openjdk.org/jeps/501), [JEP 503](https://openjdk.org/jeps/503)
- Versões anteriores citadas nas trajetórias: [JEP 445](https://openjdk.org/jeps/445), [JEP 443](https://openjdk.org/jeps/443), [JEP 429](https://openjdk.org/jeps/429), [JEP 446](https://openjdk.org/jeps/446), [JEP 453](https://openjdk.org/jeps/453), [JEP 424](https://openjdk.org/jeps/424), [JEP 434](https://openjdk.org/jeps/434), [JEP 442](https://openjdk.org/jeps/442), [JEP 338](https://openjdk.org/jeps/338), [JEP 439](https://openjdk.org/jeps/439), [JEP 448](https://openjdk.org/jeps/448)
- Evolução posterior citada no texto: [JEP 526](https://openjdk.org/jeps/526)

**Javadoc do Java 25**

- [`java.lang.IO`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/IO.html)
- [`java.lang.ScopedValue`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ScopedValue.html)
- [`java.util.concurrent.StructuredTaskScope`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html)
- [`java.util.stream.Gatherers`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Gatherers.html)
- [`java.lang.StableValue`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/StableValue.html)
- [`javax.crypto.KDF`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/javax/crypto/KDF.html)
