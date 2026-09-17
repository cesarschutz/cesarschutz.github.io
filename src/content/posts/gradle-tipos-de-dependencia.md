---
title: "Gradle — quando usar implementation, api, compileOnly e as demais configurações"
published: 2026-05-19
updated: 2026-09-16
description: "Cada configuração de dependência do Gradle alimenta um classpath: compilação, execução, processadores de anotação ou testes. Guia para bibliotecas e starters Spring Boot, com o papel do `platform` (BOM)."
tags: [Gradle, Spring]
category: Java
draft: false
---

Ao declarar uma dependência no Gradle, você escolhe uma **configuração**: `implementation`, `compileOnly`, `testImplementation` e assim por diante. Essa escolha define em quais **classpaths** a biblioteca vai entrar (compilação do código, execução, processamento de anotações, testes) e o que chega a quem consome o seu artefato.

Escolher errado tem custo: uma biblioteca que força versões de Spring no projeto de quem a usa, um processador de anotação que nunca roda ou um teste que não compila. Este post explica as configurações do plugin Java do Gradle a partir de um caso real, o `build.gradle` de uma **biblioteca ou starter Spring Boot** (*starter* é o módulo que traz dependências e auto-configuração prontas para a aplicação).

Os exemplos foram validados com o **Gradle 9.7.1** (JDK 21) e o **Spring Boot 4.1.1**.

## O exemplo

```groovy title="build.gradle"
plugins {
    id 'java-library'
}

repositories {
    mavenCentral()
}

dependencies {
    compileOnly platform('org.springframework.boot:spring-boot-dependencies:4.1.1')
    compileOnly 'org.springframework.boot:spring-boot-autoconfigure'
    compileOnly 'org.springframework:spring-context'
    compileOnly 'org.slf4j:slf4j-api'

    annotationProcessor platform('org.springframework.boot:spring-boot-dependencies:4.1.1')
    annotationProcessor 'org.springframework.boot:spring-boot-autoconfigure-processor'

    testImplementation platform('org.springframework.boot:spring-boot-dependencies:4.1.1')
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

tasks.named('test') {
    useJUnitPlatform()
}
```

<details>
<summary>O mesmo arquivo em Kotlin DSL (build.gradle.kts)</summary>

```kotlin title="build.gradle.kts"
plugins {
    `java-library`
}

repositories {
    mavenCentral()
}

dependencies {
    compileOnly(platform("org.springframework.boot:spring-boot-dependencies:4.1.1"))
    compileOnly("org.springframework.boot:spring-boot-autoconfigure")
    compileOnly("org.springframework:spring-context")
    compileOnly("org.slf4j:slf4j-api")

    annotationProcessor(platform("org.springframework.boot:spring-boot-dependencies:4.1.1"))
    annotationProcessor("org.springframework.boot:spring-boot-autoconfigure-processor")

    testImplementation(platform("org.springframework.boot:spring-boot-dependencies:4.1.1"))
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.named<Test>("test") {
    useJUnitPlatform()
}
```

</details>

Por trás dos nomes que você declara, o Gradle monta os classpaths que as tarefas usam de fato: `compileClasspath` (usado pelo `compileJava`), `runtimeClasspath`, `testCompileClasspath` (usado pelo `compileTestJava`) e `testRuntimeClasspath` (usado pela tarefa `test`). Cada configuração declarável alimenta um ou mais deles. O processador de anotação tem um caminho à parte, a própria configuração `annotationProcessor`.

![Matriz com as configurações api, implementation, compileOnly, runtimeOnly, annotationProcessor, testImplementation e testRuntimeOnly nas linhas e, nas colunas, os classpaths de compilação, execução e processadores do código principal, de compilação e execução dos testes e o que o consumidor da biblioteca recebe](/posts/gradle-tipos-de-dependencia/configuracoes-e-classpaths.svg)

A matriz acima resume o post; as seções a seguir explicam cada linha.

## `implementation`

É a configuração padrão para uma dependência de verdade: ela entra no classpath de **compilação e de execução** do código principal e também nos classpaths de teste, porque `testImplementation` herda de `implementation`.

Em uma **aplicação**, é quase sempre o que você quer. Em uma **biblioteca publicada**, ela vira dependência transitiva de execução: o Gradle a coloca no escopo `runtime` do POM, e o projeto consumidor passa a recebê-la no runtime dele, mas não no classpath de compilação. Por isso, para o que a aplicação final já fornece (como o próprio Spring), a biblioteca prefere `compileOnly`.

## `api`

