---
title: "Arquitetura · Sessão 02 — Virtual threads, pinning e CLOSE_WAIT"
published: 2026-09-12
description: "Instância viva mas muda e milhares de sockets em CLOSE_WAIT: pinning de virtual threads, o gargalo que muda de lugar, bulkhead e circuit breaker."
tags: [Java, Virtual Threads, Resiliência]
category: Arquitetura
cover: /banners/tech-circuit.svg
draft: false
---

> Sessão 02 da série **Aprendizado de arquitetura** — a primeira respondida por mim. Formato de diagnóstico: sintoma primeiro, causa depois.

## 1. Desafio

**Enunciado.** Serviço de autorização de cartões, Spring Boot 3 com Tomcat embarcado, Java 21. O time ligou virtual threads para o processamento de requisições.

Dois dias depois, no pico da tarde, uma instância para de responder. Não devolve erro — simplesmente não responde. O health check estoura, o Kubernetes reinicia o pod, e volta ao normal por algumas horas.

Os sinais:

- A JVM está viva. Sem OutOfMemory, sem exceção, sem stack trace no log.
- CPU baixa, memória estável, GC comportado.
- No host, milhares de sockets em CLOSE_WAIT.
- Não reproduz em homologação. O teste de carga sintético passa limpo.

O que está acontecendo?

## 2. Vocabulário que faltava

A sessão começou invertida: o travamento foi no vocabulário, não no raciocínio. Quatro peças antes do resto.

**Socket** — a ponta que cada lado segura numa conexão de rede. Como o telefone numa ligação: enquanto a ligação existe, ele está ocupado. Cada requisição HTTP em curso consome um, e socket é recurso finito — conta no teto de arquivos abertos do processo.

**CLOSE_WAIT** — estado TCP que significa: o outro lado desligou, o seu lado ainda não. Encerrar uma conexão exige que os dois desliguem, e quem pousa o telefone do seu lado é a aplicação, não o sistema operacional. Milhares acumulados significam que o código parou de chegar na linha que fecha.

**Platform thread** — a thread tradicional do Java, que é uma thread do SO. Custa cerca de 1 MB só para existir, então ninguém cria uma por requisição: cria-se um pool e as requisições se revezam. O problema aparece quando o trabalho é esperar — 300 ms parado esperando o adquirente é uma thread ocupada sem fazer nada.

**Virtual thread** — thread gerenciada pela JVM, não pelo SO. Custa quase nada, então cabem dezenas de milhares. Elas não substituem as threads reais: montam em cima de uma quantidade pequena delas, as **carrier threads**. Quando uma virtual thread bloqueia, a JVM a **desmonta** da carrier e coloca outra no lugar. É o revezamento que faz o modelo funcionar.

## 3. Resposta dada

> O microsserviço para de responder porque não tem thread disponível. O problema deve estar nos sockets em CLOSE_WAIT — teria que descobrir por que a aplicação não está encerrando os sockets.

## 4. Onde furou

Dois ajustes.

**Não faltou virtual thread — faltou carrier.** Virtual thread é barata e a JVM cria quantas precisar. O gargalo é o punhado de threads reais embaixo. Se cada uma delas fica presa a uma virtual thread que bloqueou e não desmontou, existem dezenas de milhares de virtual threads e nenhuma consegue executar. Esse estado tem nome: **pinning**.

**A causalidade é a inversa.** O CLOSE_WAIT não é a causa, é a impressão digital. As carriers travaram, então o código parou de rodar, então ninguém chegou na linha que fecha o socket. Os clientes desistiram e desligaram do lado deles. Milhares de CLOSE_WAIT é o retrato de uma aplicação congelada, não de um bug de fechamento de conexão.

![Diagrama: todas as carriers presas por virtual threads que bloquearam dentro de synchronized — pinning](/posts/virtual-threads-pinning-close-wait/pinning-virtual-threads.svg)

## 5. Aprendizado — pinning

No Java 21, a causa principal é uma só: **bloquear dentro de um bloco `synchronized`**.

O motivo é interno da JVM. `synchronized` compila para `monitorenter` e `monitorexit`, que adquirem e liberam o monitor do objeto, e a JVM registra o dono do monitor como sendo a **thread do sistema operacional** — a carrier. Se ela desmontasse a virtual thread ali dentro, perderia a posse de algo que ainda segura. Então a JVM não desmonta.

