---
title: "Java 21 (LTS) — A LTS Revolucionária"
published: 2026-08-31
description: "Cada novidade do Java 21 (2023) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java, LTS]
category: Java
cover: /covers/java/java-21.svg
draft: false
---

## 📖 Sobre o Java 21

Java 21 representa um **marco histórico** na evolução do Java, sendo a versão LTS mais revolucionária desde o Java 8. Lançado em setembro de 2023, introduz **Virtual Threads** como feature final, revolucionando programação concorrente, além de **String Templates**, **Pattern Matching avançado** e **Sequenced Collections**. É a versão que moderniza definitivamente o desenvolvimento Java para alta performance e concorrência massiva.

## 💡 O que são JEPs?
Java 21 incluiu 15 JEPs que consolidaram anos de desenvolvimento em preview features e introduziram inovações que redefinem como escrevemos código Java concorrente e expressivo.

---

## ⭐ Principais Novidades

## 🧵 Concorrência Revolucionária

### 🔹 JEP 444: Virtual Threads (Final)

#### ❓ O que é?
Threads ultra-leves gerenciadas pela JVM que permitem **milhões de threads concorrentes** com overhead mínimo, redefinindo completamente programação concorrente em Java.

#### ⚠️ Por que é importante?
Resolve o problema histórico do Java com threads caras do SO. Permite escrever código sequencial simples que escala para milhões de operações concorrentes, especialmente I/O.

```java
// Thread tradicional vs Virtual Thread
// Tradicional: cara, limitada (~thousands)
Thread traditionalThread = new Thread(() -> {
    // Consume ~2MB stack memory
    doWork();
});

// Virtual Thread: barata, ilimitada (millions)
Thread virtualThread = Thread.ofVirtual().start(() -> {
    // Consume ~few KB, managed by JVM
    doWork();
});

// Factory methods para Virtual Threads
Thread vt1 = Thread.ofVirtual()
    .name("worker-1")
    .start(() -> processTask());

Thread vt2 = Thread.ofVirtual()
    .name("worker-", 2)  // worker-2
    .unstarted(() -> processTask());
vt2.start();

// Virtual Thread com Executor
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    // Pode criar MILHÕES dessas facilmente!
    for (int i = 0; i < 1_000_000; i++) {
        final int taskId = i;
        executor.submit(() -> {
            try {
                // I/O operations não bloqueiam carrier threads
                Thread.sleep(Duration.ofSeconds(1));
                var response = httpClient.send(request, bodyHandler);
                System.out.println("Task " + taskId + " completed");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
    }
} // Executor fecha automaticamente

// Comparação de performance
public class PerformanceComparison {
    
    // Approach tradicional - limitado
    public void traditionalApproach() throws InterruptedException {
        var executor = Executors.newFixedThreadPool(200); // Máximo prático
        var latch = new CountDownLatch(10_000);
        
        for (int i = 0; i < 10_000; i++) {
            executor.submit(() -> {
                try {
                    // Simula I/O
                    Thread.sleep(100);
                    latch.countDown();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        
        latch.await();
        executor.shutdown();
    }
    
    // Virtual Threads - escala infinitamente
    public void virtualThreadsApproach() throws InterruptedException {
        var latch = new CountDownLatch(1_000_000); // 100x mais!
        
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 1_000_000; i++) {
                executor.submit(() -> {
                    try {
                        // Mesmo I/O, mas não bloqueia carrier threads
                        Thread.sleep(100);
                        latch.countDown();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
            }
        }
        
        latch.await(); // Roda muito mais rápido!
    }
}
```

#### 🌐 Casos de Uso Práticos