Só existe com o plugin **`java-library`** (com o plugin `java` puro, o build falha com `Could not find method api()`). Funciona como `implementation` dentro do seu projeto, com uma diferença: a dependência é **exposta aos consumidores também na compilação** (escopo `compile` no POM).

Use `api` quando os tipos da dependência aparecem na API pública da sua biblioteca, por exemplo um método público que retorna ou recebe uma classe dela. Se ela é só detalhe interno, use `implementation`: o consumidor compila contra menos coisas e não passa a depender, sem saber, de classes que você pode remover depois.

## `compileOnly`

Significa: **"preciso dessa dependência para compilar, mas ela não entra no runtime nem é publicada como dependência."**

```groovy
compileOnly 'org.springframework.boot:spring-boot-autoconfigure'
compileOnly 'org.springframework:spring-context'
compileOnly 'org.slf4j:slf4j-api'
```

O código principal usa essas classes normalmente:

```java title="SaudacaoAutoConfiguration.java"
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
public class SaudacaoAutoConfiguration {

    private static final Logger log = LoggerFactory.getLogger(SaudacaoAutoConfiguration.class);

    @Bean
    @ConditionalOnMissingBean
    public Saudacao saudacao() {
        log.info("Registrando a Saudacao padrão");
        return new Saudacao();
    }

    public static class Saudacao {
        public String ola(String nome) {
            return "Olá, " + nome;
        }
    }
}
```

Mas nada disso vai junto com a biblioteca: no projeto validado, o `runtimeClasspath` fica vazio, e dependências `compileOnly` não aparecem no POM publicado. É o padrão de quem cria uma **lib, starter ou auto-configuração** para Spring Boot:

- a biblioteca precisa conhecer o Spring para compilar;
- quem fornece o Spring em runtime é a aplicação final, que já tem os starters do Spring Boot;
- assim a biblioteca não traz dependências desnecessárias nem impõe versões ao consumidor.

A documentação do Spring Boot recomenda o mesmo para módulos de auto-configuração: marcar as dependências da biblioteca integrada como opcionais (o `<optional>` do Maven). No Gradle, o efeito mais próximo é declará-las como `compileOnly`.

**Cuidado:** `compileOnly` não chega aos testes. `testImplementation` herda de `implementation`, mas não de `compileOnly`. No exemplo, os testes compilam porque o `spring-boot-starter-test` já traz Spring e SLF4J de forma transitiva; se não trouxesse, seria preciso declarar essas dependências também em `testImplementation`. Existe ainda `compileOnlyApi`, para quando o consumidor também precisa da dependência para compilar.

## `runtimeOnly`

O inverso de `compileOnly`: a dependência **não entra na compilação**, só na execução (e na execução dos testes, porque `testRuntimeOnly` herda de `runtimeOnly`). Numa biblioteca publicada, vai para o escopo `runtime` do POM.

O caso típico é uma implementação que seu código nunca referencia diretamente, como um driver JDBC ou uma implementação de logging por trás do SLF4J. Com `runtimeOnly`, se alguém importar essas classes por engano, o código simplesmente não compila.

## `annotationProcessor`

Declara **processadores de anotação**: programas que o compilador Java (`javac`) executa durante a compilação para ler anotações e gerar código ou arquivos.

```groovy
annotationProcessor 'org.springframework.boot:spring-boot-autoconfigure-processor'
```

Não é uma biblioteca que o seu código usa, e sim uma **ferramenta que roda durante o build**. No Spring Boot, o `spring-boot-autoconfigure-processor` reúne as condições das auto-configurações no arquivo `META-INF/spring-autoconfigure-metadata.properties`, empacotado no jar. Com ele, o Spring Boot descarta cedo as auto-configurações que não se aplicam, o que melhora o tempo de inicialização. Outros exemplos conhecidos de processadores: Lombok e MapStruct.

A diferença para `compileOnly`, em duas linhas:

```txt
compileOnly          -> classes que o MEU CÓDIGO referencia
annotationProcessor  -> ferramenta que o COMPILADOR executa
```

Processador declarado em `annotationProcessor` vale só para o código principal; para os testes existe `testAnnotationProcessor`.

## `testImplementation` e `testRuntimeOnly`

`testImplementation` significa: **"essa dependência existe somente para compilar e executar os testes."** Ela não entra no runtime do código principal nem é publicada.

```groovy
testImplementation 'org.springframework.boot:spring-boot-starter-test'
testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
```