Detalhe cruel: quase nunca é o seu código. A Netflix documentou essa falha em produção em julho de 2024, e a causa foi uma biblioteca de tracing com blocos synchronized por dentro — Spring Boot 3, Tomcat embarcado, Java 21, sockets em CLOSE_WAIT. O mesmo quadro deste desafio.

E é por isso que homologação passa limpo: pinning só vira travamento quando há concorrência suficiente para prender todas as carriers ao mesmo tempo. Com carga baixa, uma carrier presa é invisível.

**Como se descobre**

- **Thread dump** — `jcmd <pid> Thread.dump_to_file`. A partir do Java 21 mostra as virtual threads, não só as platform. As carriers aparecem todas paradas no mesmo ponto, e esse ponto é a resposta.
- **JFR (Java Flight Recorder)** — o gravador de eventos embutido na JVM. O evento `jdk.VirtualThreadPinned` dispara sempre que uma virtual thread bloqueia sem conseguir desmontar, com o stack trace. Deixar ligado com alerta é a prática recomendada.

**Como se resolve**

- Trocar `synchronized` por `ReentrantLock` no código que bloqueia — mesma exclusão mútua, mas a espera não prega a carrier.
- Subir para o **Java 25**, primeira LTS com a correção do JEP 491, onde `synchronized` deixou de pregar.

Se o `synchronized` está dentro de uma dependência, o upgrade é o único caminho — não há o que refatorar. Mas upgrade leva semanas, e no plantão a mitigação imediata é outra: desligar as virtual threads por configuração e voltar ao pool tradicional. Perde escalabilidade, para de cair. Curativo e conserto são coisas separadas.

## 6. Aprendizado — o gargalo mudou de lugar

O Java 25 resolve o pinning por `synchronized`, mas não resolve o que vem junto com virtual threads.

No modelo antigo, o pool de 200 threads fazia duas coisas ao mesmo tempo sem ninguém perceber: separava o trabalho de cada requisição **e** limitava quantas chamadas simultâneas saíam do serviço. Com virtual threads, cada requisição ganha a sua e o segundo trabalho desaparece.

Chegam 10 mil requisições no pico:

- **No Postgres** nada é derrubado — forma-se fila. O pool do Hikari tem teto, digamos 20. Vinte entram, o resto espera, e depois de alguns segundos vem timeout em massa. Essa fila não existia antes: com 200 threads, só 200 pediam conexão, e as demais nem tinham começado.
- **No adquirente** é pior, porque o problema sai de casa. Milhares de chamadas simultâneas para um terceiro com contrato de 500. Ele recusa, ou fica lento — e aí você tem milhares de conexões abertas esperando.

**Virtual threads não eliminam gargalo, mudam o gargalo de lugar.** O conserto é tornar explícito o que era implícito: um limite declarado em cada recurso compartilhado, e o número decidido por você em vez de herdado do tamanho do pool.

![Diagrama: sem o pool, a enxurrada passa direto e a fila se forma no banco e no adquirente](/posts/virtual-threads-pinning-close-wait/gargalo-mudou-de-lugar.svg)

## 7. As três peças juntas

São três trabalhos diferentes, e nenhum substitui o outro:

- **Virtual threads dão vazão** — mais trabalho em voo ao mesmo tempo. Não deixam nada mais rápido: se o adquirente leva 300 ms, continua levando 300 ms. O que muda é quantas requisições cabem simultaneamente.
- **Bulkhead limita a saída** — preventivo, funciona o tempo todo. Declara quantas chamadas simultâneas podem sair do seu serviço. Devolve o limite que o pool de threads dava de graça.
- **Circuit breaker interrompe** — reativo, só age quando o alvo está mal. Percebe a sequência de falhas e para de insistir por um tempo.

Sem o breaker, cada requisição ainda gasta os 200 ms esperando vaga no bulkhead para descobrir algo que você já sabia depois da décima falha.

### Vazão — o efeito das virtual threads

Roda direto com `java Vazao.java` no Java 21 ou mais novo, sem dependência nenhuma. O `Thread.sleep` faz o papel da chamada ao adquirente.

