---
title: "AtomicBoolean — o sinalizador thread-safe da parada graciosa"
published: 2026-05-19
description: "Por que um boolean comum pode nunca ser visto pela outra thread, por que volatile resolve só metade do problema, e como o AtomicBoolean conecta o shutdown hook do SIGTERM ao loop de um job para encerrar sem corromper estado."
tags: [Java, Concorrência, Kubernetes]
category: Java
cover: /covers/atomicboolean.svg
draft: false
---

A `AtomicBoolean` é uma classe do pacote `java.util.concurrent.atomic` que encapsula um valor `boolean` oferecendo **operações atômicas e visíveis entre threads**. Num job de longa duração rodando no Kubernetes, ela serve de "interruptor" compartilhado entre a thread principal do job e a thread do shutdown hook que a JVM dispara no `SIGTERM`.

## O problema que ela resolve

O desenho típico de um job com parada graciosa:

```java title="Worker do job"
private final AtomicBoolean stopping = new AtomicBoolean(false);

// Registrado no bootstrap — executa quando a JVM recebe SIGTERM
Runtime.getRuntime().addShutdownHook(new Thread(() -> stopping.set(true)));

// Loop principal do job
while (!stopping.get()) {
    processarProximoLote();   // batch curto, commitável
}
finalizarComLimpeza();        // fecha conexões, faz flush, exit 0
```

Há **duas threads diferentes** acessando o mesmo valor:

- **Thread principal do job** — roda o loop de processamento (queries, batches) e periodicamente chama `stopping.get()` para decidir se continua.
- **Thread do shutdown hook** — criada pela JVM quando o Kubernetes envia `SIGTERM` (deadline atingido, eviction, deploy). Executa o `stopping.set(true)`.

![Sequência do SIGTERM ao exit 0: o hook seta o AtomicBoolean e o loop do job encerra limpo](/posts/atomicboolean-parada-graciosa/fluxo-sigterm-atomicboolean.svg)

## Por que não usar um `boolean` comum?

Se fosse `private boolean stopping = false;` com a thread do hook fazendo `stopping = true`, a thread principal poderia **nunca enxergar a mudança** — e não é bug hipotético, é como o Java Memory Model funciona:

- Cada thread pode manter uma cópia em cache (registrador de CPU, cache L1) do valor.
- O JIT pode otimizar `while (!stopping)` para `while (true)` se não houver garantia de visibilidade — afinal, do ponto de vista daquela thread, ninguém "mexe" na variável.
- Sem barreira de memória, a escrita feita pelo hook pode demorar arbitrariamente (ou nunca) para ser vista pela outra thread.

## Por que `AtomicBoolean` e não `volatile boolean`?

Tecnicamente, `volatile boolean` resolveria o problema de visibilidade neste caso — só há um leitor e um escritor, sem operações compostas. Mas `AtomicBoolean` é escolha melhor pela arquitetura do código:

- **Precisa ser passado como referência.** Se o flag viaja dentro de um objeto de contexto (um record entregue ao job, por exemplo), um `volatile boolean` viraria **duas cópias independentes** — a do dispatcher e a do record; mudar uma não afeta a outra. `AtomicBoolean` é um objeto: o record carrega a *mesma* referência que o hook muta.
- **API auto-documentada.** O nome já comunica thread-safety; `volatile` não comunica tão bem.
- **Extensível.** Se um dia precisar de `compareAndSet` ("só seto se ainda estiver false"), já está pronto.

## Os três métodos usados

```java
new AtomicBoolean(false)  // construtor — valor inicial
stopping.set(true)        // escrita atômica + visível para outras threads
stopping.get()            // leitura atômica + visível
```

Por trás, a JVM usa instruções de CPU específicas (em x86, `MOV` com barreira de memória; em ARM, `LDAR`/`STLR`) que garantem o efeito *happens-before* entre o `set` de uma thread e o `get` de outra. É isso que o `boolean` comum não dá.

## O ciclo de vida completo

1. O Kubernetes atinge o deadline (ou faz eviction/deploy) → envia `SIGTERM` ao container.
2. A JVM recebe o `SIGTERM` → executa os shutdown hooks em threads paralelas.
3. O hook roda `stopping.set(true)` → o `AtomicBoolean` garante a visibilidade.
4. A thread do job, no próximo check, vê `true`.
5. O job encerra limpo: commita o batch atual, fecha conexões, retorna do loop.
6. O processo sai com exit 0.

Sem o `AtomicBoolean` (ou equivalente), o passo 4 poderia simplesmente não acontecer — e o job seria morto pelo K8s com `SIGKILL` depois do `terminationGracePeriodSeconds`, possivelmente no meio de um commit, deixando estado inconsistente. O ciclo completo do término de um pod está no post [SIGTERM e SIGKILL no Kubernetes](/posts/sigterm-sigkill-kubernetes/).

## Fontes

- Java SE — [AtomicBoolean](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/AtomicBoolean.html)
- JLS §17.4 — [Memory Model](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17.4)
