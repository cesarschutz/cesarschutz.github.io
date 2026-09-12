---
title: "Java 12 — Switch Expressions Preview"
published: 2026-08-22
description: "Cada novidade do Java 12 (2019) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java]
category: Java
cover: /banners/tech-circuit.svg
draft: false
---

## 📖 Sobre o Java 12

Java 12 continuou o ciclo de releases de 6 meses, introduzindo **Switch Expressions** como preview feature e várias melhorias incrementais que pavimentaram o caminho para funcionalidades mais robustas nas versões futuras.

## 💡 O que são JEPs?
Java 12 incluiu 8 JEPs, focando principalmente em preview features e melhorias de performance e usabilidade.

---

## 🎯 Melhorias na Linguagem

### 🔹 JEP 325: Switch Expressions (Preview)

#### ❓ O que é?
Nova sintaxe para switch que permite retornar valores diretamente, usando `->` e eliminando fall-through acidental.

#### ⚠️ Por que é importante?
Elimina bugs comuns de switch tradicional (esquecer break), torna código mais expressivo e permite usar switch como expressão funcional.

```java
// Switch tradicional - verboso e propenso a bugs
String getSeasonOld(int month) {
    String season;
    switch (month) {
        case 12:
        case 1:
        case 2:
            season = "Winter";
            break;
        case 3:
        case 4:
        case 5:
            season = "Spring";
            break;
        case 6:
        case 7:
        case 8:
            season = "Summer";
            break;
        case 9:
        case 10:
        case 11:
            season = "Fall";
            break;
        default:
            throw new IllegalArgumentException("Invalid month: " + month);
    }
    return season;
}

// Java 12 - Switch Expression (mais limpo)
String getSeason(int month) {
    return switch (month) {
        case 12, 1, 2 -> "Winter";
        case 3, 4, 5 -> "Spring";
        case 6, 7, 8 -> "Summer";
        case 9, 10, 11 -> "Fall";
        default -> throw new IllegalArgumentException("Invalid month: " + month);
    };
}

// Casos mais complexos com yield (Java 13+)
int calculateDays(String month, boolean isLeapYear) {
    return switch (month.toLowerCase()) {
        case "january", "march", "may", "july", "august", "october", "december" -> 31;
        case "april", "june", "september", "november" -> 30;
        case "february" -> isLeapYear ? 29 : 28;
        default -> throw new IllegalArgumentException("Invalid month: " + month);
    };
}

// Switch com processamento complexo
String processGrade(char grade) {
    return switch (grade) {
        case 'A', 'a' -> "Excellent";
        case 'B', 'b' -> "Good";
        case 'C', 'c' -> "Average";
        case 'D', 'd' -> "Below Average";
        case 'F', 'f' -> "Fail";
        default -> "Invalid grade: " + grade;
    };
}
```

#### 🎯 Diferenças Switch Tradicional vs Expression

```java
// Tradicional: statement (executa ações)
switch (status) {
    case ACTIVE:
        enableFeatures();
        sendNotification();
        break;
    case INACTIVE:
        disableFeatures();
        break;
}

// Expression: retorna valor
String message = switch (status) {
    case ACTIVE -> "User is active";
    case INACTIVE -> "User is inactive";
    case SUSPENDED -> "User is suspended";
};

// Híbrido: pode fazer ambos no Java 14+
String result = switch (operation) {
    case ADD -> {
        logger.info("Performing addition");
        yield a + b;
    }
    case SUBTRACT -> {
        logger.info("Performing subtraction");
        yield a - b;
    }
};
```