```java
// Web Server com alta concorrência
public class HighConcurrencyWebServer {
    
    public void handleRequests() {
        var server = HttpServer.create();
        
        server.createContext("/api", exchange -> {
            // Cada request roda em sua própria Virtual Thread
            Thread.ofVirtual().start(() -> {
                try {
                    // I/O intensivo não bloqueia outras requests
                    var data = fetchFromDatabase();
                    var enriched = callExternalAPI(data);
                    var response = processData(enriched);
                    
                    exchange.sendResponseHeaders(200, response.length());
                    exchange.getResponseBody().write(response.getBytes());
                    exchange.close();
                } catch (Exception e) {
                    handleError(exchange, e);
                }
            });
        });
    }
    
    // Web Scraping massivo
    public List<String> scrapeUrls(List<String> urls) {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var futures = urls.stream()
                .map(url -> executor.submit(() -> {
                    // Milhares de requests HTTP concorrentes
                    return httpClient.send(
                        HttpRequest.newBuilder(URI.create(url)).build(),
                        HttpResponse.BodyHandlers.ofString()
                    ).body();
                }))
                .toList();
            
            // Aguardar todos completarem
            return futures.stream()
                .map(future -> {
                    try { return future.get(); }
                    catch (Exception e) { return "Error: " + e.getMessage(); }
                })
                .toList();
        }
    }
    
    // Processamento de arquivos em lote
    public void processLargeDataset(List<Path> files) {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var tasks = files.stream()
                .map(file -> executor.submit(() -> {
                    try {
                        // I/O de arquivo não bloqueia
                        var content = Files.readString(file);
                        var processed = processContent(content);
                        var outputFile = generateOutputPath(file);
                        Files.writeString(outputFile, processed);
                        return outputFile;
                    } catch (IOException e) {
                        throw new UncheckedIOException(e);
                    }
                }))
                .toList();
            
            // Aguardar processamento
            tasks.forEach(task -> {
                try { 
                    var result = task.get();
                    System.out.println("Processed: " + result);
                } catch (Exception e) {
                    System.err.println("Error: " + e.getMessage());
                }
            });
        }
    }
}
```

#### ⚡ Performance e Características

| Aspecto | Platform Threads | Virtual Threads |
|---------|------------------|-----------------|
| **Memória Stack** | ~2MB cada | ~few KB cada |
| **Limite Prático** | ~thousands | **millions** |
| **Criação** | Cara (~1ms) | **Muito barata (~μs)** |
| **Context Switch** | Caro (kernel) | **Muito barato (JVM)** |
| **I/O Blocking** | Bloqueia thread | **Não bloqueia carrier** |
| **Compatibilidade** | Código existente | **100% compatível** |