```java title="Vazao.java"
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

public class Vazao {

    static void chamadaAoAdquirente() {
        try {
            Thread.sleep(300); // espera de I/O: a thread não faz nada aqui
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    static long medir(ExecutorService executor) {
        Instant inicio = Instant.now();
        try (executor) { // close() espera todas terminarem
            IntStream.range(0, 1000)
                     .forEach(i -> executor.submit(Vazao::chamadaAoAdquirente));
        }
        return Duration.between(inicio, Instant.now()).toMillis();
    }

    public static void main(String[] args) {
        System.out.println("pool de 200 threads: " + medir(Executors.newFixedThreadPool(200)) + " ms");
        System.out.println("virtual threads:     " + medir(Executors.newVirtualThreadPerTaskExecutor()) + " ms");
    }
}
```

Mil chamadas de 300 ms. Com 200 threads são cinco levas, algo perto de 1500 ms. Com virtual threads todas ficam em voo juntas, perto de 300 ms. É esse número que deveria acender a luz amarela: mil chamadas simultâneas saindo para um terceiro.

### Bulkhead — o limite, sem dependência

Também roda sozinho. Mostra o pico real de chamadas simultâneas e quantas foram recusadas por você.

```java title="BulkheadSimples.java"
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

public class BulkheadSimples {

    static final Semaphore limite = new Semaphore(100);
    static final AtomicInteger emVoo = new AtomicInteger();
    static final AtomicInteger pico = new AtomicInteger();
    static final AtomicInteger recusadas = new AtomicInteger();

    static void capturar() {
        if (!entrar()) {              // não conseguiu vaga a tempo
            recusadas.incrementAndGet();
            return;                   // recusa rápida, decidida por você
        }
        try {
            int agora = emVoo.incrementAndGet();
            pico.updateAndGet(p -> Math.max(p, agora));
            Thread.sleep(300);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            emVoo.decrementAndGet();
            limite.release();         // sem isto, o limite vaza até zerar
        }
    }

    static boolean entrar() {
        try {
            return limite.tryAcquire(200, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    public static void main(String[] args) {
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            IntStream.range(0, 1000).forEach(i -> executor.submit(BulkheadSimples::capturar));
        }
        System.out.println("pico de chamadas simultâneas: " + pico.get());
        System.out.println("recusadas por você:           " + recusadas.get());
    }
}
```

O pico nunca passa de 100, por mais requisições que cheguem. O `finally` é o ponto crítico do código: se a permissão não for devolvida em todo caminho de saída, incluindo exceção, o limite encolhe sozinho até travar tudo.

**De onde vem o número.** Não é chute nem é o contrato do parceiro. É a lei de Little: vazão desejada × latência média dele. Cem por segundo com resposta em 300 ms dá 30 chamadas em voo. Põe folga e mede.

### Circuit breaker — com Resilience4j

Aqui entra dependência. No Maven:

```xml title="pom.xml"
<dependency>
  <groupId>io.github.resilience4j</groupId>
  <artifactId>resilience4j-circuitbreaker</artifactId>
  <version>2.2.0</version>
</dependency>
```

O exemplo abaixo simula um parceiro que falha por um tempo e depois volta, e imprime cada mudança de estado:

```java title="Breaker.java"
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;

import java.time.Duration;

public class Breaker {

    static volatile boolean parceiroFora = true;

    static String capturar() {
        if (parceiroFora) throw new RuntimeException("adquirente indisponível");
        return "CAPTURADO";
    }

    public static void main(String[] args) throws Exception {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
            .slidingWindowSize(20)                        // olha as últimas 20 chamadas
            .minimumNumberOfCalls(10)                     // só decide depois de 10
            .failureRateThreshold(50)                     // abre com 50% de falha
            .waitDurationInOpenState(Duration.ofSeconds(3))
            .permittedNumberOfCallsInHalfOpenState(3)     // sondagem ao voltar
            .build();

        CircuitBreaker breaker = CircuitBreaker.of("adquirente", config);
        breaker.getEventPublisher()
               .onStateTransition(e -> System.out.println(">> " + e.getStateTransition()));

        for (int i = 1; i <= 60; i++) {
            if (i == 40) parceiroFora = false;  // parceiro se recupera
            try {
                breaker.executeSupplier(Breaker::capturar);
            } catch (CallNotPermittedException e) {
                System.out.println(i + ": barrado pelo breaker, sem sair da aplicação");
            } catch (RuntimeException e) {
                System.out.println(i + ": falhou no parceiro");
            }
            Thread.sleep(150);
        }
    }
}
```

