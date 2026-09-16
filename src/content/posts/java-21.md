---
title: "Java 21 (LTS) — Virtual threads, pattern matching e Sequenced Collections"
published: 2025-07-02T02:10:00Z
description: "O que mudou do Java 17 ao Java 21: virtual threads, pattern matching para `switch`, record patterns, Sequenced Collections, ZGC geracional e as 38 JEPs do Java 18 ao 21, com a versão em que cada recurso chegou."
tags: [Java, LTS, Virtual Threads, Pattern Matching, Migração]
series: java
cover: /covers/java/java-21.svg
draft: false
---

O Java 21 chegou à disponibilidade geral em 19 de setembro de 2023 ([JDK 21](https://openjdk.org/projects/jdk/21/)) e é uma versão de suporte estendido (LTS). Para o Java 21, o [roadmap de suporte da Oracle](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) informa Premier Support até setembro de 2028 e Extended Support até setembro de 2031. Para o Java 17, LTS anterior, o mesmo roadmap informa Premier Support até setembro de 2026 e Extended Support até setembro de 2029. Java 18, 19 e 20 não são LTS: o Premier Support de cada um terminou seis meses após o lançamento, quando saiu a versão seguinte.

Este artigo cobre **as mudanças do Java 18 ao Java 21** (quatro releases e 38 JEPs), ou seja, o que muda para quem migra do Java 17. O foco é mostrar o que cada recurso resolve, como usar e **em qual versão ele chegou**. Muitos dos recursos mais importantes passaram por uma ou mais rodadas de *preview* antes de ficarem finais no 21.

| Versão | Disponibilidade geral | Tipo | JEPs |
| --- | --- | --- | --- |
| Java 18 | 22/03/2022 ([JDK 18](https://openjdk.org/projects/jdk/18/)) | não LTS | 9 |
| Java 19 | 20/09/2022 ([JDK 19](https://openjdk.org/projects/jdk/19/)) | não LTS | 7 |
| Java 20 | 21/03/2023 ([JDK 20](https://openjdk.org/projects/jdk/20/)) | não LTS | 7 |
| Java 21 | 19/09/2023 ([JDK 21](https://openjdk.org/projects/jdk/21/)) | **LTS** | 15 |

Dois termos aparecem o tempo todo:

- **Preview** ([JEP 12](https://openjdk.org/jeps/12)): recurso de linguagem ou API completo, mas ainda não permanente. Fica desligado por padrão e exige `--enable-preview` na compilação e na execução. Pode mudar ou sair na versão seguinte.
- **Incubadora** ([JEP 11](https://openjdk.org/jeps/11)): API experimental entregue em um módulo `jdk.incubator.*`, que precisa ser adicionado explicitamente com `--add-modules`.

Em cada recurso, a linha **Chegou em** mostra a trajetória completa, com link para a JEP de cada etapa.

## Linha do tempo

![Linha do tempo do Java 17 ao Java 21 mostrando, por recurso, as etapas de incubadora, preview e final com o número de cada JEP](/posts/java-21/linha-do-tempo.svg)

Três recursos saíram de preview e ficaram finais no Java 21: pattern matching para `switch`, record patterns e virtual threads. Structured concurrency e scoped values subiram de incubadora para preview, e a Foreign Function & Memory API seguiu em preview (ficou final só no Java 22). Os recursos que chegaram direto como finais estão concentrados no Java 18 (UTF-8 por padrão, Simple Web Server, `@snippet`, SPI de resolução de endereços e reflexão reimplementada) e no Java 21 (Sequenced Collections, ZGC geracional, API de KEM e aviso para agentes carregados dinamicamente). Java 19 e 20 não entregaram nenhum recurso novo final por JEP: as JEPs dessas versões são de preview ou incubadora, além do port para Linux/RISC-V no Java 19.

## Linguagem

### Pattern matching para switch

**Chegou em:** Java 17 (preview, [JEP 406](https://openjdk.org/jeps/406)) → Java 18 (2ª preview, [JEP 420](https://openjdk.org/jeps/420)) → Java 19 (3ª preview, [JEP 427](https://openjdk.org/jeps/427)) → Java 20 (4ª preview, [JEP 433](https://openjdk.org/jeps/433)) → Java 21 (final, [JEP 441](https://openjdk.org/jeps/441))

No Java 17, sem habilitar preview, o `switch` só aceitava seletores de tipos integrais (exceto `long`), seus wrappers, `String` e enums, e cada `case` só podia comparar com uma constante. Quem precisava decidir pelo **tipo** de um objeto escrevia uma cadeia de `if (x instanceof ...)`. A [JEP 441](https://openjdk.org/jeps/441) muda o `switch` em quatro pontos:

1. O seletor pode ser **qualquer tipo de referência**.
2. Um `case` pode ter um **padrão** (`case Cartao c`) e também `case null`.
3. Um padrão pode ter uma **guarda** com `when`.
4. Constantes de enum podem aparecer com **nome qualificado** (`case Real.CEDULA`).

Veja uma hierarquia selada de pagamentos tratada das duas formas:

```java title="Pagamentos.java" {25-33}
import java.math.BigDecimal;

public class Pagamentos {

    sealed interface Pagamento permits Pix, Cartao, Boleto {}
    record Pix(String chave, BigDecimal valor) implements Pagamento {}
    record Cartao(String bandeira, int parcelas, BigDecimal valor) implements Pagamento {}
    record Boleto(String linhaDigitavel, BigDecimal valor) implements Pagamento {}

    // Java 17: cadeia de instanceof + else final "impossível"
    static String descreverJava17(Pagamento p) {
        if (p instanceof Pix pix) {
            return "Pix para " + pix.chave();
        } else if (p instanceof Cartao c && c.parcelas() > 1) {
            return "Cartão " + c.bandeira() + " em " + c.parcelas() + "x";
        } else if (p instanceof Cartao c) {
            return "Cartão " + c.bandeira() + " à vista";
        } else if (p instanceof Boleto b) {
            return "Boleto " + b.linhaDigitavel();
        }
        throw new IllegalStateException("tipo inesperado"); // o compilador não sabe que é inalcançável
    }

    // Java 21: switch com padrões, guarda e case null
    static String descrever(Pagamento p) {
        return switch (p) {
            case null -> "nenhum pagamento";
            case Pix pix -> "Pix para " + pix.chave();
            case Cartao c when c.parcelas() > 1 -> "Cartão " + c.bandeira() + " em " + c.parcelas() + "x";
            case Cartao c -> "Cartão " + c.bandeira() + " à vista";
            case Boleto b -> "Boleto " + b.linhaDigitavel();
            // sem default: a hierarquia é selada, o compilador verifica a exaustividade
        };
    }

    public static void main(String[] args) {
        var pagamentos = new Pagamento[] {
            new Pix("ana@exemplo.com", new BigDecimal("50.00")),
            new Cartao("Visa", 3, new BigDecimal("300.00")),
            new Cartao("Master", 1, new BigDecimal("80.00")),
            new Boleto("34191.79001 01043.510047", new BigDecimal("120.00")),
            null
        };
        for (Pagamento p : pagamentos) {
            System.out.println(descrever(p));
        }
        System.out.println(descreverJava17(pagamentos[1]));
    }
}
```

As regras que valem a pena conhecer, todas descritas na [JEP 441](https://openjdk.org/jeps/441):

- **Exaustividade.** Um `switch` que usa padrões ou `case null` precisa cobrir todos os valores possíveis. Com `sealed`, o compilador usa a cláusula `permits` para provar isso, e o `default` fica desnecessário. A JEP recomenda **não** colocar `default` nesses casos: sem ele, se alguém criar um novo subtipo, o erro aparece na próxima compilação e não em produção. `switch` antigos, sem padrões e com seletor de tipo legado, continuam compilando sem essa exigência.
- **Ordem e dominância.** O primeiro `case` que casa é o escolhido. Se um `case` nunca pode ser alcançado porque um anterior já cobre todos os seus valores (por exemplo, `case CharSequence cs` antes de `case String s`), é erro de compilação. Por isso, no exemplo, `case Cartao c when ...` vem antes de `case Cartao c`.
- **`null`.** Sem `case null`, o `switch` continua lançando `NullPointerException` para seletor nulo, como sempre. Com `case null`, você trata o nulo dentro do próprio `switch`. `case null, default ->` junta os dois.
- **`MatchException`.** Se nenhum rótulo casar em tempo de execução, o que só acontece quando a hierarquia muda depois da compilação, o `switch` lança `MatchException`. Para alinhar as duas semânticas, uma expressão `switch` sobre enum passou a lançar `MatchException`, e não mais `IncompatibleClassChangeError`, quando nenhum rótulo casa em tempo de execução.

A sintaxe mudou durante as previews. A guarda era escrita com `&&` e virou `when` no Java 19 ([JEP 427](https://openjdk.org/jeps/427)). Os padrões entre parênteses foram removidos no Java 21, que também passou a aceitar constantes de enum qualificadas ([JEP 441](https://openjdk.org/jeps/441)). Isso é útil quando o seletor é uma interface selada implementada por um enum:

```java title="Moedas.java" {9-10}
public class Moedas {

    sealed interface Moeda permits Real, Cripto {}
    enum Real implements Moeda { CEDULA, MOEDA }
    record Cripto(String simbolo) implements Moeda {}

    static String tipo(Moeda m) {
        return switch (m) {
            case Real.CEDULA -> "cédula";      // nome qualificado de constante de enum (Java 21)
            case Real.MOEDA  -> "moeda metálica";
            case Cripto c    -> "cripto " + c.simbolo();
        };
    }

    public static void main(String[] args) {
        System.out.println(tipo(Real.CEDULA));
        System.out.println(tipo(new Cripto("BTC")));
    }
}
```

O guia oficial [Pattern Matching for switch](https://docs.oracle.com/en/java/javase/21/language/pattern-matching-switch.html) tem mais exemplos.

### Record patterns

**Chegou em:** Java 19 (preview, [JEP 405](https://openjdk.org/jeps/405)) → Java 20 (2ª preview, [JEP 432](https://openjdk.org/jeps/432)) → Java 21 (final, [JEP 440](https://openjdk.org/jeps/440))

O Java 16 trouxe records ([JEP 395](https://openjdk.org/jeps/395)) e o *type pattern* do `instanceof` ([JEP 394](https://openjdk.org/jeps/394)). Faltava o caminho inverso do construtor: **desmontar** um record em seus componentes. Um *record pattern* tem a forma `Tipo(padrão1, padrão2, ...)`. O valor casa se for uma instância do record; nesse caso, o Java chama o acessor de cada componente e testa o subpadrão correspondente. Como os subpadrões podem ser outros record patterns, dá para navegar numa estrutura inteira de uma vez ([JEP 440](https://openjdk.org/jeps/440)).

![Diagrama de um record pattern aninhado: o objeto Retangulo com dois PontoColorido é desmontado e os componentes x, y, cor e inferior viram variáveis de padrão](/posts/java-21/record-patterns-aninhados.svg)

```java title="Formas.java" {18-22,25-31}
public class Formas {

    enum Cor { VERMELHO, VERDE, AZUL }
    record Ponto(int x, int y) {}
    record PontoColorido(Ponto ponto, Cor cor) {}
    record Retangulo(PontoColorido superiorEsquerdo, PontoColorido inferiorDireito) {}

    // Java 17: type pattern + acessores encadeados
    static void imprimirJava17(Object obj) {
        if (obj instanceof Retangulo r) {
            Ponto p = r.superiorEsquerdo().ponto();
            Cor cor = r.superiorEsquerdo().cor();
            System.out.println("canto em (" + p.x() + ", " + p.y() + ") " + cor);
        }
    }

    // Java 21: record patterns aninhados desmontam a estrutura de uma vez
    static void imprimir(Object obj) {
        if (obj instanceof Retangulo(PontoColorido(Ponto(var x, var y), Cor cor), var inferior)) {
            System.out.println("canto em (" + x + ", " + y + ") " + cor + "; oposto: " + inferior);
        }
    }

    // Record patterns em switch, com exaustividade verificada
    static int area(Retangulo r) {
        return switch (r) {
            case Retangulo(PontoColorido(Ponto(int x1, int y1), var c1),
                           PontoColorido(Ponto(int x2, int y2), var c2)) ->
                Math.abs(x2 - x1) * Math.abs(y2 - y1);
        };
    }

    public static void main(String[] args) {
        var r = new Retangulo(
            new PontoColorido(new Ponto(0, 10), Cor.VERMELHO),
            new PontoColorido(new Ponto(4, 2), Cor.AZUL));
        imprimirJava17(r);
        imprimir(r);
        System.out.println("área = " + area(r));
    }
}
```

Detalhes importantes:

- Os nomes das variáveis não precisam ser iguais aos dos componentes: `Ponto(int a, int b)` funciona.
- `var` deixa o compilador inferir o tipo do componente.
- `null` **nunca** casa com um record pattern.
- Em records genéricos, os argumentos de tipo são inferidos. `Caixa(Caixa(var s))` sobre um `Caixa<Caixa<String>>` é tratado como `Caixa<Caixa<String>>(Caixa<String>(var s))`.

```java title="Caixas.java" {9-12,18}
public class Caixas {

    record Caixa<T>(T conteudo) {}
    record Par<A, B>(A primeiro, B segundo) {}

    static String descrever(Object obj) {
        return switch (obj) {
            // os argumentos de tipo de Caixa e Par são inferidos
            case Caixa(Caixa(String s)) -> "caixa dentro de caixa com a string " + s;
            case Caixa(var c)           -> "caixa com " + c;
            case Par(Integer a, Integer b) when a > b -> "par decrescente";
            case Par(var a, var b)      -> "par (" + a + ", " + b + ")";
            default                     -> "outra coisa";
        };
    }

    static void generico(Caixa<Caixa<String>> cc) {
        if (cc instanceof Caixa(Caixa(var s))) {   // inferido como Caixa<Caixa<String>>(Caixa<String>(var s))
            System.out.println(s.toUpperCase());
        }
    }

    public static void main(String[] args) {
        System.out.println(descrever(new Caixa<>(new Caixa<>("oi"))));
        System.out.println(descrever(new Caixa<>(42)));
        System.out.println(descrever(new Par<>(3, 1)));
        System.out.println(descrever(new Par<>("a", 1)));
        generico(new Caixa<>(new Caixa<>("java")));
    }
}
```

Se você experimentou as previews, atenção a duas mudanças. A 2ª preview, no Java 20, removeu os *named record patterns* e adicionou record patterns no cabeçalho do `for` aprimorado ([JEP 432](https://openjdk.org/jeps/432)). A versão final, no Java 21, **removeu** o suporte no `for` ([JEP 440](https://openjdk.org/jeps/440)). Código escrito para a preview do Java 20 com `for (Ponto(var x, var y) : pontos)` não compila no Java 21.

## Concorrência

### Virtual threads

**Chegou em:** Java 19 (preview, [JEP 425](https://openjdk.org/jeps/425)) → Java 20 (2ª preview, [JEP 436](https://openjdk.org/jeps/436)) → Java 21 (final, [JEP 444](https://openjdk.org/jeps/444))

Aplicações de servidor costumam usar o estilo *thread-per-request*: uma thread cuida da requisição do começo ao fim. O estilo é simples de escrever, depurar e perfilar. O problema, segundo a [JEP 444](https://openjdk.org/jeps/444), é que cada `java.lang.Thread` era um invólucro de uma thread do sistema operacional. Threads do SO são caras, então o número de threads vira o limite de vazão muito antes de CPU ou conexões. Um pool não resolve, porque reaproveita threads mas não aumenta o total. A alternativa era o estilo assíncrono (`CompletableFuture`, frameworks reativos), que escala, mas quebra o código em estágios, perde stack traces úteis e atrapalha depuradores e profilers.

Uma **virtual thread** também é uma instância de `java.lang.Thread`, só que **não fica presa a uma thread do SO**. O JDK tem seu próprio scheduler, um `ForkJoinPool` em modo FIFO, que monta (*mount*) virtual threads em algumas *platform threads* chamadas **carriers**. Por padrão, o paralelismo desse pool é igual ao número de processadores. Quando o código numa virtual thread faz uma operação bloqueante do JDK, como ler de um socket, esperar um `BlockingQueue.take()` ou dormir, a virtual thread normalmente **desmonta**, e a carrier fica livre para outra. Quando a operação pode continuar, a virtual thread volta à fila e é montada de novo, possivelmente em outra carrier. A pilha dela fica no heap, em objetos que crescem e encolhem conforme a necessidade.

![Comparação entre platform threads, uma thread do SO por thread Java, e virtual threads, muitas virtual threads agendadas por um ForkJoinPool sobre poucas carriers, com o ciclo de montar e desmontar em I/O e o aviso sobre pinning](/posts/java-21/virtual-threads.svg)

O código continua sequencial e bloqueante. O que muda é como as threads são criadas:

```java title="ThreadsVirtuais.java" {12,22-24,27,31-42}
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.stream.IntStream;

public class ThreadsVirtuais {

    public static void main(String[] args) throws Exception {
        // 1) Um executor que cria uma virtual thread nova por tarefa
        Instant inicio = Instant.now();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            IntStream.range(0, 10_000).forEach(i ->
                executor.submit(() -> {
                    Thread.sleep(Duration.ofSeconds(1)); // bloqueio: a virtual thread desmonta da carrier
                    return i;
                }));
        } // close() espera todas as tarefas terminarem
        System.out.println("10.000 tarefas de 1s em " + Duration.between(inicio, Instant.now()).toMillis() + " ms");

        // 2) Criando diretamente com Thread.Builder
        Thread t = Thread.ofVirtual()
                .name("worker-", 0)
                .start(() -> System.out.println(Thread.currentThread() + " virtual? " + Thread.currentThread().isVirtual()));
        t.join();

        Thread.startVirtualThread(() -> System.out.println("atalho: startVirtualThread")).join();

        // 3) Limitar concorrência com Semaphore, não com pool de threads
        var limite = new Semaphore(20);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 100; i++) {
                executor.submit(() -> {
                    limite.acquire();
                    try {
                        return chamarServicoExterno();
                    } finally {
                        limite.release();
                    }
                });
            }
        }
        System.out.println("fim");
    }

    static String chamarServicoExterno() throws InterruptedException {
        Thread.sleep(10);
        return "ok";
    }
}
```

O primeiro bloco é o exemplo da própria JEP: 10.000 tarefas que dormem 1 segundo rodam concorrentemente, e o JDK executa tudo sobre poucas threads do SO. A JEP compara com duas alternativas. `Executors.newCachedThreadPool()` tentaria criar 10.000 threads do SO e poderia derrubar o programa, dependendo da máquina. `newFixedThreadPool(200)` dividiria 200 threads entre as 10.000 tarefas, com vazão de 200 tarefas por segundo, contra cerca de 10.000 por segundo com virtual threads depois do aquecimento, segundo a JEP.

O que a [JEP 444](https://openjdk.org/jeps/444) deixa claro sobre quando e como usar:

- **Virtual threads não são threads mais rápidas.** Elas trazem escala (mais vazão), não menos latência. Ajudam quando há muitas tarefas concorrentes (a JEP fala em mais de alguns milhares) e quando a carga **não é limitada por CPU**. Para cálculo pesado, ter mais threads que núcleos não ajuda.
- **Não faça pool de virtual threads.** Crie uma por tarefa. Se o objetivo do pool era limitar o acesso a um recurso, como no máximo 20 chamadas a um serviço, use um `Semaphore`, como no terceiro bloco.
- **Cuidado com `ThreadLocal` usado como cache.** Virtual threads suportam `ThreadLocal`, e no Java 21 esse suporte não pode mais ser desligado, como era possível nas previews. Mas o idioma de guardar um objeto caro por thread deixa de funcionar quando cada tarefa tem a própria thread: o objeto seria recriado a cada tarefa.
- **Diferenças de API.** Virtual threads são sempre daemon, têm prioridade fixa `NORM_PRIORITY` e não participam ativamente de `ThreadGroup`. `Thread.getAllStackTraces()` passou a devolver só platform threads. Os construtores públicos de `Thread` continuam criando platform threads.

**Pinning.** No Java 21, há dois casos em que a virtual thread não consegue desmontar durante uma operação bloqueante e fica "presa" (*pinned*) à carrier: dentro de um bloco ou método `synchronized`, e durante um método nativo ou função estrangeira. O código continua correto, mas bloqueia a carrier. Se isso for frequente e longo, a escalabilidade cai. A recomendação da JEP é trocar `synchronized` por `ReentrantLock` onde houver I/O longo e frequente. Não é preciso trocar blocos raros ou que só protegem operações em memória.

```java title="Pinning.java" {10-12,17-22}
import java.util.concurrent.locks.ReentrantLock;

public class Pinning {

    private final Object monitor = new Object();
    private final ReentrantLock lock = new ReentrantLock();

    // No Java 21, bloquear dentro de synchronized "prende" (pin) a virtual thread à carrier
    String buscarComSynchronized() throws InterruptedException {
        synchronized (monitor) {
            return io();
        }
    }

    // Alternativa recomendada pela JEP 444 para seções longas com I/O
    String buscarComLock() throws InterruptedException {
        lock.lock();
        try {
            return io();
        } finally {
            lock.unlock();
        }
    }

    static String io() throws InterruptedException {
        Thread.sleep(50); // simula I/O bloqueante
        return "dados";
    }

    public static void main(String[] args) throws Exception {
        var p = new Pinning();
        Thread.ofVirtual().start(() -> {
            try {
                System.out.println(p.buscarComSynchronized());
                System.out.println(p.buscarComLock());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).join();
    }
}
```

Para encontrar pinning, o Java 21 oferece a propriedade `jdk.tracePinnedThreads` e o evento JFR `jdk.VirtualThreadPinned`, que vem habilitado com limiar de 20 ms ([JEP 444](https://openjdk.org/jeps/444)). No Temurin 21.0.12, o exemplo acima reporta só a versão com `synchronized`:

```bash
$ java -Djdk.tracePinnedThreads=short Pinning.java
VirtualThread[#23]/runnable@ForkJoinPool-1-worker-1 reason:MONITOR
    Pinning.buscarComSynchronized(Pinning.java:11) <== monitors:1
dados
dados
```

O caso do `synchronized` foi resolvido depois, no Java 24: a [JEP 491](https://openjdk.org/jeps/491) faz virtual threads bloqueadas nesses blocos liberarem a carrier, eliminando quase todos os casos de pinning. Quem fica no Java 21 precisa conviver com a limitação.

Para observar milhares de threads, o `jcmd` ganhou um novo formato de thread dump que agrupa as virtual threads e pode sair em JSON: `jcmd <pid> Thread.dump_to_file -format=json <arquivo>`. O guia [Virtual Threads](https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html) da Oracle aprofunda esses pontos.

### Mudanças permanentes em Thread e ExecutorService

**Chegou em:** Java 19 (final, [JEP 425](https://openjdk.org/jeps/425))

A 2ª preview de virtual threads ([JEP 436](https://openjdk.org/jeps/436)) explica que algumas mudanças descritas na [JEP 425](https://openjdk.org/jeps/425) viraram **permanentes** já no Java 19, fora do preview, porque servem para qualquer código e não só para virtual threads:

- `ExecutorService` passou a estender `AutoCloseable`. `close()` espera as tarefas terminarem, então o executor pode ser usado em `try-with-resources`.
- `Thread.sleep(Duration)`, `Thread.join(Duration)` e `Thread.threadId()`. O antigo `getId()` foi depreciado no 19 ([Javadoc de Thread](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)).
- `Future` ganhou métodos para consultar o estado e o resultado de uma tarefa concluída: `state()`, `resultNow()` e `exceptionNow()` ([Javadoc de Future](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Future.html)).
- `ThreadGroup` foi degradado: não dá mais para destruir um grupo explicitamente (`destroy()` não faz nada), e `suspend`, `resume` e `stop` do grupo lançam `UnsupportedOperationException` ([release notes do 19](https://www.oracle.com/java/technologies/javase/19-relnote-issues.html)).

No Java 20, os métodos equivalentes de `Thread` seguiram o mesmo caminho, como mostra a seção [Removidos e depreciados](#removidos-e-depreciados).

## APIs da biblioteca padrão

### Sequenced Collections

**Chegou em:** Java 21 (final, [JEP 431](https://openjdk.org/jeps/431))

O framework de coleções tinha vários tipos com ordem de encontro definida (`List`, `Deque`, `LinkedHashSet`, `SortedSet`, `LinkedHashMap`), mas nenhum supertipo comum para essa ideia, e cada um tinha um jeito diferente de pegar o primeiro ou o último elemento. Pegar o último de um `LinkedHashSet` exigia percorrer tudo. Iterar ao contrário variava de tipo para tipo. A [JEP 431](https://openjdk.org/jeps/431) cria três interfaces e as encaixa na hierarquia existente. Todos os métodos novos têm implementação *default*.

![Hierarquia das Sequenced Collections: SequencedCollection entre Collection e List/Deque, SequencedSet acima de LinkedHashSet e SortedSet, SequencedMap acima de LinkedHashMap e SortedMap, com a lista de métodos de cada interface](/posts/java-21/sequenced-collections.svg)

```java title="Sequenciadas.java"
import java.util.*;

public class Sequenciadas {

    public static void main(String[] args) {
        List<String> lista = new ArrayList<>(List.of("a", "b", "c"));

        // Java 17
        String primeiro17 = lista.get(0);
        String ultimo17 = lista.get(lista.size() - 1);

        // Java 21
        String primeiro = lista.getFirst();
        String ultimo = lista.getLast();
        List<String> invertida = lista.reversed(); // visão, não cópia
        lista.addLast("d");
        System.out.println(primeiro17 + ultimo17 + " " + primeiro + ultimo + " " + invertida); // ac ac [d, c, b, a]

        // LinkedHashSet: addFirst/addLast reposicionam um elemento que já existe
        var recentes = new LinkedHashSet<>(List.of("home", "busca", "carrinho"));
        recentes.addLast("home");
        System.out.println(recentes + " último=" + recentes.getLast()); // [busca, carrinho, home] último=home

        // LinkedHashMap: acesso às pontas e inserção no início
        var cache = new LinkedHashMap<String, Integer>();
        cache.put("x", 1);
        cache.put("y", 2);
        cache.putFirst("z", 0);
        System.out.println(cache + " primeira=" + cache.firstEntry() + " última=" + cache.lastEntry());
        System.out.println("removida=" + cache.pollLastEntry() + " restante=" + cache.sequencedKeySet().reversed());

        // Deque, SortedSet e SortedMap também são sequenciados
        SequencedCollection<Integer> ordenado = new TreeSet<>(Set.of(5, 1, 3));
        System.out.println(ordenado.getFirst() + " .. " + ordenado.getLast());

        // SortedSet posiciona pela ordem natural: addFirst não faz sentido
        try {
            ordenado.addFirst(0);
        } catch (UnsupportedOperationException e) {
            System.out.println("TreeSet.addFirst -> UnsupportedOperationException");
        }

        // Wrappers imutáveis novos
        SequencedMap<String, Integer> somenteLeitura = Collections.unmodifiableSequencedMap(cache);
        System.out.println(somenteLeitura.reversed());
    }
}
```

Pontos de atenção, todos da [JEP 431](https://openjdk.org/jeps/431):

- `reversed()` devolve uma **visão**: mudanças na coleção original aparecem nela, como mostra o `"d"` adicionado depois. Ela funciona com `for`, `stream()`, `forEach()` e `toArray()`.
- `getFirst()`, `getLast()`, `removeFirst()` e `removeLast()` lançam `NoSuchElementException` em coleção vazia. Os métodos `add*` e `remove*` são opcionais, e as coleções imutáveis lançam `UnsupportedOperationException`.
- Em `LinkedHashSet` e `LinkedHashMap`, `addFirst`/`addLast` e `putFirst`/`putLast` **movem** o elemento se ele já existir. A JEP descreve a falta disso no `LinkedHashSet` como uma deficiência antiga. Em `SortedSet` e `SortedMap`, esses métodos lançam `UnsupportedOperationException`, porque a posição vem da ordenação.
- Em `SequencedMap`, as visões ordenadas se chamam `sequencedKeySet()`, `sequencedValues()` e `sequencedEntrySet()`. A JEP evitou alterar os tipos de retorno de `keySet()`, `values()` e `entrySet()` para não quebrar subclasses existentes.

Métodos *default* novos no topo da hierarquia podem conflitar com métodos já declarados em classes ou interfaces que estendem as interfaces de coleção, e os novos tipos podem mudar o resultado da inferência de tipos. As duas situações causam incompatibilidades de código-fonte ou binárias. As [release notes do Java 21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html) apontam para o documento [JDK 21: Sequenced Collections Incompatibilities](https://inside.java/2023/05/12/quality-heads-up/), que analisa esses casos.

### UTF-8 por padrão

**Chegou em:** Java 18 (final, [JEP 400](https://openjdk.org/jeps/400))

Até o Java 17, o *charset* padrão era decidido na inicialização a partir do sistema operacional e do locale. No macOS era UTF-8 (exceto no locale POSIX C). No Windows, costumava ser uma *code page* como `windows-1252`. Todas as APIs que usam o charset padrão sem receber um explicitamente (`FileReader`, `FileWriter`, `InputStreamReader`, `OutputStreamWriter`, `PrintStream`, `Formatter`, `Scanner`) podiam ler e gravar texto de forma diferente conforme a máquina. A [JEP 400](https://openjdk.org/jeps/400) especifica que o charset padrão é **UTF-8** em todas as plataformas. A exceção é a E/S de console: `System.out` e `System.err` seguem o charset do console.

```java title="Charset.java"
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class Charset {
    public static void main(String[] args) throws IOException {
        System.out.println("default charset: " + java.nio.charset.Charset.defaultCharset());   // UTF-8 no Java 18+
        System.out.println("native.encoding: " + System.getProperty("native.encoding"));      // o que o SO usaria

        Path arquivo = Files.createTempFile("acentos", ".txt");
        // Sem charset explícito: no Java 18+ grava em UTF-8 em qualquer SO
        try (var w = new FileWriter(arquivo.toFile())) {
            w.write("ação");
        }
        // Melhor ainda: ser explícito e não depender do default
        try (var r = new FileReader(arquivo.toFile(), StandardCharsets.UTF_8)) {
            char[] buf = new char[10];
            int n = r.read(buf);
            System.out.println(new String(buf, 0, n));
        }
    }
}
```

Na migração, a JEP recomenda:

- Testar a aplicação **ainda no Java 17** com `java -Dfile.encoding=UTF-8` e compilar com `javac -encoding UTF-8`, para descobrir antes onde há dependência do charset do SO.
- Se precisar do comportamento antigo, usar `-Dfile.encoding=COMPAT`. Valores diferentes de `UTF-8` e `COMPAT` não são suportados.
- Conferir os fontes `.java` salvos em outra codificação: o `javac` também passa a assumir UTF-8 quando `-encoding` não é informado, e literais com acento podem ser lidos errado.
- `Charset.forName("default")`, que antes era um alias de US-ASCII, passa a lançar `UnsupportedCharsetException`.

### Outras adições de API

Várias melhorias menores entraram sem JEP própria e estão documentadas nas release notes de cada versão:

| Versão | API | O que faz |
| --- | --- | --- |
| 19 | `HashMap.newHashMap(int)`, `HashSet.newHashSet(int)` e equivalentes para `LinkedHashMap`, `LinkedHashSet` e `WeakHashMap` | cria a coleção dimensionada para N **elementos**, sem redimensionamento. O construtor com `int` recebe capacidade, não número de elementos |
| 19 | `Locale.of(...)` | substitui os construtores de `Locale`, depreciados no 19 |
| 19 | `DateTimeFormatter.ofLocalizedPattern(String)` | formatos localizados flexíveis, como `"yMMM"` |
| 20 | `URL.of(URI, URLStreamHandler)` | os construtores de `java.net.URL` foram depreciados; a recomendação é partir de `URI` e usar `URI.toURL()` |
| 21 | `Math.clamp(...)` e `StrictMath.clamp(...)` | limita um valor a um intervalo; `clamp(long, int, int)` também serve para converter `long` em `int` com segurança |
| 21 | `StringBuilder.repeat(...)` e `StringBuffer.repeat(...)` | acrescenta N cópias de um caractere ou texto |
| 21 | `String.indexOf(ch, beginIndex, endIndex)` e `indexOf(str, beginIndex, endIndex)` | busca limitada a um intervalo; lança exceção se o intervalo for inválido |
| 21 | `String.splitWithDelimiters(...)` e `Pattern.splitWithDelimiters(...)` | como `split`, mas mantém os delimitadores no resultado |
| 21 | `Character.isEmoji(int)` e outros cinco métodos de emoji | propriedades de emoji do Unicode, também disponíveis em regex com `\p{IsEmoji}` |
| 21 | `HttpClient.close()`, `shutdown()`, `shutdownNow()`, `awaitTermination(...)` | `HttpClient` passa a ser `AutoCloseable` |

Fontes: release notes do [Java 19](https://www.oracle.com/java/technologies/javase/19-relnote-issues.html), do [Java 20](https://www.oracle.com/java/technologies/javase/20-relnote-issues.html) e do [Java 21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html).

```java title="NovasApis.java"
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Locale;
import java.util.concurrent.Executors;

public class NovasApis {

    public static void main(String[] args) throws Exception {
        // Java 21: Math.clamp
        int percentual = Math.clamp(135, 0, 100);         // 100
        int narrow = Math.clamp(5_000_000_000L, 0, Integer.MAX_VALUE); // long -> int com segurança

        // Java 21: StringBuilder.repeat
        String linha = new StringBuilder().repeat('-', 20).append(" fim").toString();

        // Java 21: indexOf com intervalo [begin, end)
        String csv = "id;nome;email;telefone";
        int pos = csv.indexOf(';', 3, 10);                // 7

        // Java 21: splitWithDelimiters mantém os delimitadores
        String[] partes = "a+b-c".splitWithDelimiters("[+-]", 0); // [a, +, b, -, c]

        // Java 21: propriedades de emoji
        boolean emoji = Character.isEmoji("😀".codePointAt(0));  // true

        // Java 19: HashMap dimensionado para N elementos (não para N buckets)
        var mapa = HashMap.<String, Integer>newHashMap(1_000);

        // Java 19: Locale.of substitui os construtores depreciados
        Locale ptBR = Locale.of("pt", "BR");
        String mesAno = DateTimeFormatter.ofLocalizedPattern("yMMM").withLocale(ptBR).format(LocalDate.of(2023, 9, 19));

        System.out.println(percentual + " " + narrow + " " + linha + " " + pos + " "
                + Arrays.toString(partes) + " " + emoji + " " + mapa.size() + " " + mesAno);

        // Java 19: ExecutorService é AutoCloseable
        try (var pool = Executors.newFixedThreadPool(2)) {
            pool.submit(() -> System.out.println("tarefa no pool"));
        } // close() = shutdown + awaitTermination

        // Java 21: HttpClient é AutoCloseable
        try (HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build()) {
            System.out.println("cliente criado: " + client.version());
        }
    }
}
```

### Internet-Address Resolution SPI

**Chegou em:** Java 18 (final, [JEP 418](https://openjdk.org/jeps/418))

`InetAddress` sempre usou o resolvedor nativo do sistema operacional. A [JEP 418](https://openjdk.org/jeps/418) define uma *service-provider interface* no pacote `java.net.spi` ([`InetAddressResolverProvider`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/spi/InetAddressResolverProvider.html) e `InetAddressResolver`). Com ela, uma biblioteca pode registrar, via `ServiceLoader`, outro resolvedor para todo o sistema, útil em testes ou com protocolos como DNS sobre QUIC ou HTTPS. Sem provedor registrado, nada muda. A [JEP 444](https://openjdk.org/jeps/444) cita essa SPI como o caminho para ter resolvedores que não prendem virtual threads durante a busca de nomes.

### Reflexão reimplementada com method handles

**Chegou em:** Java 18 (final, [JEP 416](https://openjdk.org/jeps/416))

`Method.invoke`, `Constructor.newInstance`, `Field.get` e `Field.set` passaram a usar `java.lang.invoke` por baixo. A API pública não mudou. A JEP publica os próprios números de microbenchmark: quando os objetos `Method`, `Constructor` e `Field` ficam em campos `static final`, a nova implementação foi de 43% a 57% mais rápida. Quando não podem ser tratados como constantes, o acesso a campos ficou de 51% a 77% mais lento, sem degradação nos benchmarks de serialização com Jackson, XStream e Kryo que a equipe rodou. Como plano de contingência, o Java 18 aceitava `-Djdk.reflect.useDirectMethodHandle=false` para voltar à implementação antiga, e a JEP avisa que essa opção seria removida no futuro. A mudança também reduz *frames* nativos na pilha, o que ajuda virtual threads ([JEP 444](https://openjdk.org/jeps/444), seção Dependencies).

## JVM, GC e desempenho

### ZGC geracional

**Chegou em:** Java 21 (final, [JEP 439](https://openjdk.org/jeps/439))

O ZGC é o coletor de baixa latência do JDK, pronto para produção desde o Java 15 ([JEP 377](https://openjdk.org/jeps/377)). Ele faz quase todo o trabalho em paralelo com a aplicação, com pausas normalmente abaixo de 1 ms. Até o Java 20, porém, ele não separava objetos por idade e precisava percorrer o heap inteiro a cada ciclo. A [JEP 439](https://openjdk.org/jeps/439) aplica a hipótese geracional fraca (a maioria dos objetos morre jovem) e divide o heap em **geração jovem** e **geração velha**, coletadas de forma independente. Para isso, o ZGC geracional adiciona *store barriers* às *load barriers* que já existiam e passa a manter um *remembered set* de ponteiros da geração velha para a jovem.

No Java 21, o modo geracional é **opcional**:

```bash
# ZGC não geracional (padrão do -XX:+UseZGC no Java 21)
java -XX:+UseZGC -jar app.jar

# ZGC geracional
java -XX:+UseZGC -XX:+ZGenerational -jar app.jar
```

Segundo as [release notes do Java 21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html), aplicações com o ZGC geracional devem ter menor risco de *allocation stalls*, menos memória extra de heap e menos uso de CPU pelo GC. Outra diferença citada na JEP: o ZGC geracional não usa memória multimapeada, então ferramentas como `ps` deixam de mostrar o uso de heap aproximadamente triplicado. O modo geracional virou padrão no Java 23 ([JEP 474](https://openjdk.org/jeps/474)). Detalhes de ajuste estão no [guia do ZGC](https://docs.oracle.com/en/java/javase/21/gctuning/z-garbage-collector.html).

### Aviso ao carregar agentes dinamicamente

**Chegou em:** Java 21 (final, [JEP 451](https://openjdk.org/jeps/451))

Carregar um agente Java ou JVM TI numa JVM já em execução, pela Attach API ou pelo `jcmd`, passa a imprimir um aviso no *stderr*. A JEP prepara uma versão futura que vai bloquear essa carga por padrão. Agentes carregados na inicialização com `-javaagent` ou `-agentlib` não geram aviso, e ferramentas que só se conectam para monitoramento, como `jcmd` e `jconsole`, continuam funcionando sem opções extras. Se uma ferramenta de observabilidade depende de *attach* dinâmico de agentes, use `-XX:+EnableDynamicAgentLoading` para deixar a permissão explícita. Para simular o comportamento futuro, use `-XX:-EnableDynamicAgentLoading`.

### Outras mudanças de JVM

- **Java 18:** o G1 aceita regiões de heap de até 512 MB com `-XX:G1HeapRegionSize`. A escolha automática continua limitada a 32 MB. Serial, Parallel e ZGC passaram a suportar deduplicação de strings ([release notes do 18](https://www.oracle.com/java/technologies/javase/18-relnote-issues.html)).
- **Java 19:** port oficial para Linux/RISC-V ([JEP 422](https://openjdk.org/jeps/422)) e a opção `-XX:+AutoCreateSharedArchive`, que cria e atualiza automaticamente o arquivo CDS da aplicação ([release notes do 19](https://www.oracle.com/java/technologies/javase/19-relnote-issues.html)).
- **Java 21:** o *full GC* do G1, como último recurso, passa a mover objetos *humongous* para evitar `OutOfMemoryError` por falta de espaço contíguo, e o *Hot Card Cache* do G1 foi removido ([release notes do 21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html)).

## Ferramentas

### Simple Web Server (jwebserver)

**Chegou em:** Java 18 (final, [JEP 408](https://openjdk.org/jeps/408))

Um servidor HTTP mínimo que serve arquivos estáticos de um diretório, pensado para protótipos, testes e ensino. Ele **não** é um servidor de produção: suporta só HTTP/1.1, só `GET` e `HEAD`, não tem HTTPS e não tem autenticação. Por padrão, escuta em `127.0.0.1:8000` e serve o diretório atual.

```bash
# serve o diretório atual em http://127.0.0.1:8000/
jwebserver

# outra porta, outro diretório e log detalhado
jwebserver -p 9000 -d /caminho/absoluto -o verbose

# escutar em todas as interfaces
jwebserver -b 0.0.0.0
```

A mesma funcionalidade existe como API em `com.sun.net.httpserver`, com as classes novas [`SimpleFileServer`](https://docs.oracle.com/en/java/javase/21/docs/api/jdk.httpserver/com/sun/net/httpserver/SimpleFileServer.html), `HttpHandlers` e `Request`:

```java title="ServidorArquivos.java"
import com.sun.net.httpserver.SimpleFileServer;
import com.sun.net.httpserver.SimpleFileServer.OutputLevel;
import java.net.InetSocketAddress;
import java.nio.file.Path;

public class ServidorArquivos {
    public static void main(String[] args) {
        var server = SimpleFileServer.createFileServer(
                new InetSocketAddress(8080),
                Path.of("/tmp").toAbsolutePath(),   // precisa ser um caminho absoluto
                OutputLevel.VERBOSE);
        server.start();
        System.out.println("Servindo em http://localhost:8080/");
        server.stop(0); // no exemplo real, deixe rodando
    }
}
```

Todas as opções estão na [página de manual do jwebserver](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jwebserver.html).

### Trechos de código no Javadoc com @snippet

**Chegou em:** Java 18 (final, [JEP 413](https://openjdk.org/jeps/413))

Exemplos de código em Javadoc eram escritos com `<pre>{@code ...}</pre>`, que exige escapar HTML, não tem destaque de sintaxe e bagunça a indentação por causa dos asteriscos. A tag `{@snippet ...}` resolve isso. O conteúdo não precisa de escape, a indentação é calculada em relação à chave de fechamento (como em *text blocks*) e comentários de marcação como `@highlight` e `@replace` controlam a apresentação. O trecho também pode vir de um arquivo externo, que pode ser compilado e testado, com `{@snippet file="Exemplo.java" region="uso"}`.

```java title="Contas.java" {5-8}
public class Contas {

    /**
     * Soma os valores ignorando nulos.
     * {@snippet :
     * var total = Contas.somar(List.of(10, 20)); // @highlight substring="somar"
     * System.out.println(total);                 // 30
     * }
     */
    public static int somar(java.util.List<Integer> valores) {
        return valores.stream().filter(java.util.Objects::nonNull).mapToInt(Integer::intValue).sum();
    }
}
```

O guia [Programmer's Guide to Snippets](https://docs.oracle.com/en/java/javase/21/javadoc/snippets.html) documenta todas as tags de marcação.

### Outras mudanças em ferramentas

- **Java 20:** novo lint `lossy-conversions` no `javac`, que avisa sobre conversões com perda escondidas em atribuições compostas como `int x; x += 1.5;` ([release notes do 20](https://www.oracle.com/java/technologies/javase/20-relnote-issues.html)).
- **Java 21:** novo lint `this-escape`, que avisa quando um construtor chama métodos sobrescrevíveis e pode expor um objeto parcialmente construído. O comando `jfr view` e `jcmd <pid> JFR.view` mostram dados de gravações do JFR em tabelas, com visões como `hot-methods`, `gc-pauses` e `pinned-threads`. O `jshell TOOLING` dá acesso a `javac`, `javap` e outras ferramentas dentro do JShell ([release notes do 21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html)).

## Segurança

### API de Key Encapsulation Mechanism (KEM)

**Chegou em:** Java 21 (final, [JEP 452](https://openjdk.org/jeps/452))

Um KEM usa criptografia de chave pública para que duas partes cheguem a uma mesma **chave simétrica**. O emissor usa a chave pública do receptor para gerar a chave secreta e uma "mensagem de encapsulamento". O receptor usa a chave privada para recuperar a mesma chave a partir dessa mensagem. A [JEP 452](https://openjdk.org/jeps/452) cria a classe [`javax.crypto.KEM`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/javax/crypto/KEM.html) com essa abstração. O objetivo declarado é permitir o uso de KEMs em protocolos como TLS e HPKE (RFC 9180) e preparar o terreno para os algoritmos pós-quânticos que estavam em padronização no NIST quando a JEP foi escrita. O JDK 21 inclui uma implementação de DHKEM (RFC 9180).

```java title="Kem.java"
import java.security.KeyPairGenerator;
import java.util.Arrays;
import javax.crypto.KEM;
import javax.crypto.SecretKey;

public class Kem {
    public static void main(String[] args) throws Exception {
        // Receptor: gera o par de chaves e publica a chave pública
        var kpg = KeyPairGenerator.getInstance("X25519");
        var parReceptor = kpg.generateKeyPair();

        // Emissor: encapsula uma chave secreta usando a chave pública do receptor
        KEM kemEmissor = KEM.getInstance("DHKEM");
        KEM.Encapsulator encapsulador = kemEmissor.newEncapsulator(parReceptor.getPublic());
        KEM.Encapsulated encapsulado = encapsulador.encapsulate(0, 32, "AES");
        SecretKey chaveEmissor = encapsulado.key();
        byte[] mensagem = encapsulado.encapsulation(); // enviada ao receptor

        // Receptor: recupera a mesma chave secreta com a chave privada
        KEM kemReceptor = KEM.getInstance("DHKEM");
        KEM.Decapsulator decapsulador = kemReceptor.newDecapsulator(parReceptor.getPrivate());
        SecretKey chaveReceptor = decapsulador.decapsulate(mensagem, 0, 32, "AES");

        System.out.println("mesma chave? " + Arrays.equals(chaveEmissor.getEncoded(), chaveReceptor.getEncoded()));
    }
}
```

### Outras mudanças de segurança

- **Java 18:** JARs assinados com SHA-1 passam a ser tratados como não assinados, exceto os com carimbo de tempo anterior a 1º de janeiro de 2019. O valor padrão da propriedade `java.security.manager` virou `disallow`, então `System.setSecurityManager(...)` lança `UnsupportedOperationException`, a menos que a JVM seja iniciada com `-Djava.security.manager=allow` ([release notes do 18](https://www.oracle.com/java/technologies/javase/18-relnote-issues.html)).
- **Java 19:** suítes TLS com 3DES saíram da lista habilitada por padrão ([release notes do 19](https://www.oracle.com/java/technologies/javase/19-relnote-issues.html)).
- **Java 20:** suítes `TLS_ECDH_*` desabilitadas por padrão e DTLS 1.0 desabilitado ([release notes do 20](https://www.oracle.com/java/technologies/javase/20-relnote-issues.html)).
- **Java 21:** o grupo Diffie-Hellman padrão do TLS subiu de 1024 para 2048 bits, e a JVM passou a verificar assinaturas HSS/LMS ([release notes do 21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html)).

## Removidos e depreciados

### Finalização depreciada para remoção

**Chegou em:** Java 18 (depreciado para remoção, [JEP 421](https://openjdk.org/jeps/421))

A finalização (`Object.finalize()` e o mecanismo que a executa) foi depreciada para remoção. Ela continua habilitada por padrão, mas a JEP prevê desabilitá-la por padrão numa versão futura e removê-la em outra depois disso. As alternativas indicadas são `try-with-resources` e a API `java.lang.ref.Cleaner`. Para descobrir se a aplicação ou alguma biblioteca depende de finalizadores, o Java 18 trouxe a opção `--finalization=disabled`, que a JEP recomenda usar só em testes, e o evento JFR `jdk.FinalizerStatistics`.

### Port Windows 32 bits x86 depreciado para remoção

**Chegou em:** Java 21 (depreciado para remoção, [JEP 449](https://openjdk.org/jeps/449))

A JEP cita entre os motivos que, nesse port, as virtual threads recorrem a threads do kernel e não trazem o ganho esperado. No Java 21, configurar um build do JDK para Windows 32 bits x86 falha, a menos que se use `--enable-deprecated-ports=yes`. A remoção aconteceu no Java 24 ([JEP 479](https://openjdk.org/jeps/479)).

### Outras remoções e depreciações

- **Java 18:** as opções de *biased locking*, como `-XX:+UseBiasedLocking`, ficaram obsoletas: geram aviso e são ignoradas ([release notes do 18](https://www.oracle.com/java/technologies/javase/18-relnote-issues.html)).
- **Java 19:** `Thread.getId()` e os construtores de `Locale` foram depreciados, com `Thread.threadId()` e `Locale.of(...)` como substitutos ([release notes do 19](https://www.oracle.com/java/technologies/javase/19-relnote-issues.html)).
- **Java 20:** `Thread.suspend()`, `Thread.resume()` e `Thread.stop()` passaram a lançar `UnsupportedOperationException`, e `ThreadDeath` foi depreciado para remoção. Os construtores de `java.net.URL` foram depreciados. O `javac` deixou de aceitar `7` em `-source`, `-target` e `--release`. Opções de ajuste do refinamento concorrente do G1, como `-XX:G1ConcRefinementGreenZone`, ficaram obsoletas ([release notes do 20](https://www.oracle.com/java/technologies/javase/20-relnote-issues.html)).
- **Java 21:** foram removidos a classe `java.lang.Compiler` e a propriedade `java.compiler`, o recurso de *JAR Index*, `ThreadGroup.allowThreadSuspension`, `javax.management.remote.rmi.RMIIIOPServerImpl`, as opções `-altsigner` e `-altsignerpath` do `jarsigner` e o cache de caminhos canônicos de `java.io.File`. As opções `G1ConcRSLogCacheSize` e `G1ConcRSHotCardLimit` ficaram obsoletas com a remoção do *Hot Card Cache* do G1 ([release notes do 21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html)).

## Recursos em preview ou incubadora nesta LTS

Os recursos desta seção **existem no Java 21, mas não são finais**. Recursos de preview precisam de `--enable-preview` para compilar e executar, e código que depende deles só roda na versão exata do JDK para a qual foi compilado. APIs de incubadora estão em módulos `jdk.incubator.*` e precisam de `--add-modules`. Várias dessas APIs mudaram, ou até saíram, nas versões seguintes, como mostra a tabela no fim da seção.

```bash
# executar um arquivo-fonte usando preview no Java 21
java --enable-preview --source 21 Arquivo.java

# ou compilar e executar em duas etapas
javac --release 21 --enable-preview Arquivo.java
java --enable-preview Arquivo
```

### String Templates

**Chegou em:** Java 21 (preview, [JEP 430](https://openjdk.org/jeps/430))

String Templates propunham interpolação com expressões embutidas `\{...}` e um *template processor* que valida e combina o texto. `STR` é importado automaticamente em todo arquivo.

```java title="Templates.java"
public class Templates {
    public static void main(String[] args) {
        String nome = "Ana";
        int x = 10, y = 20;
        String s = STR."Olá, \{nome}! \{x} + \{y} = \{x + y}";
        System.out.println(s); // Olá, Ana! 10 + 20 = 30
    }
}
```

**Não use em código novo.** O recurso teve uma 2ª preview no Java 22 ([JEP 459](https://openjdk.org/jeps/459)) e depois foi **retirado**: a 3ª preview ([JEP 465](https://openjdk.org/jeps/465)) está com status *Closed / Withdrawn*, e as [release notes do Java 23](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html) registram a retirada do recurso.

### Padrões e variáveis sem nome

**Chegou em:** Java 21 (preview, [JEP 443](https://openjdk.org/jeps/443))

O caractere `_` passa a indicar um componente ou uma variável que você é obrigado a declarar, mas não vai usar. Ele pode aparecer em record patterns, `catch`, parâmetros de lambda, variáveis locais, `for` e `try-with-resources`. Isso permite listar vários padrões no mesmo `case`, algo que a [JEP 441](https://openjdk.org/jeps/441) proíbe quando os padrões declaram variáveis com nome.

```java title="SemNome.java" {16-18,27,33,38}
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class SemNome {

    sealed interface Bola permits BolaVermelha, BolaAzul, BolaVerde {}
    final static class BolaVermelha implements Bola {}
    final static class BolaAzul implements Bola {}
    final static class BolaVerde implements Bola {}
    record Caixa<T extends Bola>(T conteudo) {}
    record Ponto(int x, int y) {}

    static String processar(Caixa<? extends Bola> caixa) {
        return switch (caixa) {
            case Caixa(BolaVermelha _), Caixa(BolaAzul _) -> "processa";   // vários padrões num case
            case Caixa(BolaVerde _)                       -> "para";
            case Caixa(_)                                 -> "pega outra caixa"; // cobre conteúdo null
        };
    }

    public static void main(String[] args) {
        System.out.println(processar(new Caixa<>(new BolaAzul())));
        System.out.println(processar(new Caixa<>(null)));

        Object o = new Ponto(3, 4);
        if (o instanceof Ponto(int x, _)) {          // ignora o componente y
            System.out.println("x = " + x);
        }

        try {
            Integer.parseInt("abc");
        } catch (NumberFormatException _) {          // variável de exceção não usada
            System.out.println("número inválido");
        }

        Map<String, Integer> tamanhos = List.of("a", "bb").stream()
                .collect(Collectors.toMap(s -> s, _ -> 0)); // parâmetro de lambda não usado
        System.out.println(tamanhos);
    }
}
```

Esse recurso ficou final, sem mudanças, no Java 22 ([JEP 456](https://openjdk.org/jeps/456)).

### Classes sem nome e métodos main de instância

**Chegou em:** Java 21 (preview, [JEP 445](https://openjdk.org/jeps/445))

Pensado para o ensino, o recurso tem duas partes. O método `main` pode ser de instância, sem `static`, sem `public` e sem `String[]`. E um arquivo pode ter métodos e campos soltos, sem declarar a classe.

```java title="Ola.java"
void main() {
    System.out.println("Olá, " + nome());
}

String nome() {
    return "Java 21";
}
```

O recurso passou por mais previews ([JEP 463](https://openjdk.org/jeps/463) no 22, [JEP 477](https://openjdk.org/jeps/477) no 23 e [JEP 495](https://openjdk.org/jeps/495) no 24) e ficou final no Java 25 com outro nome, *Compact Source Files and Instance Main Methods*, e alguns ajustes ([JEP 512](https://openjdk.org/jeps/512)).

### Structured concurrency

**Chegou em:** Java 19 (incubadora, [JEP 428](https://openjdk.org/jeps/428)) → Java 20 (2ª incubadora, [JEP 437](https://openjdk.org/jeps/437)) → Java 21 (preview, [JEP 453](https://openjdk.org/jeps/453))

Structured concurrency complementa as virtual threads: trata um grupo de subtarefas concorrentes como uma unidade. Se uma falhar, as outras são canceladas. Se a thread dona for interrompida antes ou durante o `join()`, as subtarefas também são canceladas. E a vida das subtarefas fica confinada ao bloco que as criou. Com `ExecutorService` e `Future`, nada disso é garantido: no exemplo da [JEP 453](https://openjdk.org/jeps/453), se `findUser()` falha, `fetchOrder()` continua rodando na própria thread, o que a JEP chama de vazamento de thread.

### Scoped values

**Chegou em:** Java 20 (incubadora, [JEP 429](https://openjdk.org/jeps/429)) → Java 21 (preview, [JEP 446](https://openjdk.org/jeps/446))

Scoped values são uma alternativa a `ThreadLocal` para passar dados imutáveis a métodos chamados, direta ou indiretamente, durante um escopo delimitado. O valor não tem `set()` e é herdado pelas subtarefas de um `StructuredTaskScope` ([JEP 446](https://openjdk.org/jeps/446)). O exemplo abaixo usa as duas APIs juntas:

```java title="Concorrencia.java" {10,13-20,26,35-36}
import java.util.concurrent.ExecutionException;
import java.util.concurrent.StructuredTaskScope;
import java.util.function.Supplier;

public class Concorrencia {

    record Resposta(String usuario, int pedido) {}

    // Scoped value: "parâmetro implícito" imutável e com escopo delimitado
    static final ScopedValue<String> USUARIO_LOGADO = ScopedValue.newInstance();

    static Resposta tratar() throws ExecutionException, InterruptedException {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            Supplier<String>  usuario = scope.fork(Concorrencia::buscarUsuario);
            Supplier<Integer> pedido  = scope.fork(Concorrencia::buscarPedido);

            scope.join()             // espera as duas subtarefas
                 .throwIfFailed();   // se uma falhou, a outra já foi cancelada

            return new Resposta(usuario.get(), pedido.get());
        }
    }

    static String buscarUsuario() throws InterruptedException {
        Thread.sleep(100);
        return USUARIO_LOGADO.get();   // subtarefas herdam o scoped value
    }

    static Integer buscarPedido() throws InterruptedException {
        Thread.sleep(50);
        return 42;
    }

    public static void main(String[] args) throws Exception {
        Resposta r = ScopedValue.where(USUARIO_LOGADO, "ana")
                                .call(Concorrencia::tratar);
        System.out.println(r);
        System.out.println("vinculado fora do escopo? " + USUARIO_LOGADO.isBound());
    }
}
```

Esse código é específico do Java 21. Scoped values ficaram finais no Java 25 ([JEP 506](https://openjdk.org/jeps/506)), depois de mais três previews. Structured concurrency continuava em preview no Java 25, com uma API diferente: o escopo passou a ser aberto por métodos de fábrica `StructuredTaskScope.open(...)`, e não mais por construtores como `ShutdownOnFailure` ([JEP 505](https://openjdk.org/jeps/505)).

### Foreign Function & Memory API

**Chegou em:** Java 17 (incubadora, [JEP 412](https://openjdk.org/jeps/412)) → Java 18 (2ª incubadora, [JEP 419](https://openjdk.org/jeps/419)) → Java 19 (preview, [JEP 424](https://openjdk.org/jeps/424)) → Java 20 (2ª preview, [JEP 434](https://openjdk.org/jeps/434)) → Java 21 (3ª preview, [JEP 442](https://openjdk.org/jeps/442))

A **FFM API** (`java.lang.foreign`) permite chamar bibliotecas nativas e manipular memória fora do heap sem JNI. Na 3ª preview do Java 21, o ciclo de vida da memória nativa foi centralizado na interface `Arena`, e a classe `VaList` foi removida ([JEP 442](https://openjdk.org/jeps/442)). Ela ficou final no Java 22 ([JEP 454](https://openjdk.org/jeps/454)), com mais ajustes de API. Para quem vai usar FFM de verdade, o Java 22 ou superior é o caminho.

### Vector API

**Chegou em:** Java 16 (incubadora, [JEP 338](https://openjdk.org/jeps/338)) → Java 17 (2ª incubadora, [JEP 414](https://openjdk.org/jeps/414)) → Java 18 (3ª incubadora, [JEP 417](https://openjdk.org/jeps/417)) → Java 19 (4ª incubadora, [JEP 426](https://openjdk.org/jeps/426)) → Java 20 (5ª incubadora, [JEP 438](https://openjdk.org/jeps/438)) → Java 21 (6ª incubadora, [JEP 448](https://openjdk.org/jeps/448))

A **Vector API** (`jdk.incubator.vector`) expressa cálculos vetoriais que a JIT compila para instruções SIMD da CPU. Ela continua em incubadora há muitas versões: a [JEP 508](https://openjdk.org/jeps/508), do Java 25, é a 10ª. Segundo essa JEP, a API vai continuar incubando até que recursos necessários do Projeto Valhalla estejam disponíveis como preview.

### Resumo do que não é final no Java 21

| Recurso | Status no Java 21 | O que aconteceu depois |
| --- | --- | --- |
| String Templates | Preview ([JEP 430](https://openjdk.org/jeps/430)) | retirado; ausente no Java 23 ([release notes do 23](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html)) |
| Padrões e variáveis sem nome | Preview ([JEP 443](https://openjdk.org/jeps/443)) | final no Java 22 ([JEP 456](https://openjdk.org/jeps/456)) |
| Classes sem nome e main de instância | Preview ([JEP 445](https://openjdk.org/jeps/445)) | final no Java 25, com outro nome ([JEP 512](https://openjdk.org/jeps/512)) |
| Scoped values | Preview ([JEP 446](https://openjdk.org/jeps/446)) | final no Java 25 ([JEP 506](https://openjdk.org/jeps/506)) |
| Structured concurrency | Preview ([JEP 453](https://openjdk.org/jeps/453)) | ainda preview no Java 25, com API nova ([JEP 505](https://openjdk.org/jeps/505)) |
| Foreign Function & Memory API | 3ª preview ([JEP 442](https://openjdk.org/jeps/442)) | final no Java 22 ([JEP 454](https://openjdk.org/jeps/454)) |
| Vector API | 6ª incubadora ([JEP 448](https://openjdk.org/jeps/448)) | 10ª incubadora no Java 25 ([JEP 508](https://openjdk.org/jeps/508)) |

## O que observar na migração a partir do Java 17

A lista abaixo junta as mudanças com maior chance de quebrar build ou comportamento para quem sai do Java 17. Vale ler também as seções *Removed*, *Deprecated* e *Other Notes* das release notes de cada versão ([18](https://www.oracle.com/java/technologies/javase/18-relnote-issues.html), [19](https://www.oracle.com/java/technologies/javase/19-relnote-issues.html), [20](https://www.oracle.com/java/technologies/javase/20-relnote-issues.html), [21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html)).

**Comportamento em tempo de execução**

- **Charset padrão UTF-8 (Java 18).** É a mudança com mais chance de alterar comportamento em Windows ou em servidores com locale diferente de UTF-8. Veja a seção [UTF-8 por padrão](#utf-8-por-padrão) e a [JEP 400](https://openjdk.org/jeps/400).
- **Security Manager (Java 18).** Com `java.security.manager=disallow` por padrão, `System.setSecurityManager(...)` lança `UnsupportedOperationException`, a menos que a JVM seja iniciada com `-Djava.security.manager=allow` ([release notes do 18](https://www.oracle.com/java/technologies/javase/18-relnote-issues.html)).
- **JARs assinados com SHA-1 (Java 18)** passam a ser tratados como não assinados, com a exceção dos que têm carimbo de tempo anterior a 1º de janeiro de 2019 ([release notes do 18](https://www.oracle.com/java/technologies/javase/18-relnote-issues.html)).
- **Métodos de controle de thread (Java 19 e 20).** `ThreadGroup.destroy()` não faz nada, e `stop`, `suspend` e `resume` lançam `UnsupportedOperationException` tanto em `ThreadGroup` (19) quanto em `Thread` (20) ([release notes do 19](https://www.oracle.com/java/technologies/javase/19-relnote-issues.html) e [do 20](https://www.oracle.com/java/technologies/javase/20-relnote-issues.html)).
- **`Double.toString` e `Float.toString` (Java 19)** podem devolver representações mais curtas em alguns valores. Por exemplo, `Double.toString(2e23)` devolve `"2.0E23"`. Em regex, `\b` passou a considerar só caracteres ASCII por padrão, como `\w` ([release notes do 19](https://www.oracle.com/java/technologies/javase/19-relnote-issues.html)).
- **Nomes de interfaces de rede no Windows (Java 21)** passaram a ser os nomes do sistema operacional, como `ethernet_32768` em vez de `eth0`, o que afeta buscas com `NetworkInterface.getByName(...)` ([release notes do 21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html)).
- **Expressão `switch` sobre enum (Java 21)** lança `MatchException` em vez de `IncompatibleClassChangeError` quando aparece uma constante nova sem recompilação ([JEP 441](https://openjdk.org/jeps/441)).

**Compilação e APIs**

- **Novos métodos em tipos centrais podem colidir com o seu código.** Isso vale para subclasses de `Thread` que declaram métodos com os mesmos nomes dos novos (`isVirtual()`, `threadId()`, `join(Duration)`), segundo as [release notes do 19](https://www.oracle.com/java/technologies/javase/19-relnote-issues.html), e para coleções próprias com `getFirst()`, `reversed()` e similares ([JEP 431](https://openjdk.org/jeps/431) e [análise de incompatibilidades](https://inside.java/2023/05/12/quality-heads-up/)).
- **Depreciações e remoções de API:** finalização depreciada para remoção (Java 18), `Thread.getId()` e construtores de `Locale` (Java 19), construtores de `URL` e `ThreadDeath` (Java 20) e as classes e opções removidas no Java 21 estão na seção [Removidos e depreciados](#removidos-e-depreciados).
- **`javac`:** o suporte a `-source`, `-target` e `--release 7` foi removido no Java 20 ([release notes do 20](https://www.oracle.com/java/technologies/javase/20-relnote-issues.html)). No Java 21, ponto e vírgula extra entre `import`s virou erro ao compilar com `--release 21`; com versões de código-fonte anteriores, gera só um aviso ([release notes do 21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html)).
- **Previews:** código que usava record patterns no `for` (preview do Java 20) não compila no 21. Código com qualquer preview do Java 21 não roda em outras versões sem ajustes.

**Plataforma e operação**

- **Agentes carregados dinamicamente (Java 21, [JEP 451](https://openjdk.org/jeps/451)).** Ferramentas que fazem *attach* dinâmico de agentes passam a gerar aviso no *stderr*. Veja a seção [Aviso ao carregar agentes dinamicamente](#aviso-ao-carregar-agentes-dinamicamente) para as opções `-XX:+EnableDynamicAgentLoading` e `-XX:-EnableDynamicAgentLoading`.
- **Windows 32 bits x86 (Java 21, [JEP 449](https://openjdk.org/jeps/449))** foi depreciado para remoção. A remoção aconteceu no Java 24 ([JEP 479](https://openjdk.org/jeps/479)).
- **Opções de JVM obsoletas:** as opções de *biased locking* (Java 18) e várias opções de refinamento do G1 (Java 20 e 21) só geram aviso e são ignoradas. Vale revisar os scripts de inicialização ([Removidos e depreciados](#removidos-e-depreciados)).

## Todas as JEPs, versão a versão

Listas conferidas nas páginas oficiais de cada release no OpenJDK; os títulos seguem as páginas das JEPs. Tipos: **Final** (recurso permanente ou mudança de implementação), **Preview**, **Incubadora**, **Experimental**, **Depreciação**, **Remoção**, **Plataforma** (port para sistema operacional ou arquitetura) e **Interno** (mudança no desenvolvimento do próprio OpenJDK, sem efeito para quem usa o JDK).

### Java 18

| JEP | Título | Tipo |
| --- | --- | --- |
| [400](https://openjdk.org/jeps/400) | UTF-8 by Default | Final |
| [408](https://openjdk.org/jeps/408) | Simple Web Server | Final |
| [413](https://openjdk.org/jeps/413) | Code Snippets in Java API Documentation | Final |
| [416](https://openjdk.org/jeps/416) | Reimplement Core Reflection with Method Handles | Final |
| [417](https://openjdk.org/jeps/417) | Vector API (Third Incubator) | Incubadora |
| [418](https://openjdk.org/jeps/418) | Internet-Address Resolution SPI | Final |
| [419](https://openjdk.org/jeps/419) | Foreign Function & Memory API (Second Incubator) | Incubadora |
| [420](https://openjdk.org/jeps/420) | Pattern Matching for switch (Second Preview) | Preview |
| [421](https://openjdk.org/jeps/421) | Deprecate Finalization for Removal | Depreciação |

### Java 19

| JEP | Título | Tipo |
| --- | --- | --- |
| [405](https://openjdk.org/jeps/405) | Record Patterns (Preview) | Preview |
| [422](https://openjdk.org/jeps/422) | Linux/RISC-V Port | Plataforma |
| [424](https://openjdk.org/jeps/424) | Foreign Function & Memory API (Preview) | Preview |
| [425](https://openjdk.org/jeps/425) | Virtual Threads (Preview) | Preview |
| [426](https://openjdk.org/jeps/426) | Vector API (Fourth Incubator) | Incubadora |
| [427](https://openjdk.org/jeps/427) | Pattern Matching for switch (Third Preview) | Preview |
| [428](https://openjdk.org/jeps/428) | Structured Concurrency (Incubator) | Incubadora |

### Java 20

| JEP | Título | Tipo |
| --- | --- | --- |
| [429](https://openjdk.org/jeps/429) | Scoped Values (Incubator) | Incubadora |
| [432](https://openjdk.org/jeps/432) | Record Patterns (Second Preview) | Preview |
| [433](https://openjdk.org/jeps/433) | Pattern Matching for switch (Fourth Preview) | Preview |
| [434](https://openjdk.org/jeps/434) | Foreign Function & Memory API (Second Preview) | Preview |
| [436](https://openjdk.org/jeps/436) | Virtual Threads (Second Preview) | Preview |
| [437](https://openjdk.org/jeps/437) | Structured Concurrency (Second Incubator) | Incubadora |
| [438](https://openjdk.org/jeps/438) | Vector API (Fifth Incubator) | Incubadora |

### Java 21

| JEP | Título | Tipo |
| --- | --- | --- |
| [430](https://openjdk.org/jeps/430) | String Templates (Preview) | Preview |
| [431](https://openjdk.org/jeps/431) | Sequenced Collections | Final |
| [439](https://openjdk.org/jeps/439) | Generational ZGC | Final |
| [440](https://openjdk.org/jeps/440) | Record Patterns | Final |
| [441](https://openjdk.org/jeps/441) | Pattern Matching for switch | Final |
| [442](https://openjdk.org/jeps/442) | Foreign Function & Memory API (Third Preview) | Preview |
| [443](https://openjdk.org/jeps/443) | Unnamed Patterns and Variables (Preview) | Preview |
| [444](https://openjdk.org/jeps/444) | Virtual Threads | Final |
| [445](https://openjdk.org/jeps/445) | Unnamed Classes and Instance Main Methods (Preview) | Preview |
| [446](https://openjdk.org/jeps/446) | Scoped Values (Preview) | Preview |
| [448](https://openjdk.org/jeps/448) | Vector API (Sixth Incubator) | Incubadora |
| [449](https://openjdk.org/jeps/449) | Deprecate the Windows 32-bit x86 Port for Removal | Depreciação |
| [451](https://openjdk.org/jeps/451) | Prepare to Disallow the Dynamic Loading of Agents | Final |
| [452](https://openjdk.org/jeps/452) | Key Encapsulation Mechanism API | Final |
| [453](https://openjdk.org/jeps/453) | Structured Concurrency (Preview) | Preview |

## Fontes

**Releases e suporte**

- [JDK 18](https://openjdk.org/projects/jdk/18/), [JDK 19](https://openjdk.org/projects/jdk/19/), [JDK 20](https://openjdk.org/projects/jdk/20/) e [JDK 21](https://openjdk.org/projects/jdk/21/): OpenJDK
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
- Release notes da Oracle: [JDK 18](https://www.oracle.com/java/technologies/javase/18-relnote-issues.html), [JDK 19](https://www.oracle.com/java/technologies/javase/19-relnote-issues.html), [JDK 20](https://www.oracle.com/java/technologies/javase/20-relnote-issues.html), [JDK 21](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html) e [JDK 23](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html)

**JEPs do período (Java 18 a 21)**

- [JEP 400](https://openjdk.org/jeps/400), [JEP 408](https://openjdk.org/jeps/408), [JEP 413](https://openjdk.org/jeps/413), [JEP 416](https://openjdk.org/jeps/416), [JEP 417](https://openjdk.org/jeps/417), [JEP 418](https://openjdk.org/jeps/418), [JEP 419](https://openjdk.org/jeps/419), [JEP 420](https://openjdk.org/jeps/420), [JEP 421](https://openjdk.org/jeps/421)
- [JEP 405](https://openjdk.org/jeps/405), [JEP 422](https://openjdk.org/jeps/422), [JEP 424](https://openjdk.org/jeps/424), [JEP 425](https://openjdk.org/jeps/425), [JEP 426](https://openjdk.org/jeps/426), [JEP 427](https://openjdk.org/jeps/427), [JEP 428](https://openjdk.org/jeps/428)
- [JEP 429](https://openjdk.org/jeps/429), [JEP 432](https://openjdk.org/jeps/432), [JEP 433](https://openjdk.org/jeps/433), [JEP 434](https://openjdk.org/jeps/434), [JEP 436](https://openjdk.org/jeps/436), [JEP 437](https://openjdk.org/jeps/437), [JEP 438](https://openjdk.org/jeps/438)
- [JEP 430](https://openjdk.org/jeps/430), [JEP 431](https://openjdk.org/jeps/431), [JEP 439](https://openjdk.org/jeps/439), [JEP 440](https://openjdk.org/jeps/440), [JEP 441](https://openjdk.org/jeps/441), [JEP 442](https://openjdk.org/jeps/442), [JEP 443](https://openjdk.org/jeps/443), [JEP 444](https://openjdk.org/jeps/444), [JEP 445](https://openjdk.org/jeps/445), [JEP 446](https://openjdk.org/jeps/446), [JEP 448](https://openjdk.org/jeps/448), [JEP 449](https://openjdk.org/jeps/449), [JEP 451](https://openjdk.org/jeps/451), [JEP 452](https://openjdk.org/jeps/452), [JEP 453](https://openjdk.org/jeps/453)

**JEPs de contexto (antes e depois do período)**

- [JEP 11: Incubator Modules](https://openjdk.org/jeps/11) e [JEP 12: Preview Features](https://openjdk.org/jeps/12)
- Antes do período: [JEP 377](https://openjdk.org/jeps/377) (Java 15), [JEP 338](https://openjdk.org/jeps/338), [JEP 394](https://openjdk.org/jeps/394) e [JEP 395](https://openjdk.org/jeps/395) (Java 16), [JEP 406](https://openjdk.org/jeps/406), [JEP 412](https://openjdk.org/jeps/412) e [JEP 414](https://openjdk.org/jeps/414) (Java 17)
- Depois do Java 21: [JEP 454](https://openjdk.org/jeps/454), [JEP 456](https://openjdk.org/jeps/456), [JEP 459](https://openjdk.org/jeps/459), [JEP 463](https://openjdk.org/jeps/463), [JEP 465](https://openjdk.org/jeps/465), [JEP 474](https://openjdk.org/jeps/474), [JEP 477](https://openjdk.org/jeps/477), [JEP 479](https://openjdk.org/jeps/479), [JEP 491](https://openjdk.org/jeps/491), [JEP 495](https://openjdk.org/jeps/495), [JEP 505](https://openjdk.org/jeps/505), [JEP 506](https://openjdk.org/jeps/506), [JEP 508](https://openjdk.org/jeps/508), [JEP 512](https://openjdk.org/jeps/512)

**Documentação oficial**

- [Virtual Threads (Java Core Libraries, JDK 21)](https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html)
- [Pattern Matching for switch](https://docs.oracle.com/en/java/javase/21/language/pattern-matching-switch.html) e [Record Patterns](https://docs.oracle.com/en/java/javase/21/language/record-patterns.html)
- [The Z Garbage Collector (JDK 21)](https://docs.oracle.com/en/java/javase/21/gctuning/z-garbage-collector.html)
- [jwebserver (manual)](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jwebserver.html) e [Programmer's Guide to Snippets](https://docs.oracle.com/en/java/javase/21/javadoc/snippets.html)
- Javadoc do Java 21: [SequencedCollection](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/SequencedCollection.html), [Thread](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html), [Thread.Builder](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.Builder.html), [Future](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Future.html), [SimpleFileServer](https://docs.oracle.com/en/java/javase/21/docs/api/jdk.httpserver/com/sun/net/httpserver/SimpleFileServer.html), [KEM](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/javax/crypto/KEM.html), [InetAddressResolverProvider](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/spi/InetAddressResolverProvider.html)
- [JDK 21: Sequenced Collections Incompatibilities (inside.java)](https://inside.java/2023/05/12/quality-heads-up/)