📚 **Saiba mais**: [Virtual Threads Guide](https://openjdk.org/jeps/444)

## 🎨 String Templates

### 🔹 JEP 430: String Templates (Preview)

#### ❓ O que é?
Sistema type-safe de interpolação de strings que permite embedding seguro de expressões e valores diretamente na string, substituindo concatenação verbosa.

#### ⚠️ Por que é importante?
Elimina problemas de SQL injection, oferece melhor performance que concatenação e torna código mais legível e seguro.

```java
// String Template básico
String name = "João Silva";
int age = 30;
String message = STR."Olá, \{name}! Você tem \{age} anos.";
// Resultado: "Olá, João Silva! Você tem 30 anos."

// Expressões complexas
double price = 19.99;
int quantity = 3;
double tax = 0.08;
String invoice = STR."Total: R$ \{price * quantity * (1 + tax):%.2f}";
// Resultado: "Total: R$ 64.77"

// Templates multilinhas
String report = STR."""
    Relatório de Vendas
    ==================
    Cliente: \{name}
    Idade: \{age} anos
    Itens: \{quantity}
    Subtotal: R$ \{price * quantity:%.2f}
    Taxa: R$ \{price * quantity * tax:%.2f}
    Total: R$ \{price * quantity * (1 + tax):%.2f}
    Data: \{LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))}
    """;

// Templates para diferentes formatos
public class TemplateExamples {
    
    // JSON seguro
    public String generateJson(User user) {
        return STR."""
            {
                "id": \{user.getId()},
                "name": "\{user.getName()}",
                "email": "\{user.getEmail()}",
                "active": \{user.isActive()},
                "lastLogin": "\{user.getLastLogin()?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)}",
                "roles": [\{user.getRoles().stream()
                    .map(role -> STR."\"\{role}\"")
                    .collect(Collectors.joining(", "))}]
            }
            """;
    }
    
    // SQL Templates (type-safe!)
    public String buildQuery(String table, List<String> columns, Map<String, Object> filters) {
        var columnList = String.join(", ", columns);
        var whereClause = filters.entrySet().stream()
            .map(entry -> STR."\{entry.getKey()} = ?\{entry.getValue()}")
            .collect(Collectors.joining(" AND "));
            
        return STR."""
            SELECT \{columnList}
            FROM \{table}
            WHERE \{whereClause}
            ORDER BY created_at DESC
            """;
    }
    
    // HTML Templates
    public String generateCard(Product product) {
        return STR."""
            <div class="product-card">
                <h3>\{product.getName()}</h3>
                <p class="description">\{product.getDescription()}</p>
                <div class="price">
                    <span class="currency">R$</span>
                    <span class="amount">\{product.getPrice():%.2f}</span>
                </div>
                <div class="stock \{product.getStock() > 0 ? "in-stock" : "out-of-stock"}">
                    \{product.getStock() > 0 ? 
                        STR."\{product.getStock()} disponíveis" : 
                        "Fora de estoque"}
                </div>
            </div>
            """;
    }
}
```

#### 🛡️ Templates Customizados

```java
// Template processor customizado para SQL
public static final StringTemplate.Processor<PreparedStatement, SQLException> SQL = 
    (StringTemplate template) -> {
        String query = StringTemplate.STR.process(template);
        return connection.prepareStatement(query);
    };

// Uso seguro contra SQL injection
public List<User> findUsers(String namePattern, int minAge) throws SQLException {
    PreparedStatement stmt = SQL."""
        SELECT * FROM users 
        WHERE name LIKE \{namePattern}
        AND age >= \{minAge}
        ORDER BY name
        """;
    
    // PreparedStatement já configurado!
    return executeQuery(stmt);
}

// Template para logs estruturados
public static final StringTemplate.Processor<LogEvent, RuntimeException> LOG = 
    (StringTemplate template) -> {
        // Processa template e cria evento de log estruturado
        var processed = StringTemplate.STR.process(template);
        return new LogEvent(Level.INFO, processed, Instant.now());
    };

// Uso
LogEvent event = LOG."User \{userId} performed action \{action} at \{timestamp}";
logger.log(event);
```

### 🔹 Pattern Matching for Switch (Final)

#### ❓ O que é?
Switch melhorado que suporta pattern matching com qualquer tipo e guards.

#### 💡 Exemplo Simples
```java
// Pattern matching com tipos
public String processValue(Object value) {
    return switch (value) {
        case String s when s.length() > 10 -> "String longa: " + s;
        case String s -> "String curta: " + s;
        case Integer i when i > 0 -> "Número positivo: " + i;
        case Integer i -> "Número não positivo: " + i;
        case null -> "Valor nulo";
        default -> "Tipo desconhecido: " + value.getClass();
    };
}

// Com Records
record Point(int x, int y) {}
record Circle(Point center, int radius) {}

public String analyzeShape(Object shape) {
    return switch (shape) {
        case Circle(Point(int x, int y), int r) when r > 10 -> 
            STR."Círculo grande em (\{x}, \{y}) com raio \{r}";
        case Circle(Point(int x, int y), int r) -> 
            STR."Círculo pequeno em (\{x}, \{y}) com raio \{r}";
        case Point(int x, int y) -> STR."Ponto em (\{x}, \{y})";
        default -> "Forma desconhecida";
    };
}
```

### 🔹 Sequenced Collections

#### ❓ O que é?
Nova interface que representa coleções com ordem definida, oferecendo acesso ao primeiro e último elemento.

#### 💡 Exemplo Simples
```java
// SequencedCollection interface
List<String> list = List.of("primeiro", "meio", "último");

// Métodos novos
String primeiro = list.getFirst();  // "primeiro"
String ultimo = list.getLast();     // "último"

// Reversed view
List<String> reverso = list.reversed();
// ["último", "meio", "primeiro"]

// Com Set também
LinkedHashSet<String> set = new LinkedHashSet<>();
set.add("a");
set.add("b");
set.add("c");

String primeiroSet = set.getFirst(); // "a"
String ultimoSet = set.getLast();    // "c"
```

### 🔹 Record Patterns (Final)

#### ❓ O que é?
Permite desestruturar Records diretamente em pattern matching.

#### 💡 Exemplo Simples
```java
record Person(String name, int age) {}
record Employee(Person person, String department) {}

public String processEmployee(Employee emp) {
    return switch (emp) {
        // Desestruturação aninhada
        case Employee(Person(String name, int age), String dept) 
            when age < 25 -> STR."\{name} é estagiário em \{dept}";
        case Employee(Person(String name, int age), String dept) 
            when age > 50 -> STR."\{name} é sênior em \{dept}";
        case Employee(Person(String name, int age), String dept) -> 
            STR."\{name} (\{age} anos) trabalha em \{dept}";
    };
}
```

### 🔹 Key Encapsulation Mechanism API

#### ❓ O que é?
API para algoritmos criptográficos quantum-safe, preparando Java para a era pós-quântica.

#### 💡 Exemplo Simples
```java
// Gerar par de chaves para KEM
KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM");
KeyPair keyPair = kpg.generateKeyPair();

// Encapsular segredo
KEM kem = KEM.getInstance("ML-KEM");
KEM.Encapsulator encapsulator = kem.newEncapsulator(keyPair.getPublic());
KEM.Encapsulated encapsulated = encapsulator.encapsulate();

byte[] sharedSecret = encapsulated.key();
byte[] encapsulation = encapsulated.encapsulation();
```

---

## 🔧 Outras Melhorias Importantes

### ⚡ Performance
- **Generational ZGC**: Garbage Collection ainda mais eficiente
- **Prepare to Restrict Dynamic Loading**: Melhor segurança
- **Dynamic CDS Archives**: Startup mais rápido

### 🛠️ APIs
- **Math.clamp()**: Limitar valores a um range
- **StringBuilder/StringBuffer repeat()**: Repetir sequências
- **Emoji support**: Melhor suporte a caracteres Unicode

---

---

## 🎯 Impacto e Revolução

Java 21 representa **a maior revolução** desde Java 8:

- ✅ **Virtual Threads** eliminam limitações de concorrência
- ✅ **String Templates** modernizam manipulação de strings
- ✅ **Pattern Matching avançado** simplifica lógica complexa
- ✅ **Sequenced Collections** melhoram APIs de coleção
- ✅ **Performance excepcional** para aplicações I/O intensivas
- ✅ **Preparado para futuro** quantum-safe
- ✅ **Compatibilidade total** com código existente

## 📊 Comparação de LTS

| Aspecto | Java 8 | Java 11 | Java 17 | **Java 21** |
|---------|---------|---------|---------|-------------|
| **Concorrência** | Threads tradicionais | Threads tradicionais | Threads tradicionais | **🚀 Virtual Threads** |
| **String Templates** | ❌ | ❌ | ❌ | **✅ Preview** |
| **Pattern Matching** | ❌ | ❌ | instanceof | **✅ Switch avançado** |
| **Record Patterns** | ❌ | ❌ | ❌ | **✅ Final** |
| **Sequenced Collections** | ❌ | ❌ | ❌ | **✅ Final** |
| **Quantum-safe Crypto** | ❌ | ❌ | ❌ | **✅ KEM API** |
| **Performance I/O** | Thread pools | Thread pools | Thread pools | **🚀 Massivamente escalável** |

---

## 📅 Informações da Versão

- **📅 Lançamento**: 19 de setembro de 2023
- **🔧 Tipo**: LTS (Long Term Support)
- **⚡ Suporte Oracle**: Até setembro de 2031 (Extended até 2034)
- **🆓 Suporte Gratuito**: Eclipse Temurin, Amazon Corretto, Microsoft OpenJDK
- **🎯 Status**: **LTS revolucionária** - nova referência para alta performance
- **🔄 Migração**: Fácil - principalmente additive features

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 21 Documentation](https://docs.oracle.com/en/java/javase/21/)
- [Java 21 API Specification](https://docs.oracle.com/en/java/javase/21/docs/api/)
- [All JEPs in Java 21](https://openjdk.org/projects/jdk/21/)

### 🧵 **Virtual Threads**
- [Virtual Threads Guide](https://openjdk.org/jeps/444)
- [Virtual Threads Tutorial](https://www.baeldung.com/java-virtual-thread-vs-thread)
- [Loom Project](https://openjdk.org/projects/loom/)
- [Virtual Threads Best Practices](https://spring.io/blog/2022/10/11/embracing-virtual-threads)

### 🎨 **String Templates**
- [String Templates JEP](https://openjdk.org/jeps/430)
- [String Interpolation Guide](https://www.baeldung.com/java-string-templates)

### 🔍 **Pattern Matching**
- [Pattern Matching for Switch](https://openjdk.org/jeps/441)
- [Record Patterns](https://openjdk.org/jeps/440)
- [Pattern Matching Tutorial](https://www.baeldung.com/java-pattern-matching-switch)

### 📚 **Collections**
- [Sequenced Collections](https://openjdk.org/jeps/431)
- [Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)

### 🔒 **Segurança**
- [Key Encapsulation Mechanism](https://openjdk.org/jeps/452)
- [Quantum-Safe Cryptography](https://www.nist.gov/news-events/news/2022/07/nist-announces-first-four-quantum-resistant-cryptographic-algorithms)

### 💻 **Exemplos e Práticas**
- [Java 21 Features Examples](https://www.baeldung.com/java-21-new-features)
- [Modern Java Development](https://github.com/openjdk/jdk21)
- [Virtual Threads Cookbook](https://github.com/ebarlas/virtual-threads-examples) 