Na saída você vê a sequência inteira: falhas reais, transição `CLOSED_TO_OPEN`, um bloco de chamadas barradas sem sair da aplicação, `OPEN_TO_HALF_OPEN` depois dos 3 segundos, sondagem, e `HALF_OPEN_TO_CLOSED` quando o parceiro volta.

Os três estados: **fechado** é o saudável, corrente passando (o nome confunde no começo); **aberto** é o disjuntor desarmado, falha imediata sem tráfego; **meio-aberto** deixa poucas passarem para sondar e decide se fecha ou abre de novo.

**De onde vem, e o que ele não é.** O circuit breaker não tem relação com virtual threads. Ele é bem mais velho: aparece no livro *Release It!*, de Michael Nygard, em 2007, e ficou conhecido com o Hystrix da Netflix por volta de 2012 — anos antes de virtual thread existir. O problema que ele resolve é de sistema distribuído: parar de insistir com um serviço que está mal. Vale em qualquer linguagem, com ou sem thread, síncrono ou assíncrono. O mesmo se aplica ao bulkhead, que vem do mesmo livro e da mesma época.

A relação com esta sessão é outra, e vale guardar assim: **virtual threads não criaram a necessidade, tiraram o disfarce.** O pool de 200 threads dava um limite acidental de graça, e esse limite mascarava a ausência das duas proteções. Ao remover o pool, o que estava escondido apareceu.

Isso importa na hora de aplicar. Quem conclui que "circuit breaker é coisa de virtual thread" deixa de usar nos serviços que continuam com pool — e lá ele é igualmente necessário, só que a falha demora mais a aparecer.

### Em produção, com Spring Boot

No Spring o mesmo vira configuração, com métrica pronta para o Dynatrace:

```xml title="pom.xml"
<dependency>
  <groupId>io.github.resilience4j</groupId>
  <artifactId>resilience4j-spring-boot3</artifactId>
  <version>2.2.0</version>
</dependency>
```

```yaml title="application.yml"
resilience4j:
  bulkhead:
    instances:
      adquirente:
        maxConcurrentCalls: 100
        maxWaitDuration: 200ms
  circuitbreaker:
    instances:
      adquirente:
        slidingWindowType: COUNT_BASED
        slidingWindowSize: 20
        minimumNumberOfCalls: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 3s
        permittedNumberOfCallsInHalfOpenState: 3
```

```java
@Bulkhead(name = "adquirente")
@CircuitBreaker(name = "adquirente", fallbackMethod = "indisponivel")
public Resposta capturar(Cobranca cobranca) {
    return adquirenteClient.capturar(cobranca);
}

private Resposta indisponivel(Cobranca cobranca, Throwable causa) {
    return Resposta.negada("EMISSOR_INDISPONIVEL");
}
```

Quatro detalhes que costumam morder:

- **Use o bulkhead de semáforo, não o de thread pool.** O Resilience4j tem as duas variantes; a de thread pool reintroduz exatamente o pool que você acabou de tirar. `@Bulkhead` sem `type` já é o de semáforo.
- **Timeout é pré-requisito.** Sem tempo limite na chamada HTTP, ela não falha — fica pendurada. O breaker só conta falhas, então nunca abre, e você acumula conexões esperando para sempre.
- **O limiar é proporção, não contagem.** Baixo demais abre por soluço; alto demais nunca abre. E `minimumNumberOfCalls` evita que três falhas às três da manhã, com tráfego baixo, abram o disjuntor.
- **A ordem dos aspectos é fixa.** O Resilience4j aplica de fora para dentro: Retry, CircuitBreaker, RateLimiter, TimeLimiter, Bulkhead. O retry, sendo o mais externo, retenta o conjunto inteiro — e por isso ele precisa de espera crescente com um pouco de aleatoriedade, ou você cria a tempestade de retries que derruba de vez quem já estava mal.

### O que devolver para quem foi recusado

Em cartão, **negar não é falhar**. Erro genérico obriga a maquininha a decidir sem informação. Negar com o código certo diz que foi indisponibilidade temporária, e não recusa por saldo ou suspeita de fraude — isso muda o que a rede faz em seguida e muda o atendimento que o portador recebe.

