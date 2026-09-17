---
title: "Java 11 (LTS) — módulos, var, HTTP Client e o novo ciclo de releases"
published: 2025-07-02T00:30:00Z
updated: 2026-09-16
description: "O que chegou do Java 9 ao 11 para quem migra do Java 8: sistema de módulos, `var`, `HttpClient`, novas APIs, G1 como padrão, TLS 1.3, a remoção do Java EE e do CORBA e o ciclo de releases a cada seis meses."
tags: [LTS, Linguagem, JVM, Migração]
series: java
draft: false
---

O Java 11 chegou à disponibilidade geral (GA) em **25 de setembro de 2018** ([página do JDK 11](https://openjdk.org/projects/jdk/11/)) e foi a primeira versão de suporte de longo prazo (LTS, *long-term support*) depois do Java 8. Entre as duas saíram o Java 9, em 21 de setembro de 2017 ([JDK 9](https://openjdk.org/projects/jdk9/)), e o Java 10, em 20 de março de 2018 ([JDK 10](https://openjdk.org/projects/jdk/10/)). Nenhum dos dois é LTS: pelo [roadmap de suporte da Oracle](https://www.oracle.com/java/technologies/java-se-support-roadmap.html), o 9 foi substituído pelo 10 e o 10 pelo 11 assim que saíram.

Este artigo é para quem vem do Java 8 e reúne o que mudou do 9 ao 11. Ele começa pelo novo ciclo de releases e pelo sistema de módulos, a mudança que mais pesa na migração; passa por linguagem, concorrência, APIs, JVM, ferramentas e segurança; e termina com o que foi removido, um roteiro de migração e a lista completa de JEPs (*JDK Enhancement Proposals*, as propostas formais de mudança do OpenJDK). Cada recurso indica a versão e a JEP em que apareceu, porque vários passaram por estágios: o HTTP Client, por exemplo, foi incubadora no 9 e no 10 antes de virar API padrão no 11.

Sobre suporte, o roadmap da Oracle informa Premier Support do Oracle JDK 11 até setembro de 2023 e Extended Support até janeiro de 2032. Distribuições do OpenJDK têm calendários próprios: a Adoptium informa disponibilidade do Eclipse Temurin 11 até pelo menos outubro de 2027 ([Adoptium](https://adoptium.net/support/)), e a AWS, fim de vida do Amazon Corretto 11 em janeiro de 2032 ([Corretto FAQ](https://aws.amazon.com/corretto/faqs/)).

## Linha do tempo

![Linha do tempo do Java 9 ao Java 11 mostrando, por versão, quando chegaram o sistema de módulos, jlink, var, HTTP Client (incubadora no 9 e no 10, final no 11), jshell, G1 padrão, recursos experimentais como AOT, Graal, ZGC e Epsilon, TLS 1.3 e a remoção dos módulos Java EE e CORBA](/posts/java-11/linha-do-tempo-java-9-a-11.svg)

O diagrama mostra os principais recursos de cada versão e o estágio em que chegaram. Em números, o [JDK 9](https://openjdk.org/projects/jdk9/) entregou 91 JEPs, o [JDK 10](https://openjdk.org/projects/jdk/10/) entregou 12 e o [JDK 11](https://openjdk.org/projects/jdk/11/) entregou 17; a lista completa está em [Todas as JEPs, versão a versão](#todas-as-jeps-versão-a-versão).

### Uma versão nova a cada seis meses

Foram três anos e meio entre o Java 8 (março de 2014) e o Java 9 (setembro de 2017), porque cada versão esperava seus grandes recursos ficarem prontos. Em setembro de 2017, Mark Reinhold, da Oracle, propôs [inverter a lógica](https://mreinhold.org/blog/forward-faster): uma *feature release* (versão com recursos novos) a cada seis meses, atualizações trimestrais (janeiro, abril, julho e outubro) e uma LTS a cada três anos. O calendário passa a ser fixo, e o recurso que não fica pronto a tempo simplesmente vai para a versão seguinte. Pelo processo descrito na [JEP 3](https://openjdk.org/jeps/3), em junho e dezembro o repositório principal é bifurcado para estabilizar a próxima versão, que chega em março ou setembro, como mostram as datas do diagrama. O [guia de atualizações do Java](/posts/guia-atualizacoes-java/#como-funciona-o-ciclo-de-releases) detalha esse ciclo.

![Linha do tempo das versões 8 a 17 mostrando lançamentos a cada seis meses a partir do 9, as LTS 8, 11 e 17 e o período de Premier Support da Oracle de cada uma: 9 e 10 cobertas só até a versão seguinte, 11 com Premier até set/2023 e Extended até jan/2032](/posts/java-11/modelo-de-releases.svg)

No diagrama, cada barra é o Premier Support da Oracle para uma versão. Três consequências para quem mantém sistemas:

- **Versões não-LTS têm vida curta.** O Premier Support do 9 terminou em março de 2018 e o do 10 em setembro de 2018, quando saiu a versão seguinte.
- **As LTS são o alvo natural de produção.** A Oracle define 8, 11, 17, 21 e 25 como LTS e hoje pretende lançar uma a cada dois anos ([roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)); o salto de 11 para 17 vem do intervalo de três anos da proposta original.
- **Recursos grandes chegam em etapas.** Uma API pode sair antes como *módulo incubadora*, ainda não final e fora da resolução padrão ([JEP 11](https://openjdk.org/jeps/11)); a partir do Java 12, recursos de linguagem e da JVM também podem sair em *preview*, completos mas desligados por padrão ([JEP 12](https://openjdk.org/jeps/12)). O [post do Java 17](/posts/java-17/#recursos-em-preview-ou-incubadora-nesta-lts) mostra esse mecanismo em uso.

### O novo formato do número de versão

**Chegou em:** Java 9 (final, [JEP 223](https://openjdk.org/jeps/223)) → Java 10 (final, [JEP 322](https://openjdk.org/jeps/322))

No Java 8, a propriedade `java.version` tinha a forma `1.8.0_nnn`. A [JEP 223](https://openjdk.org/jeps/223) abandonou o prefixo `1.` e definiu `$MAJOR.$MINOR.$SECURITY`. A [JEP 322](https://openjdk.org/jeps/322) adaptou o esquema ao calendário de seis meses: `$FEATURE.$INTERIM.$UPDATE.$PATCH`. `$FEATURE` sobe a cada versão semestral (10 em março de 2018, 11 em setembro de 2018), `$INTERIM` fica em zero, `$UPDATE` conta as atualizações e `$PATCH` é reservado para correções emergenciais. O [guia de migração da Oracle](https://docs.oracle.com/en/java/javase/11/migrate/index.html) avisa que código que interpreta a string de versão pode precisar de ajuste:

```java title="Versao.java"
public class Versao {
    public static void main(String[] args) {
        // Frágil: pressupõe o formato "1.x" do Java 8 ("1.8.0_202")
        String propriedade = System.getProperty("java.version");  // no Java 11: "11.0.x"
        String segundoPedaco = propriedade.split("\\.")[1];        // "0" no Java 11, não "11"
        System.out.println(propriedade + " -> " + segundoPedaco);

        // Robusto: Runtime.version() (Java 9) e feature() (Java 10)
        Runtime.Version versao = Runtime.version();
        System.out.println("feature=" + versao.feature() + " update=" + versao.update());
        if (versao.feature() >= 11) {
            System.out.println("pode usar HttpClient");
        }
    }
}
```

[`Runtime.Version`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/Runtime.Version.html) existe desde o Java 9; os métodos `feature()`, `interim()`, `update()` e `patch()` foram adicionados no Java 10.

### Licenças e distribuições

Junto com o ciclo novo mudou a distribuição, e isso pesa na escolha do JDK para produção:

- **Oracle JDK 11**: licença OTN, que permite sem custo uso pessoal, desenvolvimento, testes, prototipação, demonstração e alguns outros usos limitados ([Oracle Java SE Licensing FAQ](https://www.oracle.com/java/technologies/javase/jdk-faqs.html)).
- **Builds do OpenJDK publicados pela Oracle**: licença GPLv2 com Classpath Exception, mas, para o Java 11, só até o **11.0.2, de janeiro de 2019** (mesma FAQ). As atualizações seguintes do OpenJDK 11 vêm de outros distribuidores, como o [Eclipse Temurin](https://adoptium.net/support/) e o [Amazon Corretto](https://aws.amazon.com/corretto/faqs/).
- **Diferenças técnicas pequenas.** As [release notes do JDK 11](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html) listam, entre outras: instaladores e Solaris só no Oracle JDK, Alpine Linux só no OpenJDK, saída diferente de `java -version` e assinatura obrigatória de provedores criptográficos de terceiros só no Oracle JDK. Recursos antes comerciais, como o Flight Recorder, entraram no OpenJDK ([JEP 328](https://openjdk.org/jeps/328)); por isso a flag `-XX:+UnlockCommercialFeatures` só gera aviso no Oracle JDK 11, mas impede a JVM de iniciar nos builds do OpenJDK.

O [guia de atualizações do Java](/posts/guia-atualizacoes-java/#distribuições-de-jdk) compara as distribuições atuais e seus custos.

## Sistema de módulos (JPMS)

O sistema de módulos da plataforma Java (JPMS, *Java Platform Module System*) é a maior mudança do período. Mesmo que você nunca escreva um `module-info.java`, ele afeta a sua aplicação, porque o próprio JDK foi dividido em módulos.

### Módulos e module-info.java

**Chegou em:** Java 9 (final, [JEP 261](https://openjdk.org/jeps/261) e [JEP 200](https://openjdk.org/jeps/200))

No Java 8, o classpath é uma lista plana de JARs: nada declara que um JAR depende de outro, qualquer classe `public` é visível para todos e uma dependência ausente só aparece quando alguma classe tenta carregá-la. O JPMS, especificado pela JSR 376 e implementado pela [JEP 261](https://openjdk.org/jeps/261), cria o **módulo**: um conjunto nomeado de pacotes que declara do que depende (`requires`) e o que expõe (`exports`). A [JEP 200](https://openjdk.org/jeps/200) usou esse mecanismo para dividir o próprio JDK em módulos como `java.base`, `java.sql` e `java.logging`.

![Comparação entre classpath do Java 8, uma lista plana de JARs em que tudo é visível e dependências ausentes só falham em execução, e module path do Java 9, um grafo em que com.exemplo.pedidos requer com.exemplo.estoque e java.logging, só o pacote api do estoque é exportado e o pacote interno fica inacessível](/posts/java-11/classpath-x-module-path.svg)

O diagrama compara os dois modelos com o exemplo abaixo: `com.exemplo.estoque` publica uma interface e esconde a implementação; `com.exemplo.pedidos` consome o serviço sem conhecer a classe concreta.

```java title="src/com.exemplo.estoque/module-info.java"
module com.exemplo.estoque {
    // só o pacote de API fica visível para outros módulos
    exports com.exemplo.estoque.api;

    // entrega uma implementação via ServiceLoader, sem expor a classe
    provides com.exemplo.estoque.api.Estoque
        with com.exemplo.estoque.interno.EstoqueEmMemoria;
}
```

```java title="src/com.exemplo.estoque/com/exemplo/estoque/api/Estoque.java"
package com.exemplo.estoque.api;

public interface Estoque {
    int disponivel(String sku);
}
```

```java title="src/com.exemplo.estoque/com/exemplo/estoque/interno/EstoqueEmMemoria.java"
package com.exemplo.estoque.interno;

import com.exemplo.estoque.api.Estoque;
import java.util.Map;

public class EstoqueEmMemoria implements Estoque {
    private final Map<String, Integer> saldo = Map.of("CAMISA-P", 12, "CAMISA-M", 0);

    @Override
    public int disponivel(String sku) {
        return saldo.getOrDefault(sku, 0);
    }
}
```

```java title="src/com.exemplo.pedidos/module-info.java"
module com.exemplo.pedidos {
    requires com.exemplo.estoque;   // dependência explícita, verificada na compilação e na inicialização
    requires java.logging;          // módulo da plataforma fora do java.base

    uses com.exemplo.estoque.api.Estoque;
}
```

```java title="src/com.exemplo.pedidos/com/exemplo/pedidos/App.java"
package com.exemplo.pedidos;

import com.exemplo.estoque.api.Estoque;
import java.util.ServiceLoader;
import java.util.logging.Logger;

public class App {
    private static final Logger LOG = Logger.getLogger(App.class.getName());

    public static void main(String[] args) {
        Estoque estoque = ServiceLoader.load(Estoque.class)
                .findFirst()
                .orElseThrow();
        LOG.info("CAMISA-P disponível: " + estoque.disponivel("CAMISA-P"));
    }
}
```

Compilação e execução usam o **module path** em vez do classpath:

```bash
javac -d out --module-source-path src $(find src -name "*.java")
java --module-path out -m com.exemplo.pedidos/com.exemplo.pedidos.App
# INFO: CAMISA-P disponível: 12
```

Se `pedidos` importar `com.exemplo.estoque.interno.EstoqueEmMemoria`, a compilação falha com `package com.exemplo.estoque.interno is not visible`, porque o pacote não foi exportado. As diretivas principais do `module-info.java`, definidas na [seção 7.7 da especificação da linguagem](https://docs.oracle.com/javase/specs/jls/se11/html/jls-7.html#jls-7.7):

| Diretiva | Efeito |
| --- | --- |
| `requires M` | o módulo lê `M` e pode usar os pacotes que `M` exporta |
| `requires transitive M` | quem requer este módulo também passa a ler `M` |
| `requires static M` | dependência obrigatória na compilação e opcional em execução |
| `exports P` / `exports P to M` | torna os tipos públicos de `P` acessíveis a todos ou só a `M` |
| `opens P` / `open module` | libera reflexão profunda (membros privados) em tempo de execução |
| `uses S` / `provides S with I` | consumo e oferta de serviços via `ServiceLoader` |

**Não é obrigatório modularizar a aplicação.** Código no classpath continua funcionando: ele pertence ao *unnamed module* (módulo sem nome), que lê todos os módulos observáveis ([JLS 7.7.5](https://docs.oracle.com/javase/specs/jls/se11/html/jls-7.html#jls-7.7.5)). Um JAR sem `module-info` colocado no module path vira um *automatic module*, cujo nome vem do atributo `Automatic-Module-Name` do manifesto ou, na falta dele, do nome do arquivo ([Javadoc de `ModuleFinder`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/module/ModuleFinder.html)). Os dois mecanismos permitem migrar aos poucos: primeiro rodar tudo no classpath, depois modularizar o que fizer sentido.

### Encapsulamento das APIs internas do JDK

**Chegou em:** Java 9 (final, [JEP 260](https://openjdk.org/jeps/260))

Muitas bibliotecas usavam classes internas do JDK, como `sun.misc.BASE64Encoder`. A [JEP 260](https://openjdk.org/jeps/260) dividiu essas APIs em dois grupos:

- **Não críticas**, com substituto suportado (por exemplo, `java.util.Base64`): ficam encapsuladas por padrão.
- **Críticas**, sem substituto no Java 8, como `sun.misc.Unsafe` e `sun.reflect.ReflectionFactory`: continuam acessíveis pelo módulo `jdk.unsupported`.

Usar um pacote encapsulado diretamente no código-fonte vira erro de compilação. Já o acesso por reflexão (por exemplo, `setAccessible(true)` em um campo privado do JDK) continua funcionando do Java 9 ao 11, com aviso: pela [JEP 261](https://openjdk.org/jeps/261), o padrão `--illegal-access=permit` abre ao classpath os pacotes internos que já existiam no Java 8 e avisa uma única vez, no primeiro acesso ilegal. A mesma JEP anunciava que `deny` viraria o padrão, e foi o que aconteceu: o Java 16 mudou o padrão ([JEP 396](https://openjdk.org/jeps/396)) e o Java 17 tirou o efeito da opção ([JEP 403](https://openjdk.org/jeps/403)), como detalha o [post do Java 17](/posts/java-17/#encapsulamento-forte-dos-internos-do-jdk). No Java 11, o aviso tem esta forma:

```text
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.exemplo.Biblioteca (file:/app/lib.jar) to field java.lang.String.value
WARNING: Please consider reporting this to the maintainers of com.exemplo.Biblioteca
WARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations
WARNING: All illegal access operations will be denied in a future release
```

O [guia de migração da Oracle](https://docs.oracle.com/en/java/javase/11/migrate/index.html) recomenda atualizar a biblioteca responsável, usar `jdeps --jdk-internals` para achar dependências estáticas e, onde não houver alternativa, abrir só o pacote necessário:

```bash
# lista usos de APIs internas e sugere substitutos
jdeps --jdk-internals app.jar

# abre um pacote interno específico para o código do classpath
java --add-opens java.base/java.lang=ALL-UNNAMED -jar app.jar

# simula o comportamento futuro para testar a aplicação
java --illegal-access=deny -jar app.jar
```

### Imagem de runtime modular: adeus rt.jar

**Chegou em:** Java 9 (final, [JEP 220](https://openjdk.org/jeps/220))

A [JEP 220](https://openjdk.org/jeps/220) reestruturou o JDK instalado: somem `rt.jar` e `tools.jar`, cujo conteúdo passa para um formato interno em `lib/`, e as classes e recursos da plataforma passam a ser endereçados pelo esquema de URI `jrt:`. Também saíram o mecanismo de extensões (`lib/ext`, `java.ext.dirs`) e o de *endorsed standards* (`lib/endorsed`, `java.endorsed.dirs`), que permitia substituir APIs do JDK por versões mais novas. Ferramentas antigas que abriam `rt.jar` diretamente precisam de versões atualizadas.

Outra consequência: a partir do 11, a Oracle só distribui o JDK, sem JRE separado, e indica o `jlink` para montar runtimes menores ([JDK 11 Release Notes](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html)).

### jlink: runtime sob medida

**Chegou em:** Java 9 (final, [JEP 282](https://openjdk.org/jeps/282))

Com o JDK modularizado, dá para montar um runtime só com os módulos que a aplicação usa. O `jlink` parte dos módulos raiz, resolve as dependências e gera uma imagem com `bin/java` e, opcionalmente, um script de lançamento ([documentação do jlink](https://docs.oracle.com/en/java/javase/11/tools/jlink.html)).

```bash
jlink --module-path $JAVA_HOME/jmods:out \
      --add-modules com.exemplo.pedidos \
      --launcher pedidos=com.exemplo.pedidos/com.exemplo.pedidos.App \
      --strip-debug --no-header-files --no-man-pages --compress=2 \
      --output runtime

runtime/bin/java --list-modules
# com.exemplo.estoque
# com.exemplo.pedidos
# java.base@11.0.x
# java.logging@11.0.x

runtime/bin/pedidos
```

![Diagrama do jlink: a partir dos jmods do JDK 11 e dos módulos da aplicação, o jlink gera uma pasta runtime com bin/java, o script pedidos e apenas os módulos com.exemplo.pedidos, com.exemplo.estoque, java.logging e java.base](/posts/java-11/jlink-runtime-enxuto.svg)

Como mostra o diagrama, só entram os módulos alcançados pelos `requires`. O cuidado está nos provedores de serviço, que são carregados via `ServiceLoader` e não aparecem em nenhum `requires`: o módulo `jdk.crypto.ec` (provedor `SunEC`, de curvas elípticas), por exemplo, precisa ser adicionado com `--add-modules`, ou com `--bind-services`, que inclui todos os provedores disponíveis e aumenta a imagem. Para uma aplicação não modular, `jdeps --print-module-deps app.jar` lista os módulos da plataforma que ela usa.

## Linguagem

As mudanças de sintaxe do período são poucas e reduzem cerimônia. As grandes novidades de linguagem, como [switch expressions](/posts/java-17/#switch-expressions), [text blocks](/posts/java-17/#text-blocks) e [records](/posts/java-17/#records), vieram depois do 11 e estão no post do Java 17.

### Ajustes do Project Coin: métodos private em interface e mais

**Chegou em:** Java 9 (final, [JEP 213](https://openjdk.org/jeps/213))

A [JEP 213](https://openjdk.org/jeps/213) fez pequenos ajustes em recursos do Java 7 e 8 ([Java Language Changes](https://docs.oracle.com/en/java/javase/11/language/java-language-changes.html)):

- **Métodos `private` em interfaces**, para compartilhar código entre métodos `default` sem expô-lo.
- **Variáveis final ou efetivamente finais direto no try-with-resources**, sem declarar uma nova variável.
- **Diamond (`<>`) em classes anônimas**, quando o tipo inferido é denotável.
- **`@SafeVarargs` em métodos de instância privados.**
- **`_` deixa de ser identificador válido.** No Java 8 gerava aviso; a partir do 9 é erro de compilação.

```java title="Linguagem9.java"
import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class Linguagem9 {

    interface Validador {
        // método default público reaproveitando lógica privada
        default boolean valido(String cpf) {
            return somenteDigitos(cpf) && cpf.length() == 11;
        }

        // Java 9: método privado em interface
        private boolean somenteDigitos(String valor) {
            return valor.chars().allMatch(Character::isDigit);
        }
    }

    public static void main(String[] args) throws IOException {
        Validador validador = new Validador() { };
        System.out.println(validador.valido("12345678901")); // true

        // Java 9: variável efetivamente final direto no try-with-resources
        BufferedReader leitor = new BufferedReader(new StringReader("linha 1\nlinha 2"));
        try (leitor) {
            System.out.println(leitor.readLine()); // linha 1
        }

        // Java 9: diamond em classe anônima
        Comparator<String> porTamanho = new Comparator<>() {
            @Override
            public int compare(String a, String b) {
                return Integer.compare(a.length(), b.length());
            }
        };
        List<String> nomes = new ArrayList<>(List.of("Ana", "Bruna", "Caio"));
        nomes.sort(porTamanho);
        System.out.println(nomes); // [Ana, Caio, Bruna]
    }
}
```

### var: inferência de tipo em variáveis locais

**Chegou em:** Java 10 (final, [JEP 286](https://openjdk.org/jeps/286))

No Java 8, uma variável local sempre exige o tipo escrito por inteiro, mesmo quando ele já aparece no lado direito da atribuição. Com `var`, o compilador infere o tipo da variável local a partir do inicializador. O tipo continua estático: `var` não é tipagem dinâmica. Pela [JEP 286](https://openjdk.org/jeps/286), vale para variáveis locais com inicializador e variáveis do `for` aprimorado e do `for` tradicional; não vale para campos, parâmetros de método ou construtor, tipos de retorno ou parâmetros de `catch`. Tecnicamente, `var` é um *nome de tipo reservado*, não uma palavra-chave, então variáveis ou métodos chamados `var` continuam compilando.

```java title="Var10.java" {7,11,12}
import java.util.HashMap;
import java.util.List;

public class Var10 {
    public static void main(String[] args) {
        // Java 8: Map<String, List<Integer>> notasPorAluno = new HashMap<String, List<Integer>>();
        var notasPorAluno = new HashMap<String, List<Integer>>(); // tipo: HashMap<String, List<Integer>>
        notasPorAluno.put("ana", List.of(8, 9));
        notasPorAluno.put("caio", List.of(7));

        for (var entrada : notasPorAluno.entrySet()) {
            var media = entrada.getValue().stream()
                    .mapToInt(Integer::intValue)
                    .average()
                    .orElse(0); // tipo: double
            System.out.println(entrada.getKey() + " -> " + media); // ana -> 8.5, caio -> 7.0
        }
    }
}
```

Onde `var` não é permitido ou o tipo não pode ser inferido, o código não compila. Cada linha abaixo gera um erro:

```java title="VarInvalido.java"
class VarInvalido {
    var campo = 1;              // 'var' is not allowed here: não vale para campos

    void metodo() {
        var semValor;           // cannot infer type: falta o inicializador
        var nulo = null;        // cannot infer type: null não define um tipo
        var lambda = () -> 42;  // cannot infer type: lambda precisa de um tipo-alvo explícito
    }
}
```

Regra prática: use `var` quando o tipo fica evidente no lado direito (`new`, fábricas com nome claro) e mantenha o tipo explícito quando ele documenta algo que o nome da variável não diz.

### var em parâmetros de lambda

**Chegou em:** Java 11 (final, [JEP 323](https://openjdk.org/jeps/323))

O Java 11 permite `var` nos parâmetros de lambdas implicitamente tipadas: `(var a, var b) -> a + b` equivale a `(a, b) -> a + b`. A vantagem é poder aplicar modificadores e anotações sem escrever o tipo completo. Pela [JEP 323](https://openjdk.org/jeps/323), ou todos os parâmetros usam `var`, ou nenhum.

```java title="VarLambda.java"
import java.util.function.BiFunction;

public class VarLambda {
    @interface NaoNulo { }

    public static void main(String[] args) {
        BiFunction<Integer, Integer, Integer> soma = (var a, var b) -> a + b;
        System.out.println(soma.apply(2, 3)); // 5

        // o ganho real: anotar parâmetros mantendo o tipo inferido
        BiFunction<String, String, String> juntar = (@NaoNulo var x, @NaoNulo var y) -> x + y;
        System.out.println(juntar.apply("Java ", "11")); // Java 11

        // (var x, y) -> ...        não compila: mistura var com parâmetro sem tipo
        // (var x, String y) -> ... não compila: mistura var com tipo explícito
    }
}
```

### Nestmates: acesso privado entre classes aninhadas

**Chegou em:** Java 11 (final, [JEP 181](https://openjdk.org/jeps/181))

Classes aninhadas são compiladas em arquivos `.class` separados. Até o Java 10, quando uma classe interna acessava um membro `private` da externa, o compilador gerava *métodos ponte* com visibilidade de pacote (os `access$000`), que, segundo a [JEP 181](https://openjdk.org/jeps/181), enfraquecem o encapsulamento, aumentam um pouco o tamanho da aplicação e confundem ferramentas. O Java 11 introduz os *nests*: a JVM sabe que as classes pertencem ao mesmo ninho e permite o acesso direto. A reflexão ganhou `Class.getNestHost()`, `getNestMembers()` e `isNestmateOf()`.

```java title="Ninho.java"
public class Ninho {
    private int segredo = 42;

    class Interna {
        int ler() {
            return segredo; // acesso a membro privado da classe externa
        }
    }

    public static void main(String[] args) {
        System.out.println(Interna.class.getNestHost().getSimpleName()); // Ninho
        System.out.println(Ninho.class.isNestmateOf(Interna.class));     // true
    }
}
```

Compilada no JDK 8, `javap -p Ninho` mostra o método sintético `static int access$000(Ninho)`; no JDK 11 ele não existe e o bytecode de `Interna` lê o campo com `getfield` diretamente. A mudança é invisível para a maioria do código, mas explica diferenças em ferramentas que manipulam bytecode.

## Concorrência

### CompletableFuture e Flow

**Chegou em:** Java 9 (final, [JEP 266](https://openjdk.org/jeps/266))

O [`CompletableFuture` do Java 8](/posts/java-8/#completablefuture-longadder-stampedlock-e-concurrenthashmap) não tinha um jeito direto de limitar o tempo de espera de uma tarefa assíncrona. A [JEP 266](https://openjdk.org/jeps/266) acrescentou `orTimeout`, `completeOnTimeout`, `failedFuture` e `delayedExecutor`, entre outros ([Javadoc de `CompletableFuture`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/concurrent/CompletableFuture.html)). A mesma JEP trouxe as interfaces de *reactive streams* em `java.util.concurrent.Flow` (publicador e assinante de um fluxo assíncrono, com controle de quantos itens o assinante aceita), usadas pelo HTTP Client para enviar e receber corpos.

```java title="Timeouts.java"
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class Timeouts {
    public static void main(String[] args) {
        // valor padrão se a tarefa passar do tempo
        String resultado = CompletableFuture
                .supplyAsync(Timeouts::consultaLenta)
                .completeOnTimeout("valor-padrão", 200, TimeUnit.MILLISECONDS)
                .join();
        System.out.println(resultado); // valor-padrão

        // ou falha com TimeoutException
        CompletableFuture.supplyAsync(Timeouts::consultaLenta)
                .orTimeout(200, TimeUnit.MILLISECONDS)
                .exceptionally(erro -> {
                    System.out.println(erro.getClass().getSimpleName()); // TimeoutException
                    return null;
                })
                .join();
    }

    static String consultaLenta() {
        try {
            Thread.sleep(2_000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return "valor-real";
    }
}
```

Use `completeOnTimeout` quando existe um valor aceitável de reserva e `orTimeout` quando o atraso deve virar erro. Nos dois casos, o timeout só completa o `CompletableFuture`: a tarefa original não é interrompida e continua ocupando a thread do pool até terminar, porque essa classe não usa interrupção para controlar o processamento (veja `cancel` no Javadoc).

## APIs da biblioteca padrão

Muitas das adições do dia a dia não têm JEP própria; nesses casos a fonte é o Javadoc do JDK 11, que registra em `Since` a versão de cada método.

### Coleções imutáveis: List.of, Set.of, Map.of e cópias

**Chegou em:** Java 9 (final, [JEP 269](https://openjdk.org/jeps/269)) → Java 10 (final)

Criar uma coleção pequena e imutável no Java 8 exigia várias linhas e um wrapper `Collections.unmodifiable...`. A [JEP 269](https://openjdk.org/jeps/269) adicionou fábricas estáticas em `List`, `Set` e `Map` (`Map.of` aceita até dez pares; acima disso, use `Map.ofEntries`). O Java 10 completou com `List.copyOf`, `Set.copyOf`, `Map.copyOf` e os coletores `Collectors.toUnmodifiableList`, `toUnmodifiableSet` e `toUnmodifiableMap` ([JDK 10 Release Notes](https://www.oracle.com/java/technologies/javase/10-relnote-issues.html)).

```java title="Colecoes.java" {11-13,18,25}
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class Colecoes {
    public static void main(String[] args) {
        // Java 8: Collections.unmodifiableSet(new HashSet<>(Arrays.asList("BRL", "USD", "EUR")))
        // Java 9: fábricas imutáveis (JEP 269)
        List<String> status = List.of("ABERTO", "PAGO", "CANCELADO");
        Set<String> moedas = Set.of("BRL", "USD", "EUR");
        Map<String, Integer> ddd = Map.of("SP", 11, "RJ", 21);
        System.out.println(ddd.get("SP")); // 11

        // Java 10: cópia imutável; mudanças na origem não afetam a cópia
        List<String> mutavel = new ArrayList<>(status);
        List<String> copia = List.copyOf(mutavel);
        mutavel.add("ESTORNADO");
        System.out.println(copia); // [ABERTO, PAGO, CANCELADO]

        // Java 10: coletor que já devolve uma lista imutável
        List<String> minusculas = moedas.stream()
                .map(String::toLowerCase)
                .collect(Collectors.toUnmodifiableList());

        tentar("add", () -> status.add("NOVO"));          // add -> UnsupportedOperationException
        tentar("coletor", () -> minusculas.clear());      // coletor -> UnsupportedOperationException
        tentar("null", () -> List.of("a", null));         // null -> NullPointerException
        tentar("duplicado", () -> Set.of("BRL", "BRL"));  // duplicado -> IllegalArgumentException
    }

    static void tentar(String nome, Runnable acao) {
        try {
            acao.run();
        } catch (RuntimeException e) {
            System.out.println(nome + " -> " + e.getClass().getSimpleName());
        }
    }
}
```

Diferenças em relação a `Arrays.asList` e aos wrappers antigos, documentadas no Javadoc de [`List`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/List.html), [`Set`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/Set.html) e [`Map`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/Map.html):

- elementos, chaves e valores `null` são rejeitados com `NullPointerException`;
- `Set.of` e `Map.of` rejeitam duplicatas com `IllegalArgumentException`;
- a ordem de iteração de `Set.of` e `Map.of` **não é especificada e pode mudar**, então não escreva testes que dependam dela;
- `copyOf` devolve uma coleção desconectada da origem, diferente de `Collections.unmodifiableList`, que é só uma visão.

### Optional e Stream

**Chegou em:** Java 9 (final) → Java 10 (final) → Java 11 (final)

[`Optional`](/posts/java-8/#optional) e a [Stream API](/posts/java-8/#stream-api) chegaram no Java 8 e receberam nas três versões seguintes os métodos que faltavam para uso fluente, sem JEP própria ([Javadoc de `Optional`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/Optional.html) e [de `Stream`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/stream/Stream.html)). No Java 9 vieram `Optional.or`, `ifPresentOrElse` e `stream`, além de `Stream.takeWhile`, `dropWhile`, `iterate` com condição e `ofNullable`. O Java 10 adicionou `Optional.orElseThrow()` sem argumentos, que as [release notes](https://www.oracle.com/java/technologies/javase/10-relnote-issues.html) descrevem como sinônimo de `get()` e alternativa preferida a ele, e o Java 11, `Optional.isEmpty()`.

```java title="OptionalEStream.java"
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class OptionalEStream {

    static Optional<String> buscarNoCache(String id) { return Optional.empty(); }
    static Optional<String> buscarNoBanco(String id) { return Optional.of("cliente-" + id); }

    public static void main(String[] args) {
        // Java 9: or() só consulta o banco se o cache vier vazio
        Optional<String> cliente = buscarNoCache("42").or(() -> buscarNoBanco("42"));

        // Java 9: ifPresentOrElse trata os dois caminhos
        cliente.ifPresentOrElse(
                c -> System.out.println("achou " + c),       // achou cliente-42
                () -> System.out.println("não achou"));

        // Java 9: stream() transforma Optional em Stream de 0 ou 1 elemento
        List<String> encontrados = List.of("1", "2", "3").stream()
                .map(OptionalEStream::buscarNoCache)
                .flatMap(Optional::stream)
                .collect(Collectors.toList());
        System.out.println(encontrados); // []

        // Java 10: orElseThrow() sem argumentos; Java 11: isEmpty()
        String valor = cliente.orElseThrow();
        System.out.println(valor + " vazio? " + cliente.isEmpty()); // cliente-42 vazio? false

        // Java 9: takeWhile / dropWhile param no primeiro elemento que falha
        List<Integer> leituras = List.of(10, 20, 30, 5, 40);
        System.out.println(leituras.stream().takeWhile(n -> n < 25).collect(Collectors.toList())); // [10, 20]
        System.out.println(leituras.stream().dropWhile(n -> n < 25).collect(Collectors.toList())); // [30, 5, 40]

        // Java 9: iterate com condição de parada, como um for
        Stream.iterate(1, n -> n <= 1000, n -> n * 10).forEach(System.out::println); // 1, 10, 100, 1000

        // Java 9: ofNullable evita o if (x != null)
        String talvezNulo = System.getenv("VARIAVEL_QUE_NAO_EXISTE");
        System.out.println(Stream.ofNullable(talvezNulo).count()); // 0
    }
}
```

`takeWhile` não é um `filter`: o `5` depois do `30` fica de fora, porque a leitura para no primeiro elemento que não satisfaz a condição. Use-o em sequências ordenadas ou quando a regra de parada é justamente "até o primeiro que falhar". Os coletores `Collectors.filtering` e `Collectors.flatMapping`, úteis como coletores de segundo nível em `groupingBy`, também são do Java 9 ([Javadoc de `Collectors`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/stream/Collectors.html)).

### String, Files e Predicate.not

**Chegou em:** Java 11 (final)

O Java 11 adicionou utilitários de uso diário, sem JEP própria; o Java 17 trouxe outros ([novos métodos em `String`](/posts/java-17/#novos-métodos-em-string-e-charsequence) e [`Stream.toList`](/posts/java-17/#streamtolist-e-streammapmulti)) (Javadoc de [`String`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/String.html), [`Files`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/nio/file/Files.html), [`Predicate`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/function/Predicate.html), [`Collection`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/Collection.html) e [`Path`](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/nio/file/Path.html)):

| Método | O que faz |
| --- | --- |
| `String.isBlank()` | `true` se a string está vazia ou só tem espaços em branco |
| `String.strip()`, `stripLeading()`, `stripTrailing()` | remove espaços usando `Character.isWhitespace`, que reconhece espaços Unicode (o `trim()` só remove caracteres até `U+0020`) |
| `String.repeat(int)` | repete a string |
| `String.lines()` | `Stream<String>` com as linhas, aceitando `\n`, `\r` e `\r\n` |
| `Files.readString` / `Files.writeString` | lê e grava texto em uma chamada, em UTF-8 por padrão |
| `Predicate.not` | nega um predicado, útil com method references |
| `Collection.toArray(IntFunction)` | converte para array usando um gerador, como `String[]::new` |
| `Path.of` | fábrica de `Path` na própria interface |

```java title="StringsEArquivos.java"
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.function.Predicate;
import java.util.stream.Collectors;

public class StringsEArquivos {
    public static void main(String[] args) throws IOException {
        System.out.println("   ".isBlank());                 // true
        System.out.println("=".repeat(10));                  // ==========
        System.out.println("a\nb\r\nc".lines().count());     // 3

        String comEspacoUnicode = "\u2003texto\u2003";         // U+2003: espaço largo (em space)
        System.out.println(comEspacoUnicode.trim().length());  // 7: trim() não remove U+2003
        System.out.println(comEspacoUnicode.strip().length()); // 5: strip() remove

        Path arquivo = Files.createTempFile("pedidos", ".csv");
        Files.writeString(arquivo, "id;valor\n1;10.00\n\n2;25.50\n");
        String conteudo = Files.readString(arquivo);

        // antes: .filter(linha -> !linha.isBlank())
        List<String> linhas = conteudo.lines()
                .filter(Predicate.not(String::isBlank))
                .collect(Collectors.toList());
        System.out.println(linhas);                          // [id;valor, 1;10.00, 2;25.50]

        String[] array = linhas.toArray(String[]::new);
        System.out.println(array.length);                    // 3
        Files.delete(arquivo);
    }
}
```

Outras adições pequenas do período, também registradas no Javadoc: `InputStream.transferTo` e `readAllBytes` (9), `Objects.requireNonNullElse` e `requireNonNullElseGet` (9), `Reader.transferTo` (10), `InputStream.readNBytes(int)`, `InputStream.nullInputStream` e `Writer.nullWriter` (11).

### HTTP Client

**Chegou em:** Java 9 (incubadora, [JEP 110](https://openjdk.org/jeps/110)) → Java 10 (2ª incubadora) → Java 11 (final, [JEP 321](https://openjdk.org/jeps/321))

No Java 8, a opção da biblioteca padrão para HTTP era o `HttpURLConnection`. A [JEP 110](https://openjdk.org/jeps/110) resume seus problemas: foi pensado para vários protocolos hoje extintos, é anterior ao HTTP/1.1, é difícil de usar e só funciona em modo bloqueante. A nova API suporta HTTP/1.1, HTTP/2 e WebSocket, com uso síncrono e assíncrono.

Ela saiu primeiro como **módulo incubadora** (`jdk.incubator.httpclient`), que o código do classpath só enxerga com `--add-modules` ([JEP 11](https://openjdk.org/jeps/11)). No Java 11, a [JEP 321](https://openjdk.org/jeps/321) padronizou a API no módulo e pacote `java.net.http`; durante a incubação, a implementação foi quase toda reescrita e passou a ser totalmente assíncrona. O pacote incubado `jdk.incubator.http` foi removido, então código escrito para o 9 ou o 10 precisa ao menos trocar os imports ([JDK 11 Release Notes](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html)).

O exemplo faz uma chamada real a `openjdk.org`, então precisa de acesso à internet:

```java title="ClienteHttp.java"
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

public class ClienteHttp {

    public static void main(String[] args) throws IOException, InterruptedException {
        // depois de construído, o HttpClient é imutável e serve para várias requisições
        HttpClient cliente = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NORMAL) // o padrão é NEVER
                .build();

        HttpRequest requisicao = HttpRequest.newBuilder(URI.create("https://openjdk.org/projects/jdk/11/"))
                .timeout(Duration.ofSeconds(10))             // sem isso, espera indefinidamente
                .GET()
                .build();

        // síncrono: bloqueia até a resposta chegar
        HttpResponse<String> resposta = cliente.send(requisicao, HttpResponse.BodyHandlers.ofString());
        System.out.println(resposta.statusCode() + " via " + resposta.version()); // 200 via HTTP_2

        // assíncrono: sendAsync devolve um CompletableFuture e não bloqueia a thread
        CompletableFuture<Integer> status = cliente
                .sendAsync(requisicao, HttpResponse.BodyHandlers.discarding())
                .thenApply(HttpResponse::statusCode);
        System.out.println(status.join()); // 200
    }
}
```

Para enviar um corpo, usa-se um `BodyPublisher` com o mesmo `send` ou `sendAsync` (o endereço abaixo é ilustrativo):

```java
HttpRequest post = HttpRequest.newBuilder(URI.create("https://api.example.com/pedidos"))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString("{\"pedido\": 123, \"valor\": 49.90}"))
        .build();
```

Dois cuidados. Os padrões de `HttpClient.newHttpClient()` são preferência por HTTP/2 (com HTTP/1.1 quando o servidor não aceita), **nenhum redirecionamento** (`NEVER`), o seletor de proxy padrão e o `SSLContext` padrão ([Javadoc de `HttpClient`](https://docs.oracle.com/en/java/javase/11/docs/api/java.net.http/java/net/http/HttpClient.html)). E, sem `timeout` na requisição, a espera pela resposta não tem limite ([Javadoc de `HttpRequest.Builder`](https://docs.oracle.com/en/java/javase/11/docs/api/java.net.http/java/net/http/HttpRequest.Builder.html)). Como o cliente é imutável e serve para várias requisições, reaproveite a mesma instância em vez de criar uma por chamada.

### Outras APIs do período

- **Process API** ([JEP 102](https://openjdk.org/jeps/102), Java 9): `ProcessHandle` expõe PID, comando, argumentos, processo pai e descendentes, e `onExit()` devolve um `CompletableFuture` concluído quando o processo termina, tarefas que antes exigiam código nativo. Exemplo: `ProcessHandle.current().pid()`.
- **Stack-Walking API** ([JEP 259](https://openjdk.org/jeps/259), Java 9): `StackWalker` percorre a pilha sob demanda e com filtro, sem capturar o stack trace inteiro.
- **Variable Handles** ([JEP 193](https://openjdk.org/jeps/193), Java 9): `VarHandle` oferece operações atômicas, como *compare-and-set* (CAS), em campos e arrays, cobrindo usos comuns de `sun.misc.Unsafe` com uma API suportada.
- **Enhanced Deprecation** ([JEP 277](https://openjdk.org/jeps/277), Java 9): `@Deprecated` ganhou `since` e `forRemoval`, e a ferramenta `jdeprscan` procura usos de APIs depreciadas em JARs e classes.

## JVM, GC e desempenho

As mudanças desta seção não aparecem no código, mas aparecem em produção: coletor padrão, formato de log, consumo de memória e tempo de inicialização.

### G1 como coletor padrão

**Chegou em:** Java 9 (final, [JEP 248](https://openjdk.org/jeps/248)) → Java 10 (final, [JEP 307](https://openjdk.org/jeps/307))

No Java 8, o coletor padrão em servidores era o Parallel GC, voltado a throughput. A [JEP 248](https://openjdk.org/jeps/248) tornou o G1 o padrão em configurações de servidor de 32 e 64 bits, partindo da premissa de que limitar pausas costuma importar mais do que maximizar throughput. A JEP registra o risco: o G1 consome recursos de forma diferente do Parallel, e quem precisa minimizar esse overhead deve escolher outro coletor explicitamente.

O G1 evita coletas completas, mas quando elas acontecem, a implementação do Java 9 usava uma única thread. A [JEP 307](https://openjdk.org/jeps/307) paralelizou o full GC do G1, que passou a usar o mesmo número de threads das coletas young e mixed ([JDK 10 Release Notes](https://www.oracle.com/java/technologies/javase/10-relnote-issues.html)).

Na migração, uma aplicação que roda no 8 sem flags de GC muda de coletor ao subir para o 11. Se você depende do comportamento do Parallel, declare `-XX:+UseParallelGC`; caso contrário, meça latência e throughput com o G1 antes de ir para produção. Atenção também ao tamanho da máquina: o G1 é o padrão em máquinas *server-class*, que o [guia de ergonomia do GC](https://docs.oracle.com/javase/10/gctuning/ergonomics.htm) define como duas ou mais CPUs e 2 GB ou mais de memória. Em contêineres pequenos isso muda o resultado: no Temurin 11.0.32, um contêiner com 1 CPU ou 1 GB de memória recebe o Serial GC, e um com 2 CPUs e 2 GB recebe o G1.

### Compact Strings e concatenação com invokedynamic

**Chegou em:** Java 9 (final, [JEP 254](https://openjdk.org/jeps/254) e [JEP 280](https://openjdk.org/jeps/280))

Até o Java 8, `String` guardava os caracteres em um `char[]`, com dois bytes por caractere. A [JEP 254](https://openjdk.org/jeps/254) cita dados de aplicações reais indicando que strings ocupam boa parte do heap e que a maioria contém apenas caracteres Latin-1. A representação passou a ser um `byte[]` com um campo de codificação: Latin-1 (um byte por caractere) quando possível e UTF-16 quando necessário. É uma mudança só de implementação: o código não muda, e a [documentação do comando `java`](https://docs.oracle.com/en/java/javase/11/tools/java.html) indica `-XX:-CompactStrings` para desligá-la se a aplicação usar sobretudo texto fora do Latin-1 ou se uma regressão de desempenho for atribuída a ela.

A [JEP 280](https://openjdk.org/jeps/280) mudou o bytecode que o `javac` gera para `a + b + c`: em vez da sequência de `StringBuilder.append`, o compilador emite um `invokedynamic` para `java.lang.invoke.StringConcatFactory`, e a estratégia de concatenação passa a ser decidida em tempo de execução, o que permite otimizações futuras sem recompilar. Ferramentas que inspecionam ou reescrevem bytecode precisam entender esse formato.

### Logging unificado da JVM

**Chegou em:** Java 9 (final, [JEP 158](https://openjdk.org/jeps/158) e [JEP 271](https://openjdk.org/jeps/271))

Cada componente da HotSpot tinha suas próprias flags de log (`-XX:+PrintGCDetails`, `-XX:+PrintGCDateStamps`, `-Xloggc`...). A [JEP 158](https://openjdk.org/jeps/158) criou um framework único, configurado por `-Xlog:<tags>=<nível>:<saída>:<decorações>`, e a [JEP 271](https://openjdk.org/jeps/271) reimplementou o log de GC sobre ele. O formato das linhas mudou, então parsers de log de GC precisam ser revistos ([Migration Guide](https://docs.oracle.com/en/java/javase/11/migrate/index.html)).

```bash
# uma linha por coleta
java -Xlog:gc -jar app.jar

# log detalhado de GC em arquivo, com data, uptime, nível e tags em cada linha
java -Xlog:gc*:file=gc.log:time,uptime,level,tags -jar app.jar

# lista tags, níveis e decorações disponíveis
java -Xlog:help
```

As flags antigas não se comportam todas do mesmo jeito. No Temurin 11.0.32, `-XX:+PrintGCDetails` e `-Xloggc` ainda são aceitas, com aviso de depreciação e conversão para `-Xlog`, mas `-XX:+PrintGCDateStamps` gera `Unrecognized VM option` e **a JVM não inicia**. Revise os scripts de inicialização antes da migração.

### Application Class-Data Sharing (AppCDS)

**Chegou em:** Java 10 (final, [JEP 310](https://openjdk.org/jeps/310))

Ao iniciar, a JVM lê, verifica e prepara cada classe, trabalho que se repete a cada execução. O Class-Data Sharing (CDS), presente desde o JDK 5, grava esse resultado em um arquivo que a JVM mapeia direto na memória, o que reduz o tempo de inicialização e permite que várias JVMs na mesma máquina compartilhem essas páginas. Até então, só as classes do próprio JDK carregadas pelo class loader de bootstrap podiam ser arquivadas. A [JEP 310](https://openjdk.org/jeps/310) estendeu o mecanismo às classes da aplicação e da plataforma. No Java 10 era preciso `-XX:+UseAppCDS`; no Java 11 a opção ficou obsoleta e o recurso passou a estar sempre disponível ([JDK-8193213](https://bugs.openjdk.org/browse/JDK-8193213)).

```bash
# 1. roda a aplicação e registra as classes carregadas
java -Xshare:off -XX:DumpLoadedClassList=app.lst -cp app.jar com.exemplo.Main

# 2. gera o arquivo compartilhado com essas classes
java -Xshare:dump -XX:SharedClassListFile=app.lst -XX:SharedArchiveFile=app.jsa -cp app.jar

# 3. inicia usando o arquivo (o classpath deve ser o mesmo da geração)
java -Xshare:on -XX:SharedArchiveFile=app.jsa -cp app.jar com.exemplo.Main
```

Com `-Xlog:class+load`, as classes vindas do arquivo aparecem com `source: shared objects file`, o que confirma que ele está sendo usado. O processo em três passos ficou mais simples depois: o Java 12 e o 13 trouxeram arquivo CDS padrão e arquivamento dinâmico ([post do Java 17](/posts/java-17/#class-data-sharing-padrão-e-dinâmico)), e o Java 24 e o 25 evoluíram a ideia para o [cache AOT do Projeto Leyden](/posts/java-25/#cache-aot-inicialização-e-warmup-mais-rápidos-projeto-leyden).

### JVM ciente de contêineres

**Chegou em:** Java 10 (final, [JDK-8146115](https://bugs.openjdk.org/browse/JDK-8146115))

Esta melhoria não tem JEP, mas é uma das mais relevantes para quem roda em Docker ou Kubernetes. Segundo as [release notes do JDK 10](https://www.oracle.com/java/technologies/javase/10-relnote-issues.html), a JVM passou a detectar que está em um contêiner Linux e a usar o número de CPUs e a memória alocados ao contêiner, em vez dos valores do host. O suporte é ligado por padrão (`-XX:-UseContainerSupport` desliga). Vieram junto:

- `-XX:ActiveProcessorCount=n`, que fixa o número de CPUs visto pela JVM;
- `-XX:InitialRAMPercentage`, `-XX:MaxRAMPercentage` e `-XX:MinRAMPercentage` ([JDK-8186248](https://bugs.openjdk.org/browse/JDK-8186248)), que substituem as formas `...RAMFraction` e dimensionam o heap como porcentagem da memória disponível.

```bash
# heap máximo = 75% do limite de memória do contêiner
java -XX:MaxRAMPercentage=75 -jar app.jar
```

Sem configuração, o heap máximo padrão é 1/4 da memória física ([guia de ergonomia do GC](https://docs.oracle.com/en/java/javase/11/gctuning/ergonomics.html)); em um contêiner, essa memória é o limite do contêiner.

### Flight Recorder no OpenJDK

**Chegou em:** Java 11 (final, [JEP 328](https://openjdk.org/jeps/328))

O Java Flight Recorder (JFR) grava eventos da JVM, do sistema operacional e das bibliotecas do JDK em formato binário, para diagnóstico em produção. A [JEP 328](https://openjdk.org/jeps/328) trouxe para o OpenJDK esse recurso, que antes era comercial no Oracle JDK. As métricas de sucesso da JEP são no máximo 1% de overhead na configuração padrão, medido no SPECjbb2015, e nenhum overhead mensurável quando desligado.

```bash
# grava por 60 segundos a partir da inicialização
java -XX:StartFlightRecording=duration=60s,filename=app.jfr -jar app.jar

# ou controla uma JVM em execução
jcmd <pid> JFR.start
jcmd <pid> JFR.dump filename=app.jfr
jcmd <pid> JFR.stop
```

Eventos próprios podem ser criados estendendo `jdk.jfr.Event`. Para analisar as gravações, use o Java Mission Control, que no 11 deixou de vir com o JDK e virou download separado ([JDK 11 Release Notes](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html)). O Java 14 acrescentou a leitura contínua dos eventos, sem gravar arquivo ([JFR Event Streaming](/posts/java-17/#jfr-event-streaming)).

### Outras melhorias de runtime

- **Thread-Local Handshakes** ([JEP 312](https://openjdk.org/jeps/312), Java 10): permite executar operações em threads individuais sem um *safepoint* global, a pausa em que todas as threads da aplicação param.
- **Heap em dispositivos alternativos** ([JEP 316](https://openjdk.org/jeps/316), Java 10): `-XX:AllocateHeapAt=<caminho>` aloca o heap em outro tipo de memória, como NV-DIMM (memória não volátil).
- **Heap profiling de baixo overhead** ([JEP 331](https://openjdk.org/jeps/331), Java 11): amostragem de alocações no heap via JVMTI, a interface nativa usada por profilers e agentes.
- **Strings internadas no CDS** ([JEP 250](https://openjdk.org/jeps/250), Java 9) e **cache de código segmentado** ([JEP 197](https://openjdk.org/jeps/197), Java 9).

## Ferramentas

### jshell

**Chegou em:** Java 9 (final, [JEP 222](https://openjdk.org/jeps/222))

Até o Java 8, testar uma linha de código exigia criar uma classe com `main`, compilar e executar. O `jshell` é um REPL (*read-eval-print loop*, ciclo de ler, avaliar e imprimir): avalia declarações, instruções e expressões Java na hora, sem classe nem compilação explícita. Serve para testar uma API, conferir uma expressão regular ou explorar uma biblioteca. A JEP também entrega a API `jdk.jshell`, para embutir o recurso em outras aplicações.

```text
$ jshell
jshell> var precos = List.of(10.0, 25.5, 4.5)
precos ==> [10.0, 25.5, 4.5]

jshell> precos.stream().mapToDouble(Double::doubleValue).sum()
$2 ==> 40.0

jshell> "Java 11".repeat(2)
$3 ==> "Java 11Java 11"

jshell> /exit
|  Goodbye
```

### Executar um arquivo .java diretamente

**Chegou em:** Java 11 (final, [JEP 330](https://openjdk.org/jeps/330))

O launcher `java` ganhou um quarto modo, além de classe, JAR e módulo: executar um arquivo de código-fonte. Pela [JEP 330](https://openjdk.org/jeps/330), `java Ola.java` compila o arquivo em memória e executa a primeira classe declarada nele, sem gravar `.class` em disco. Argumentos depois do nome do arquivo vão para o `main`.

```java title="Ola.java"
public class Ola {
    public static void main(String[] args) {
        String nome = args.length > 0 ? args[0] : "mundo";
        System.out.println("Olá, " + nome + "!");
    }
}
```

```bash
java Ola.java Maria
# Olá, Maria!
```

O recurso também funciona em scripts Unix com *shebang*. Nesse caso, a JEP não permite a extensão `.java`, e a opção `--source` força o modo de código-fonte:

```java title="relatorio"
#!/usr/bin/java --source 11

public class Relatorio {
    public static void main(String[] args) {
        System.out.println("Argumentos: " + String.join(", ", args));
    }
}
```

```bash
chmod +x relatorio
./relatorio a b
# Argumentos: a, b
```

O programa pode ter várias classes, mas todas precisam estar no mesmo arquivo; dependências externas podem ser passadas com `--class-path`. O recurso é útil para scripts e utilitários pequenos; para projetos maiores, continue com uma ferramenta de build. O Java 22 removeu a restrição de arquivo único ([post do Java 25](/posts/java-25/#executar-programas-com-vários-arquivos-fonte)).

### Outras ferramentas do período

- **`javac --release N`** ([JEP 247](https://openjdk.org/jeps/247), Java 9): compila para uma versão anterior da plataforma e, diferente de `-source`/`-target`, impede o uso acidental de APIs que não existem nela. Exemplo: `javac --release 8` no JDK 11 recusa `List.of`.
- **`jdeps`**: no JDK 11, `--jdk-internals` aponta usos de APIs internas e sugere substitutos, e `--print-module-deps` lista os módulos da plataforma usados, útil para montar o `jlink` ([documentação do jdeps](https://docs.oracle.com/en/java/javase/11/tools/jdeps.html)).

## Segurança

### TLS 1.3

**Chegou em:** Java 11 (final, [JEP 332](https://openjdk.org/jeps/332))

A [JEP 332](https://openjdk.org/jeps/332) implementa no JDK o TLS 1.3 (RFC 8446), que ela descreve como uma revisão profunda do protocolo, com ganhos significativos de segurança e desempenho em relação às versões anteriores. As [release notes do JDK 11](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html) listam os novos nomes padrão, como o protocolo `TLSv1.3` e as *cipher suites* (combinações de algoritmos de cifra e hash) `TLS_AES_128_GCM_SHA256` e `TLS_AES_256_GCM_SHA384`.

O exemplo abre uma conexão com um servidor externo, `www.oracle.com`, restrita a TLS 1.3, e mostra o que foi negociado. Precisa de acesso à internet, e a cipher suite depende da configuração do servidor; se ele não aceitar TLS 1.3, o handshake falha com `SSLHandshakeException`.

```java title="Tls13.java"
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

public class Tls13 {
    public static void main(String[] args) throws Exception {
        SSLSocketFactory fabrica = (SSLSocketFactory) SSLSocketFactory.getDefault();
        try (SSLSocket socket = (SSLSocket) fabrica.createSocket("www.oracle.com", 443)) {
            // restringe a conexão a TLS 1.3 (sem fallback para 1.2)
            SSLParameters parametros = socket.getSSLParameters();
            parametros.setProtocols(new String[] {"TLSv1.3"});
            socket.setSSLParameters(parametros);

            socket.startHandshake();
            System.out.println(socket.getSession().getProtocol());    // TLSv1.3
            System.out.println(socket.getSession().getCipherSuite()); // ex.: TLS_AES_256_GCM_SHA384
        }
    }
}
```

As mesmas release notes avisam que o TLS 1.3 não é diretamente compatível com as versões anteriores e apontam riscos na atualização, entre eles:

- o TLS 1.3 usa política de *half-close* (cada lado fecha a sua direção da conexão de forma independente), enquanto o 1.2 e anteriores usam *duplex-close*; aplicações que dependem do fechamento conjunto podem ter problemas;
- o algoritmo de assinatura DSA não é suportado, então servidores configurados só com certificados DSA não conseguem negociar o 1.3;
- as cipher suites do 1.3 são outras, e código que fixa cipher suites antigas pode não conseguir usar 1.3 sem alteração;
- as propriedades `jdk.tls.client.protocols` e `jdk.tls.server.protocols` ajustam os protocolos habilitados por padrão, se necessário.

### Criptografia e certificados

| Recurso | Versão | Fonte |
| --- | --- | --- |
| Keystore padrão passa de JKS para PKCS12 | Java 9 | [JEP 229](https://openjdk.org/jeps/229) |
| Algoritmos SHA-3 (`SHA3-224` a `SHA3-512`) em `MessageDigest` | Java 9 | [JEP 287](https://openjdk.org/jeps/287) |
| `SecureRandom` baseado em DRBG (NIST SP 800-90Ar1) | Java 9 | [JEP 273](https://openjdk.org/jeps/273) |
| Mecanismo para desabilitar certificados SHA-1 em cadeias ancoradas nas raízes do JDK (`jdkCA`) | Java 9 | [JEP 288](https://openjdk.org/jeps/288) |
| DTLS 1.0 e 1.2, ALPN e OCSP stapling no JSSE | Java 9 | [JEP 219](https://openjdk.org/jeps/219), [JEP 244](https://openjdk.org/jeps/244), [JEP 249](https://openjdk.org/jeps/249) |
| Filtro de dados de serialização (`ObjectInputFilter`, `jdk.serialFilter`) | Java 9 | [JEP 290](https://openjdk.org/jeps/290) |
| Política de criptografia ilimitada ativada por padrão | Java 9 | [Migration Guide](https://docs.oracle.com/en/java/javase/11/migrate/index.html) |
| `cacerts` do OpenJDK com certificados raiz de CAs | Java 10 | [JEP 319](https://openjdk.org/jeps/319) |
| Cifras `ChaCha20` e `ChaCha20-Poly1305` | Java 11 | [JEP 329](https://openjdk.org/jeps/329) |
| Acordo de chaves com Curve25519 e Curve448 (X25519/X448) | Java 11 | [JEP 324](https://openjdk.org/jeps/324) |

Dois detalhes práticos: a política ilimitada dispensa os arquivos "JCE Unlimited Strength" que precisavam ser instalados no Java 8, e a [JEP 319](https://openjdk.org/jeps/319) resolveu o `cacerts` vazio dos builds do OpenJDK, que impedia conexões TLS sem configuração extra.

## Removidos e depreciados

Esta seção reúne as mudanças que costumam quebrar builds e scripts na migração do 8 para o 11.

### Módulos Java EE e CORBA

**Chegou em:** Java 9 (depreciado para remoção) → Java 11 (removido, [JEP 320](https://openjdk.org/jeps/320))

JAX-WS, JAXB, JAF e Common Annotations entraram no Java SE 6 por conveniência, mas evoluíam no Java EE, e manter cópias dentro do Java SE ficou cada vez mais difícil. A [JEP 320](https://openjdk.org/jeps/320) conta a trajetória: no Java 9, esses módulos foram depreciados para remoção e deixaram de ser resolvidos por padrão para código do classpath (`--add-modules` os reativava). No Java 11, foram removidos, e nenhuma flag os traz de volta.

| Módulo removido no Java 11 | Tecnologia |
| --- | --- |
| `java.xml.ws` | JAX-WS, SAAJ e Web Services Metadata |
| `java.xml.bind` | JAXB |
| `java.activation` | JavaBeans Activation Framework (JAF) |
| `java.xml.ws.annotation` | Common Annotations (`javax.annotation.*`) |
| `java.corba` | CORBA |
| `java.transaction` | JTA |
| `java.se.ee` | módulo agregador dos seis acima |
| `jdk.xml.ws` e `jdk.xml.bind` | ferramentas `wsgen`, `wsimport`, `schemagen` e `xjc` |

Saíram também as ferramentas `idlj`, `orbd`, `servertool` e `tnamesrv` ([JEP 320](https://openjdk.org/jeps/320)), e o `rmic` perdeu as opções `-idl` e `-iiop` ([JDK 11 Release Notes](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html)). O sintoma típico é `NoClassDefFoundError` ou erro de compilação em `javax.xml.bind.*`.

A correção é declarar as implementações como dependências do projeto. A JEP 320 aponta as implementações de referência e os JARs de API publicados no Maven (na época, `com.sun.xml.bind:jaxb-ri`, `com.sun.xml.ws:jaxws-ri`, `javax.xml.bind:jaxb-api`, `javax.annotation:javax.annotation-api` e outros) e lembra dois usos "acidentais" comuns:

- quem usava `javax.xml.bind.DatatypeConverter` só para Base64 deve migrar para [`java.util.Base64`](/posts/java-8/#base64-na-biblioteca-padrão), disponível desde o Java 8;
- quem usava `javax.annotation.Generated` pode usar `javax.annotation.processing.Generated`, criado no Java 9.

```java title="Base64Exemplo.java" del={1,6} ins={2,7}
import javax.xml.bind.DatatypeConverter;   // não existe mais no Java 11
import java.util.Base64;                   // disponível desde o Java 8

public class Base64Exemplo {
    public static String codificar(byte[] dados) {
        return DatatypeConverter.printBase64Binary(dados);
        return Base64.getEncoder().encodeToString(dados);
    }
}
```

### Nashorn, Pack200, CMS e Applet API

| Item | Situação no período | Destino depois |
| --- | --- | --- |
| Applet API | depreciada no Java 9 ([JEP 289](https://openjdk.org/jeps/289)) | depreciada para remoção no Java 17 ([JEP 398](https://openjdk.org/jeps/398)) |
| Coletor CMS | depreciado no Java 9 ([JEP 291](https://openjdk.org/jeps/291)); `-XX:+UseConcMarkSweepGC` emite aviso | removido no Java 14 ([JEP 363](https://openjdk.org/jeps/363)) |
| Motor JavaScript Nashorn e `jjs` | depreciados no Java 11 ([JEP 335](https://openjdk.org/jeps/335)) | removidos no Java 15 ([JEP 372](https://openjdk.org/jeps/372)) |
| `pack200`, `unpack200` e API `Pack200` | depreciados no Java 11 ([JEP 336](https://openjdk.org/jeps/336)) | removidos no Java 14 ([JEP 367](https://openjdk.org/jeps/367)) |

No Java 11, o Nashorn, [motor JavaScript que chegou no Java 8](/posts/java-8/#nashorn-e-jjs), imprime um aviso de depreciação quando usado via `javax.script`, `jrunscript` ou `jjs`; a opção `--no-deprecation-warning` suprime o aviso ([JDK 11 Release Notes](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html)).

### O que saiu do Oracle JDK 11

As [release notes do JDK 11](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html) listam mudanças de empacotamento que pegam de surpresa quem usava o Oracle JDK 8:

- **Java Plugin (applets) e Java Web Start** foram removidos, assim como o `appletviewer`, depreciado no 9. O [roadmap da Oracle](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) informa que o Java SE 11 e posteriores não incluem essa pilha de deployment.
- **JavaFX** não vem mais no JDK; é distribuído separadamente pelo projeto [OpenJFX](https://openjfx.io/).
- **Java Mission Control** virou download separado, e **não há mais JRE nem Server JRE**: só o JDK, com o [`jlink`](#jlink-runtime-sob-medida) para runtimes menores.

### Ferramentas, opções e APIs removidas

| Removido | Versão | Fonte |
| --- | --- | --- |
| Combinações de GC depreciadas no 8 (DefNew + CMS, ParNew + SerialOld, CMS incremental) e flags como `-Xincgc` | Java 9 | [JEP 214](https://openjdk.org/jeps/214) |
| Seleção de versão do JRE na inicialização (`-version:`, `JRE-Version` no manifesto) | Java 9 | [JEP 231](https://openjdk.org/jeps/231) |
| Agente `hprof` e ferramenta `jhat` | Java 9 | [JEP 240](https://openjdk.org/jeps/240), [JEP 241](https://openjdk.org/jeps/241) |
| Demos e exemplos do JDK | Java 9 | [JEP 298](https://openjdk.org/jeps/298) |
| `rt.jar`, `tools.jar`, mecanismos de extensão e *endorsed standards* | Java 9 | [JEP 220](https://openjdk.org/jeps/220) |
| Ferramenta `javah` (use `javac -h`) | Java 10 | [JEP 313](https://openjdk.org/jeps/313) |
| `Thread.destroy()` e `Thread.stop(Throwable)` | Java 11 | [JDK 11 Release Notes](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html) |
| `sun.misc.Unsafe.defineClass` (use `MethodHandles.Lookup.defineClass`, do Java 9) | Java 11 | [JDK 11 Release Notes](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html) |

## Recursos em preview ou incubadora nesta LTS

O Java 11 não tem recursos em preview: o mecanismo só passou a ser usado no Java 12. O que havia de não final no período eram recursos **experimentais** da JVM, versões iniciais para teste que ficam bloqueadas até `-XX:+UnlockExperimentalVMOptions`, e o HTTP Client em incubadora, concluído no 11.

| Recurso | Status no Java 11 | Como habilitar | O que aconteceu depois |
| --- | --- | --- | --- |
| ZGC ([JEP 333](https://openjdk.org/jeps/333)) | experimental, só Linux/x64 | `-XX:+UnlockExperimentalVMOptions -XX:+UseZGC` | produção no Java 15 ([JEP 377](https://openjdk.org/jeps/377); veja o [post do Java 17](/posts/java-17/#zgc-e-shenandoah-em-produção)) |
| Epsilon ([JEP 318](https://openjdk.org/jeps/318)) | experimental | `-XX:+UnlockExperimentalVMOptions -XX:+UseEpsilonGC` | continua experimental: no Temurin 25.0.4, ainda exige a flag de desbloqueio |
| Graal como JIT ([JEP 317](https://openjdk.org/jeps/317), Java 10) | experimental, só Linux/x64 | `-XX:+UnlockExperimentalVMOptions -XX:+UseJVMCICompiler` | removido no Java 17 ([JEP 410](https://openjdk.org/jeps/410)) |
| AOT com `jaotc` ([JEP 295](https://openjdk.org/jeps/295), Java 9) | experimental, só Linux/x64 | ferramenta `jaotc` | removido no Java 17 ([JEP 410](https://openjdk.org/jeps/410)) |
| JVMCI ([JEP 243](https://openjdk.org/jeps/243), Java 9) | experimental | `-XX:+UnlockExperimentalVMOptions -XX:+EnableJVMCI` | mantido no Java 17 para compiladores externos ([JEP 410](https://openjdk.org/jeps/410)) |
| HTTP Client ([JEP 110](https://openjdk.org/jeps/110)) | incubadora no 9 e no 10 | módulo [`jdk.incubator.httpclient`](https://docs.oracle.com/javase/9/docs/api/jdk.incubator.httpclient-summary.html) via `--add-modules` | final no Java 11 ([JEP 321](https://openjdk.org/jeps/321)) |

Graal é um compilador JIT escrito em Java, conectado à JVM pela JVMCI (*JVM Compiler Interface*); o `jaotc` usava o Graal para compilar classes para código nativo antes da execução (AOT, *ahead-of-time*). Sobre os dois coletores novos:

- **ZGC** é um coletor concorrente, baseado em regiões e com compactação. As metas da [JEP 333](https://openjdk.org/jeps/333) eram pausas de no máximo 10 ms, heaps de centenas de megabytes a vários terabytes e no máximo 15% de redução de throughput em relação ao G1. São metas de projeto, não garantias para qualquer carga.
- **Epsilon** aloca memória e nunca a recupera: quando o heap acaba, a JVM termina. Segundo a [JEP 318](https://openjdk.org/jeps/318), serve para testes de desempenho (isolar o custo do GC), testes de pressão de memória e jobs muito curtos.

## O que observar na migração a partir do Java 8

O [guia de migração da Oracle](https://docs.oracle.com/en/java/javase/11/migrate/index.html) sugere primeiro rodar a aplicação no JDK 11 sem recompilar e, em paralelo, atualizar bibliotecas e ferramentas de build, recompilar e rodar o `jdeps`. Mesmo que tudo pareça funcionar, revise os pontos abaixo. O [guia de atualizações do Java](/posts/guia-atualizacoes-java/#o-processo-de-migração-em-cinco-fases) descreve o processo completo de migração.

1. **Dependências Java EE e CORBA.** Qualquer uso de `javax.xml.bind`, `javax.xml.ws`, `javax.activation`, `javax.annotation` (Common Annotations), `javax.transaction` ou CORBA precisa de dependência explícita ([JEP 320](https://openjdk.org/jeps/320)).
2. **APIs internas do JDK.** Rode `jdeps --jdk-internals` no código e nas bibliotecas. Uso estático de pacotes internos encapsulados não compila; uso reflexivo gera o aviso de *illegal reflective access* no 11 e passa a falhar por padrão no 16 e no 17 ([JEP 260](https://openjdk.org/jeps/260), [JEP 396](https://openjdk.org/jeps/396), [JEP 403](https://openjdk.org/jeps/403)). Atualize as bibliotecas para versões que suportam o 11 e teste com `--illegal-access=deny` para antecipar o comportamento do 17.
3. **Parsing da versão.** Código que lê `java.version` esperando `1.8` quebra; use `Runtime.version()` ([JEP 223](https://openjdk.org/jeps/223), [JEP 322](https://openjdk.org/jeps/322)).
4. **Flags da JVM.** Flags de log de GC mudaram e algumas impedem a JVM de iniciar ([JEP 271](https://openjdk.org/jeps/271)); combinações de GC antigas foram removidas ([JEP 214](https://openjdk.org/jeps/214)); o coletor padrão passou a ser o G1 ([JEP 248](https://openjdk.org/jeps/248)). Opções da permanent generation, como `-XX:MaxPermSize`, geram aviso e devem sair dos scripts ([Migration Guide](https://docs.oracle.com/en/java/javase/11/migrate/index.html)).
5. **Formatação de datas e números.** A partir do Java 9, os formatos regionais vêm por padrão do CLDR (*Common Locale Data Repository*, a base de dados de locales mantida pelo Unicode Consortium) ([JEP 252](https://openjdk.org/jeps/252)), e o guia de migração cita datas e moedas formatadas de outro jeito. Saída do mesmo código no Temurin 8 (8u502) e no Temurin 11 (11.0.32):

   ```java title="Formatos.java"
   import java.time.LocalDate;
   import java.time.format.DateTimeFormatter;
   import java.time.format.FormatStyle;
   import java.util.Locale;

   public class Formatos {
       public static void main(String[] args) {
           Locale ptBR = new Locale("pt", "BR");
           LocalDate data = LocalDate.of(2018, 9, 25);
           DateTimeFormatter medio = DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(ptBR);
           DateTimeFormatter completo = DateTimeFormatter.ofLocalizedDate(FormatStyle.FULL).withLocale(ptBR);

           System.out.println(medio.format(data));
           // Java 8:  25/09/2018
           // Java 11: 25 de set de 2018

           System.out.println(completo.format(data));
           // Java 8:  Terça-feira, 25 de Setembro de 2018
           // Java 11: terça-feira, 25 de setembro de 2018
       }
   }
   ```

   Para manter o comportamento do 8 enquanto ajusta testes e relatórios, use `-Djava.locale.providers=COMPAT,CLDR`.
6. **`rt.jar`, `lib/ext` e `lib/endorsed`.** Ferramentas que leem `rt.jar` e instalações que colocam JARs em `lib/ext` ou `lib/endorsed` precisam mudar: esses JARs devem ir para o classpath ([JEP 220](https://openjdk.org/jeps/220)). No Temurin 11.0.32, `-Djava.ext.dirs` e `-Djava.endorsed.dirs` impedem a JVM de iniciar, e o guia de migração avisa que `java` e `javac` encerram ao encontrar `lib/endorsed`.
7. **Class loaders.** O class loader da aplicação deixou de ser um `URLClassLoader`, então código que faz cast para adicionar JARs ao classpath em tempo de execução quebra. O antigo *extension class loader* virou o *platform class loader* ([Migration Guide](https://docs.oracle.com/en/java/javase/11/migrate/index.html)).
8. **`_` como identificador.** Vira erro de compilação a partir do 9 ([JEP 213](https://openjdk.org/jeps/213)).
9. **Aplicações desktop.** JavaFX, Web Start e applets não vêm mais no Oracle JDK 11 ([JDK 11 Release Notes](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html)).
10. **TLS.** Teste integrações com o TLS 1.3 habilitado, principalmente se a aplicação fixa cipher suites ou depende do fechamento duplex da conexão ([JDK 11 Release Notes](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html)).
11. **Compilação.** Para gerar bytecode compatível com uma versão anterior, prefira `--release` a `-source`/`-target` ([JEP 247](https://openjdk.org/jeps/247)). Segundo o guia de migração, o `javac` 11 aceita de 6 a 11 (6 com aviso de depreciação), e valores 5 ou anteriores são erro desde o JDK 9.

Quando o 11 estiver estável, o próximo salto está em [O que observar na migração a partir do Java 11](/posts/java-17/#o-que-observar-na-migração-a-partir-do-java-11), no post do Java 17.

## Todas as JEPs, versão a versão

Listas conferidas nas páginas oficiais de cada release no OpenJDK; os títulos seguem as páginas das JEPs. Tipos: **Final** (recurso permanente ou mudança de implementação), **Preview**, **Incubadora**, **Experimental**, **Depreciação**, **Remoção**, **Plataforma** (port para sistema operacional ou arquitetura) e **Interno** (mudança no desenvolvimento do próprio OpenJDK, sem efeito para quem usa o JDK).

### Java 9

<details>
<summary>Ver as 91 JEPs do Java 9</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [102](https://openjdk.org/jeps/102) | Process API Updates | Final |
| [110](https://openjdk.org/jeps/110) | HTTP 2 Client | Incubadora |
| [143](https://openjdk.org/jeps/143) | Improve Contended Locking | Final |
| [158](https://openjdk.org/jeps/158) | Unified JVM Logging | Final |
| [165](https://openjdk.org/jeps/165) | Compiler Control | Final |
| [193](https://openjdk.org/jeps/193) | Variable Handles | Final |
| [197](https://openjdk.org/jeps/197) | Segmented Code Cache | Final |
| [199](https://openjdk.org/jeps/199) | Smart Java Compilation, Phase Two | Interno |
| [200](https://openjdk.org/jeps/200) | The Modular JDK | Final |
| [201](https://openjdk.org/jeps/201) | Modular Source Code | Interno |
| [211](https://openjdk.org/jeps/211) | Elide Deprecation Warnings on Import Statements | Final |
| [212](https://openjdk.org/jeps/212) | Resolve Lint and Doclint Warnings | Interno |
| [213](https://openjdk.org/jeps/213) | Milling Project Coin | Final |
| [214](https://openjdk.org/jeps/214) | Remove GC Combinations Deprecated in JDK 8 | Remoção |
| [215](https://openjdk.org/jeps/215) | Tiered Attribution for javac | Final |
| [216](https://openjdk.org/jeps/216) | Process Import Statements Correctly | Final |
| [217](https://openjdk.org/jeps/217) | Annotations Pipeline 2.0 | Final |
| [219](https://openjdk.org/jeps/219) | Datagram Transport Layer Security (DTLS) | Final |
| [220](https://openjdk.org/jeps/220) | Modular Run-Time Images | Final |
| [221](https://openjdk.org/jeps/221) | Simplified Doclet API | Final |
| [222](https://openjdk.org/jeps/222) | jshell: The Java Shell (Read-Eval-Print Loop) | Final |
| [223](https://openjdk.org/jeps/223) | New Version-String Scheme | Final |
| [224](https://openjdk.org/jeps/224) | HTML5 Javadoc | Final |
| [225](https://openjdk.org/jeps/225) | Javadoc Search | Final |
| [226](https://openjdk.org/jeps/226) | UTF-8 Property Files | Final |
| [227](https://openjdk.org/jeps/227) | Unicode 7.0 | Final |
| [228](https://openjdk.org/jeps/228) | Add More Diagnostic Commands | Final |
| [229](https://openjdk.org/jeps/229) | Create PKCS12 Keystores by Default | Final |
| [231](https://openjdk.org/jeps/231) | Remove Launch-Time JRE Version Selection | Remoção |
| [232](https://openjdk.org/jeps/232) | Improve Secure Application Performance | Final |
| [233](https://openjdk.org/jeps/233) | Generate Run-Time Compiler Tests Automatically | Interno |
| [235](https://openjdk.org/jeps/235) | Test Class-File Attributes Generated by javac | Interno |
| [236](https://openjdk.org/jeps/236) | Parser API for Nashorn | Final |
| [237](https://openjdk.org/jeps/237) | Linux/AArch64 Port | Plataforma |
| [238](https://openjdk.org/jeps/238) | Multi-Release JAR Files | Final |
| [240](https://openjdk.org/jeps/240) | Remove the JVM TI hprof Agent | Remoção |
| [241](https://openjdk.org/jeps/241) | Remove the jhat Tool | Remoção |
| [243](https://openjdk.org/jeps/243) | Java-Level JVM Compiler Interface | Experimental |
| [244](https://openjdk.org/jeps/244) | TLS Application-Layer Protocol Negotiation Extension | Final |
| [245](https://openjdk.org/jeps/245) | Validate JVM Command-Line Flag Arguments | Final |
| [246](https://openjdk.org/jeps/246) | Leverage CPU Instructions for GHASH and RSA | Final |
| [247](https://openjdk.org/jeps/247) | Compile for Older Platform Versions | Final |
| [248](https://openjdk.org/jeps/248) | Make G1 the Default Garbage Collector | Final |
| [249](https://openjdk.org/jeps/249) | OCSP Stapling for TLS | Final |
| [250](https://openjdk.org/jeps/250) | Store Interned Strings in CDS Archives | Final |
| [251](https://openjdk.org/jeps/251) | Multi-Resolution Images | Final |
| [252](https://openjdk.org/jeps/252) | Use CLDR Locale Data by Default | Final |
| [253](https://openjdk.org/jeps/253) | Prepare JavaFX UI Controls & CSS APIs for Modularization | Final |
| [254](https://openjdk.org/jeps/254) | Compact Strings | Final |
| [255](https://openjdk.org/jeps/255) | Merge Selected Xerces 2.11.0 Updates into JAXP | Final |
| [256](https://openjdk.org/jeps/256) | BeanInfo Annotations | Final |
| [257](https://openjdk.org/jeps/257) | Update JavaFX/Media to Newer Version of GStreamer | Final |
| [258](https://openjdk.org/jeps/258) | HarfBuzz Font-Layout Engine | Final |
| [259](https://openjdk.org/jeps/259) | Stack-Walking API | Final |
| [260](https://openjdk.org/jeps/260) | Encapsulate Most Internal APIs | Final |
| [261](https://openjdk.org/jeps/261) | Module System | Final |
| [262](https://openjdk.org/jeps/262) | TIFF Image I/O | Final |
| [263](https://openjdk.org/jeps/263) | HiDPI Graphics on Windows and Linux | Final |
| [264](https://openjdk.org/jeps/264) | Platform Logging API and Service | Final |
| [265](https://openjdk.org/jeps/265) | Marlin Graphics Renderer | Final |
| [266](https://openjdk.org/jeps/266) | More Concurrency Updates | Final |
| [267](https://openjdk.org/jeps/267) | Unicode 8.0 | Final |
| [268](https://openjdk.org/jeps/268) | XML Catalogs | Final |
| [269](https://openjdk.org/jeps/269) | Convenience Factory Methods for Collections | Final |
| [270](https://openjdk.org/jeps/270) | Reserved Stack Areas for Critical Sections | Final |
| [271](https://openjdk.org/jeps/271) | Unified GC Logging | Final |
| [272](https://openjdk.org/jeps/272) | Platform-Specific Desktop Features | Final |
| [273](https://openjdk.org/jeps/273) | DRBG-Based SecureRandom Implementations | Final |
| [274](https://openjdk.org/jeps/274) | Enhanced Method Handles | Final |
| [275](https://openjdk.org/jeps/275) | Modular Java Application Packaging | Final |
| [276](https://openjdk.org/jeps/276) | Dynamic Linking of Language-Defined Object Models | Final |
| [277](https://openjdk.org/jeps/277) | Enhanced Deprecation | Final |
| [278](https://openjdk.org/jeps/278) | Additional Tests for Humongous Objects in G1 | Interno |
| [279](https://openjdk.org/jeps/279) | Improve Test-Failure Troubleshooting | Interno |
| [280](https://openjdk.org/jeps/280) | Indify String Concatenation | Final |
| [281](https://openjdk.org/jeps/281) | HotSpot C++ Unit-Test Framework | Interno |
| [282](https://openjdk.org/jeps/282) | jlink: The Java Linker | Final |
| [283](https://openjdk.org/jeps/283) | Enable GTK 3 on Linux | Final |
| [284](https://openjdk.org/jeps/284) | New HotSpot Build System | Interno |
| [285](https://openjdk.org/jeps/285) | Spin-Wait Hints | Final |
| [287](https://openjdk.org/jeps/287) | SHA-3 Hash Algorithms | Final |
| [288](https://openjdk.org/jeps/288) | Disable SHA-1 Certificates | Final |
| [289](https://openjdk.org/jeps/289) | Deprecate the Applet API | Depreciação |
| [290](https://openjdk.org/jeps/290) | Filter Incoming Serialization Data | Final |
| [291](https://openjdk.org/jeps/291) | Deprecate the Concurrent Mark Sweep (CMS) Garbage Collector | Depreciação |
| [292](https://openjdk.org/jeps/292) | Implement Selected ECMAScript 6 Features in Nashorn | Final |
| [294](https://openjdk.org/jeps/294) | Linux/s390x Port | Plataforma |
| [295](https://openjdk.org/jeps/295) | Ahead-of-Time Compilation | Experimental |
| [297](https://openjdk.org/jeps/297) | Unified arm32/arm64 Port | Plataforma |
| [298](https://openjdk.org/jeps/298) | Remove Demos and Samples | Remoção |
| [299](https://openjdk.org/jeps/299) | Reorganize Documentation | Interno |

</details>

### Java 10

<details>
<summary>Ver as 12 JEPs do Java 10</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [286](https://openjdk.org/jeps/286) | Local-Variable Type Inference | Final |
| [296](https://openjdk.org/jeps/296) | Consolidate the JDK Forest into a Single Repository | Interno |
| [304](https://openjdk.org/jeps/304) | Garbage-Collector Interface | Interno |
| [307](https://openjdk.org/jeps/307) | Parallel Full GC for G1 | Final |
| [310](https://openjdk.org/jeps/310) | Application Class-Data Sharing | Final |
| [312](https://openjdk.org/jeps/312) | Thread-Local Handshakes | Final |
| [313](https://openjdk.org/jeps/313) | Remove the Native-Header Generation Tool (javah) | Remoção |
| [314](https://openjdk.org/jeps/314) | Additional Unicode Language-Tag Extensions | Final |
| [316](https://openjdk.org/jeps/316) | Heap Allocation on Alternative Memory Devices | Final |
| [317](https://openjdk.org/jeps/317) | Experimental Java-Based JIT Compiler | Experimental |
| [319](https://openjdk.org/jeps/319) | Root Certificates | Final |
| [322](https://openjdk.org/jeps/322) | Time-Based Release Versioning | Final |

</details>

### Java 11

<details>
<summary>Ver as 17 JEPs do Java 11</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [181](https://openjdk.org/jeps/181) | Nest-Based Access Control | Final |
| [309](https://openjdk.org/jeps/309) | Dynamic Class-File Constants | Final |
| [315](https://openjdk.org/jeps/315) | Improve Aarch64 Intrinsics | Final |
| [318](https://openjdk.org/jeps/318) | Epsilon: A No-Op Garbage Collector | Experimental |
| [320](https://openjdk.org/jeps/320) | Remove the Java EE and CORBA Modules | Remoção |
| [321](https://openjdk.org/jeps/321) | HTTP Client (Standard) | Final |
| [323](https://openjdk.org/jeps/323) | Local-Variable Syntax for Lambda Parameters | Final |
| [324](https://openjdk.org/jeps/324) | Key Agreement with Curve25519 and Curve448 | Final |
| [327](https://openjdk.org/jeps/327) | Unicode 10 | Final |
| [328](https://openjdk.org/jeps/328) | Flight Recorder | Final |
| [329](https://openjdk.org/jeps/329) | ChaCha20 and Poly1305 Cryptographic Algorithms | Final |
| [330](https://openjdk.org/jeps/330) | Launch Single-File Source-Code Programs | Final |
| [331](https://openjdk.org/jeps/331) | Low-Overhead Heap Profiling | Final |
| [332](https://openjdk.org/jeps/332) | Transport Layer Security (TLS) 1.3 | Final |
| [333](https://openjdk.org/jeps/333) | ZGC: A Scalable Low-Latency Garbage Collector (Experimental) | Experimental |
| [335](https://openjdk.org/jeps/335) | Deprecate the Nashorn JavaScript Engine | Depreciação |
| [336](https://openjdk.org/jeps/336) | Deprecate the Pack200 Tools and API | Depreciação |

</details>

## Fontes

**Releases, processo e suporte**

- [OpenJDK — JDK 9](https://openjdk.org/projects/jdk9/), [JDK 10](https://openjdk.org/projects/jdk/10/) e [JDK 11](https://openjdk.org/projects/jdk/11/) (listas de JEPs e datas de GA)
- [JEP 3: JDK Release Process](https://openjdk.org/jeps/3), [JEP 11: Incubator Modules](https://openjdk.org/jeps/11) e [JEP 12: Preview Features](https://openjdk.org/jeps/12)
- [Mark Reinhold — Moving Java Forward Faster (2017)](https://mreinhold.org/blog/forward-faster)
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) e [Oracle Java SE Licensing FAQ](https://www.oracle.com/java/technologies/javase/jdk-faqs.html)
- [Eclipse Adoptium — Temurin Support](https://adoptium.net/support/) e [Amazon Corretto FAQs](https://aws.amazon.com/corretto/faqs/)

**JEPs citadas no texto**

- Java 9: [102](https://openjdk.org/jeps/102), [110](https://openjdk.org/jeps/110), [158](https://openjdk.org/jeps/158), [193](https://openjdk.org/jeps/193), [197](https://openjdk.org/jeps/197), [200](https://openjdk.org/jeps/200), [213](https://openjdk.org/jeps/213), [214](https://openjdk.org/jeps/214), [219](https://openjdk.org/jeps/219), [220](https://openjdk.org/jeps/220), [222](https://openjdk.org/jeps/222), [223](https://openjdk.org/jeps/223), [229](https://openjdk.org/jeps/229), [231](https://openjdk.org/jeps/231), [240](https://openjdk.org/jeps/240), [241](https://openjdk.org/jeps/241), [243](https://openjdk.org/jeps/243), [244](https://openjdk.org/jeps/244), [247](https://openjdk.org/jeps/247), [248](https://openjdk.org/jeps/248), [249](https://openjdk.org/jeps/249), [250](https://openjdk.org/jeps/250), [252](https://openjdk.org/jeps/252), [254](https://openjdk.org/jeps/254), [259](https://openjdk.org/jeps/259), [260](https://openjdk.org/jeps/260), [261](https://openjdk.org/jeps/261), [266](https://openjdk.org/jeps/266), [269](https://openjdk.org/jeps/269), [271](https://openjdk.org/jeps/271), [273](https://openjdk.org/jeps/273), [277](https://openjdk.org/jeps/277), [280](https://openjdk.org/jeps/280), [282](https://openjdk.org/jeps/282), [287](https://openjdk.org/jeps/287), [288](https://openjdk.org/jeps/288), [289](https://openjdk.org/jeps/289), [290](https://openjdk.org/jeps/290), [291](https://openjdk.org/jeps/291), [295](https://openjdk.org/jeps/295), [298](https://openjdk.org/jeps/298)
- Java 10: [286](https://openjdk.org/jeps/286), [307](https://openjdk.org/jeps/307), [310](https://openjdk.org/jeps/310), [312](https://openjdk.org/jeps/312), [313](https://openjdk.org/jeps/313), [316](https://openjdk.org/jeps/316), [317](https://openjdk.org/jeps/317), [319](https://openjdk.org/jeps/319), [322](https://openjdk.org/jeps/322)
- Java 11: [181](https://openjdk.org/jeps/181), [318](https://openjdk.org/jeps/318), [320](https://openjdk.org/jeps/320), [321](https://openjdk.org/jeps/321), [323](https://openjdk.org/jeps/323), [324](https://openjdk.org/jeps/324), [328](https://openjdk.org/jeps/328), [329](https://openjdk.org/jeps/329), [330](https://openjdk.org/jeps/330), [331](https://openjdk.org/jeps/331), [332](https://openjdk.org/jeps/332), [333](https://openjdk.org/jeps/333), [335](https://openjdk.org/jeps/335), [336](https://openjdk.org/jeps/336)
- Versões posteriores: [363](https://openjdk.org/jeps/363), [367](https://openjdk.org/jeps/367), [372](https://openjdk.org/jeps/372), [377](https://openjdk.org/jeps/377), [396](https://openjdk.org/jeps/396), [398](https://openjdk.org/jeps/398), [403](https://openjdk.org/jeps/403), [410](https://openjdk.org/jeps/410)

**Oracle: release notes e guias**

- [Garbage Collection Tuning Guide — Ergonomics (Java SE 10)](https://docs.oracle.com/javase/10/gctuning/ergonomics.htm)
- [JDK 10 Release Notes](https://www.oracle.com/java/technologies/javase/10-relnote-issues.html) e [JDK 11 Release Notes](https://www.oracle.com/java/technologies/javase/11-relnote-issues.html)
- [Oracle JDK Migration Guide, Release 11](https://docs.oracle.com/en/java/javase/11/migrate/index.html)
- [Java Language Changes (Java SE 11)](https://docs.oracle.com/en/java/javase/11/language/java-language-changes.html) e [Java Language Specification SE 11, capítulo 7 (pacotes e módulos)](https://docs.oracle.com/javase/specs/jls/se11/html/jls-7.html)
- [java](https://docs.oracle.com/en/java/javase/11/tools/java.html), [jlink](https://docs.oracle.com/en/java/javase/11/tools/jlink.html) e [jdeps](https://docs.oracle.com/en/java/javase/11/tools/jdeps.html) (JDK 11)
- [HotSpot GC Tuning Guide 11 — Ergonomics](https://docs.oracle.com/en/java/javase/11/gctuning/ergonomics.html)
- [JDK-8146115: Improve docker container detection and resource configuration usage](https://bugs.openjdk.org/browse/JDK-8146115), [JDK-8186248: Allow more flexibility in selecting Heap % of available RAM](https://bugs.openjdk.org/browse/JDK-8186248) e [JDK-8193213: Make the UseAppCDS option obsolete](https://bugs.openjdk.org/browse/JDK-8193213)

**Javadoc**

- [Módulo jdk.incubator.httpclient (JDK 9)](https://docs.oracle.com/javase/9/docs/api/jdk.incubator.httpclient-summary.html), [HttpClient](https://docs.oracle.com/en/java/javase/11/docs/api/java.net.http/java/net/http/HttpClient.html) e [HttpRequest.Builder](https://docs.oracle.com/en/java/javase/11/docs/api/java.net.http/java/net/http/HttpRequest.Builder.html)
- [ModuleFinder](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/module/ModuleFinder.html), [String](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/String.html), [Runtime.Version](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/Runtime.Version.html), [CompletableFuture](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/concurrent/CompletableFuture.html)
- [List](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/List.html), [Set](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/Set.html), [Map](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/Map.html), [Collection](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/Collection.html)
- [Optional](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/Optional.html), [Stream](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/stream/Stream.html), [Collectors](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/stream/Collectors.html)
- [Files](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/nio/file/Files.html), [Path](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/nio/file/Path.html), [Predicate](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/function/Predicate.html)
