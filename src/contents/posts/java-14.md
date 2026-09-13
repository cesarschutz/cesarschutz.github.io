---
title: "Java 14 — Records Preview e Pattern Matching"
published: 2025-07-02T01:00:00Z
description: "Cada novidade do Java 14 (2020) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java]
category: Java
cover: /covers/java/java-14.svg
draft: false
---

## 📖 Sobre o Java 14

Java 14 foi um release **fundamental** que introduziu **Records** em preview, revolucionando como criamos data classes em Java. Também trouxe **Pattern Matching for instanceof** em preview e **Text Blocks** como feature final, além de **Helpful NullPointerExceptions** que facilitam debugging.

## 💡 O que são JEPs?
Java 14 incluiu 16 JEPs que introduziram features revolucionárias em preview e melhorias significativas de usabilidade e performance.

---

## 🏗️ Modelagem de Dados

### 🔹 JEP 359: Records (Preview)

#### ❓ O que é?
Classes compactas e imutáveis para dados que geram automaticamente construtores, getters, `equals()`, `hashCode()` e `toString()`.

#### ⚠️ Por que é importante?
Elimina drasticamente boilerplate code para data classes, promove imutabilidade e melhora legibilidade do código.

```java
// Antes do Java 14 - classe tradicional verbosa
public class PersonOld {
    private final String name;
    private final int age;
    private final String email;
    
    public PersonOld(String name, int age, String email) {
        this.name = name;
        this.age = age;
        this.email = email;
    }
    
    public String getName() { return name; }
    public int getAge() { return age; }
    public String getEmail() { return email; }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        PersonOld person = (PersonOld) obj;
        return age == person.age &&
               Objects.equals(name, person.name) &&
               Objects.equals(email, person.email);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(name, age, email);
    }
    
    @Override
    public String toString() {
        return "PersonOld{name='" + name + "', age=" + age + ", email='" + email + "'}";
    }
}

// Java 14 - Record simples e poderoso (1 linha!)
public record Person(String name, int age, String email) {}

// Uso automático de todos os métodos gerados
Person person = new Person("João Silva", 30, "joao@email.com");
System.out.println(person.name());     // João Silva
System.out.println(person.age());      // 30
System.out.println(person.email());    // joao@email.com
System.out.println(person);            // Person[name=João Silva, age=30, email=joao@email.com]

// Equals e hashCode funcionam automaticamente
Person person1 = new Person("Ana", 25, "ana@test.com");
Person person2 = new Person("Ana", 25, "ana@test.com");
System.out.println(person1.equals(person2)); // true
System.out.println(person1.hashCode() == person2.hashCode()); // true

// Records são completamente imutáveis
// person.age = 31; // ERRO - não é possível modificar
```

#### 🔧 Records com Validação e Métodos Customizados
```java
// Record com validação no construtor
public record Product(String name, double price) {
    public Product {
        // Compact constructor - validação aplicada automaticamente
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name cannot be null or blank");
        }
        if (price < 0) {
            throw new IllegalArgumentException("Price cannot be negative");
        }
        
        // Normalização
        name = name.trim();
    }
    
    // Métodos customizados
    public boolean isExpensive() {
        return price > 100.0;
    }
    
    public Product withDiscount(double percentage) {
        return new Product(name, price * (1 - percentage / 100));
    }
    
    // Factory methods
    public static Product free(String name) {
        return new Product(name, 0.0);
    }
}

// Record para coordenadas com métodos matemáticos
public record Point(double x, double y) {
    
    // Constructor alternativo
    public Point(double value) {
        this(value, value); // Ponto na diagonal
    }
    
    // Métodos utilitários
    public double distanceFromOrigin() {
        return Math.sqrt(x * x + y * y);
    }
    
    public double distanceTo(Point other) {
        double dx = x - other.x;
        double dy = y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    public Point translate(double deltaX, double deltaY) {
        return new Point(x + deltaX, y + deltaY);
    }
    
    // Constantes úteis
    public static final Point ORIGIN = new Point(0, 0);
    public static final Point UNIT_X = new Point(1, 0);
    public static final Point UNIT_Y = new Point(0, 1);
}

// Record para configuração de aplicação
public record AppConfig(
    String appName,
    String version,
    int port,
    boolean debugMode,
    List<String> features
) {
    public AppConfig {
        // Validações
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("Invalid port: " + port);
        }
        
        // Criar cópia imutável da lista
        features = List.copyOf(features);
    }
    
    public boolean hasFeature(String feature) {
        return features.contains(feature);
    }
    
    public AppConfig withPort(int newPort) {
        return new AppConfig(appName, version, newPort, debugMode, features);
    }
}
```