📚 **Saiba mais**: [Switch Expressions JEP](https://openjdk.org/jeps/325)

---

## 📝 String Enhancements

### 🔹 JEP 326: Raw String Literals (Removed)

#### ❓ O que era?
Raw String Literals foram inicialmente propostas para Java 12 mas removidas antes do lançamento devido a feedback da comunidade.

### 🔹 Novos Métodos String

#### ❓ O que é?
Dois novos métodos úteis adicionados à classe String para manipulação comum.

#### ⚠️ Por que é importante?
Simplifica operações comuns de formatação e transformação de strings.

```java
// indent() - adiciona indentação a cada linha
String code = """
    public class Example {
        public void method() {
            System.out.println("Hello");
        }
    }
    """;

String indented = code.indent(4);
// Adiciona 4 espaços a cada linha

// Exemplo prático: formatação de código
public String formatJavaCode(String code, int indentLevel) {
    return code.lines()
        .map(line -> " ".repeat(indentLevel) + line)
        .collect(Collectors.joining("\n"));
}

// transform() - aplica função de transformação
String greeting = "hello world";

// Aplicar múltiplas transformações
String result = greeting
    .transform(String::toUpperCase)        // "HELLO WORLD"
    .transform(s -> s.replace(" ", "_"))   // "HELLO_WORLD"
    .transform(s -> "[" + s + "]");        // "[HELLO_WORLD]"

// Exemplo prático: pipeline de transformação
public String processUserInput(String input) {
    return input
        .transform(String::trim)           // Remove espaços
        .transform(String::toLowerCase)    // Minúsculas
        .transform(this::removeSpecialChars) // Remove caracteres especiais
        .transform(this::validateFormat);  // Valida formato
}

// Comparação com abordagem tradicional
// Antes:
String processed = validateFormat(
    removeSpecialChars(
        input.trim().toLowerCase()
    )
);

// Com transform() - mais fluente
String processed = input
    .transform(String::trim)
    .transform(String::toLowerCase)
    .transform(this::removeSpecialChars)
    .transform(this::validateFormat);
```

---

## 🗑️ Garbage Collection

### 🔹 JEP 189: Shenandoah GC (Experimental)

#### ❓ O que é?
Garbage collector experimental focado em baixa latência, desenvolvido pela Red Hat.

#### ⚠️ Por que é importante?
Oferece pause times consistentemente baixos independente do tamanho do heap, concurrent com a aplicação.

```bash
# Ativar Shenandoah (experimental)
java -XX:+UnlockExperimentalVMOptions \
     -XX:+UseShenandoahGC \
     MyApplication

# Características do Shenandoah:
# - Pause times < 10ms
# - Concurrent compaction
# - Independent of heap size
# - Good for low-latency applications
```

### 🔹 JEP 346: Promptly Return Unused Committed Memory from G1

#### ❓ O que é?
Melhoria no G1GC para retornar memória não utilizada ao sistema operacional mais rapidamente.

#### ⚠️ Por que é importante?
Reduz footprint de memória em aplicações com padrões de uso variáveis, especialmente útil em containers.

```bash
# G1GC retorna memória unused automaticamente
java -XX:+UseG1GC \
     -XX:G1PeriodicGCInterval=5000 \
     MyApplication
```

---

## 🚀 JVM e Performance

### 🔹 JEP 230: Microbenchmark Suite

#### ❓ O que é?
Adiciona JMH (Java Microbenchmark Harness) como parte do código fonte OpenJDK.

#### ⚠️ Por que é importante?
Facilita criação de benchmarks precisos e consistentes para medir performance de código Java.

```java
// Exemplo de microbenchmark
@BenchmarkMode(Mode.Throughput)
@State(Scope.Benchmark)
public class StringConcatBenchmark {
    
    @Param({"10", "100", "1000"})
    private int size;
    
    @Benchmark
    public String stringConcat() {
        String result = "";
        for (int i = 0; i < size; i++) {
            result += "test";
        }
        return result;
    }
    
    @Benchmark
    public String stringBuilder() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < size; i++) {
            sb.append("test");
        }
        return sb.toString();
    }
}
```

### 🔹 JEP 334: JVM Constants API

#### ❓ O que é?
API para modelar key nominal descriptors para class-file e run-time artifacts.

#### ⚠️ Por que é importante?
Melhora performance e facilita tools que analisam ou geram bytecode.

---

## 🔧 Outras Melhorias

### 🔹 JEP 344: Abortable Mixed Collections for G1

#### ❓ O que é?
Permite abortar mixed garbage collections no G1 se excederem pause time target.

### 🔹 Default CDS Archives

#### ❓ O que é?
Arquivos CDS são criados por padrão durante build, melhorando startup time.

```bash
# CDS é usado automaticamente se disponível
java MyApplication  # Startup mais rápido com CDS
```

---

## 🎯 Impacto e Preparação

Java 12 foi importante para **preparar o terreno**:

- ✅ **Switch Expressions** preview mostrou direção da linguagem
- ✅ **Shenandoah GC** trouxe nova opção para baixa latência
- ✅ **String enhancements** continuaram melhorando APIs
- ✅ **Performance improvements** com CDS e G1 melhorias
- ✅ **Microbenchmarks** padronizaram testes de performance

---

## 📅 Informações da Versão

- **📅 Lançamento**: 19 de março de 2019
- **🔧 Tipo**: Feature Release
- **⚡ Suporte**: Terminado em setembro de 2019
- **🎯 Status**: Preview features importantes (Switch Expressions)
- **🔄 Migração**: Simples - principalmente additive features

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 12 Documentation](https://docs.oracle.com/en/java/javase/12/)
- [Java 12 API Specification](https://docs.oracle.com/en/java/javase/12/docs/api/)
- [All JEPs in Java 12](https://openjdk.org/projects/jdk/12/)

### 🎯 **Switch Expressions**
- [JEP 325: Switch Expressions](https://openjdk.org/jeps/325)
- [Switch Expression Examples](https://www.baeldung.com/java-switch)
- [Preview Features Guide](https://openjdk.org/jeps/12)

### 🗑️ **Garbage Collection**
- [Shenandoah GC](https://openjdk.org/jeps/189)
- [G1 Improvements](https://openjdk.org/jeps/346)
- [GC Comparison Guide](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/)

### 💻 **Exemplos e Práticas**
- [Java 12 Features Guide](https://www.baeldung.com/java-12-new-features)
- [Switch Expressions Tutorial](https://mkyong.com/java/java-12-switch-expressions/)
- [JMH Microbenchmarks](http://tutorials.jenkov.com/java-performance/jmh.html) 