O critério para escolher entre erro imediato e nova tentativa é o orçamento de tempo: autorização síncrona tem poucos segundos, então recusa rápida é o caminho principal. Retentar fica para os fluxos assíncronos — ajuste financeiro, estorno, processamento em lote — onde a espera cabe.

## 8. Padrões nomeados

**Já explicados acima — aqui fica só o nome formal**

- **Carrier pinning** — a virtual thread bloqueia sem conseguir desmontar e mantém a thread real refém. *Onde mais aparece:* qualquer runtime que multiplexa tarefas leves sobre threads do SO; goroutines em Go têm a versão delas ao chamar código nativo.
- **CLOSE_WAIT como sintoma** — socket que o outro lado fechou e o seu não. *Onde mais aparece:* vazamento de conexão por `close()` que não roda, cliente HTTP sem try-with-resources, pool que nunca devolve. É um dos primeiros lugares a olhar quando o processo está vivo mas mudo.
- **Deslocamento de gargalo** — remover um limite não aumenta capacidade, só empurra a fila para o próximo recurso escasso. *Onde mais aparece:* aumentar o pool de threads e derrubar o banco, subir réplicas e saturar a rede, paralelizar um job e estourar a API de terceiro.
- **Bulkhead** — limite declarado de chamadas simultâneas a um recurso, para que a sobrecarga de uma dependência não afunde o serviço inteiro. O nome vem das anteparas que dividem o casco de um navio em compartimentos estanques. Vem do livro *Release It!*, de Michael Nygard (2007) — nada a ver com virtual threads. *Onde mais aparece:* separar o pool de conexões por dependência, limitar consumidores por tópico, isolar tenant em SaaS.
- **Circuit breaker** — para de chamar quem está falhando, espera, e volta sondando. Três estados: fechado, aberto, meio-aberto. Também do *Release It!* (2007), popularizado pelo Hystrix da Netflix por volta de 2012, anos antes de virtual thread existir. *Onde mais aparece:* qualquer chamada a terceiro, e também entre microsserviços internos. **Virtual threads não criaram a necessidade dele nem do bulkhead — só tiraram o disfarce**, porque o pool de threads dava um limite acidental que mascarava a ausência dos dois.

**Mencionados de passagem — vale saber o que são**

- **Backpressure** — mecanismo pelo qual quem está sobrecarregado avisa quem produz para desacelerar, em vez de aceitar tudo e desmoronar. Semáforo, fila limitada e rate limit são formas de aplicar. *Por que importa aqui:* virtual threads são ótimas para I/O, mas não oferecem backpressure — se você precisa dela, o modelo de threads não é o seu problema e trocar de modelo não ajuda.
- **Scoped Values** — substituto principiado do `ThreadLocal`, finalizado no Java 25. Virtual threads nunca são reaproveitadas, então objeto por thread vira objeto por requisição, e isso cria pressão de memória invisível que só aparece sob carga alta. *Onde mais aparece:* propagação de contexto — usuário autenticado, trace id, tenant.
- **JEP** — Java Enhancement Proposal, o documento que descreve cada mudança da plataforma e o raciocínio por trás dela. O JEP 491 é o que corrigiu o pinning; o JEP 444 é o que trouxe virtual threads. *Por que está aqui:* saber ler um JEP é a forma de conferir o que uma versão mudou sem depender de post de blog.

## 9. Onde eu apertaria numa entrevista

- O upgrade para o Java 25 leva semanas. O que você faz hoje, no plantão?
- Java 25 e Spring Boot 4 no mesmo deploy: se algo quebrar, como você sabe qual dos dois foi?
- Qual número você coloca no semáforo do adquirente, e como chega nele?
- Depois de tudo corrigido, que métrica no Dynatrace te avisaria que o pinning voltou?
- O teste de carga passou limpo. O que faltava nele?

## Fontes

- InfoQ — [Virtual Threads after JDK 24: What Changed for Production Java](https://www.infoq.com/articles/virtual-threads-after-jdk24/)
- Netflix Technology Blog — [Java 21 Virtual Threads: Dude, Where's My Lock?](https://netflixtechblog.com/java-21-virtual-threads-dude-wheres-my-lock-3052540e231d) (julho de 2024)
- OpenJDK — [JEP 491: Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)
- OpenJDK — [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- Resilience4j — [documentação de Bulkhead e CircuitBreaker](https://resilience4j.readme.io/docs/getting-started)