📚 **Saiba mais**: [Records JEP](https://openjdk.org/jeps/359)

---

## 🔍 Pattern Matching

### 🔹 JEP 305: Pattern Matching for instanceof (Preview)

#### ❓ O que é?
Simplifica verificações de tipo eliminando casting manual e reduzindo código boilerplate.

#### ⚠️ Por que é importante?
Torna verificações de tipo mais expressivas e menos propensas a erro, especialmente em hierarquias de classes complexas.

```java
// Antes do Java 14 - casting manual obrigatório
public String processValue(Object value) {
    if (value instanceof String) {
        String str = (String) value;  // Casting manual redundante
        return "String: " + str.toUpperCase();
    } else if (value instanceof Integer) {
        Integer num = (Integer) value;  // Mais casting manual
        return "Number: " + (num * 2);
    } else if (value instanceof List) {
        List<?> list = (List<?>) value;  // Casting complexo
        return "List with " + list.size() + " elements";
    }
    return "Unknown: " + value.getClass().getSimpleName();
}

// Java 14 - Pattern Matching limpo
public String processValue(Object value) {
    if (value instanceof String str) {           // Casting automático!
        return "String: " + str.toUpperCase();
    } else if (value instanceof Integer num) {   // Variável disponível imediatamente
        return "Number: " + (num * 2);
    } else if (value instanceof List<?> list) {  // Funciona com generics
        return "List with " + list.size() + " elements";
    }
    return "Unknown: " + value.getClass().getSimpleName();
}

// Exemplo prático: processamento de AST (Abstract Syntax Tree)
public sealed interface Expression permits Literal, BinaryOp, UnaryOp {}
public record Literal(Object value) implements Expression {}
public record BinaryOp(Expression left, String operator, Expression right) implements Expression {}
public record UnaryOp(String operator, Expression operand) implements Expression {}

public String evaluate(Expression expr) {
    if (expr instanceof Literal lit) {
        return lit.value().toString();
    } else if (expr instanceof BinaryOp binOp) {
        String left = evaluate(binOp.left());
        String right = evaluate(binOp.right());
        return String.format("(%s %s %s)", left, binOp.operator(), right);
    } else if (expr instanceof UnaryOp unOp) {
        String operand = evaluate(unOp.operand());
        return String.format("(%s%s)", unOp.operator(), operand);
    }
    return "Unknown expression";
}

// Pattern matching com condições adicionais
public String analyzeNumber(Object obj) {
    if (obj instanceof Integer num && num > 0) {
        return "Positive integer: " + num;
    } else if (obj instanceof Integer num && num < 0) {
        return "Negative integer: " + num;
    } else if (obj instanceof Integer num) {
        return "Zero";
    } else if (obj instanceof Double dbl && dbl.isNaN()) {
        return "Not a number";
    } else if (obj instanceof Double dbl && dbl.isInfinite()) {
        return "Infinite number";
    } else if (obj instanceof Double dbl) {
        return "Double: " + dbl;
    }
    return "Not a number type";
}
```

📚 **Saiba mais**: [Pattern Matching for instanceof](https://openjdk.org/jeps/305)

---

## 📝 String e Text Processing

### 🔹 JEP 368: Text Blocks (Final)

#### ❓ O que é?
Text Blocks se tornaram feature final, permitindo strings multilinha sem escape.

#### ⚠️ Por que é importante?
Elimina concatenação verbosa para SQL, JSON, HTML e outros formatos estruturados.

```java
// Text Blocks finais no Java 14
String json = """
    {
        "user": {
            "name": "João Silva",
            "age": 30,
            "preferences": {
                "theme": "dark",
                "notifications": true
            }
        }
    }
    """;

String sql = """
    SELECT u.name, u.email, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.active = true
      AND u.created_at > '2020-01-01'
    GROUP BY u.id, u.name, u.email
    ORDER BY order_count DESC
    """;

// HTML template
String htmlPage = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Java 14 Features</title>
        <style>
            body { font-family: Arial, sans-serif; }
            .highlight { background-color: yellow; }
        </style>
    </head>
    <body>
        <h1>Welcome to Java 14</h1>
        <p>New features include <span class="highlight">Records</span> 
           and <span class="highlight">Pattern Matching</span>!</p>
    </body>
    </html>
    """;
```

---

## 🎯 Switch Expressions

### 🔹 JEP 361: Switch Expressions (Final)

#### ❓ O que é?
Switch Expressions se tornaram feature final, permitindo switch como expressão.

#### ⚠️ Por que é importante?
Elimina fall-through bugs e torna código mais funcional e expressivo.

```java
// Switch Expressions finais
public String getDayType(DayOfWeek day) {
    return switch (day) {
        case MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY -> "Weekday";
        case SATURDAY, SUNDAY -> "Weekend";
    };
}

// Com yield para casos complexos
public int calculateScore(String grade, boolean extraCredit) {
    return switch (grade.toUpperCase()) {
        case "A" -> {
            int base = 90;
            yield extraCredit ? base + 10 : base;
        }
        case "B" -> {
            int base = 80;
            yield extraCredit ? base + 8 : base;
        }
        case "C" -> 70;
        case "D" -> 60;
        case "F" -> 0;
        default -> throw new IllegalArgumentException("Invalid grade: " + grade);
    };
}
```

---

## 🐛 Debugging e Observabilidade

### 🔹 JEP 358: Helpful NullPointerExceptions

#### ❓ O que é?
NPEs agora mostram exatamente qual variável é null, facilitando debugging.

#### ⚠️ Por que é importante?
Reduz drasticamente tempo de debugging ao identificar precisamente a causa do NPE.

```java
// Exemplo que gera NPE mais informativa
public class User {
    private String name;
    private Address address;
    
    // getters...
}

public class Address {
    private String street;
    private City city;
    
    // getters...
}

public class City {
    private String name;
    // getter...
}

// Código que pode gerar NPE
User user = getUser();
String cityName = user.getAddress().getCity().getName();

// Antes do Java 14 - mensagem inútil:
// Exception in thread "main" java.lang.NullPointerException
//     at Example.main(Example.java:10)

// Java 14 - mensagem específica e útil:
// Exception in thread "main" java.lang.NullPointerException: 
//     Cannot invoke "City.getName()" because the return value of 
//     "Address.getCity()" is null
//     at Example.main(Example.java:10)

// Ou se user.getAddress() fosse null:
// Cannot invoke "Address.getCity()" because the return value of 
//     "User.getAddress()" is null
```

#### 🔧 Habilitando Helpful NPEs
```bash
# Ativar helpful NPEs (padrão no Java 14+)
java -XX:+ShowCodeDetailsInExceptionMessages MyApp

# Ou via system property
java -Djava.lang.invoke.stringConcat=BC_SB MyApp
```

📚 **Saiba mais**: [Helpful NullPointerExceptions](https://openjdk.org/jeps/358)

---

## 🚀 Performance e APIs

### 🔹 JEP 370: Foreign Memory Access API (Incubator)

#### ❓ O que é?
API incubator para acessar memória externa ao heap Java de forma segura.

#### ⚠️ Por que é importante?
Permite interoperabilidade eficiente com código nativo e estruturas de dados off-heap.

```java
// Exemplo básico de Foreign Memory Access
try (MemorySegment segment = MemorySegment.allocateNative(100)) {
    MemoryAddress address = segment.baseAddress();
    
    // Escrever dados
    MemoryAccess.setInt(address, 42);
    MemoryAccess.setLong(address.addOffset(4), 123456789L);
    
    // Ler dados
    int value = MemoryAccess.getInt(address);
    long longValue = MemoryAccess.getLong(address.addOffset(4));
    
    System.out.println("Int: " + value + ", Long: " + longValue);
}
```

### 🔹 JEP 349: JFR Event Streaming

#### ❓ O que é?
Permite consumir dados do Java Flight Recorder em tempo real via streaming.

#### ⚠️ Por que é importante?
Habilita monitoramento em tempo real de aplicações Java com baixo overhead.

```java
// Consumir eventos JFR em tempo real
try (var stream = EventStream.openRepository()) {
    stream.onEvent("jdk.CPULoad", event -> {
        System.out.println("CPU Load: " + event.getFloat("machineTotal"));
    });
    
    stream.onEvent("jdk.GarbageCollection", event -> {
        System.out.println("GC: " + event.getString("name") + 
                          " took " + event.getDuration("duration"));
    });
    
    stream.start();
}
```

---

## 🎯 Outras Melhorias

### 🔹 JEP 362: Deprecate Solaris/SPARC Ports

#### ❓ O que é?
Deprecia suporte para Solaris/SPARC, focando esforços em plataformas mais utilizadas.

### 🔹 JEP 364: ZGC no macOS

#### ❓ O que é?
Torna ZGC disponível no macOS como experimental.

```bash
# ZGC no macOS
java -XX:+UnlockExperimentalVMOptions -XX:+UseZGC MyApp
```

### 🔹 JEP 365: ZGC no Windows

#### ❓ O que é?
Porta ZGC para Windows como experimental.

```bash
# ZGC no Windows
java -XX:+UnlockExperimentalVMOptions -XX:+UseZGC MyApp
```

---

## 🎯 Impacto e Importância

Java 14 foi **fundamental** para o futuro do Java:

- ✅ **Records preview** revolucionaram data classes
- ✅ **Pattern Matching** simplificou verificações de tipo
- ✅ **Text Blocks final** melhoraram strings multilinha
- ✅ **Helpful NPEs** facilitaram debugging
- ✅ **Switch Expressions final** consolidaram sintaxe moderna
- ✅ **Foreign Memory API** abriu caminho para interop nativa

---

## 📅 Informações da Versão

- **📅 Lançamento**: 17 de março de 2020
- **🔧 Tipo**: Feature Release
- **⚡ Suporte**: Terminado em setembro de 2020
- **🎯 Status**: Marco importante - introduziu Records
- **🔄 Migração**: Simples - principalmente preview features

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 14 Documentation](https://docs.oracle.com/en/java/javase/14/)
- [Java 14 API Specification](https://docs.oracle.com/en/java/javase/14/docs/api/)
- [All JEPs in Java 14](https://openjdk.org/projects/jdk/14/)

### 🏗️ **Records**
- [JEP 359: Records](https://openjdk.org/jeps/359)
- [Records Tutorial](https://www.baeldung.com/java-record-keyword)
- [Records Best Practices](https://www.infoq.com/articles/java-14-feature-spotlight/)

### 🔍 **Pattern Matching**
- [JEP 305: Pattern Matching for instanceof](https://openjdk.org/jeps/305)
- [Pattern Matching Guide](https://www.baeldung.com/java-pattern-matching-instanceof)

### 📝 **Text Blocks**
- [JEP 368: Text Blocks](https://openjdk.org/jeps/368)
- [Text Blocks Tutorial](https://www.baeldung.com/java-text-blocks)

### 🐛 **Debugging**
- [JEP 358: Helpful NullPointerExceptions](https://openjdk.org/jeps/358)
- [Better NPE Messages](https://www.baeldung.com/java-14-nullpointerexception)

### 💻 **Exemplos e Práticas**
- [Java 14 Features Examples](https://www.baeldung.com/java-14-new-features)
- [Modern Java Development](https://github.com/openjdk/jdk14)
- [Java 14 Migration Guide](https://blog.codefx.org/java/java-14-guide/) 