O `spring-boot-starter-test` traz JUnit, Spring Test e Spring Boot Test, AssertJ, Hamcrest, Mockito, JSONassert, JsonPath e Awaitility. Ele também traz o Logback (via `spring-boot-starter-logging`), então os logs aparecem nos testes mesmo com o código principal dependendo só da **API** de logging (`slf4j-api`). Se o seu ambiente de teste não trouxesse uma implementação, o lugar certo para ela seria `testRuntimeOnly 'ch.qos.logback:logback-classic'`, já que os testes não referenciam classes do Logback. O post [Logging estruturado no Spring Boot](/posts/logging-estruturado-spring-boot/) mostra o Logback em uso.

`testRuntimeOnly` segue a mesma lógica de `runtimeOnly`, só que para os testes. O `junit-platform-launcher` é o exemplo clássico, e não é opcional: desde a versão 9.0, o Gradle não carrega mais essa dependência automaticamente (o comportamento antigo foi depreciado no Gradle 8). Sem essa linha, a tarefa `test` falha com `Failed to load JUnit Platform`.

## O papel do `platform(...)`

```groovy
platform('org.springframework.boot:spring-boot-dependencies:4.1.1')
```

Importa o **BOM** (*Bill of Materials*) do Spring Boot: um arquivo que lista versões testadas em conjunto das bibliotecas do ecossistema. Com ele, você declara as dependências **sem versão** e o Gradle usa as do BOM. Isso evita espalhar versões pelo `build.gradle` e reduz o risco de combinar versões incompatíveis.

Com `platform`, as versões do BOM são **recomendações**: se outra parte do grafo pedir uma versão diferente, a resolução de conflitos do Gradle ainda pode escolhê-la. Para impor as versões do BOM existe `enforcedPlatform`, que deve ser usado com cuidado.

**Por que ele aparece três vezes?** Porque um `platform` só vale para a configuração em que foi declarado e para as que herdam dela. `annotationProcessor` e `testImplementation` não herdam de `compileOnly`, então o BOM precisa ser declarado em cada uma. Se o BOM estivesse em `implementation`, `testImplementation` o herdaria. O plugin `io.spring.dependency-management` é a alternativa que evita a repetição, mas a documentação do Spring Boot aponta que o suporte nativo do Gradle tende a deixar o build mais rápido.

## Resumo

| Configuração | Classpaths do projeto | O consumidor recebe? | Uso comum |
| --- | --- | --- | --- |
| `implementation` | Compilação, execução e testes | Só na execução | Dependências internas da aplicação ou da lib |
| `api` (plugin `java-library`) | Compilação, execução e testes | Na compilação e na execução | Tipos que aparecem na API pública da lib |
| `compileOnly` | Só compilação do código principal | Não | APIs fornecidas pela aplicação consumidora |
| `runtimeOnly` | Execução do código principal e dos testes | Só na execução | Drivers JDBC, implementações de logging |
| `annotationProcessor` | Caminho de processadores do `javac` | Não | Processadores de anotação, geração de metadados |
| `testImplementation` | Compilação e execução dos testes | Não | JUnit, Mockito, Spring Boot Test |
| `testRuntimeOnly` | Só execução dos testes | Não | `junit-platform-launcher` |

## Conclusão

Para uma biblioteca ou starter Spring Boot, essa separação mantém o artefato leve e desacoplado: o projeto compila contra Spring e SLF4J sem impô-los ao runtime do consumidor, os processadores de anotação ficam restritos ao build e as dependências de teste ficam isoladas nos testes. Na dúvida, pergunte à dependência: meu código referencia essa classe? Ela precisa estar presente em runtime? O consumidor precisa dela para compilar? As respostas apontam a configuração certa.

## Fontes

- Gradle — [Dependency Configurations](https://docs.gradle.org/current/userguide/dependency_configurations.html)
- Gradle — [The Java Plugin (configurações e herança entre elas)](https://docs.gradle.org/current/userguide/java_plugin.html)
- Gradle — [The Java Library Plugin (`api`, `compileOnlyApi` e escopos do POM)](https://docs.gradle.org/current/userguide/java_library_plugin.html)
- Gradle — [Testing in Java & JVM projects (`junit-platform-launcher`)](https://docs.gradle.org/current/userguide/java_testing.html)
- Gradle — [Upgrading within Gradle 8.x: dependências automáticas do framework de teste](https://docs.gradle.org/current/userguide/upgrading_version_8.html#test_framework_implementation_dependencies)
- Gradle — [Platforms (`platform` e `enforcedPlatform`)](https://docs.gradle.org/current/userguide/platforms.html)
- Spring Boot — [Creating Your Own Auto-configuration](https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html)
- Spring Boot — [Test Scope Dependencies](https://docs.spring.io/spring-boot/reference/testing/test-scope-dependencies.html)
- Spring Boot Gradle Plugin — [Managing Dependencies](https://docs.spring.io/spring-boot/gradle-plugin/managing-dependencies.html)
