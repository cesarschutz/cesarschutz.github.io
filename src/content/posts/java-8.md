---
title: "Java 8 (LTS) — lambdas, Stream API, java.time e o fim do PermGen"
published: 2025-07-02T00:00:00Z
updated: 2026-09-16
description: "O que mudou do Java 7 para o Java 8: lambdas, `Stream`, `Optional`, `java.time`, `CompletableFuture` e Metaspace no lugar do PermGen, com exemplos antes e depois e a lista completa das 55 JEPs."
tags: [LTS, Linguagem, JVM, Concorrência]
series: java
draft: false
---

O JDK 8 chegou à disponibilidade geral em **18 de março de 2014**, segundo o [cronograma oficial do projeto JDK 8](https://openjdk.org/projects/jdk8/milestones). A versão entregou 55 JEPs, e a principal delas, [JEP 126](https://openjdk.org/jeps/126), levou expressões lambda, method references e default methods para a linguagem. Em cima disso vieram a Stream API, a nova API de datas (`java.time`), o `CompletableFuture` e, dentro da JVM, o fim da *permanent generation*.

Este artigo abre a série de LTS e compara o Java 8 com o **Java 7**. Ele serve para quem ainda está migrando código Java 7, para quem mantém sistemas em Java 8 e quer conhecer bem a base que usa, e para quem vai migrar do 8 para o 11 e precisa saber de onde parte. Os exemplos foram compilados e executados no Temurin 1.8.0_502; os trechos marcados como Java 7 foram compilados com `javac -source 1.7`.

O texto começa com uma visão geral em diagrama e segue por tema: linguagem, concorrência, APIs da biblioteca padrão, JVM, ferramentas, segurança e itens removidos. Cada recurso importante mostra o problema que existia no Java 7, o que mudou, um exemplo de antes e depois e os cuidados de uso. No fim estão os pontos de atenção na migração e a tabela com as 55 JEPs.

Em 2014, "LTS" (*long-term support*, versão com suporte longo) ainda não fazia parte do modelo de releases do OpenJDK. Em [Moving Java Forward Faster](https://mreinhold.org/blog/forward-faster) (setembro de 2017), Mark Reinhold, arquiteto-chefe da plataforma Java na Oracle, lembra que até então as versões eram grandes, irregulares e guiadas por recursos. O Java 8, por exemplo, levou oito meses a mais para resolver problemas críticos de segurança e terminar o Project Lambda. No mesmo texto ele propôs uma *feature release* (versão com recursos novos) a cada seis meses, a partir de março de 2018, e uma LTS a cada três anos, a partir de setembro de 2018. Essa primeira LTS foi o Java 11, e o [artigo sobre o Java 11](/posts/java-11/#uma-versão-nova-a-cada-seis-meses) detalha o modelo. A marcação formal veio com a [JEP 322](https://openjdk.org/jeps/322) (Time-Based Release Versioning, JDK 10): quem distribui o JDK pode identificar uma versão com suporte longo, e o sufixo `LTS` aparece na saída de `java --version`.

Mesmo sendo anterior a esse modelo, o Java 8 aparece como LTS no [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html), ao lado de 11, 17, 21 e 25. Para o Oracle JDK 8, o roadmap informa GA em março de 2014, *Premier Support* até março de 2022 e *Extended Support* até dezembro de 2030. Desde a atualização de 16 de abril de 2019, clientes Oracle obtêm as atualizações do Java SE 8 para uso comercial pelo My Oracle Support; para uso pessoal e de desenvolvimento, a Oracle informa que as atualizações públicas continuam gratuitas. Builds OpenJDK de outros fornecedores seguem calendários próprios: Reinhold já previa que as atualizações de uma LTS durariam pelo menos três anos, possivelmente mais, dependendo do fornecedor. O [guia de atualizações do Java](/posts/guia-atualizacoes-java/#distribuições-de-jdk) compara as distribuições.

## Visão geral

O diagrama agrupa as mudanças do Java 7 para o Java 8 em blocos. Cada bloco corresponde a uma seção deste artigo.

![Diagrama com os blocos de mudança do Java 7 para o Java 8: linguagem, APIs, JVM, ferramentas, segurança e itens removidos](/posts/java-8/visao-geral-java-8.svg)

Os itens do diagrama estão na [página "What's New in JDK 8"](https://www.oracle.com/java/technologies/javase/8-whats-new.html) e na [lista oficial de JEPs do JDK 8](https://openjdk.org/projects/jdk8/features). O artigo segue essa divisão, com as novidades de concorrência em seção própria:

- **Linguagem**: lambdas e interfaces funcionais, method references, default e static methods em interfaces, inferência de tipos melhorada, type annotations, repeating annotations e nomes de parâmetros via reflection.
- **Concorrência**: `CompletableFuture`, `LongAdder`, `StampedLock` e os métodos novos do `ConcurrentHashMap`.
- **APIs da biblioteca padrão**: Stream API, métodos novos nas coleções, `Optional`, `java.time`, `Base64` e `HashMap` com árvores balanceadas.
- **JVM, GC e desempenho**: troca do PermGen pelo Metaspace, depreciação de combinações de GC, intrinsics de AES e Compact Profiles.
- **Ferramentas**: `jdeps`, Nashorn e `jjs`, novas opções do `javac` e DocLint.
- **Segurança, removidos e migração**: TLS 1.1 e 1.2 ligados no cliente por padrão, remoção do `apt` e da ponte JDBC-ODBC, e as incompatibilidades do [Compatibility Guide for JDK 8](https://www.oracle.com/java/technologies/javase/8-compatibility-guide.html).

## Linguagem

### Expressões lambda e interfaces funcionais

**Chegou em:** Java 8 ([JEP 126](https://openjdk.org/jeps/126))

Até o Java 7, a única forma de passar comportamento para um método era criar um objeto, quase sempre uma classe anônima. Ordenar uma lista com um critério próprio ou disparar uma `Thread` custava cinco ou seis linhas de cerimônia para uma linha de lógica. A JEP 126 cita outro problema: com a iteração *externa* (o `for` do chamador), a biblioteca não tem como paralelizar nem otimizar o laço. Com a iteração *interna*, a estrutura de dados recebe o código a executar e decide como percorrer os elementos.

Uma lambda é uma função anônima escrita de forma curta: `(parâmetros) -> expressão` ou `(parâmetros) -> { bloco }`. Ela não tem tipo próprio. O compilador usa o **tipo-alvo**, que é o tipo esperado no ponto onde a lambda aparece, e esse tipo precisa ser uma **interface funcional**, ou seja, uma interface com exatamente um método abstrato. `Comparator`, `Runnable` e `Callable` já tinham um único método abstrato antes do Java 8, então as APIs que os recebem passam a aceitar lambdas sem mudança nenhuma ([What's New in JDK 8](https://www.oracle.com/java/technologies/javase/8-whats-new.html)).

```java title="OrdenaNomes.java (Java 7)"
List<String> nomes = new ArrayList<>(Arrays.asList("Marina", "Ana", "Bruno"));

// Classe anônima só para carregar um trecho de comportamento
Collections.sort(nomes, new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return Integer.compare(a.length(), b.length());
    }
});

Thread t = new Thread(new Runnable() {
    @Override
    public void run() {
        System.out.println("processando em segundo plano");
    }
});
t.start();
```

```java title="OrdenaNomes.java (Java 8)"
List<String> nomes = new ArrayList<>(Arrays.asList("Marina", "Ana", "Bruno"));

// O compilador infere Comparator<String> pelo contexto (target typing)
Collections.sort(nomes, (a, b) -> Integer.compare(a.length(), b.length()));

Thread t = new Thread(() -> System.out.println("processando em segundo plano"));
t.start();
```

Uma lambda **não é só uma forma curta de classe anônima**. Há duas diferenças que afetam o código, ambas definidas na [JLS 8, §15.27.2](https://docs.oracle.com/javase/specs/jls/se8/html/jls-15.html#jls-15.27.2):

- `this` dentro da lambda tem o mesmo valor que no método onde ela foi escrita. Numa classe anônima, `this` é a própria instância anônima.
- Variáveis locais usadas no corpo precisam ser `final` ou *effectively final*, isto é, nunca reatribuídas depois de inicializadas.

A implementação também é outra. Uma classe anônima vira um arquivo `.class` próprio na compilação (`Externa$1.class`). Para lambdas, a JEP 126 aponta como abordagem preferida o `invokedynamic` e os *method handles* da JSR 292. `invokedynamic` é uma instrução de bytecode cuja ligação com o código de destino só acontece em tempo de execução. O Javadoc de [`LambdaMetafactory`](https://docs.oracle.com/javase/8/docs/api/java/lang/invoke/LambdaMetafactory.html) descreve essa classe como o *bootstrap* (o método que faz a ligação) desses pontos de chamada e diz que a ligação pode carregar dinamicamente uma classe que implementa a interface funcional.

Para não obrigar cada biblioteca a declarar as próprias interfaces, o Java 8 criou o pacote [`java.util.function`](https://docs.oracle.com/javase/8/docs/api/java/util/function/package-summary.html). As interfaces principais são `Predicate<T>` (teste), `Function<T,R>` (transformação), `Supplier<T>` (fornecedor), `Consumer<T>` (efeito colateral) e `UnaryOperator`/`BinaryOperator`, além de versões para primitivos como `IntPredicate` e `ToLongFunction`. A anotação [`@FunctionalInterface`](https://docs.oracle.com/javase/8/docs/api/java/lang/FunctionalInterface.html) faz o compilador verificar que a interface tem um único método abstrato.

```java title="Interfaces.java"
@FunctionalInterface // o compilador garante exatamente um método abstrato
interface Validador<T> {
    boolean valido(T valor);
}

Validador<String> naoVazio = s -> s != null && !s.isEmpty();

Predicate<String> temArroba = s -> s.contains("@");
Function<String, Integer> tamanho = String::length;
Supplier<StringBuilder> novoBuffer = StringBuilder::new;
Consumer<String> imprime = System.out::println;

// Interfaces funcionais trazem métodos default para composição
Predicate<String> emailSimples = temArroba.and(s -> s.endsWith(".com"));

System.out.println(naoVazio.valido(""));                        // false
System.out.println(emailSimples.test("ana@exemplo.com"));       // true
System.out.println(tamanho.andThen(n -> n * 2).apply("java"));  // 8
```

### Method references

**Chegou em:** Java 8 ([JEP 126](https://openjdk.org/jeps/126))

Quando a lambda só chama um método que já existe, dá para referenciar o método direto com `::`. A [lição do Java Tutorial](https://docs.oracle.com/javase/tutorial/java/javaOO/methodreferences.html) descreve quatro formas:

```java title="Referencias.java"
// 1. Método estático: equivale a s -> Integer.parseInt(s)
Function<String, Integer> converte = Integer::parseInt;

// 2. Método de instância de um objeto específico: s -> prefixo.concat(s)
String prefixo = "id-";
Function<String, String> comPrefixo = prefixo::concat;

// 3. Método de instância de um objeto arbitrário do tipo: (a, b) -> a.compareToIgnoreCase(b)
BiFunction<String, String, Integer> compara = String::compareToIgnoreCase;

// 4. Construtor: () -> new ArrayList<String>()
Supplier<List<String>> novaLista = ArrayList::new;

List<String> nomes = Arrays.asList("bruno", "Ana", "carla");
nomes.sort(String::compareToIgnoreCase);
System.out.println(nomes); // [Ana, bruno, carla]
```

A terceira forma costuma confundir. Em `String::compareToIgnoreCase`, o primeiro parâmetro da função vira o objeto que recebe a chamada e os demais viram argumentos. Por isso a mesma referência serve como `Comparator<String>`.

### Default e static methods em interfaces

**Chegou em:** Java 8 ([JEP 126](https://openjdk.org/jeps/126))

Para adicionar `stream()` e `forEach` a `Collection` e `Iterable`, o JDK tinha um problema: incluir um método abstrato numa interface quebra todas as implementações que já existem, inclusive as de fora do JDK. A JEP 126 resolveu isso com *virtual extension methods*, que no texto final da linguagem se chamam **default methods**. São métodos de interface com corpo, marcados com `default`, que as classes herdam se não sobrescreverem. Segundo a [documentação da Oracle](https://docs.oracle.com/javase/8/docs/technotes/guides/language/enhancements.html), eles permitem adicionar funcionalidade às interfaces de uma biblioteca **mantendo compatibilidade binária** com o código escrito para as versões antigas dessas interfaces. As interfaces também passam a aceitar métodos `static`.

```java title="DefaultMethods.java"
interface Notificador {
    void enviar(String mensagem);

    // Método default: implementações antigas continuam compilando
    default void enviarTodos(String... mensagens) {
        for (String m : mensagens) {
            enviar(m);
        }
    }

    // Método estático: utilitário junto da própria interface
    static Notificador console() {
        return m -> System.out.println("[console] " + m);
    }
}

interface Auditavel  { default String descricao() { return "auditável"; } }
interface Rastreavel { default String descricao() { return "rastreável"; } }

// Dois defaults com a mesma assinatura: a classe é obrigada a resolver
class Pedido implements Auditavel, Rastreavel {
    @Override
    public String descricao() {
        return Auditavel.super.descricao() + " e " + Rastreavel.super.descricao();
    }
}
```

No Java 7, a saída seria uma classe utilitária separada (como `Collections` em relação a `Collection`) ou uma classe abstrata base, que consome a única superclasse permitida.

Como uma classe pode implementar várias interfaces, default methods trazem a questão da herança múltipla de *comportamento*. Duas regras resolvem os conflitos:

- **Dois defaults com a mesma assinatura:** pela [JLS 8, §8.4.8.4](https://docs.oracle.com/javase/specs/jls/se8/html/jls-8.html#jls-8.4.8.4), herdar dois métodos com assinaturas equivalentes, sendo pelo menos um default, é erro de compilação, a menos que a classe sobrescreva o método. Dentro dele, `Interface.super.metodo()` chama a versão de uma interface específica, como faz `Pedido` no exemplo.
- **Classe vence interface:** como resume o [Java Tutorial](https://docs.oracle.com/javase/tutorial/java/IandI/override.html), métodos de instância herdados de classes têm preferência sobre default methods de interfaces.

O Java 9 completou o recurso com métodos `private` em interfaces, para que os métodos com corpo de uma interface compartilhem código ([JEP 213](https://openjdk.org/jeps/213)); o [artigo sobre o Java 11](/posts/java-11/#ajustes-do-project-coin-métodos-private-em-interface-e-mais) mostra o exemplo.

### Inferência de tipos pelo tipo-alvo

**Chegou em:** Java 8 ([JEP 101](https://openjdk.org/jeps/101))

O Java 7 já usava o tipo declarado numa atribuição para inferir o argumento de tipo de um método genérico (`List<String> vazia = Collections.emptyList();` compila), mas não fazia o mesmo quando a chamada era argumento de outro método nem em chamadas encadeadas. Nesses casos era preciso escrever o argumento de tipo explicitamente, como em `Collections.<String>emptyList()` (o chamado *type witness*). A JEP 101 levou a inferência para o **contexto de argumento de método** e para **chamadas encadeadas**. Sem isso, lambdas passadas como argumento seriam pouco práticas. O caso do `addAll` abaixo vem da [documentação da Oracle](https://docs.oracle.com/javase/8/docs/technotes/guides/language/enhancements.html):

```java title="Inferencia.java (Java 7)"
static void imprime(List<String> itens) { System.out.println(itens); }

List<String> nomes = new ArrayList<>();
// No Java 7 a chamada aninhada precisa do argumento de tipo explícito
nomes.addAll(Arrays.<String>asList());
imprime(Collections.<String>emptyList());
```

```java title="Inferencia.java (Java 8)"
List<String> nomes = new ArrayList<>();
// O tipo do parâmetro do método externo vira o tipo-alvo da chamada interna
nomes.addAll(Arrays.asList());
imprime(Collections.emptyList());
```

Compilada com `-source 1.7`, a versão Java 8 falha com `no suitable method found for addAll(List<Object>)` e, na segunda chamada, `incompatible types: List<Object> cannot be converted to List<String>`. Essa mudança de inferência também tem um efeito colateral na resolução de sobrecarga, tratado na seção de migração.

### Type annotations

**Chegou em:** Java 8 ([JEP 104](https://openjdk.org/jeps/104))

No Java 7, anotações só podiam ficar em **declarações** (classe, método, campo, parâmetro, variável local). A JEP 104 (JSR 308) permite anotar qualquer **uso de tipo**: argumentos genéricos, `new`, casts, `implements`, `throws`. Para isso surgiu o alvo [`ElementType.TYPE_USE`](https://docs.oracle.com/javase/8/docs/api/java/lang/annotation/ElementType.html).

Segundo a JEP, o objetivo é permitir *pluggable type checkers*: verificadores plugados ao compilador, como o Checker Framework, que reforçam o sistema de tipos e acham em tempo de compilação erros de ponteiro nulo e efeitos colaterais em dados imutáveis. O cuidado é não esperar essa verificação do próprio JDK. Como diz o [Java Tutorial](https://docs.oracle.com/javase/tutorial/java/annotations/type_annotations.html), o Java SE 8 **não traz** um framework de verificação de tipos. Ele entrega a sintaxe, o armazenamento no `.class` e a API de reflection (`java.lang.reflect.AnnotatedType`); a anotação `@NaoNulo` abaixo, sozinha, não impede nenhum `null`.

```java title="TypeAnnotations.java"
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE_USE) // novo em Java 8: vale em qualquer uso de tipo
@interface NaoNulo {}

// Anotação no argumento de tipo, algo impossível no Java 7
static List<@NaoNulo String> emails = new ArrayList<>();

static String normaliza(Object valor) {
    // Também vale em casts, throws, new, extends/implements...
    return ((@NaoNulo String) valor).trim();
}

// Leitura via reflection (java.lang.reflect.AnnotatedType, novo no Java 8)
AnnotatedParameterizedType tipo = (AnnotatedParameterizedType)
        TypeAnnotations.class.getDeclaredField("emails").getAnnotatedType();
System.out.println(tipo.getAnnotatedActualTypeArguments()[0]
        .isAnnotationPresent(NaoNulo.class)); // true
```

### Repeating annotations

**Chegou em:** Java 8 ([JEP 120](https://openjdk.org/jeps/120))

A JEP 120 aponta um padrão comum no Java EE: criar uma anotação "contêiner" só para simular a repetição de outra. Com `@Repeatable`, a mesma anotação pode aparecer várias vezes no mesmo elemento. O compilador continua gerando o contêiner por baixo, e o método novo `getAnnotationsByType` o atravessa de forma transparente ([Java Tutorial: Repeating Annotations](https://docs.oracle.com/javase/tutorial/java/annotations/repeating.html)).

```java title="Agendamentos.java (Java 7)"
@Retention(RetentionPolicy.RUNTIME)
@interface Agendamento { String cron(); }

// Anotação "contêiner" escrita à mão só para repetir @Agendamento
@Retention(RetentionPolicy.RUNTIME)
@interface Agendas { Agendamento[] value(); }

@Agendas({
    @Agendamento(cron = "0 0 6 * * ?"),
    @Agendamento(cron = "0 0 18 * * ?")
})
class Relatorio {}

Agendas agendas = Relatorio.class.getAnnotation(Agendas.class);
for (Agendamento a : agendas.value()) {
    System.out.println(a.cron());
}
```

```java title="Agendamentos.java (Java 8)" ins={2,8-9,13}
@Retention(RetentionPolicy.RUNTIME)
@Repeatable(Agendas.class) // aponta para o contêiner
@interface Agendamento { String cron(); }

@Retention(RetentionPolicy.RUNTIME)
@interface Agendas { Agendamento[] value(); }

@Agendamento(cron = "0 0 6 * * ?")
@Agendamento(cron = "0 0 18 * * ?")
class Relatorio {}

// getAnnotationsByType enxerga através do contêiner gerado pelo compilador
for (Agendamento a : Relatorio.class.getAnnotationsByType(Agendamento.class)) {
    System.out.println(a.cron());
}
```

### Nomes de parâmetros em tempo de execução

**Chegou em:** Java 8 ([JEP 118](https://openjdk.org/jeps/118))

Bibliotecas que ligam valores a parâmetros pelo nome precisam conhecer os nomes usados no código-fonte. Como a reflection do Java 7 não oferecia forma confiável de obtê-los, várias APIs definiam anotações próprias do tipo `@ParameterName`, repetindo o nome de cada parâmetro, como descreve a JEP. A JEP 118 criou um atributo opcional no `.class` do Java 8 (versão 52.0 do formato) e a classe `java.lang.reflect.Parameter`, acessível por `Executable.getParameters()`.

O cuidado é que os nomes só são gravados quando o código é compilado com `javac -parameters` ([Java Language Enhancements](https://docs.oracle.com/javase/8/docs/technotes/guides/language/enhancements.html)). Sem a opção, a API devolve nomes sintéticos:

```java title="NomesParametros.java"
public void transferir(String contaOrigem, String contaDestino, long centavos) {}

Method m = NomesParametros.class.getMethod("transferir", String.class, String.class, long.class);
for (Parameter p : m.getParameters()) {
    // Com "javac -parameters": contaOrigem, contaDestino, centavos
    // Sem a opção: arg0, arg1, arg2 (isNamePresent() == false)
    System.out.println(p.getName() + " (nome presente: " + p.isNamePresent() + ")");
}
```

## Concorrência

### CompletableFuture, LongAdder, StampedLock e ConcurrentHashMap

**Chegou em:** Java 8 ([JEP 155](https://openjdk.org/jeps/155))

A JEP 155 reuniu a atualização do `java.util.concurrent` (JSR 166). O guia [Concurrency Utilities Enhancements in Java SE 8](https://docs.oracle.com/javase/8/docs/technotes/guides/concurrency/changes8.html) lista as novidades:

- **`CompletableFuture<T>` e `CompletionStage<T>`**: o `Future` do Java 5 só oferecia `get()` para obter o resultado, e `get()` bloqueia a thread. Combinar dois resultados, transformar um valor ou tratar erro sem bloquear exigia código manual. O `CompletableFuture` é um `Future` que pode ser completado explicitamente e que aceita funções e ações disparadas quando o resultado fica pronto.
- **`LongAdder`, `LongAccumulator`, `DoubleAdder`, `DoubleAccumulator`**: contadores e acumuladores que, segundo a JEP, usam técnicas de redução de contenção (disputa entre threads pelo mesmo dado) e relaxam as garantias de atomicidade para escalar melhor que as variáveis `Atomic*` quando muitas threads atualizam o mesmo valor.
- **`ConcurrentHashMap`** com mais de 30 métodos novos (`forEach`, `search`, `reduce`, `mappingCount`, `newKeySet`) e `computeIfAbsent` executado de forma atômica, com a função aplicada no máximo uma vez por chave ([Javadoc](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ConcurrentHashMap.html)).
- **`ForkJoinPool.commonPool()`**: pool comum usado por qualquer `ForkJoinTask` não submetida a um pool específico.
- **`StampedLock`**: lock com três modos (escrita, leitura e leitura otimista) e conversões entre eles. Na leitura otimista, a thread lê sem bloquear e depois chama `validate` para saber se houve escrita no meio. O [Javadoc de `StampedLock`](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/locks/StampedLock.html) avisa que ele não é reentrante: o trecho protegido não deve chamar métodos que tentem obter o mesmo lock de novo.

O primeiro exemplo busca preço e frete em paralelo e soma os dois. `consultarPreco` e `consultarFrete` são chamadas bloqueantes (por exemplo, a serviços remotos) que devolvem `99.90` e `16.00`.

```java title="Checkout.java (Java 7)"
ExecutorService pool = Executors.newFixedThreadPool(2);
try {
    Future<BigDecimal> preco = pool.submit(new Callable<BigDecimal>() {
        @Override
        public BigDecimal call() {
            return consultarPreco("SKU-1");
        }
    });
    Future<BigDecimal> frete = pool.submit(new Callable<BigDecimal>() {
        @Override
        public BigDecimal call() {
            return consultarFrete("90000-000");
        }
    });

    // Future só oferece get(), que bloqueia; compor resultados é trabalho manual
    BigDecimal total = preco.get().add(frete.get());
    System.out.println("Total: " + total); // Total: 115.90
} finally {
    pool.shutdown();
}
```

```java title="Checkout.java (Java 8)"
ExecutorService pool = Executors.newFixedThreadPool(2);
try {
    CompletableFuture<BigDecimal> preco =
            CompletableFuture.supplyAsync(() -> consultarPreco("SKU-1"), pool);
    CompletableFuture<BigDecimal> frete =
            CompletableFuture.supplyAsync(() -> consultarFrete("90000-000"), pool);

    CompletableFuture<String> resumo = preco
            .thenCombine(frete, BigDecimal::add)      // quando os dois terminarem
            .thenApply(total -> "Total: " + total)    // transforma o resultado
            .exceptionally(erro -> "Falha: " + erro.getMessage());

    System.out.println(resumo.join()); // Total: 115.90
} finally {
    pool.shutdown();
}
```

Passar um `Executor` explícito para `supplyAsync` é uma decisão consciente. Pelo [Javadoc de `CompletableFuture`](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/CompletableFuture.html), os métodos `*Async` sem `Executor` rodam no `ForkJoinPool.commonPool()`, ou numa thread nova por tarefa se o pool comum tiver paralelismo menor que dois. Tarefas que bloqueiam em I/O ocupariam esse pool compartilhado. O Java 9 acrescentou timeouts e novos métodos ao `CompletableFuture`, descritos no [artigo sobre o Java 11](/posts/java-11/#completablefuture-e-flow).

O segundo exemplo conta acessos por rota com quatro threads. `computeIfAbsent` cria o contador de cada rota uma única vez, e `LongAdder` recebe os incrementos concorrentes:

```java title="Contadores.java"
ConcurrentHashMap<String, LongAdder> acessos = new ConcurrentHashMap<>();
ExecutorService pool = Executors.newFixedThreadPool(4);

for (int i = 0; i < 10_000; i++) {
    String rota = (i % 2 == 0) ? "/pedidos" : "/clientes";
    // computeIfAbsent é atômico no ConcurrentHashMap; LongAdder reduz contenção
    pool.execute(() -> acessos.computeIfAbsent(rota, r -> new LongAdder()).increment());
}
pool.shutdown();
pool.awaitTermination(10, TimeUnit.SECONDS);

System.out.println(acessos.get("/pedidos").sum()); // 5000
```

## APIs da biblioteca padrão

### Stream API

**Chegou em:** Java 8 ([JEP 107](https://openjdk.org/jeps/107))

A JEP 107 descreve o objetivo como "filter/map/reduce para Java": operações em massa sobre coleções, sequenciais ou paralelas, expressas com lambdas. O resultado é o pacote [`java.util.stream`](https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html). Um **stream** não é uma estrutura de dados. É uma sequência de elementos vinda de uma fonte (coleção, array, gerador, canal de I/O) sobre a qual se monta um *pipeline*, uma cadeia de operações aplicadas em sequência. As operações não alteram a fonte: um `filter` produz um novo stream, sem remover nada da coleção original.

O Javadoc do pacote divide as operações em dois tipos:

- **Intermediárias** (`filter`, `map`, `sorted`, `distinct`, `limit`…) devolvem um novo stream e são **sempre lazy** (preguiçosas): nada é processado quando elas são chamadas.
- **Terminais** (`collect`, `forEach`, `reduce`, `count`, `findFirst`…) percorrem a fonte e produzem um resultado ou efeito colateral. Depois delas o stream está **consumido** e não pode ser reutilizado.

A avaliação preguiçosa permite juntar várias operações numa única passagem e, com operações de curto-circuito como `findFirst` e `limit`, parar antes de ler todos os dados.

No exemplo a seguir, `pedidos` é uma lista de objetos `Pedido` com cliente, status e valor (`BigDecimal`). A versão Java 8 só acrescenta getters para usar method references.

```java title="RelatorioPedidos.java (Java 7)"
// 1) Clientes dos 2 maiores pedidos pagos: filtrar, ordenar, cortar, mapear
List<Pedido> pagos = new ArrayList<>();
for (Pedido p : pedidos) {
    if (p.status.equals("PAGO")) {
        pagos.add(p);
    }
}
Collections.sort(pagos, new Comparator<Pedido>() {
    @Override
    public int compare(Pedido a, Pedido b) {
        return b.valor.compareTo(a.valor);
    }
});
List<String> top = new ArrayList<>();
for (int i = 0; i < pagos.size() && i < 2; i++) {
    top.add(pagos.get(i).cliente);
}

// 2) Total pago por cliente
Map<String, BigDecimal> totalPorCliente = new HashMap<>();
for (Pedido p : pagos) {
    BigDecimal atual = totalPorCliente.get(p.cliente);
    totalPorCliente.put(p.cliente, atual == null ? p.valor : atual.add(p.valor));
}
```

```java title="RelatorioPedidos.java (Java 8)"
// 1) Clientes dos 2 maiores pedidos pagos
List<String> top = pedidos.stream()
        .filter(Pedido::isPago)
        .sorted(Comparator.comparing(Pedido::getValor).reversed())
        .limit(2)
        .map(Pedido::getCliente)
        .collect(Collectors.toList());

// 2) Total pago por cliente
Map<String, BigDecimal> totalPorCliente = pedidos.stream()
        .filter(Pedido::isPago)
        .collect(Collectors.groupingBy(Pedido::getCliente,
                Collectors.reducing(BigDecimal.ZERO, Pedido::getValor, BigDecimal::add)));
```

O programa abaixo mostra a avaliação preguiçosa. O `println` dentro das lambdas deixa ver a ordem real de execução:

```java title="Preguica.java"
List<String> nomes = Arrays.asList("ana", "bruno", "carla", "daniel", "eduarda");

Stream<String> pipeline = nomes.stream()
        .filter(n -> {
            System.out.println("filter: " + n);
            return n.length() > 4;
        })
        .map(n -> {
            System.out.println("map:    " + n);
            return n.toUpperCase();
        });

System.out.println("pipeline montado, nada executado ainda");

// A operação terminal dispara o processamento, elemento a elemento
String primeiro = pipeline.findFirst().get();
System.out.println("resultado: " + primeiro);
```

```text title="Saída no JDK 8"
pipeline montado, nada executado ainda
filter: ana
filter: bruno
map:    bruno
resultado: BRUNO
```

![Pipeline de Stream com fonte, filter e map intermediários e findFirst terminal; só "ana" e "bruno" são avaliados](/posts/java-8/stream-pipeline-lazy.svg)

A saída mostra que o processamento é **vertical**: cada elemento passa por todas as etapas antes de o próximo começar, em vez de filtrar a lista inteira e depois mapear. Como `findFirst` encontrou "bruno", os três últimos nomes nunca foram avaliados.

Três pontos da documentação que evitam problemas em produção:

- **Paralelismo explícito.** Basta trocar `stream()` por `parallelStream()`. Segundo a JEP 107, a versão paralela usa o framework Fork/Join do Java 7, e pelo [guia de concorrência do Java 8](https://docs.oracle.com/javase/8/docs/technotes/guides/concurrency/changes8.html) tarefas Fork/Join não submetidas a um pool específico rodam no `ForkJoinPool.commonPool()`, um pool único para a JVM inteira.
- **Sem interferência e sem estado.** O Javadoc do pacote exige que a fonte não seja modificada durante a execução do pipeline (exceto em fontes concorrentes) e avisa que lambdas com estado podem gerar resultados não determinísticos ou incorretos.
- **Streams de primitivos.** `IntStream`, `LongStream` e `DoubleStream` evitam *boxing* (a conversão de cada `int` em objeto `Integer`) e trazem `sum`, `average` e `summaryStatistics`.

A API continuou crescendo nas LTS seguintes: `takeWhile`, `dropWhile` e `ofNullable` no Java 9 ([artigo sobre o Java 11](/posts/java-11/#optional-e-stream)) e `Stream.toList()` no Java 16 ([artigo sobre o Java 17](/posts/java-17/#streamtolist-e-streammapmulti)).

### Lambdas nas coleções e em outras bibliotecas

**Chegou em:** Java 8 ([JEP 109](https://openjdk.org/jeps/109))

A JEP 109 é o outro lado da JEP 107: adaptar as bibliotecas existentes para aceitar lambdas, na maior parte com default methods. A página [New and Enhanced APIs That Take Advantage of Lambda Expressions and Streams](https://docs.oracle.com/javase/8/docs/technotes/guides/language/lambda_api_jdk8.html) lista as classes alteradas, entre elas `Iterable`, `Collection`, `List`, `Map`, `Map.Entry`, `Comparator`, `String`, `Files`, `BufferedReader` e `Random`, e as novas `StringJoiner`, `Optional`, `Spliterator` e `IntSummaryStatistics`. O exemplo abaixo faz três tarefas comuns com uma lista de palavras (remover vazias, contar ocorrências e agrupar pela inicial) e mostra os métodos novos que mais eliminam código repetitivo:

```java title="ContaPalavras.java (Java 7)"
List<String> palavras = new ArrayList<>(Arrays.asList("java", "", "lambda", "java", ""));

// Remover vazios exige Iterator explícito para não lançar ConcurrentModificationException
Iterator<String> it = palavras.iterator();
while (it.hasNext()) {
    if (it.next().isEmpty()) {
        it.remove();
    }
}

Map<String, Integer> contagem = new HashMap<>();
for (String p : palavras) {
    Integer atual = contagem.get(p);
    contagem.put(p, atual == null ? 1 : atual + 1);
}

Map<String, List<String>> porInicial = new HashMap<>();
for (String p : palavras) {
    String chave = p.substring(0, 1);
    List<String> grupo = porInicial.get(chave);
    if (grupo == null) {
        grupo = new ArrayList<>();
        porInicial.put(chave, grupo);
    }
    grupo.add(p);
}

Integer streams = contagem.get("streams");
System.out.println(streams == null ? 0 : streams); // 0
```

```java title="ContaPalavras.java (Java 8)"
List<String> palavras = new ArrayList<>(Arrays.asList("java", "", "lambda", "java", ""));

palavras.removeIf(String::isEmpty);

Map<String, Integer> contagem = new HashMap<>();
palavras.forEach(p -> contagem.merge(p, 1, Integer::sum));

Map<String, List<String>> porInicial = new HashMap<>();
palavras.forEach(p ->
        porInicial.computeIfAbsent(p.substring(0, 1), k -> new ArrayList<>()).add(p));

System.out.println(contagem.getOrDefault("streams", 0));   // 0
System.out.println(String.join(", ", palavras));           // java, lambda, java
```

Outros acréscimos da mesma leva: `Comparator.comparing(...).thenComparing(...).reversed()` e `nullsFirst`/`nullsLast`, `List.sort` e `replaceAll`, `Map.putIfAbsent`/`compute`/`computeIfPresent`/`replaceAll`, `Files.lines` e `BufferedReader.lines` devolvendo `Stream<String>`, e `String.chars()`.

### Optional

**Chegou em:** Java 8 ([Javadoc de `java.util.Optional`](https://docs.oracle.com/javase/8/docs/api/java/util/Optional.html))

O Javadoc define `Optional<T>` como um contêiner que pode ou não guardar um valor não nulo. No Java 7, "pode não haver resultado" ficava na documentação, ou nem isso: o método devolvia `null` e cabia a quem chamava lembrar da verificação. Usar `Optional` no retorno põe a ausência **na assinatura** e dá operações para encadear transformações sem `if` aninhado.

```java title="BuscaCliente.java (Java 7)"
// Contrato implícito: pode devolver null, e nada no tipo avisa isso
static Cliente buscar(String id) { /* ... */ }

static String cidadeDoCliente(String id) {
    Cliente cliente = buscar(id);
    if (cliente != null) {
        Endereco endereco = cliente.endereco;
        if (endereco != null && endereco.cidade != null) {
            return endereco.cidade.toUpperCase();
        }
    }
    return "DESCONHECIDA";
}
```

```java title="BuscaCliente.java (Java 8)"
// A ausência agora faz parte da assinatura
static Optional<Cliente> buscar(String id) { /* ... */ }

static String cidadeDoCliente(String id) {
    return buscar(id)
            .map(c -> c.endereco)      // map devolve Optional.empty() se o resultado for null
            .map(e -> e.cidade)
            .map(String::toUpperCase)
            .orElse("DESCONHECIDA");
}
```

Cuidados que vêm do próprio Javadoc: `get()` lança `NoSuchElementException` se o valor estiver ausente, então prefira `orElse`, `orElseGet`, `orElseThrow` e `ifPresent`. `Optional` também é uma classe *value-based* (definida só pelo valor que carrega, sem identidade garantida), e operações que dependem de identidade (`==`, `synchronized`, `identityHashCode`) têm resultado imprevisível. Existem ainda `OptionalInt`, `OptionalLong` e `OptionalDouble` para primitivos.

Métodos que faltavam, como `ifPresentOrElse`, `or`, `stream` e `isEmpty`, chegaram entre o Java 9 e o 11 e estão no [artigo sobre o Java 11](/posts/java-11/#optional-e-stream).

### Nova API de data e hora (java.time)

**Chegou em:** Java 8 ([JEP 150](https://openjdk.org/jeps/150))

A motivação da JEP 150 é direta: as classes de data e hora que existiam eram ruins, mutáveis e tinham desempenho imprevisível. Havia demanda antiga por uma API melhor inspirada no Joda-Time. Os problemas conhecidos de `java.util.Date` e `Calendar` incluem meses começando em zero, objetos mutáveis compartilhados por engano e `SimpleDateFormat`, cujo [Javadoc](https://docs.oracle.com/javase/8/docs/api/java/text/SimpleDateFormat.html) avisa que os formatos de data não são sincronizados. A JSR 310 trouxe o pacote [`java.time`](https://docs.oracle.com/javase/8/docs/api/java/time/package-summary.html), baseado na ISO-8601, em que todas as classes são imutáveis e thread-safe.

![Modelo de tipos do java.time: LocalDate, LocalTime e LocalDateTime sem fuso; OffsetDateTime e ZonedDateTime com offset ou fuso; Instant como tempo de máquina; Period, Duration e DateTimeFormatter](/posts/java-8/java-time-modelo.svg)

O modelo separa conceitos que o `Date` misturava:

- **Tempo local** (`LocalDate`, `LocalTime`, `LocalDateTime`, `YearMonth`, `MonthDay`): o que um calendário ou relógio de parede mostra, sem fuso. Serve para data de nascimento, vencimento de boleto, horário de funcionamento.
- **Com offset ou fuso** (`OffsetDateTime`, `ZonedDateTime`): um ponto inequívoco na linha do tempo. `ZoneId` traz as regras de um fuso (horário de verão, mudanças históricas). `ZoneOffset` é só um deslocamento fixo.
- **Tempo de máquina** (`Instant`): segundos e nanossegundos desde 1970-01-01T00:00:00Z, próprio para timestamps e logs.
- **Quantidades**: `Period` conta em anos, meses e dias. `Duration` conta em segundos e nanossegundos.

```java title="Vencimento.java (Java 7)"
// Mês começa em zero: Calendar.JANUARY == 0
Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("America/Sao_Paulo"));
cal.clear();
cal.set(2024, Calendar.JANUARY, 31);

// Calendar é mutável: add altera o próprio objeto
cal.add(Calendar.MONTH, 1);
Date vencimento = cal.getTime();

// SimpleDateFormat não é thread-safe: não pode ser compartilhado sem cuidado
SimpleDateFormat fmt = new SimpleDateFormat("dd/MM/yyyy");
fmt.setTimeZone(TimeZone.getTimeZone("America/Sao_Paulo"));
System.out.println(fmt.format(vencimento)); // 29/02/2024
```

```java title="Vencimento.java (Java 8)"
// DateTimeFormatter é imutável e thread-safe: pode ser constante
private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

LocalDate emissao = LocalDate.of(2024, Month.JANUARY, 31);
LocalDate vencimento = emissao.plusMonths(1); // novo objeto; emissao não muda
System.out.println(vencimento.format(BR));    // 29/02/2024
System.out.println(Period.between(emissao, vencimento)); // P29D

// Data e hora "de parede" + fuso = instante inequívoco
ZonedDateTime reuniao = LocalDateTime.of(2024, 3, 10, 14, 0)
        .atZone(ZoneId.of("America/Sao_Paulo"));
System.out.println(reuniao.withZoneSameInstant(ZoneId.of("Europe/Lisbon")));
// 2024-03-10T17:00Z[Europe/Lisbon]

System.out.println(Duration.ofSeconds(90).toMinutes()); // 1

// Ponte com a API antiga
Instant agora = Instant.parse("2024-03-10T17:00:00Z");
Date legado = Date.from(agora);
System.out.println(legado.toInstant().equals(agora)); // true
```

Os métodos seguem um padrão de nomes descrito no Javadoc do pacote: `of` (fábrica), `parse`, `with` (o "setter" imutável), `plus`/`minus`, `to` (conversão) e `at` (combinação, como `LocalDate.atTime` ou `LocalDateTime.atZone`). Na migração, o código legado pode ser convertido aos poucos com `Date.from(Instant)`, `Date.toInstant()` e `GregorianCalendar.toZonedDateTime()`. Pela [JEP 170](https://openjdk.org/jeps/170), o JDBC 4.2 ganhou um setter e um update genéricos em `PreparedStatement`, `CallableStatement` e `ResultSet` justamente para suportar os tipos da JSR 310.

### Base64 na biblioteca padrão

**Chegou em:** Java 8 ([JEP 135](https://openjdk.org/jeps/135))

A JEP 135 conta que o JDK devia havia muito tempo uma API padrão de Base64 e que muitos desenvolvedores acabavam usando as classes internas e sem suporte `sun.misc.BASE64Encoder`/`BASE64Decoder`. A classe `java.util.Base64` oferece codificadores e decodificadores nas variantes básica, *URL and Filename safe* e MIME, conforme as RFC 4648 e 2045 ([Javadoc de `Base64`](https://docs.oracle.com/javase/8/docs/api/java/util/Base64.html)).

```java title="Codificacao.java (Java 7)"
byte[] dados = "usuario:senha".getBytes(StandardCharsets.UTF_8);

// Alternativas comuns no Java 7: JAXB (DatatypeConverter), Apache Commons Codec
// ou a classe interna e não suportada sun.misc.BASE64Encoder
String codificado = DatatypeConverter.printBase64Binary(dados);
byte[] decodificado = DatatypeConverter.parseBase64Binary(codificado);
```

```java title="Codificacao.java (Java 8)"
byte[] dados = "usuario:senha".getBytes(StandardCharsets.UTF_8);

String basico = Base64.getEncoder().encodeToString(dados);   // dXN1YXJpbzpzZW5oYQ==
byte[] decodificado = Base64.getDecoder().decode(basico);

// Variante URL-safe (RFC 4648): troca '+' e '/' por '-' e '_'
String paraUrl = Base64.getUrlEncoder().withoutPadding()
        .encodeToString(new byte[] {(byte) 0xfb, (byte) 0xff}); // -_8
```

Quem migra deve trocar também o `DatatypeConverter`. Ele pertence ao JAXB, que saiu do JDK no Java 11 com a [JEP 320](https://openjdk.org/jeps/320), assunto da seção [Módulos Java EE e CORBA](/posts/java-11/#módulos-java-ee-e-corba) do próximo artigo da série.

### Outras melhorias de biblioteca

- **Ordenação paralela de arrays** ([JEP 103](https://openjdk.org/jeps/103)): `Arrays.parallelSort` para todos os tipos primitivos exceto `boolean` e para objetos, usando o pool comum do Fork/Join. A chamada continua síncrona para quem a faz.
- **Aritmética sem sinal e com detecção de overflow** ([enhancements em java.lang/java.util](https://docs.oracle.com/javase/8/docs/technotes/guides/lang/enhancements.html)): `Integer`/`Long` ganharam `toUnsignedString`, `parseUnsignedInt`, `divideUnsigned`, `compareUnsigned`. [`Math.addExact`](https://docs.oracle.com/javase/8/docs/api/java/lang/Math.html#addExact-int-int-) e similares lançam `ArithmeticException` em overflow em vez de "dar a volta" em silêncio.
- **`HashMap` com árvores balanceadas** ([JEP 180](https://openjdk.org/jeps/180)): quando um bucket recebe colisões demais, ele troca a lista ligada por uma árvore balanceada, e o pior caso cai de O(n) para O(log n) segundo a JEP. Vale para `HashMap`, `LinkedHashMap` e `ConcurrentHashMap`. O hashing alternativo de `String` adicionado no 7u6 foi removido ([Collections Framework Enhancements in Java SE 8](https://docs.oracle.com/javase/8/docs/technotes/guides/collections/changes8.html)).
- **JDBC 4.2** ([JEP 170](https://openjdk.org/jeps/170)): a interface `SQLType` e o enum `JDBCType` (que inclui `REF_CURSOR`), além de sobrecargas como [`PreparedStatement.setObject(int, Object, SQLType)`](https://docs.oracle.com/javase/8/docs/api/java/sql/PreparedStatement.html), todos marcados como *Since 1.8* no Javadoc.

```java title="Utilitarios.java"
System.out.println(Integer.toUnsignedString(-1));        // 4294967295

try {
    Math.addExact(Integer.MAX_VALUE, 1);
} catch (ArithmeticException e) {
    System.out.println("overflow: " + e.getMessage());   // overflow: integer overflow
}

int[] numeros = {5, 3, 9, 1, 7};
Arrays.parallelSort(numeros);
System.out.println(Arrays.toString(numeros));            // [1, 3, 5, 7, 9]
```

## JVM, GC e desempenho

### Remoção do PermGen e chegada do Metaspace

**Chegou em:** Java 8 ([JEP 122](https://openjdk.org/jeps/122))

No HotSpot, a representação interna das classes (os *metadados de classe*) ficava na **permanent generation** (PermGen), uma área gerenciada pela JVM com tamanho máximo fixo, definido por `-XX:MaxPermSize`. Quando esse espaço acabava, a JVM lançava `java.lang.OutOfMemoryError: PermGen space`, erro documentado no [guia de troubleshooting do Java 7](https://docs.oracle.com/javase/7/docs/webnotes/tsg/TSG-VM/html/memleaks.html). Segundo a JEP 122, essa área precisava ter espaço para os metadados de todas as classes usadas pela aplicação, e o tamanho tinha de ser ajustado à mão.

A JEP 122, criada em 2010, removeu a permanent generation. A motivação oficial é a convergência entre HotSpot e JRockit: o JRockit não tinha permanent generation, e seus usuários não estavam acostumados a configurá-la. O efeito prático foi acabar com a necessidade de ajustar esse tamanho.

Além dos metadados, a JEP descreve a permanent generation guardando strings internadas (o pool de `String` que reúne literais e resultados de [`String.intern()`](https://docs.oracle.com/javase/8/docs/api/java/lang/String.html#intern--)) e variáveis estáticas de classe. Parte dessa mudança chegou antes do Java 8: segundo as [notas de release do JDK 7](https://www.oracle.com/java/technologies/javase/jdk7-relnotes.html), as strings internadas já tinham saído da permanent generation no JDK 7 e passado para as gerações young e old do heap. O diagrama compara os dois arranjos:

![Comparação: no Java 7 o PermGen, de tamanho fixo, guarda metadados de classe e estáticos, e as strings internadas já estão no heap; no Java 8 os metadados vão para o Metaspace em memória nativa e os estáticos vão para o heap](/posts/java-8/permgen-vs-metaspace.svg)

A JEP 122 moveu o conteúdo para dois lugares:

- **Metadados de classe → memória nativa (Metaspace).** O [guia de GC tuning do JDK 8](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/considerations.html) explica que o espaço é pedido ao sistema operacional e dividido em *chunks*, cada um ligado a um class loader. Quando as classes de um loader são descarregadas, os chunks são reaproveitados ou devolvidos ao SO. **Por padrão não há limite**, e `-XX:MaxMetaspaceSize` define um teto. Ao atingir um *high-water mark* (valor inicial dado por `-XX:MetaspaceSize`), a JVM dispara um GC para tentar descarregar classes.
- **Strings internadas e estáticos de classe → heap Java.** A JEP avisa que isso pode aumentar o número de GCs ou causar `OutOfMemoryError` no heap, e que pode ser preciso ajustar `-Xmx`. Quem vem do JDK 7 já tem as strings internadas no heap; a novidade do Java 8 são os estáticos.

```bash title="Flags antigas no JDK 8"
$ java -XX:PermSize=32m -XX:MaxPermSize=128m -version
OpenJDK 64-Bit Server VM warning: ignoring option PermSize=32m; support was removed in 8.0
OpenJDK 64-Bit Server VM warning: ignoring option MaxPermSize=128m; support was removed in 8.0

# Equivalente no JDK 8: teto explícito para metadados de classe
$ java -XX:MaxMetaspaceSize=256m -jar app.jar
```

Esgotar o Metaspace continua gerando erro, agora `java.lang.OutOfMemoryError: Metaspace`, conforme o [guia de troubleshooting do Java 8](https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/memleaks002.html). Como o padrão é não ter limite, um vazamento de class loader passa a consumir memória nativa do processo em vez de esbarrar num PermGen de tamanho fixo. Definir `MaxMetaspaceSize` e monitorar o uso ocupa o lugar do antigo ajuste de `MaxPermSize`.

### Combinações de GC depreciadas

**Chegou em:** Java 8 ([JEP 173](https://openjdk.org/jeps/173))

Para reduzir o custo de manutenção e de testes, a JEP 173 depreciou três combinações de coletores pouco usadas, que passaram a emitir aviso ao iniciar a JVM:

| Flags | Combinação | Sugestão da JEP |
|---|---|---|
| `-XX:+UseConcMarkSweepGC -XX:-UseParNewGC` | DefNew + CMS | ParNew + CMS |
| `-XX:+UseParNewGC` (sem CMS) | ParNew + SerialOld | ParallelScavenge + SerialOld |
| `-Xincgc` ou `-XX:+CMSIncrementalMode` | CMS incremental (iCMS) | CMS "normal" |

As três foram removidas no JDK 9 pela [JEP 214](https://openjdk.org/jeps/214), e o [artigo sobre o Java 11](/posts/java-11/#ferramentas-opções-e-apis-removidas) lista essa remoção. Quem ainda usa alguma delas no Java 8 precisa trocar antes de migrar para o 9 ou superior.

### Outras mudanças na JVM

- **Compact Profiles** ([JEP 161](https://openjdk.org/jeps/161)): três subconjuntos da plataforma (`compact1`, `compact2`, `compact3`), em camadas, para rodar aplicações em dispositivos com poucos recursos sem o Java SE inteiro. A JEP já levava em conta uma transição futura para um sistema de módulos, que chegou no Java 9 como JPMS (Java Platform Module System) e está no [artigo sobre o Java 11](/posts/java-11/#módulos-e-module-infojava).
- **Intrinsics de AES** ([JEP 164](https://openjdk.org/jeps/164)): o compilador do HotSpot usa as instruções AES dos processadores x86 quando disponíveis. A [página What's New](https://www.oracle.com/java/technologies/javase/8-whats-new.html) cita as flags `-XX:+UseAES -XX:+UseAESIntrinsics`.
- **Menos contenção de cache em campos** ([JEP 142](https://openjdk.org/jeps/142)): quando dois núcleos usam posições de memória que caem na mesma linha de cache do processador e pelo menos um deles escreve, os dois disputam essa linha e o desempenho cai (o problema costuma ser chamado de *false sharing*). A JEP criou um mecanismo para a JVM separar, com espaço de preenchimento, campos marcados como muito disputados.
- **Mensagens de verificação de bytecode mais detalhadas** ([JEP 136](https://openjdk.org/jeps/136)) e **representação de method handles com lambda forms** ([JEP 160](https://openjdk.org/jeps/160)), que trocou caminhos em assembly por uma representação intermediária otimizável e passou mais trabalho para código Java portável.

## Ferramentas

### jdeps: análise de dependências

**Chegou em:** Java 8 ([JEP 162](https://openjdk.org/jeps/162))

A JEP 162 ("Prepare for Modularization") previa uma ferramenta de linha de comando para mostrar as dependências estáticas de uma aplicação, principalmente o uso de APIs internas do JDK. Ela saiu como [`jdeps`](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/jdeps.html), que mostra dependências por pacote ou por classe de arquivos `.class`, diretórios e JARs. A opção `-jdkinternals` é a mais útil para preparar uma migração: ela lista o que depende de APIs internas que podem sumir. No Java 9, a maioria dessas APIs foi encapsulada pela [JEP 260](https://openjdk.org/jeps/260) (ver [Encapsulamento das APIs internas do JDK](/posts/java-11/#encapsulamento-das-apis-internas-do-jdk) no artigo sobre o Java 11). A saída abaixo analisa uma classe que usa `sun.misc.BASE64Encoder`; a ferramenta aponta a dependência e sugere o substituto:

```bash title="Saída do jdeps no JDK 8 (resumida)"
$ jdeps -jdkinternals UsaInterna.class
UsaInterna.class -> /opt/java/openjdk/jre/lib/rt.jar
   UsaInterna (UsaInterna.class)
      -> sun.misc.BASE64Encoder                             JDK internal API (rt.jar)

JDK Internal API                         Suggested Replacement
----------------                         ---------------------
sun.misc.BASE64Encoder                   Use java.util.Base64 @since 1.8
```

### Nashorn e jjs

**Chegou em:** Java 8 ([JEP 174](https://openjdk.org/jeps/174))

O Nashorn substituiu o Rhino como motor JavaScript do JDK. Pela JEP 174, ele implementa ECMAScript 5.1, gera bytecode JVM, usa `invokedynamic` em todas as invocações e fica disponível pela API `javax.script` (JSR 223) e pela ferramenta de linha de comando [`jjs`](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/jjs.html). O [Compatibility Guide](https://www.oracle.com/java/technologies/javase/8-compatibility-guide.html) registra a troca do Rhino pelo Nashorn.

```java title="ScriptNashorn.java"
// No JDK 7 o motor padrão era o Rhino; no JDK 8 é o Nashorn
ScriptEngine js = new ScriptEngineManager().getEngineByName("nashorn");
js.put("taxa", 0.1);
Object resultado = js.eval("var valor = 250; valor * (1 + taxa);");
System.out.println(resultado); // 275.0
```

Antes de adotar o Nashorn, é bom saber o fim da história: ele foi depreciado para remoção no Java 11 ([JEP 335](https://openjdk.org/jeps/335)) e removido no Java 15 ([JEP 372](https://openjdk.org/jeps/372)), junto com o `jjs`. Quem depende dele no Java 8 vai precisar de outro motor numa LTS mais nova; o [artigo sobre o Java 11](/posts/java-11/#nashorn-pack200-cms-e-applet-api) resume essa saída.

### Outras mudanças em javac, javadoc e java

Pela [página What's New in JDK 8](https://www.oracle.com/java/technologies/javase/8-whats-new.html):

- `javac -parameters` grava os nomes dos parâmetros no `.class` (ver JEP 118, acima).
- `javac -h <dir>` gera os headers de métodos nativos. Com isso não é mais preciso rodar o `javah` como passo separado do build.
- **DocLint** ([JEP 172](https://openjdk.org/jeps/172)): verifica comentários Javadoc (HTML inválido, problemas de acessibilidade). Fica ligado por padrão no `javadoc` e opcional no `javac` via `-Xdoclint`.
- **DocTree API** ([JEP 105](https://openjdk.org/jeps/105)) para percorrer comentários Javadoc como árvores sintáticas.
- O comando `java` passou a iniciar aplicações JavaFX diretamente ([JEP 153](https://openjdk.org/jeps/153)).

## Segurança

A [página de melhorias de segurança do JDK 8](https://docs.oracle.com/javase/8/docs/technotes/guides/security/enhancements-8.html) e as JEPs listam as mudanças principais:

- **TLS 1.1 e 1.2 habilitados por padrão no cliente** do provedor SunJSSE, configuráveis pela nova propriedade `jdk.tls.client.protocols`.
- **SNI no servidor** ([JEP 114](https://openjdk.org/jeps/114)): segundo a JEP, sem a extensão *Server Name Indication* um servidor HTTPS não consegue atender, em hospedagem virtual, vários domínios que compartilham o mesmo endereço IP. O JDK 7 já a habilitava no cliente, e o JDK 8 passou a suportá-la em aplicações servidoras.
- **Cipher suites AEAD** ([JEP 115](https://openjdk.org/jeps/115)): suporte a criptografia autenticada (*Authenticated Encryption with Associated Data*), com `AES/GCM/NoPadding` no SunJCE e suítes AEAD no SunJSSE.
- **Algoritmos PBE mais fortes** ([JEP 121](https://openjdk.org/jeps/121)), de criptografia baseada em senha (*password-based encryption*), como `PBEWithSHA256AndAES_128`, **SHA-224** ([JEP 130](https://openjdk.org/jeps/130)) e suporte ampliado à NSA Suite B ([JEP 129](https://openjdk.org/jeps/129)).
- **Geração de números aleatórios configurável** ([JEP 123](https://openjdk.org/jeps/123)): a JEP cita aplicações travando em `SecureRandom` no Linux por falta de entropia em `/dev/random`. O Java 8 adicionou [`SecureRandom.getInstanceStrong()`](https://docs.oracle.com/javase/8/docs/api/java/security/SecureRandom.html#getInstanceStrong--), que usa os algoritmos da propriedade `securerandom.strongAlgorithms`.
- **Verificação de revogação de certificados** com a nova classe `PKIXRevocationChecker` ([JEP 124](https://openjdk.org/jeps/124)) e **reforma dos keystores** JKS/JCEKS/PKCS12 ([JEP 166](https://openjdk.org/jeps/166)).
- **`doPrivileged` limitado** ([JEP 140](https://openjdk.org/jeps/140)), **`URLPermission`** para permissões de rede por URL em vez de IP ([JEP 184](https://openjdk.org/jeps/184)) e **propriedades JAXP** para restringir os protocolos usados ao buscar DTDs, schemas e stylesheets externos ([JEP 185](https://openjdk.org/jeps/185)).

## Removidos e depreciados

O [Compatibility Guide for JDK 8](https://www.oracle.com/java/technologies/javase/8-compatibility-guide.html) separa o que saiu da especificação Java SE do que saiu do JDK:

| O que | Situação no Java 8 | O que usar |
|---|---|---|
| Ferramenta `apt` e pacote `com.sun.mirror` ([JEP 117](https://openjdk.org/jeps/117)) | Removidos | Processamento de anotações da JSR 269 (`javac`, `javax.annotation.processing`) |
| Ponte JDBC-ODBC (`sun.jdbc.odbc`) | Removida | Driver JDBC do fornecedor do banco |
| Flags `PermSize`/`MaxPermSize` | Ignoradas com aviso | `MetaspaceSize`/`MaxMetaspaceSize` |
| `Thread.stop(Throwable)` (depreciado desde o 1.2) | Lança `UnsupportedOperationException` | — |
| Rhino (motor JavaScript) | Substituído | Nashorn |
| Java para Solaris 32 bits, Java Quick Starter, ponte Active-X, Java Plug-in clássico | Removidos | — |
| Combinações de GC da JEP 173 | Depreciadas | Ver tabela em "JVM, GC e desempenho" |
| `SecurityManager.checkMemberAccess`, `checkTopLevelWindow` e similares | Depreciados | `checkPermission` |
| `addPropertyChangeListener`/`removePropertyChangeListener` em `LogManager` e `Pack200` ([JEP 162](https://openjdk.org/jeps/162)) | Depreciados (obstáculos à modularização) | No `Pack200`, consultar a propriedade `PROGRESS` |
| Mecanismos *endorsed standards* e *extension* (a partir do 8u40) | Depreciados | Preparação para módulos (JEP 200 e 220) |

## Recursos em preview ou incubadora nesta LTS

Nenhum. Recursos em *preview* e módulos de *incubadora* são formas de entregar algo ainda provisório, para coletar feedback antes de torná-lo permanente ou removê-lo. O Java 8 é anterior aos dois mecanismos: os módulos de incubadora foram definidos pela [JEP 11](https://openjdk.org/jeps/11), criada em 2016, e os recursos em preview pela [JEP 12](https://openjdk.org/jeps/12), introduzida em 2018, por volta do JDK 12. Nenhuma das 55 JEPs do Java 8 foi entregue em caráter provisório. O HTTP Client, que passou por incubadora no Java 9 e no 10, é um exemplo e está no [artigo sobre o Java 11](/posts/java-11/#http-client).

## O que observar na migração a partir do Java 7

Segundo o [Compatibility Guide](https://www.oracle.com/java/technologies/javase/8-compatibility-guide.html), o Java SE 8 é fortemente compatível com as versões anteriores e quase todos os programas rodam sem alteração. Os pontos a verificar ficam nos casos de canto listados ali:

1. **Formato de classe 52.0.** Cada versão do Java grava no `.class` um número de versão, e o do Java 8 é 52.0. Classes compiladas pelo Java 8 não rodam em JVMs anteriores. Classes compiladas para o Java 7 rodam no 8. Em migração gradual, compile com `-source`/`-target` compatíveis com o runtime mais antigo que ainda existe no ambiente.

2. **Sobrecarga escolhida pode mudar.** Com a inferência pelo tipo-alvo, métodos que antes não eram aplicáveis passam a ser, e o compilador pode escolher outra sobrecarga sem nenhum aviso. O exemplo abaixo é adaptado do guia. No Temurin 1.8.0_502, compilado com `-source 1.7`, ele imprime `m(Object)` nas duas linhas. Com o padrão do JDK 8, a primeira linha passa a imprimir `m(String[])`, a sobrecarga mais específica:

   ```java title="Sobrecarga.java"
   static void m(Object o)   { System.out.println("m(Object)"); }
   static void m(String[] o) { System.out.println("m(String[])"); }

   static <Z> Z g() { return null; }

   public static void main(String[] args) {
       m(g());          // Java 7: m(Object) — Java 8: m(String[])
       m((Object) g()); // força o comportamento antigo nos dois
   }
   ```

3. **Mudanças de inferência que quebram compilação.** Código que passa *raw types* (tipos genéricos usados sem argumento de tipo, como `List` no lugar de `List<String>`) a métodos genéricos e compilava no JDK 7 pode falhar no JDK 8 com `incompatible types`. Além disso, o `javac` passou a aplicar corretamente a JLS §15.21 e rejeita algumas comparações entre `Object` e primitivo que antes aceitava.

4. **Interfaces precisam estar no classpath de compilação.** Ao compilar contra uma classe que implementa uma interface definida em outro `.class`, o arquivo da interface agora precisa estar disponível para o `javac`.

5. **Ordem de iteração do `HashMap`.** A JEP 180 e o [guia de coleções](https://docs.oracle.com/javase/8/docs/technotes/guides/collections/changes8.html) avisam que a ordem de iteração de `HashMap` e `HashSet` pode mudar. Ela nunca foi especificada, e código ou testes que dependem dela precisam ser corrigidos.

6. **Memória.** Troque `MaxPermSize` por `MaxMetaspaceSize` onde fizer sentido e reveja `-Xmx`, porque os estáticos de classe agora ocupam o heap, onde as strings internadas já estavam desde o JDK 7 (JEP 122). A mesma JEP avisa que ferramentas que conheciam a permanent generation, como jconsole e VisualVM, precisaram ser adaptadas. Painéis e alertas que olhavam o PermGen devem passar a olhar o Metaspace.

7. **Comportamentos de biblioteca que mudaram** (todos no guia):
   - `BigDecimal.stripTrailingZeros()` sobre um valor igual a zero devolve `BigDecimal.ZERO`.
   - `NumberFormat`/`DecimalFormat` corrigiram o arredondamento perto de empates: `format(0.8055d)` com *half-even* passa de `0.806` para `0.805`.
   - `Collection.removeAll(null)` e `retainAll(null)` lançam `NullPointerException` de forma consistente, mesmo com a coleção vazia.
   - Proxies dinâmicos de interfaces não públicas passam a ser classes não públicas, e o construtor `Proxy(InvocationHandler)` rejeita `null`.
   - A partir do 8u20, `Class.getMethod` e `Class.getMethods` filtram os métodos de superinterfaces sobrescritos por um default method.
   - Interfaces de MBean e MXBean precisam ser públicas.

8. **Rede e segurança.** Os valores de autenticação *Digest* do `HttpURLConnection` deixaram de vir entre aspas, conforme a RFC 2617, e alguns servidores podem estranhar. Com `SecurityManager`, fazer bind de sockets fora da faixa efêmera exige permissão explícita. Certificados com chaves RSA menores que 1024 bits são bloqueados.

9. **Build e Javadoc.** Com o DocLint ativo por padrão no `javadoc` ([What's New in JDK 8](https://www.oracle.com/java/technologies/javase/8-whats-new.html), JEP 172), comentários com HTML inválido ou problemas de acessibilidade passam a ser apontados na geração da documentação.

10. **APIs internas.** Rode `jdeps -jdkinternals` no Java 8. O que depende de `sun.*` e de outras APIs internas não tem garantia de compatibilidade, e o Java 9 encapsulou a maioria delas ([JEP 260](https://openjdk.org/jeps/260)).

O próximo salto, do Java 8 para o 11, traz mais rupturas: sistema de módulos, encapsulamento das APIs internas e remoção dos módulos Java EE. Esses pontos estão em [O que observar na migração a partir do Java 8](/posts/java-11/#o-que-observar-na-migração-a-partir-do-java-8), no artigo sobre o Java 11.

## Todas as JEPs

Lista conferida na [página oficial de features do JDK 8](https://openjdk.org/projects/jdk8/features) no OpenJDK; os títulos seguem as páginas das JEPs, e todas estão com status *Closed / Delivered* e release 8. Na página do release, a JEP 104 aparece como "Annotations on Java Types" e a JEP 128 como "BCP 47 Locale Matching". Áreas: **Linguagem**, **Bibliotecas**, **JVM**, **Ferramentas**, **Segurança**, **Internacionalização**, **Plataforma** (perfis compactos, preparação para módulos e política de APIs do JDK) e **Interno** (build do próprio OpenJDK, sem efeito para quem usa o JDK).

### Java 8

<details>
<summary>Ver as 55 JEPs do Java 8</summary>

| JEP | Título | Área |
|---|---|---|
| [101](https://openjdk.org/jeps/101) | Generalized Target-Type Inference | Linguagem |
| [103](https://openjdk.org/jeps/103) | Parallel Array Sorting | Bibliotecas |
| [104](https://openjdk.org/jeps/104) | Type Annotations | Linguagem |
| [105](https://openjdk.org/jeps/105) | DocTree API | Ferramentas |
| [106](https://openjdk.org/jeps/106) | Add Javadoc to javax.tools | Ferramentas |
| [107](https://openjdk.org/jeps/107) | Bulk Data Operations for Collections | Bibliotecas |
| [109](https://openjdk.org/jeps/109) | Enhance Core Libraries with Lambda | Bibliotecas |
| [112](https://openjdk.org/jeps/112) | Charset Implementation Improvements | Bibliotecas |
| [113](https://openjdk.org/jeps/113) | MS-SFU Kerberos 5 Extensions | Segurança |
| [114](https://openjdk.org/jeps/114) | TLS Server Name Indication (SNI) Extension | Segurança |
| [115](https://openjdk.org/jeps/115) | AEAD CipherSuites | Segurança |
| [117](https://openjdk.org/jeps/117) | Remove the Annotation-Processing Tool (apt) | Ferramentas |
| [118](https://openjdk.org/jeps/118) | Access to Parameter Names at Runtime | Linguagem |
| [119](https://openjdk.org/jeps/119) | javax.lang.model Implementation Backed by Core Reflection | Bibliotecas |
| [120](https://openjdk.org/jeps/120) | Repeating Annotations | Linguagem |
| [121](https://openjdk.org/jeps/121) | Stronger Algorithms for Password-Based Encryption | Segurança |
| [122](https://openjdk.org/jeps/122) | Remove the Permanent Generation | JVM |
| [123](https://openjdk.org/jeps/123) | Configurable Secure Random-Number Generation | Segurança |
| [124](https://openjdk.org/jeps/124) | Enhance the Certificate Revocation-Checking API | Segurança |
| [126](https://openjdk.org/jeps/126) | Lambda Expressions & Virtual Extension Methods | Linguagem |
| [127](https://openjdk.org/jeps/127) | Improve Locale Data Packaging and Adopt Unicode CLDR Data | Internacionalização |
| [128](https://openjdk.org/jeps/128) | Unicode BCP 47 Locale Matching | Internacionalização |
| [129](https://openjdk.org/jeps/129) | NSA Suite B Cryptographic Algorithms | Segurança |
| [130](https://openjdk.org/jeps/130) | SHA-224 Message Digests | Segurança |
| [131](https://openjdk.org/jeps/131) | PKCS#11 Crypto Provider for 64-bit Windows | Segurança |
| [133](https://openjdk.org/jeps/133) | Unicode 6.2 | Internacionalização |
| [135](https://openjdk.org/jeps/135) | Base64 Encoding & Decoding | Bibliotecas |
| [136](https://openjdk.org/jeps/136) | Enhanced Verification Errors | JVM |
| [138](https://openjdk.org/jeps/138) | Autoconf-Based Build System | Interno |
| [139](https://openjdk.org/jeps/139) | Enhance javac to Improve Build Speed | Interno |
| [140](https://openjdk.org/jeps/140) | Limited doPrivileged | Segurança |
| [142](https://openjdk.org/jeps/142) | Reduce Cache Contention on Specified Fields | JVM |
| [147](https://openjdk.org/jeps/147) | Reduce Class Metadata Footprint | JVM |
| [148](https://openjdk.org/jeps/148) | Small VM | JVM |
| [149](https://openjdk.org/jeps/149) | Reduce Core-Library Memory Usage | Bibliotecas |
| [150](https://openjdk.org/jeps/150) | Date & Time API | Bibliotecas |
| [153](https://openjdk.org/jeps/153) | Launch JavaFX Applications | Ferramentas |
| [155](https://openjdk.org/jeps/155) | Concurrency Updates | Bibliotecas |
| [160](https://openjdk.org/jeps/160) | Lambda-Form Representation for Method Handles | JVM |
| [161](https://openjdk.org/jeps/161) | Compact Profiles | Plataforma |
| [162](https://openjdk.org/jeps/162) | Prepare for Modularization | Plataforma |
| [164](https://openjdk.org/jeps/164) | Leverage CPU Instructions for AES Cryptography | JVM |
| [166](https://openjdk.org/jeps/166) | Overhaul JKS-JCEKS-PKCS12 Keystores | Segurança |
| [170](https://openjdk.org/jeps/170) | JDBC 4.2 | Bibliotecas |
| [171](https://openjdk.org/jeps/171) | Fence Intrinsics | JVM |
| [172](https://openjdk.org/jeps/172) | DocLint | Ferramentas |
| [173](https://openjdk.org/jeps/173) | Retire Some Rarely-Used GC Combinations | JVM |
| [174](https://openjdk.org/jeps/174) | Nashorn JavaScript Engine | Ferramentas |
| [176](https://openjdk.org/jeps/176) | Mechanical Checking of Caller-Sensitive Methods | Segurança |
| [177](https://openjdk.org/jeps/177) | Optimize java.text.DecimalFormat.format | Bibliotecas |
| [178](https://openjdk.org/jeps/178) | Statically-Linked JNI Libraries | Bibliotecas |
| [179](https://openjdk.org/jeps/179) | Document JDK API Support and Stability | Plataforma |
| [180](https://openjdk.org/jeps/180) | Handle Frequent HashMap Collisions with Balanced Trees | Bibliotecas |
| [184](https://openjdk.org/jeps/184) | HTTP URL Permissions | Segurança |
| [185](https://openjdk.org/jeps/185) | Restrict Fetching of External XML Resources | Segurança |

</details>

## Fontes

**Projeto JDK 8 e JEPs**

- [JDK 8 — Features (lista oficial de JEPs)](https://openjdk.org/projects/jdk8/features)
- [JDK 8 — Milestones (data de GA)](https://openjdk.org/projects/jdk8/milestones)
- JEPs do JDK 8: [101](https://openjdk.org/jeps/101), [103](https://openjdk.org/jeps/103), [104](https://openjdk.org/jeps/104), [105](https://openjdk.org/jeps/105), [107](https://openjdk.org/jeps/107), [109](https://openjdk.org/jeps/109), [114](https://openjdk.org/jeps/114), [115](https://openjdk.org/jeps/115), [117](https://openjdk.org/jeps/117), [118](https://openjdk.org/jeps/118), [120](https://openjdk.org/jeps/120), [121](https://openjdk.org/jeps/121), [122](https://openjdk.org/jeps/122), [123](https://openjdk.org/jeps/123), [124](https://openjdk.org/jeps/124), [126](https://openjdk.org/jeps/126), [129](https://openjdk.org/jeps/129), [130](https://openjdk.org/jeps/130), [135](https://openjdk.org/jeps/135), [136](https://openjdk.org/jeps/136), [140](https://openjdk.org/jeps/140), [142](https://openjdk.org/jeps/142), [150](https://openjdk.org/jeps/150), [153](https://openjdk.org/jeps/153), [155](https://openjdk.org/jeps/155), [160](https://openjdk.org/jeps/160), [161](https://openjdk.org/jeps/161), [162](https://openjdk.org/jeps/162), [164](https://openjdk.org/jeps/164), [166](https://openjdk.org/jeps/166), [170](https://openjdk.org/jeps/170), [172](https://openjdk.org/jeps/172), [173](https://openjdk.org/jeps/173), [174](https://openjdk.org/jeps/174), [180](https://openjdk.org/jeps/180), [184](https://openjdk.org/jeps/184), [185](https://openjdk.org/jeps/185) (as demais estão na tabela acima)
- Processo: [JEP 11 — Incubator Modules](https://openjdk.org/jeps/11), [JEP 12 — Preview Features](https://openjdk.org/jeps/12)
- JEPs posteriores citadas: [JEP 214 — Remove GC Combinations Deprecated in JDK 8](https://openjdk.org/jeps/214), [JEP 260 — Encapsulate Most Internal APIs](https://openjdk.org/jeps/260), [JEP 320 — Remove the Java EE and CORBA Modules](https://openjdk.org/jeps/320), [JEP 322 — Time-Based Release Versioning](https://openjdk.org/jeps/322), [JEP 335 — Deprecate the Nashorn JavaScript Engine for Removal](https://openjdk.org/jeps/335), [JEP 372 — Remove the Nashorn JavaScript Engine](https://openjdk.org/jeps/372)

**Oracle: visão geral, compatibilidade e suporte**

- [What's New in JDK 8](https://www.oracle.com/java/technologies/javase/8-whats-new.html)
- [Compatibility Guide for JDK 8](https://www.oracle.com/java/technologies/javase/8-compatibility-guide.html)
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
- [Mark Reinhold — Moving Java Forward Faster (2017)](https://mreinhold.org/blog/forward-faster)
- [JDK 7 Release Notes — Features and Enhancements](https://www.oracle.com/java/technologies/javase/jdk7-relnotes.html)

**Guias técnicos do JDK 8**

- [Java Programming Language Enhancements](https://docs.oracle.com/javase/8/docs/technotes/guides/language/enhancements.html)
- [New and Enhanced APIs That Take Advantage of Lambda Expressions and Streams in Java SE 8](https://docs.oracle.com/javase/8/docs/technotes/guides/language/lambda_api_jdk8.html)
- [Enhancements in java.lang.* and java.util.*](https://docs.oracle.com/javase/8/docs/technotes/guides/lang/enhancements.html)
- [Collections Framework Enhancements in Java SE 8](https://docs.oracle.com/javase/8/docs/technotes/guides/collections/changes8.html)
- [Concurrency Utilities Enhancements in Java SE 8](https://docs.oracle.com/javase/8/docs/technotes/guides/concurrency/changes8.html)
- [JDK 8 Security Enhancements](https://docs.oracle.com/javase/8/docs/technotes/guides/security/enhancements-8.html)
- [HotSpot VM GC Tuning Guide — Other Considerations (Class Metadata)](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/considerations.html)
- [Troubleshooting Guide (Java 8) — OutOfMemoryError: Metaspace](https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/memleaks002.html)
- [Troubleshooting Guide (Java 7) — OutOfMemoryError: PermGen space](https://docs.oracle.com/javase/7/docs/webnotes/tsg/TSG-VM/html/memleaks.html)
- [Ferramenta jdeps (JDK 8)](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/jdeps.html)
- [Ferramenta jjs (JDK 8)](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/jjs.html)

**Especificação, Javadoc e tutoriais**

- [JLS 8, §8.4.8.4 — Inheriting Methods with Override-Equivalent Signatures](https://docs.oracle.com/javase/specs/jls/se8/html/jls-8.html#jls-8.4.8.4)
- [JLS 8, §15.27.2 — Lambda Body](https://docs.oracle.com/javase/specs/jls/se8/html/jls-15.html#jls-15.27.2)
- Javadoc Java 8: [java.util.stream](https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html), [java.util.function](https://docs.oracle.com/javase/8/docs/api/java/util/function/package-summary.html), [FunctionalInterface](https://docs.oracle.com/javase/8/docs/api/java/lang/FunctionalInterface.html), [LambdaMetafactory](https://docs.oracle.com/javase/8/docs/api/java/lang/invoke/LambdaMetafactory.html), [Optional](https://docs.oracle.com/javase/8/docs/api/java/util/Optional.html), [CompletableFuture](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/CompletableFuture.html), [ElementType](https://docs.oracle.com/javase/8/docs/api/java/lang/annotation/ElementType.html), [Base64](https://docs.oracle.com/javase/8/docs/api/java/util/Base64.html), [PreparedStatement](https://docs.oracle.com/javase/8/docs/api/java/sql/PreparedStatement.html), [java.time](https://docs.oracle.com/javase/8/docs/api/java/time/package-summary.html), [SimpleDateFormat](https://docs.oracle.com/javase/8/docs/api/java/text/SimpleDateFormat.html), [ConcurrentHashMap](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ConcurrentHashMap.html), [Math.addExact](https://docs.oracle.com/javase/8/docs/api/java/lang/Math.html#addExact-int-int-), [SecureRandom.getInstanceStrong](https://docs.oracle.com/javase/8/docs/api/java/security/SecureRandom.html#getInstanceStrong--)
- Java Tutorials: [Method References](https://docs.oracle.com/javase/tutorial/java/javaOO/methodreferences.html), [Overriding and Hiding Methods](https://docs.oracle.com/javase/tutorial/java/IandI/override.html), [Type Annotations](https://docs.oracle.com/javase/tutorial/java/annotations/type_annotations.html), [Repeating Annotations](https://docs.oracle.com/javase/tutorial/java/annotations/repeating.html)
