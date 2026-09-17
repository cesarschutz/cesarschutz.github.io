---
title: "Java 25 (LTS) — arquivos-fonte compactos, Scoped Values, cache AOT e criptografia pós-quântica"
published: 2025-07-02T02:50:00Z
updated: 2026-09-16
description: "Do Java 22 ao 25, para quem vem do Java 21: arquivos compactos, `import module`, construtores flexíveis, Scoped Values, cache AOT, headers compactos, criptografia pós-quântica e as 66 JEPs."
tags: [LTS, Linguagem, JVM, Criptografia]
series: java
draft: false
---

O Java 25 chegou à disponibilidade geral (GA, a versão final para produção) em **16 de setembro de 2025** e é uma release de suporte de longo prazo (LTS) na maioria dos fornecedores ([página do JDK 25](https://openjdk.org/projects/jdk/25/)). Para o Java 25, a Oracle informa Premier Support até setembro de 2030 e Extended Support até setembro de 2033; a próxima LTS planejada é o Java 29, em setembro de 2027 ([Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)). Outros fornecedores de builds do OpenJDK publicam seus próprios prazos.

Este artigo é para quem está no **Java 21**, a LTS anterior, e quer saber o que muda ao subir para o 25. Ele cobre tudo o que foi integrado nas releases **22, 23, 24 e 25**: 66 JEPs no total (12 + 12 + 24 + 18). Uma JEP (JDK Enhancement Proposal) é a proposta formal de mudança do OpenJDK; cada recurso deste artigo aponta a sua. Quem ainda está no Java 17 deve ler antes o [post do Java 21](/posts/java-21/). O que veio depois do 25 está no [post do Java 29](/posts/java-29/), e a visão geral de ciclo de releases e estratégia de migração está no [guia de atualizações do Java](/posts/guia-atualizacoes-java/).

**Como o artigo está organizado.** Primeiro vem uma linha do tempo com a trajetória dos principais recursos. Depois, os recursos finais, agrupados por tema: linguagem, concorrência, APIs, JVM, ferramentas, segurança e remoções. Cada recurso começa com a linha **Chegou em**, que mostra as versões e JEPs por onde ele passou, e segue com o problema que resolve, o que mudou, um exemplo e os cuidados. No fim estão os recursos que continuam em preview, o que observar na migração e a tabela com todas as JEPs.

Três termos aparecem o tempo todo:

- **Preview**: recurso de linguagem ou API completo, mas ainda sujeito a mudanças ou até a remoção ([JEP 12](https://openjdk.org/jeps/12)). Só funciona com `--enable-preview` na compilação e na execução.
- **Incubadora**: API ainda em fase inicial, publicada em um módulo `jdk.incubator.*`, que precisa ser adicionado com `--add-modules`.
- **Experimental**: recurso da JVM ainda em avaliação. Em geral exige `-XX:+UnlockExperimentalVMOptions` além da flag do próprio recurso; os eventos experimentais do JFR são exceção e basta ativá-los na gravação.

Todos os exemplos de código Java deste artigo foram compilados e executados no Temurin 25.0.4, com as flags indicadas em cada caso.

## Linha do tempo

![Linha do tempo do Java 21 ao Java 25 mostrando, por recurso, em quais versões ele foi preview, experimental, final, depreciado ou removido](/posts/java-25/linha-do-tempo.svg)

Cada linha do diagrama é um recurso, e cada pílula mostra a situação dele naquela versão: laranja para preview, azul para experimental, verde para final, cinza para depreciado e vermelho para removido. O padrão que se repete é claro: boa parte do que era preview no Java 21 amadureceu ao longo de três ou quatro releases e ficou final no 25. As datas de cada release vêm das páginas oficiais: Java 22 em 19/03/2024 ([JDK 22](https://openjdk.org/projects/jdk/22/)), Java 23 em 17/09/2024 ([JDK 23](https://openjdk.org/projects/jdk/23/)), Java 24 em 18/03/2025 ([JDK 24](https://openjdk.org/projects/jdk/24/)) e Java 25 em 16/09/2025 ([JDK 25](https://openjdk.org/projects/jdk/25/)).

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

Um programa pequeno em Java sempre exigiu construções pensadas para sistemas grandes: classe, `public`, `static`, `String[] args` e `System.out.println`. A [JEP 512](https://openjdk.org/jeps/512) reduz essa cerimônia sem criar um dialeto separado da linguagem. São quatro mudanças:

1. **Métodos `main` de instância.** O `main` pode deixar de ser `public` e `static` e pode não receber parâmetros. O launcher (o comando `java`) prefere um `main(String[])`; se não houver, usa um `main()` sem parâmetros. Se o método escolhido não for estático, o launcher instancia a classe pelo construtor sem argumentos e chama o método.
2. **Arquivos-fonte compactos.** Se um arquivo tem campos e métodos fora de qualquer classe, o compilador declara uma classe implícita: `final`, no pacote sem nome, com esses campos e métodos como membros. Essa classe não tem nome utilizável no código e precisa ter um `main` executável.
3. **Classe `java.lang.IO`.** Traz `print`, `println` e `readln` para entrada e saída no console. Por estar em `java.lang`, está disponível em qualquer programa, não só em arquivos compactos.
4. **Import automático de `java.base`.** Todo arquivo compacto se comporta como se começasse com `import module java.base;`, a declaração explicada na [próxima seção](#import-de-módulos). Por isso `List`, `Map` e as demais classes básicas ficam disponíveis sem nenhum import.

A versão final mudou um detalhe em relação às previews: os métodos de `IO` **não** são mais importados estaticamente de forma implícita. É preciso escrever `IO.println(...)`. A classe também saiu de `java.io` e foi para `java.lang` ([JEP 512, seção History](https://openjdk.org/jeps/512)). Exemplos antigos com `println("...")` solto, como os da primeira preview mostrada no [post do Java 21](/posts/java-21/#classes-sem-nome-e-métodos-main-de-instância), não compilam no Java 25.

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

Execute com `java Tamanhos.java`. Saída:

```text
Java: 4
Kotlin: 6
Scala: 5
Olá do Java 25
```

Quando o programa crescer, basta envolver os membros em `class Tamanhos { ... }` e adicionar `import module java.base;` para ter uma classe comum; o `main` continua igual. O recurso não serve só para quem está aprendendo: scripts, utilitários de linha de comando e protótipos também ficam mais curtos. Em código de produção organizado em pacotes, classes declaradas continuam sendo o caminho, porque a classe implícita fica no pacote sem nome e não pode ser referenciada por outras classes.

### Import de módulos

**Chegou em:** Java 23 (preview, [JEP 476](https://openjdk.org/jeps/476)) → Java 24 (2ª preview, [JEP 494](https://openjdk.org/jeps/494)) → Java 25 (final, [JEP 511](https://openjdk.org/jeps/511))

Um arquivo que usa coleções, streams, datas e I/O costuma começar com uma dúzia de imports de pacotes diferentes. Desde o Java 9, porém, o JDK é organizado em **módulos** (o sistema de módulos da plataforma, JPMS, explicado no [post do Java 11](/posts/java-11/#sistema-de-módulos-jpms)): cada módulo agrupa pacotes e declara quais exporta e de quais outros módulos depende. A [JEP 511](https://openjdk.org/jeps/511) aproveita essa organização para importar tudo de uma vez.

A declaração `import module M;` importa sob demanda todas as classes e interfaces públicas de nível superior dos pacotes que o módulo `M` exporta. Também entram os pacotes exportados pelos módulos que `M` requer de forma transitiva (`requires transitive`, isto é, dependências que o módulo repassa a quem o usa). `import module java.base` equivale a 54 imports do tipo `pacote.*`. O código que usa a declaração **não precisa ser modular**: funciona no class path normalmente.

Como vários pacotes entram de uma vez, nomes simples podem ficar ambíguos: `java.util.Date` e `java.sql.Date`, por exemplo. O uso de um nome ambíguo gera erro de compilação. Para resolver, acrescente um import mais específico; a precedência, do mais forte para o mais fraco, é:

1. import de tipo único (`import java.sql.Date;`);
2. import sob demanda de pacote (`import java.sql.*;`);
3. `import module`.

A possibilidade de um `pacote.*` sombrear um `import module` foi adicionada na segunda preview, junto com a mudança que faz `import module java.se` importar toda a API do Java SE ([JEP 494](https://openjdk.org/jeps/494)).

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
        System.out.println(hoje + " -> " + resumo); // 2025-09-16 -> norte=30, sul=5
    }
}
```

Sem a linha `import java.sql.Date;`, a compilação falha com `reference to Date is ambiguous`. Em código de produção com muitas dependências, imports explícitos continuam deixando mais claro de onde vem cada tipo. `import module` rende mais em scripts, protótipos, testes e em código que usa intensamente uma API modular, como `java.xml` ou `java.net.http`.

### Corpos de construtor flexíveis

**Chegou em:** Java 22 (preview, [JEP 447](https://openjdk.org/jeps/447)) → Java 23 (2ª preview, [JEP 482](https://openjdk.org/jeps/482)) → Java 24 (3ª preview, [JEP 492](https://openjdk.org/jeps/492)) → Java 25 (final, [JEP 513](https://openjdk.org/jeps/513))

Desde o início da linguagem, a primeira instrução de um construtor tinha de ser `super(...)` ou `this(...)`. Isso causava dois problemas descritos na [JEP 513](https://openjdk.org/jeps/513):

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

No Java 21, `super(idade)` teria de ser a primeira linha e a atribuição de `escritorio` viria depois. Como `Pessoa` chama `mostrar()` dentro do próprio construtor, a saída seria `Idade: 42, escritório: null`. A validação, por sua vez, só rodaria depois do construtor da superclasse, ou teria de ir para um método estático chamado dentro de `super(...)`.

Na prática, use o prólogo para validar e preparar argumentos e para inicializar campos que a superclasse possa enxergar. Ler campos ou chamar métodos da instância antes de `super(...)` continua proibido e gera erro de compilação. Na primeira preview, no Java 22, o recurso se chamava "Statements before super(...)".

### Variáveis e padrões sem nome

**Chegou em:** Java 21 (preview, [JEP 443](https://openjdk.org/jeps/443)) → Java 22 (final, [JEP 456](https://openjdk.org/jeps/456))

Muitas vezes a sintaxe obriga a declarar uma variável que não será usada: o parâmetro de um lambda, a exceção de um `catch`, um componente de record em um padrão. Dar nome a ela confunde quem lê, e ferramentas de análise estática costumam reclamar de variável não usada. Com a [JEP 456](https://openjdk.org/jeps/456), o caractere `_` indica essa variável ou esse padrão sem nome. O ganho é de legibilidade: fica explícito que o valor é descartado. O recurso era preview no Java 21 ([post do Java 21](/posts/java-21/#padrões-e-variáveis-sem-nome)) e ficou final sem mudanças.

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

Saída:

```text
círculo de raio 2.5
-1
{a=2, b=1}
```

### String Templates foram retirados

**Chegou em:** Java 21 (preview, [JEP 430](https://openjdk.org/jeps/430)) → Java 22 (2ª preview, [JEP 459](https://openjdk.org/jeps/459)) → Java 23 (removido)

Quem experimentou `STR."Olá \{nome}"` com `--enable-preview` no Java 21 ([post do Java 21](/posts/java-21/#string-templates)) precisa reescrever esse código. As [notas de release do JDK 23](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html) informam que, após feedback e discussão, o recurso foi considerado inadequado na forma atual e retirado, sem consenso ainda sobre um desenho melhor. Não há substituto no Java 25; continue com concatenação, `String.format`/`formatted` ou `StringBuilder`.

## Concorrência

A API `StructuredTaskScope` mudou bastante desde o Java 21 e **ainda não é final** no Java 25; ela está em [Structured Concurrency](#structured-concurrency), na seção de recursos em preview.

### `synchronized` não prende mais virtual threads

**Chegou em:** Java 24 (final, [JEP 491](https://openjdk.org/jeps/491))

Uma virtual thread não tem thread do sistema operacional própria: para executar, ela é **montada** sobre uma thread de plataforma do scheduler, chamada **carrier**. Quando bloqueia em I/O, ela normalmente **desmonta** e libera a carrier para outra virtual thread (o modelo está no [post do Java 21](/posts/java-21/#virtual-threads)).

No Java 21, havia uma exceção importante. Uma virtual thread que bloqueasse dentro de um método ou bloco `synchronized` (em I/O, em `Object.wait()` ou esperando um monitor ocupado) não desmontava: ficava **presa** (pinned) à carrier. O motivo, descrito na [JEP 491](https://openjdk.org/jeps/491): a JVM registrava a carrier como dona do monitor, e não a virtual thread. Se a virtual thread desmontasse, outra virtual thread montada na mesma carrier pareceria dona do monitor e a exclusão mútua se perderia. Como o scheduler tem poucas carriers, algumas virtual threads presas bastavam para limitar severamente quantas tarefas a aplicação conseguia atender.

A partir do Java 24, a JVM permite que virtual threads adquiram, segurem e liberem monitores independentemente da carrier. Ao bloquear para adquirir um monitor ou em `Object.wait()`, a virtual thread desmonta e libera a carrier; quando pode continuar, volta ao scheduler e remonta, possivelmente em outra carrier.

![Comparação entre Java 21 a 23, em que a virtual thread bloqueada em synchronized prende a carrier, e Java 24 e 25, em que ela desmonta e libera a carrier](/posts/java-25/synchronized-sem-pinning.svg)

O diagrama acompanha a mesma situação nas duas versões: à esquerda, as carriers ficam ocupadas por virtual threads paradas e novas tarefas esperam; à direita, a virtual thread bloqueada sai da carrier, que segue atendendo outras.

Consequências práticas para quem migra:

- A recomendação de trocar `synchronized` por `ReentrantLock` só por causa de pinning deixa de ser necessária. A JEP recomenda usar `synchronized` onde for prático, por ser mais conveniente e menos sujeito a erro, e reservar `ReentrantLock` para quando for preciso mais flexibilidade. Código que já foi migrado não precisa ser revertido.
- A propriedade `jdk.tracePinnedThreads` foi removida; defini-la não tem efeito.
- Ainda há pinning em casos menos comuns: código nativo que chama de volta código Java e bloqueia, e bloqueios durante carregamento ou inicialização de classe. O evento `jdk.VirtualThreadPinned` do JFR (JDK Flight Recorder, o gravador de eventos embutido na JVM) continua existindo para esses casos. No Java 26, um deles deixou de prender a carrier: a espera pela inicialização de uma classe ([post do Java 29](/posts/java-29/#virtual-threads-liberam-a-carrier-enquanto-esperam-a-inicialização-de-uma-classe)).

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

O programa imprime `restante: 0` depois de pouco mais de 10 segundos, porque o lock continua serializando as mil reservas (é para isso que ele serve). A diferença está no que acontece enquanto isso: no Java 24 e no 25, as virtual threads que esperam o monitor não ocupam carriers, que ficam livres para outras tarefas.

### Scoped Values

**Chegou em:** Java 20 (incubadora, [JEP 429](https://openjdk.org/jeps/429)) → Java 21 (preview, [JEP 446](https://openjdk.org/jeps/446)) → Java 22 (2ª preview, [JEP 464](https://openjdk.org/jeps/464)) → Java 23 (3ª preview, [JEP 481](https://openjdk.org/jeps/481)) → Java 24 (4ª preview, [JEP 487](https://openjdk.org/jeps/487)) → Java 25 (final, [JEP 506](https://openjdk.org/jeps/506))

Para passar contexto (usuário autenticado, ID de transação) a métodos distantes sem acrescentar parâmetros em toda a cadeia, o caminho tradicional é `ThreadLocal`. A [JEP 506](https://openjdk.org/jeps/506) aponta três problemas nele:

- **mutável de qualquer ponto:** qualquer código que chama `get` também pode chamar `set`, então fica difícil saber quem alterou o valor;
- **tempo de vida ilimitado:** o valor fica associado à thread até alguém chamar `remove`, o que causa vazamentos em pools de threads;
- **herança cara:** com `InheritableThreadLocal`, cada thread filha recebe cópia dos valores da mãe, custo que pesa com milhares de virtual threads.

Um `ScopedValue` compartilha um valor **imutável** com os métodos chamados, direta ou indiretamente, durante um escopo bem delimitado. Depois de uma incubadora e quatro previews (a versão do Java 21 aparece no [post do Java 21](/posts/java-21/#scoped-values)), a API final funciona assim:

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

![Escopos do exemplo Contexto.java: dentro de where(USUARIO_ATUAL, ana).run, get devolve ana; dentro da reassociação aninhada com sistema, devolve sistema; depois que run termina, isBound é false; ao lado, comparação entre ThreadLocal e ScopedValue em escrita, tempo de vida e herança](/posts/java-25/scoped-values-escopo.svg)

O diagrama mostra os escopos do exemplo como caixas aninhadas: cada `get()` devolve o valor da caixa mais interna em que está, e fora de todas elas não há valor associado. À direita, o resumo das diferenças em relação a `ThreadLocal`.

A única mudança da versão final em relação à quarta preview: `ScopedValue.orElse` não aceita mais `null` como argumento ([JEP 506](https://openjdk.org/jeps/506)). A API está documentada no [Javadoc de `ScopedValue`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ScopedValue.html).

`ThreadLocal` continua existindo e continua sendo a escolha quando o valor precisa ser mutável ou quando há cache por thread. Scoped Values são para o caso de passar contexto adiante sem parâmetro, como usuário autenticado, ID de transação ou contexto de framework, e combinam com virtual threads e com `StructuredTaskScope`, que ainda está em preview.

## APIs da biblioteca padrão

### Stream Gatherers

**Chegou em:** Java 22 (preview, [JEP 461](https://openjdk.org/jeps/461)) → Java 23 (2ª preview, [JEP 473](https://openjdk.org/jeps/473)) → Java 24 (final, [JEP 485](https://openjdk.org/jeps/485))

A Stream API tem um conjunto fixo de operações intermediárias (`map`, `filter`, `flatMap`, `distinct`...). Operações como agrupar em lotes de N, janela deslizante ou soma acumulada exigiam truques com estado externo ou coletar tudo em uma lista antes. A [JEP 485](https://openjdk.org/jeps/485) adiciona `Stream::gather(Gatherer)`, que aceita **operações intermediárias personalizadas**, com estado, capazes de transformar um-para-um, um-para-muitos, muitos-para-um ou muitos-para-muitos e de encerrar o stream mais cedo.

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

Chamar uma biblioteca em C a partir do Java exigia JNI (Java Native Interface): escrever e compilar código C de cola para cada plataforma, com pouca proteção contra erros de memória. A FFM API, do Projeto Panama (o projeto do OpenJDK que aproxima Java e código nativo), faz isso em Java puro e também manipula memória fora do heap com verificação de limites. Ela era a 3ª preview no Java 21 ([post do Java 21](/posts/java-21/#foreign-function--memory-api)) e ficou final no 22. Os blocos principais ([JEP 454](https://openjdk.org/jeps/454)):

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

O pacote `java.lang.classfile` oferece uma API padrão para ler, gerar e transformar arquivos `.class` ([JEP 484](https://openjdk.org/jeps/484)). Frameworks e ferramentas costumam embutir bibliotecas como ASM, que precisam ser atualizadas a cada nova versão do formato de classe. Como o formato pode mudar a cada seis meses, a JEP descreve frameworks que encontram classes mais novas que a biblioteca embutida e falham com erros que chegam a quem desenvolve a aplicação. Com uma API que evolui junto com o JDK, esse descompasso tende a sumir. É uma API para autores de frameworks, agentes e ferramentas de build, não para código de aplicação comum.

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

Toda vez que uma aplicação Java sobe, a JVM lê, analisa, carrega e linka (conecta às classes de que dependem) milhares de classes. Depois, o compilador JIT (just-in-time, que compila para código de máquina durante a execução) ainda precisa observar o programa por um tempo antes de otimizar os métodos mais usados. Esse período até a aplicação atingir o desempenho normal é o **warmup**. O Projeto Leyden, do OpenJDK, desloca parte desse trabalho para antes da execução e o grava em um **cache AOT** (ahead-of-time), reaproveitado nas execuções seguintes. Não é preciso mudar o código.

O cache é uma evolução do CDS (Class Data Sharing), que desde uma atualização do JDK 5 guarda classes já lidas e analisadas ([post do Java 17](/posts/java-17/#class-data-sharing-padrão-e-dinâmico)). Segundo a [JEP 483](https://openjdk.org/jeps/483), o cache AOT vai além e guarda as classes já carregadas e linkadas. O recurso chegou em duas etapas:

- **Java 24, [JEP 483](https://openjdk.org/jeps/483):** primeira versão do cache. O fluxo tem três passos: execução de treino (`-XX:AOTMode=record`), criação do cache (`-XX:AOTMode=create`) e produção (`-XX:AOTCache`). A JEP cita o Spring PetClinic 3.2.0 subindo em 4,486 s no JDK 23 e em 2,604 s no JDK 24 com o cache, 42% menos.
- **Java 25, [JEP 514](https://openjdk.org/jeps/514):** a opção `-XX:AOTCacheOutput` faz treino e criação em um único comando. A variável `JDK_AOT_VM_OPTIONS` passa opções só para a fase de criação.
- **Java 25, [JEP 515](https://openjdk.org/jeps/515):** o cache passa a guardar também **perfis de execução de métodos** coletados no treino, então o JIT compila mais cedo os métodos mais usados. A JVM continua perfilando em produção. No exemplo da JEP, um programa curto cai de 90 ms para 73 ms (19%), com 250 KB a mais de cache.

![Fluxo do cache AOT: três passos no Java 24 e um comando de treino e criação no Java 25, com o que o cache traz e as regras para reaproveitá-lo](/posts/java-25/cache-aot.svg)

No diagrama, a primeira linha mostra o fluxo em três comandos do Java 24; a segunda, o atalho do Java 25, que junta treino e criação. Os comandos separados de treino e criação do Java 24 continuam disponíveis ([JEP 514](https://openjdk.org/jeps/514)). Na prática:

```bash title="Java 25: criar e usar o cache"
# 1. Treino + criação do cache em um único comando
java -XX:AOTCacheOutput=app.aot -cp app.jar com.exemplo.App

# 2. Produção usando o cache
java -XX:AOTCache=app.aot -cp app.jar com.exemplo.App
```

O treino deve exercitar os caminhos comuns da aplicação, por exemplo, um conjunto de testes de integração ou uma carga sintética. Pontos de atenção da [JEP 483](https://openjdk.org/jeps/483):

- treino e produção precisam usar a mesma release do JDK, o mesmo sistema operacional e a mesma arquitetura;
- o class path de produção deve ser igual ao do treino, podendo só acrescentar entradas no fim, e conter apenas JARs (diretórios não são aceitos);
- as opções de módulo precisam ser as mesmas, e algumas, como `--add-opens` e `--patch-module`, não podem ser usadas;
- classes carregadas por class loaders customizados não entram no cache;
- se o cache não puder ser usado, a JVM emite um aviso e segue sem ele.

No Java 26, o cache passou a funcionar com qualquer coletor de lixo, inclusive o ZGC ([post do Java 29](/posts/java-29/#cache-aot-com-qualquer-coletor-inclusive-zgc)).

### Compact object headers

**Chegou em:** Java 24 (experimental, [JEP 450](https://openjdk.org/jeps/450)) → Java 25 (final, [JEP 519](https://openjdk.org/jeps/519))

Cada objeto no heap tem um cabeçalho com metadados que a JVM usa internamente. Ele tem duas partes: o **mark word**, com hash de identidade, idade do objeto para o GC e estado de lock, e o **class pointer**, que aponta para a classe do objeto. Na HotSpot de 64 bits, esse cabeçalho ocupa entre 96 bits (12 bytes) e 128 bits (16 bytes). Segundo a [JEP 450](https://openjdk.org/jeps/450), experimentos do Projeto Lilliput (o projeto do OpenJDK dedicado a reduzir o cabeçalho) mostram objetos médios de 32 a 64 bytes em muitas cargas, o que faz o cabeçalho representar mais de 20% dos dados vivos. Com headers compactos, o cabeçalho cai para **64 bits (8 bytes)**: o class pointer comprimido passa para dentro do mark word e é reduzido de 32 para 22 bits.

![Layout do cabeçalho de objeto: padrão de 96 bits com mark word e class pointer comprimido, e compacto de 64 bits com class pointer de 22 bits, hash, bits reservados para Valhalla, idade, self-forwarding e tag](/posts/java-25/object-headers-compactos.svg)

O diagrama compara os dois layouts bit a bit: no compacto, o class pointer divide os mesmos 64 bits com os demais campos, e sobram 4 bits reservados para o Projeto Valhalla, o projeto do OpenJDK que prepara os value objects.

No Java 25 a opção deixou de ser experimental e **continua desligada por padrão** ([JEP 519](https://openjdk.org/jeps/519), [notas de release do JDK 25](https://www.oracle.com/java/technologies/javase/25-relnote-issues.html)):

```bash
# Java 24 (experimental)
java -XX:+UnlockExperimentalVMOptions -XX:+UseCompactObjectHeaders -jar app.jar

# Java 25 (produto)
java -XX:+UseCompactObjectHeaders -jar app.jar
```

Os números citados na [JEP 519](https://openjdk.org/jeps/519): em um cenário, o SPECjbb2015 usou 22% menos heap e 8% menos tempo de CPU; em outro, fez 15% menos coletas com G1 e com Parallel; um benchmark de parser JSON altamente paralelo rodou em 10% menos tempo. A mesma JEP relata que o recurso foi testado na Amazon em centenas de serviços em produção, a maioria com backports para JDK 21 e 17. Uma limitação da [JEP 450](https://openjdk.org/jeps/450): com coletores que não sejam o ZGC, os headers compactos não são compatíveis com heaps acima de 8 TB. Meça na sua carga antes de ativar em produção. No Java 27, os headers compactos passaram a ser o padrão ([post do Java 29](/posts/java-29/#compact-object-headers-ligados-por-padrão)).

### Shenandoah geracional

**Chegou em:** Java 24 (experimental, [JEP 404](https://openjdk.org/jeps/404)) → Java 25 (final, [JEP 521](https://openjdk.org/jeps/521))

O Shenandoah é um coletor de pausas curtas que compacta o heap concorrentemente com a aplicação. O modo geracional aplica a hipótese geracional (a maioria dos objetos morre jovem) para concentrar o trabalho na geração jovem, com o objetivo de melhorar throughput sustentável, resistência a picos de carga e uso de memória ([JEP 404](https://openjdk.org/jeps/404)). No Java 25 ele deixa de exigir `-XX:+UnlockExperimentalVMOptions`, mas o modo padrão do Shenandoah continua sendo o de geração única, em que o heap inteiro é tratado da mesma forma ([JEP 521](https://openjdk.org/jeps/521)). Para usá-lo, é preciso escolher o Shenandoah e o modo geracional explicitamente:

```bash
java -XX:+UseShenandoahGC -XX:ShenandoahGCMode=generational -jar app.jar
```

### ZGC passa a ser só geracional

**Chegou em:** Java 23 (depreciado, [JEP 474](https://openjdk.org/jeps/474)) → Java 24 (removido, [JEP 490](https://openjdk.org/jeps/490))

No Java 21, o ZGC geracional existia ([JEP 439](https://openjdk.org/jeps/439), veja o [post do Java 21](/posts/java-21/#zgc-geracional)), mas precisava de `-XX:+ZGenerational`. O Java 23 tornou o modo geracional o padrão e depreciou o não geracional; o Java 24 removeu o não geracional para reduzir o custo de manter dois modos. Quem usa `-XX:+UseZGC` já recebe o modo geracional. No Temurin 25.0.4, passar `-XX:+ZGenerational` ou `-XX:-ZGenerational` gera o aviso `Ignoring option ZGenerational; support was removed in 24.0` e a JVM segue com o modo geracional. Remova a opção dos scripts.

### Melhorias no G1

**Chegou em:** Java 22 (final, [JEP 423](https://openjdk.org/jeps/423)) e Java 24 (final, [JEP 475](https://openjdk.org/jeps/475))

- **Region pinning** — Java 22, [JEP 423](https://openjdk.org/jeps/423): código nativo pode pedir acesso direto a um array Java por funções JNI como `GetPrimitiveArrayCritical`; enquanto isso, a thread está em uma **região crítica** e o objeto não pode ser movido. Antes, o G1 simplesmente não coletava enquanto houvesse alguma thread nessa situação, e threads que precisavam de memória ficavam esperando. Agora ele fixa (pin) apenas as regiões do heap que contêm esses objetos e continua coletando as demais, o que reduz a latência em aplicações que usam JNI.
- **Late barrier expansion** — Java 24, [JEP 475](https://openjdk.org/jeps/475): as barreiras do G1 (trechos de código que o JIT insere em acessos à memória da aplicação para registrar informações para o coletor) passam a ser expandidas mais tarde no pipeline do compilador JIT C2. O objetivo é simplificar a implementação e reduzir o tempo de compilação do C2 com G1. É uma mudança interna e não exige ação.

### JDK Flight Recorder

**Chegou em:** Java 25 (final, [JEP 518](https://openjdk.org/jeps/518) e [JEP 520](https://openjdk.org/jeps/520)) e Java 25 (experimental, [JEP 509](https://openjdk.org/jeps/509))

O JFR (JDK Flight Recorder) é o gravador de eventos embutido na JVM, usado para profiling e diagnóstico em produção com baixo custo. O Java 25 trouxe três melhorias a ele:

- **Cooperative sampling** — [JEP 518](https://openjdk.org/jeps/518): para amostrar o que uma thread está executando, o JFR percorria a pilha dela em um ponto qualquer, com heurísticas que podiam derrubar a JVM. Agora a pilha só é percorrida em **safepoints**, pontos do código em que a JVM sabe interpretar a pilha com segurança. Para não distorcer o resultado em favor desses pontos (o chamado viés de safepoint), o JFR registra onde a thread estava no momento da amostra e corrige a pilha. O objetivo é estabilidade.
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

Desde o Java 11, o launcher executa um único arquivo `.java` sem compilação explícita ([post do Java 11](/posts/java-11/#executar-um-arquivo-java-diretamente)). A [JEP 458](https://openjdk.org/jeps/458) estende esse modo a programas com vários arquivos: ao rodar `java Prog.java`, o launcher encontra no sistema de arquivos (seguindo a estrutura de diretórios dos pacotes) e compila em memória os outros `.java` referenciados. Só são compilados os arquivos realmente usados pelo programa.

```java title="Prog.java"
class Prog {
    public static void main(String[] args) {
        Helper.run(); // Helper.java é encontrado e compilado em memória
    }
}
```

```java title="Helper.java"
class Helper {
    static void run() {
        System.out.println("Olá de outro arquivo!");
    }
}
```

```bash
java Prog.java
# Olá de outro arquivo!

# com bibliotecas: todos os JARs do diretório atual no class path
java --class-path '*' Prog.java
```

Junto com arquivos compactos e `import module`, isso permite começar um projeto sem ferramenta de build (Maven, Gradle) e adotá-la só quando fizer sentido. Para projetos de verdade, com dependências versionadas e testes, a ferramenta de build continua sendo o caminho.

### Comentários de documentação em Markdown

**Chegou em:** Java 23 (final, [JEP 467](https://openjdk.org/jeps/467))

Comentários Javadoc tradicionais (`/** ... */`) misturam HTML e tags `@`: listas viram `<ul><li>`, código vira `<code>` ou `{@code}`, e o texto fica difícil de ler no próprio código-fonte. Com a [JEP 467](https://openjdk.org/jeps/467), comentários em que cada linha começa com `///` são interpretados como **Markdown** (na variante CommonMark) pelo javadoc. As block tags (`@param`, `@return`...) continuam funcionando, e links para elementos da API usam colchetes, como em `[Math#addExact(int, int)]`. Os dois estilos podem conviver no mesmo projeto.

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

O `jlink` monta uma imagem de runtime sob medida, só com os módulos de que a aplicação precisa ([post do Java 11](/posts/java-11/#jlink-runtime-sob-medida)). Antes do Java 24, ele precisava dos arquivos JMOD, que ficam na pasta `jmods` do JDK e ocupam bastante espaço. Com a [JEP 493](https://openjdk.org/jeps/493), o `jlink` pode extrair os módulos do próprio runtime do JDK, e o JDK pode ser distribuído sem os JMODs, o que reduz o tamanho dele em cerca de 25%. A capacidade precisa ser habilitada **na compilação do próprio JDK** (`--enable-linkable-runtime`), não vem ativada por padrão e alguns fornecedores podem optar por não ativá-la. Nesse modo há restrições: não dá para gerar uma imagem para outra plataforma nem uma imagem que contenha o próprio `jlink`. Verifique a documentação da sua distribuição.

## Segurança

### Criptografia resistente a computação quântica: ML-KEM e ML-DSA

**Chegou em:** Java 24 (final, [JEP 496](https://openjdk.org/jeps/496) e [JEP 497](https://openjdk.org/jeps/497))

Computadores quânticos de grande escala tornariam vulneráveis algoritmos como RSA e Diffie-Hellman. A [JEP 496](https://openjdk.org/jeps/496) lembra que o risco começa antes: um adversário pode guardar hoje dados cifrados e decifrá-los quando esses computadores existirem. O Java 24 implementa dois padrões do NIST (o instituto de padrões dos Estados Unidos) baseados em reticulados (lattices), uma família de problemas matemáticos considerada resistente a ataques quânticos:

- **ML-KEM** ([JEP 496](https://openjdk.org/jeps/496), FIPS 203): mecanismo de encapsulamento de chaves (KEM). Com a chave pública do receptor, o emissor gera uma chave simétrica e uma "cápsula"; só quem tem a chave privada abre a cápsula e obtém a mesma chave. A API `javax.crypto.KEM` já existia desde o Java 21 ([post do Java 21](/posts/java-21/#api-de-key-encapsulation-mechanism-kem)); faltava um algoritmo pós-quântico. Parâmetros `ML-KEM-512`, `ML-KEM-768` (padrão) e `ML-KEM-1024`, via `KeyPairGenerator`, `KEM` e `KeyFactory`.
- **ML-DSA** ([JEP 497](https://openjdk.org/jeps/497), FIPS 204): assinatura digital. Parâmetros `ML-DSA-44`, `ML-DSA-65` (padrão) e `ML-DSA-87`, via `KeyPairGenerator`, `Signature` e `KeyFactory`.

O `keytool` também gera pares de chaves dos dois algoritmos. O exemplo de código está na seção seguinte, junto com a KDF API. No Java 27, o TLS 1.3 do JDK passou a usar ML-KEM em uma troca de chaves híbrida ([post do Java 29](/posts/java-29/#troca-de-chaves-híbrida-pós-quântica-no-tls-13)).

### Key Derivation Function API

**Chegou em:** Java 24 (preview, [JEP 478](https://openjdk.org/jeps/478)) → Java 25 (final, [JEP 510](https://openjdk.org/jeps/510))

Funções de derivação de chave (KDFs) geram chaves criptográficas a partir de um segredo e de dados adicionais. A JEP cita como usos implementações de KEM como o ML-KEM, a troca de chaves híbrida no TLS 1.3 e o HPKE. A nova classe `javax.crypto.KDF` tem `deriveKey` (devolve uma `SecretKey`) e `deriveData` (devolve bytes). A implementação incluída é o **HKDF** (KDF baseada em HMAC, da RFC 5869), configurado por `HKDFParameterSpec` ([JEP 510](https://openjdk.org/jeps/510)). Atenção: a KDF API não substitui `SecretKeyFactory` com PBKDF2 para hash de senhas; o foco é derivar chaves a partir de material de chave.

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

O Security Manager era o mecanismo para restringir, em tempo de execução, o que o código Java podia fazer (ler arquivos, abrir conexões e assim por diante). Pouco usado e caro de manter, ele foi depreciado para remoção no Java 17 ([post do Java 17](/posts/java-17/#removidos-e-depreciados)). A partir do Java 24 não é mais possível ativá-lo ([JEP 486](https://openjdk.org/jeps/486)):

- iniciar a JVM com `-Djava.security.manager` (vazio, `allow`, `default` ou nome de classe) é **erro fatal na inicialização**, sem opção de rebaixar para aviso;
- `System.setSecurityManager(...)` lança `UnsupportedOperationException`;
- a API continua existindo, mas se comporta como se nenhum Security Manager estivesse ativo; `-Djava.security.manager=disallow` continua aceito.

```text
$ java -Djava.security.manager -version
Error occurred during initialization of VM
java.lang.Error: A command line option has attempted to allow or enable the Security Manager. Enabling a Security Manager is not supported.
```

A JEP não oferece substituto para sandboxing; para isolar código, recomenda mecanismos externos à JVM, como containers. No Java 25, várias classes de permissão que só faziam sentido com o Security Manager (como `RuntimePermission`, `FilePermission` e `PropertyPermission`) foram depreciadas para remoção ([notas de release do JDK 25](https://www.oracle.com/java/technologies/javase/25-relnote-issues.html)).

## Removidos e depreciados

Remoções que afetam recursos já citados estão nas próprias seções: [String Templates](#string-templates-foram-retirados), [ZGC não geracional](#zgc-passa-a-ser-só-geracional) e [Security Manager](#security-manager-desativado-permanentemente). A lista completa de APIs e opções removidas está em [O que observar na migração](#o-que-observar-na-migração-a-partir-do-java-21).

As duas mudanças abaixo fazem parte de um movimento do OpenJDK chamado **integridade por padrão**: operações que podem quebrar as garantias da JVM, como acessar memória sem verificação ou carregar código nativo, passam a exigir permissão explícita de quem executa a aplicação. No Java 25, por padrão, elas só geram avisos no log e afetam principalmente **bibliotecas** que sua aplicação usa.

### Métodos de acesso a memória de `sun.misc.Unsafe`

**Chegou em:** Java 23 (depreciado para remoção, [JEP 471](https://openjdk.org/jeps/471)) → Java 24 (depreciado para remoção, [JEP 498](https://openjdk.org/jeps/498))

`sun.misc.Unsafe` é uma classe interna do JDK que permite ler e escrever memória sem verificação de limites, dentro e fora do heap. Muitas bibliotecas a usam por desempenho, e um erro nesse uso pode derrubar a JVM. O Java 23 depreciou para remoção os métodos de acesso a memória dessa classe, o que gera avisos de compilação ([JEP 471](https://openjdk.org/jeps/471)). Os substitutos são `VarHandle` e a FFM API. Desde o Java 24, o primeiro uso de qualquer um desses métodos em tempo de execução também emite um aviso ([JEP 498](https://openjdk.org/jeps/498)). Por exemplo, para uma classe `com.exemplo.Cache`, empacotada em `cache.jar`, que chama `allocateMemory`, o Temurin 25.0.4 imprime:

```text
WARNING: A terminally deprecated method in sun.misc.Unsafe has been called
WARNING: sun.misc.Unsafe::allocateMemory has been called by com.exemplo.Cache (file:/app/cache.jar)
WARNING: Please consider reporting this to the maintainers of class com.exemplo.Cache
WARNING: sun.misc.Unsafe::allocateMemory will be removed in a future release
```

A opção `--sun-misc-unsafe-memory-access={allow|warn|debug|deny}` controla o comportamento. Use `debug` para descobrir qual biblioteca faz a chamada e `deny` para testar como a aplicação se comportará quando os métodos forem removidos (com `deny`, a chamada lança `UnsupportedOperationException`). A solução definitiva é atualizar a biblioteca.

### Avisos no uso de JNI

**Chegou em:** Java 24 (final, [JEP 472](https://openjdk.org/jeps/472))

Código nativo pode corromper a memória da JVM sem que o Java consiga impedir. Por isso, a partir do Java 24, três operações geram aviso quando feitas sem permissão explícita: carregar bibliotecas nativas (`System.loadLibrary`), vincular métodos `native` de JNI e chamar métodos **restritos** da FFM API (os que tocam código ou memória nativa, como `Linker::downcallHandle`). O modo padrão no Java 24 e no 25 é `--illegal-native-access=warn`; a JEP informa que uma release futura passará a lançar exceções por padrão. Habilite o acesso só para quem precisa:

```bash
java --enable-native-access=ALL-UNNAMED -jar app.jar     # código no class path
java --enable-native-access=com.exemplo.nativo -jar app.jar  # módulo específico
java --illegal-native-access=deny -jar app.jar           # teste antecipado da restrição futura
```

## Recursos em preview ou incubadora nesta LTS

Os recursos abaixo **não são finais no Java 25**. APIs e sintaxe ainda podem mudar em releases seguintes, e isso já aconteceu: os exemplos de Structured Concurrency e de Stable Values desta seção não compilam no Java 26. Não os use em código de produção que precise compilar em versões futuras sem ajustes. Cada seção indica, em uma linha, o que mudou depois; os detalhes estão no [post do Java 29](/posts/java-29/#ainda-em-preview-ou-incubadora).

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

Com um `ExecutorService` comum, nada liga as tarefas ao método que as disparou: se uma falha, as outras continuam rodando; se o método é interrompido, as tarefas não ficam sabendo. A concorrência estruturada trata um grupo de subtarefas concorrentes como uma unidade: elas começam e terminam dentro de um bloco de código, a falha de uma cancela as outras, a interrupção de quem abriu o escopo se propaga e o thread dump mostra a hierarquia. A versão do Java 21 está no [post do Java 21](/posts/java-21/#structured-concurrency). A 5ª preview mudou a API de forma **incompatível** com aquela ([JEP 505](https://openjdk.org/jeps/505)):

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

Código escrito para a preview do Java 21 com `new StructuredTaskScope.ShutdownOnFailure()` não compila no Java 25 (`cannot find symbol: class ShutdownOnFailure`). A API seguiu mudando: no Java 26, `anySuccessfulResultOrThrow()` virou `anySuccessfulOrThrow()` e `allSuccessfulOrThrow()` passou a devolver uma lista de resultados, então o exemplo acima já não compila ([JEP 525](https://openjdk.org/jeps/525)). A versão atual está no [post do Java 29](/posts/java-29/#structured-concurrency).

### Tipos primitivos em padrões, `instanceof` e `switch`

**Chegou em:** Java 23 (preview, [JEP 455](https://openjdk.org/jeps/455)) → Java 24 (2ª preview, [JEP 488](https://openjdk.org/jeps/488)) → Java 25 (3ª preview, [JEP 507](https://openjdk.org/jeps/507))

Pattern matching passa a aceitar tipos primitivos em qualquer contexto de padrão, e `instanceof` e `switch` passam a funcionar com todos os tipos primitivos, inclusive `boolean`, `long`, `float` e `double` no `switch` ([JEP 507](https://openjdk.org/jeps/507)). Um padrão primitivo só casa se a conversão for **exata**, ou seja, sem perda de informação. Assim, `instanceof byte b` funciona como um teste seguro de faixa, sem o risco de um cast `(byte)` truncar o valor em silêncio. No Java 21, `switch` não aceitava `boolean`, `long`, `float` nem `double`, e padrões de tipo só funcionavam com tipos de referência.

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

Execute com `java --enable-preview Primitivos.java`. Saída:

```text
1000 não cabe em byte sem perda
cabe em byte: 42
cabe em short: 1000
precisa de int: 100000
id = -1
dez bilhões
```

O recurso continuou em preview no Java 26 e no 27; no 26, as regras de dominância no `switch` ficaram mais rígidas e alguns `switch` antes aceitos passaram a ser rejeitados ([post do Java 29](/posts/java-29/#tipos-primitivos-em-patterns-instanceof-e-switch)).

### Stable Values

**Chegou em:** Java 25 (preview, [JEP 502](https://openjdk.org/jeps/502))

Campos `final` precisam ser inicializados no construtor ou no inicializador estático. Isso obriga a criar objetos caros logo na subida da aplicação, mesmo que nunca sejam usados. Campos não `final` permitem inicialização preguiçosa (só no primeiro uso), mas exigem cuidado com concorrência e a JVM não consegue tratá-los como constantes para otimizar o código.

Um `StableValue` resolve os dois lados: seu conteúdo é definido **no máximo uma vez**, a qualquer momento, com garantia de execução única mesmo sob concorrência. Depois disso, se o `StableValue` estiver em um campo `final`, a JVM pode tratar o conteúdo como constante ([JEP 502](https://openjdk.org/jeps/502)).

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

Saída de `java --enable-preview Configuracao.java`:

```text
criando cliente (caro)
lendo configuração...
https://api.exemplo.com
https://api.exemplo.com
shard-2
```

O exemplo usa a API do Java 25. No Java 26, ela foi renomeada de `StableValue` para `LazyConstant`, perdeu métodos como `orElseSet` e continuou em preview ([JEP 526](https://openjdk.org/jeps/526)); veja [Lazy Constants no post do Java 29](/posts/java-29/#lazy-constants).

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

A saída mostra a chave em Base64 entre `-----BEGIN PUBLIC KEY-----` e `-----END PUBLIC KEY-----` (muda a cada execução) e, no fim, `igual? true`. A API teve ajustes de nomes no Java 26 e no 27 e tem finalização prevista para o 28 ([API PEM no post do Java 29](/posts/java-29/#api-pem)).

### Vector API

**Chegou em:** Java 21 (6ª incubadora, [JEP 448](https://openjdk.org/jeps/448)) → Java 22 (7ª incubadora, [JEP 460](https://openjdk.org/jeps/460)) → Java 23 (8ª incubadora, [JEP 469](https://openjdk.org/jeps/469)) → Java 24 (9ª incubadora, [JEP 489](https://openjdk.org/jeps/489)) → Java 25 (10ª incubadora, [JEP 508](https://openjdk.org/jeps/508))

Processadores modernos têm instruções SIMD (single instruction, multiple data), que aplicam a mesma operação a vários números de uma vez, como somar dois vetores de 8 inteiros com uma única instrução. O JIT da HotSpot já vetoriza sozinho alguns laços, mas, segundo a [JEP 508](https://openjdk.org/jeps/508), o conjunto de operações transformáveis é limitado e sensível a mudanças no formato do código. Em incubação desde o Java 16 ([JEP 338](https://openjdk.org/jeps/338)), a Vector API permite escrever esses cálculos de forma explícita, e o JIT os compila para as instruções SIMD disponíveis na CPU. Segundo a mesma JEP, ela permanecerá em incubação até que recursos necessários do Projeto Valhalla estejam disponíveis como preview; só então será adaptada e promovida a preview.

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
# [2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0]
```

A Vector API seguiu em incubadora no Java 26 e no 27 ([post do Java 29](/posts/java-29/#vector-api)).

## O que observar na migração a partir do Java 21

A lista abaixo reúne mudanças que podem quebrar build ou execução, ou gerar avisos novos. Ela não substitui as notas de release de cada versão ([22](https://www.oracle.com/java/technologies/javase/22-relnote-issues.html), [23](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html), [24](https://www.oracle.com/java/technologies/javase/24-relnote-issues.html), [25](https://www.oracle.com/java/technologies/javase/25-relnote-issues.html)) nem o [guia de migração da Oracle](https://docs.oracle.com/en/java/javase/25/migrate/index.html).

**Build e compilação**

- **Annotation processing desligado por padrão (Java 23).** O `javac` só executa processadores de anotação com configuração explícita (`-processor`, `--processor-path`, `-proc:full` etc.). Builds que dependiam da descoberta automática de processadores no class path deixam de executá-los e, portanto, de gerar o código correspondente. Configure o processor path no Maven/Gradle ou passe `-proc:full` ([notas do JDK 23](https://www.oracle.com/java/technologies/javase/23-relnote-issues.html)).
- **Código escrito para previews do Java 21 precisa ser revisado:** [String Templates](#string-templates-foram-retirados) foram retirados; `StructuredTaskScope` [mudou de API](#structured-concurrency); o `main` implícito agora [exige `IO.println`](#arquivos-compactos-e-métodos-main-de-instância) em vez de `println` solto. Classes compiladas com `--enable-preview` no Java 21 também precisam ser recompiladas, porque a JVM não carrega classes compiladas com os previews de outra versão e falha com `UnsupportedClassVersionError` ([JEP 12](https://openjdk.org/jeps/12)).
- **Suporte a 32 bits x86 acabou:** o port Windows 32 bits foi removido no Java 24 ([JEP 479](https://openjdk.org/jeps/479)) e o port 32 bits x86 restante (Linux) foi depreciado no 24 ([JEP 501](https://openjdk.org/jeps/501)) e removido no 25 ([JEP 503](https://openjdk.org/jeps/503)). Para rodar Java em x86 de 32 bits, resta o port Zero, que não depende de arquitetura ([JEP 501](https://openjdk.org/jeps/501)).

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

<details>
<summary>Ver as 12 JEPs do Java 22</summary>

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

</details>

### Java 23

Lançado em 17 de setembro de 2024, com 12 JEPs ([JDK 23](https://openjdk.org/projects/jdk/23/)).

<details>
<summary>Ver as 12 JEPs do Java 23</summary>

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

</details>

### Java 24

Lançado em 18 de março de 2025, com 24 JEPs ([JDK 24](https://openjdk.org/projects/jdk/24/)).

<details>
<summary>Ver as 24 JEPs do Java 24</summary>

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

</details>

### Java 25

Lançado em 16 de setembro de 2025, com 18 JEPs ([JDK 25](https://openjdk.org/projects/jdk/25/)).

<details>
<summary>Ver as 18 JEPs do Java 25</summary>

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

</details>

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
- Evolução posterior citada no texto: [JEP 525](https://openjdk.org/jeps/525), [JEP 526](https://openjdk.org/jeps/526)
- Processo de preview: [JEP 12](https://openjdk.org/jeps/12)

**Javadoc do Java 25**

- [`java.lang.IO`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/IO.html)
- [`java.lang.ScopedValue`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ScopedValue.html)
- [`java.util.concurrent.StructuredTaskScope`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html)
- [`java.util.stream.Gatherers`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Gatherers.html)
- [`java.lang.StableValue`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/StableValue.html)
- [`javax.crypto.KDF`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/javax/crypto/KDF.html)
