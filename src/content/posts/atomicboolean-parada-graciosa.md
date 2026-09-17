---
title: "AtomicBoolean — o sinalizador thread-safe da parada graciosa"
published: 2026-05-19
updated: 2026-09-16
description: "Por que um `boolean` comum pode não ser visto por outra thread, quando `volatile` basta, por que preferir `AtomicBoolean` e como ligar o `SIGTERM` a um job sem encerrar a JVM no meio de um lote."
tags: [Concorrência, Kubernetes, JVM]
category: Java
draft: false
---

Um job de longa duração no Kubernetes pode receber `SIGTERM` a qualquer momento: deploy, eviction, `activeDeadlineSeconds` atingido. O objetivo é parar **entre um lote e outro**, nunca no meio de um commit. Para isso, duas threads precisam conversar: a que recebe o aviso de desligamento e a que roda o loop do job.

Este post mostra como fazer essa conversa com `AtomicBoolean`, uma classe do pacote `java.util.concurrent.atomic` que guarda um `boolean` com leitura e escrita seguras entre threads. No caminho: por que um `boolean` comum não serve, quando `volatile` bastaria e um detalhe fácil de esquecer: a JVM não espera o loop terminar.

## O desenho de uma parada graciosa

**Parada graciosa** é encerrar o processo de forma controlada: terminar o trabalho em andamento, fechar conexões e só então sair. Em Java, o gancho para isso é o **shutdown hook**, uma thread que a aplicação registra com `Runtime.addShutdownHook` e que a JVM inicia quando começa a se desligar, por exemplo ao receber `SIGTERM`.

```java title="Worker do job"
private static final AtomicBoolean stopping = new AtomicBoolean(false);

public static void main(String[] args) {
    Thread threadDoJob = Thread.currentThread();

    // Registrado no bootstrap; a JVM inicia esta thread ao receber SIGTERM
    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
        stopping.set(true);              // avisa o loop
        try {
            threadDoJob.join(25_000);    // espera o job terminar (até 25 s)
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }));

    // Loop principal do job
    while (!stopping.get()) {
        processarProximoLote();   // lote curto, que termina com commit
    }
    finalizarComLimpeza();        // fecha conexões, faz flush
}
```

Há **duas threads diferentes** acessando o mesmo valor:

- **Thread do job**: roda o loop de processamento (queries, lotes) e, a cada volta, chama `stopping.get()` para decidir se continua.
- **Thread do shutdown hook**: criada pela aplicação no bootstrap e iniciada pela JVM no começo do desligamento. Executa `stopping.set(true)` e espera a thread do job terminar. Por que esse `join` é indispensável está em [O hook precisa esperar o job](#o-hook-precisa-esperar-o-job).

![Sequência do SIGTERM ao fim da JVM: o hook marca o AtomicBoolean, espera a thread do job terminar o lote e só então a JVM encerra com exit code 143](/posts/atomicboolean-parada-graciosa/fluxo-sigterm-atomicboolean.svg)

## Por que não usar um `boolean` comum?

Se o campo fosse `private static boolean stopping = false;` e o hook fizesse `stopping = true`, **nada garante** que a thread do job veria a mudança. Não é um bug hipotético; é o que a especificação permite:

- A [JLS §17.4](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4) deixa o compilador livre para transformar o código, desde que o resultado seja válido pelo **Java Memory Model**, o conjunto de regras que define quais escritas uma leitura pode enxergar. Para um código sem sincronização, isso inclui comportamentos que parecem impossíveis.
- A escrita de uma thread só tem visibilidade garantida em outra se existir uma relação ***happens-before*** entre a escrita e a leitura. Um campo `volatile`, blocos `synchronized` no mesmo monitor e as classes de `java.util.concurrent` criam essa relação; um campo comum lido sem sincronização não ([Memory Consistency Properties](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/package-summary.html#MemoryVisibility)).
- Na prática, uma otimização permitida por essa liberdade é o compilador JIT ler o campo uma única vez e reaproveitar o valor em todas as voltas: se nada dentro do loop escreve na variável, do ponto de vista daquela thread ela nunca muda.

Dá para ver isso acontecer:

```java title="Visibilidade.java"
public class Visibilidade {
    static boolean parar = false; // troque por: static volatile boolean parar = false;

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            long voltas = 0;
            while (!parar) {
                voltas++;
            }
            System.out.println("worker viu parar = true após " + voltas + " voltas");
        });
        worker.setDaemon(true); // se o worker ficar preso, não impede a JVM de sair
        worker.start();

        Thread.sleep(1000);
        parar = true;
        worker.join(3000);      // espera até 3 s
        System.out.println(worker.isAlive() ? "worker AINDA rodando" : "worker encerrou");
    }
}
```

Rodando com `java Visibilidade.java` no Temurin 25, a versão com `boolean` comum imprimiu `worker AINDA rodando` em 9 de 10 execuções: o loop continuou girando depois de `parar = true`. Com `volatile`, o worker encerrou nas 6 execuções feitas. O resultado sem `volatile` varia (depende do JIT e do momento em que o código é compilado), e é justamente esse o problema: o comportamento não é garantido.

## `volatile boolean` ou `AtomicBoolean`?

Tecnicamente, um `volatile boolean` resolveria a visibilidade neste caso. A [JLS §8.3.1.4](https://docs.oracle.com/javase/specs/jls/se25/html/jls-8.html#jls-8.3.1.4) garante que todas as threads veem um valor consistente de um campo `volatile`, e aqui há só um escritor e nenhuma operação composta (do tipo "leio, decido e escrevo"). Ainda assim, `AtomicBoolean` costuma ser a escolha melhor pela forma do código:

- **Pode ser passado como referência.** `boolean` é primitivo e é copiado por valor. Se o sinalizador viaja dentro de um objeto de contexto entregue ao job, um `boolean` vira uma cópia congelada do valor no momento da construção. `AtomicBoolean` é um objeto: o contexto carrega a *mesma* instância que o hook altera.

  ```java
  record ContextoDoJob(AtomicBoolean stopping) {}

  var ctx = new ContextoDoJob(stopping);
  stopping.set(true);
  ctx.stopping().get();   // true: é a mesma instância
  // Com record ContextoDoJob(boolean stopping), ctx.stopping() continuaria false
  ```

- **O tipo documenta a intenção.** Quem lê `AtomicBoolean` sabe na hora que o valor é compartilhado entre threads; um `volatile` perdido na declaração é fácil de não notar (ou de apagar numa refatoração).
- **Já tem operações atômicas.** Se um dia precisar de `compareAndSet(false, true)` ("só marco se ainda estiver `false`"), por exemplo para garantir que a limpeza rode uma única vez, o método já existe.

## Os métodos usados

```java
new AtomicBoolean(false)  // construtor: valor inicial
stopping.set(true)        // escrita com semântica de volatile
stopping.get()            // leitura com semântica de volatile
```

Não há mágica de hardware por trás. No [código-fonte do JDK 25](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/concurrent/atomic/AtomicBoolean.java), `AtomicBoolean` guarda o valor num campo `private volatile int value`, e o [Javadoc](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicBoolean.html) define `get()` e `set()` com os efeitos de memória de `VarHandle.getVolatile` e `VarHandle.setVolatile`. A garantia vem do Java Memory Model: a escrita num campo `volatile` acontece antes (*happens-before*) de toda leitura posterior desse campo, e por isso o `get()` da thread do job enxerga o `set(true)` do hook. É isso que o `boolean` comum não oferece.

## O hook precisa esperar o job

Marcar a flag não basta. O [Javadoc de `Runtime`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Runtime.html#shutdown) descreve a sequência de desligamento: a JVM inicia todos os shutdown hooks, que rodam em paralelo com as demais threads, e **encerra assim que todos os hooks terminam**. Nesse momento, nenhuma thread executa mais código Java: métodos não terminam e blocos `finally` não rodam.

Um hook que só faz `stopping.set(true)` termina quase na hora. Rodando essa versão no Temurin 25, com lotes simulados de 2 s, e enviando `SIGTERM` com um lote em andamento, o resultado foi:

```txt
lote 1: início
lote 1: commit
lote 2: início
lote 2: commit
lote 3: início
```

O lote 3 nunca fez commit e `finalizarComLimpeza()` nunca rodou: a JVM encerrou logo depois do hook. Com o `join` do exemplo acima, o mesmo teste terminou o lote em andamento e fez a limpeza completa antes de a JVM sair.

Cuidados com esse `join`:

- **Use timeout menor que o grace period.** O Kubernetes espera `terminationGracePeriodSeconds` (padrão de 30 s) e depois manda `SIGKILL`. Os 25 s do exemplo deixam folga dentro do padrão; se houver `preStop`, ele consome o mesmo orçamento (veja [SIGTERM e SIGKILL no Kubernetes](/posts/sigterm-sigkill-kubernetes/)). Se o timeout estourar, o hook desiste, a JVM encerra e o lote em andamento é cortado, por isso cada lote precisa ser curto.
- **Não chame `System.exit` na thread que o hook espera.** `System.exit` dispara a sequência de desligamento e bloqueia indefinidamente (a thread fica parada ali até a JVM encerrar); o hook, por sua vez, espera essa mesma thread terminar. Num teste, a saída ficou travada os 25 s inteiros do timeout. Deixe o `main` simplesmente retornar.
- **Hooks devem ser rápidos.** O próprio Javadoc de `addShutdownHook` desaconselha computação longa dentro do hook. Por isso ele só avisa e espera; o trabalho de verdade (terminar o lote, fechar conexões) fica na thread do job.

### E o exit code?

Mesmo com a parada limpa, o processo **não sai com 0**. Quando o desligamento começa por um sinal, a JVM usa como exit code 128 + o número do sinal ([`Terminator.java`](https://github.com/openjdk/jdk25u/blob/master/src/java.base/unix/classes/java/lang/Terminator.java) no código do OpenJDK). Para `SIGTERM` (15), isso dá **143**, e foi o código observado nos testes, com ou sem o `join`. Em Java, 143 depois de um `SIGTERM` é o resultado normal de um shutdown limpo; o que mostra se a parada foi graciosa são os logs (lote concluído, limpeza feita), não o exit code.

Se algum processo externo exigir exit code 0, dá para chamar `Runtime.getRuntime().halt(0)` no fim do hook. Use com cuidado: `halt` encerra a JVM na hora, sem esperar os outros shutdown hooks (de frameworks de log, por exemplo).

## O ciclo de vida completo

1. O Kubernetes decide encerrar o pod (deploy, eviction, `activeDeadlineSeconds` atingido) e o kubelet faz o container runtime enviar `SIGTERM` ao processo 1 do container. O processo `java` precisa ser esse PID 1 (ou receber o sinal repassado); veja [a pegadinha do PID 1](/posts/sigterm-sigkill-kubernetes/#a-pegadinha-do-pid-1).
2. A JVM recebe o `SIGTERM`, inicia a sequência de desligamento e começa a rodar os shutdown hooks.
3. O hook executa `stopping.set(true)` e passa a esperar a thread do job com `join`.
4. A thread do job, na próxima verificação do loop, lê `true`.
5. O job termina o lote atual (com commit), sai do loop e faz a limpeza: fecha conexões, faz flush.
6. A thread do job termina, o `join` retorna e o hook acaba.
7. Com todos os hooks concluídos, a JVM encerra com exit code 143.

Sem o `AtomicBoolean` (ou um `volatile` equivalente), o passo 4 pode não acontecer: o hook esperaria até o timeout e a JVM encerraria no meio de um lote. Sem o `join`, a JVM encerra logo depois do `set(true)`, com o mesmo efeito. E se o shutdown passar do `terminationGracePeriodSeconds`, o Kubernetes manda `SIGKILL`, que não dá chance a nenhuma limpeza. O ciclo completo do término de um pod está no post [SIGTERM e SIGKILL no Kubernetes](/posts/sigterm-sigkill-kubernetes/).

## Fontes

- Java SE 25 — [AtomicBoolean](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicBoolean.html)
- Java SE 25 — [Runtime: sequência de desligamento e `addShutdownHook`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Runtime.html#addShutdownHook(java.lang.Thread))
- Java SE 25 — [`java.util.concurrent`: Memory Consistency Properties](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/package-summary.html#MemoryVisibility)
- JLS SE 25 §17.4 — [Memory Model](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4)
- JLS SE 25 §8.3.1.4 — [volatile Fields](https://docs.oracle.com/javase/specs/jls/se25/html/jls-8.html#jls-8.3.1.4)
- OpenJDK (JDK 25) — [AtomicBoolean.java](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/concurrent/atomic/AtomicBoolean.java)
- OpenJDK (JDK 25) — [Terminator.java](https://github.com/openjdk/jdk25u/blob/master/src/java.base/unix/classes/java/lang/Terminator.java)
- Kubernetes — [Pod Lifecycle: Termination of Pods](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)
- Kubernetes — [Jobs: Job termination and cleanup](https://kubernetes.io/docs/concepts/workloads/controllers/job/#job-termination-and-cleanup)
