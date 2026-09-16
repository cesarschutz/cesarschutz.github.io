---
title: "Java 20 — Scoped Values e Virtual Threads Melhorados"
published: 2025-07-02T02:00:00Z
description: "Cada novidade do Java 20 (2023) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java]
series: java
cover: /covers/java/java-20.svg
draft: false
---

## 📖 Sobre o Java 20

Java 20 introduziu **Scoped Values** como incubator, uma alternativa moderna ao ThreadLocal otimizada para Virtual Threads. Também trouxe melhorias incrementais em **Virtual Threads**, **Pattern Matching**, **Foreign Function & Memory API** e **Structured Concurrency**.

## 💡 O que são JEPs?
Java 20 incluiu 6 JEPs focados em refinamento de features preview e novas APIs para concorrência moderna.

---

## 🧵 Contextualização para Virtual Threads

### 🔹 JEP 429: Scoped Values (Incubator)

#### ❓ O que é?
Alternativa ao ThreadLocal que é **imutável**, **automática** e **otimizada para Virtual Threads**. Valores são passados automaticamente para threads filhas e removidos ao sair do escopo.

#### ⚠️ Por que é importante?
ThreadLocal tem problemas sérios com Virtual Threads: vazamentos de memória, acoplamento temporal e overhead. Scoped Values resolvem esses problemas.

```java
// Problemas do ThreadLocal tradicional
public class ThreadLocalProblems {
    
    // ThreadLocal clássico - problemático
    private static final ThreadLocal<User> USER_CONTEXT = new ThreadLocal<>();
    
    public void oldWay() {
        USER_CONTEXT.set(getCurrentUser());
        try {
            doWork(); // Pode vazar para outras operações
        } finally {
            USER_CONTEXT.remove(); // OBRIGATÓRIO - senão vaza memória
        }
    }
    
    // Com milhões de Virtual Threads, isso não escala!
}

// Scoped Values - solução moderna
public class ScopedValuesSolution {
    
    // Declaração de Scoped Value
    private static final ScopedValue<User> CURRENT_USER = ScopedValue.newInstance();
    private static final ScopedValue<String> REQUEST_ID = ScopedValue.newInstance();
    
    // Usar com escopo definido
    public void modernWay() {
        User user = getCurrentUser();
        String requestId = generateRequestId();
        
        // Definir valores no escopo
        ScopedValue.where(CURRENT_USER, user)
                  .where(REQUEST_ID, requestId)
                  .run(() -> {
                      doWork(); // user e requestId disponíveis automaticamente
                      callService(); // Valores propagados para métodos filhos
                  });
        // Valores automaticamente removidos aqui - SEM finally!
    }
    
    // Acesso em qualquer lugar da call stack
    public void doWork() {
        // Valores disponíveis sem passar parâmetros
        User user = CURRENT_USER.get();
        String requestId = REQUEST_ID.get();
        
        System.out.printf("Processing for user %s (request %s)%n", 
                         user.getName(), requestId);
        
        // Chamar outros métodos - valores propagam automaticamente
        processData();
        logActivity();
    }
    
    public void processData() {
        // Valores ainda disponíveis aqui!
        User user = CURRENT_USER.get();
        if (user.hasPermission("data.read")) {
            // processar...
        }
    }
    
    private void logActivity() {
        // E aqui também!
        String requestId = REQUEST_ID.get();
        logger.info("Activity logged for request: " + requestId);
    }
}

// Exemplo prático: Web Request Processing
public class WebRequestHandler {
    
    static final ScopedValue<HttpRequest> REQUEST = ScopedValue.newInstance();
    static final ScopedValue<User> USER = ScopedValue.newInstance();
    static final ScopedValue<Instant> START_TIME = ScopedValue.newInstance();
    
    public void handleRequest(HttpRequest request) {
        User user = authenticateUser(request);
        Instant startTime = Instant.now();
        
        // Toda operação tem contexto automático
        ScopedValue.where(REQUEST, request)
                  .where(USER, user)
                  .where(START_TIME, startTime)
                  .run(() -> {
                      processRequest();
                  });
    }
    
    private void processRequest() {
        // Contexto disponível sem injeção de dependência
        HttpRequest request = REQUEST.get();
        User user = USER.get();
        
        // Validações
        validatePermissions();
        
        // Lógica de negócio
        var result = businessLogic();
        
        // Response
        sendResponse(result);
        
        // Logging automático
        logRequest();
    }
    
    private void validatePermissions() {
        User user = USER.get();
        HttpRequest request = REQUEST.get();
        
        String resource = request.getPath();
        if (!user.hasPermission(resource)) {
            throw new ForbiddenException("Access denied to " + resource);
        }
    }
    
    private void logRequest() {
        HttpRequest request = REQUEST.get();
        User user = USER.get();
        Instant startTime = START_TIME.get();
        
        Duration duration = Duration.between(startTime, Instant.now());
        
        logger.info("Request {} by {} completed in {}ms", 
                   request.getPath(), 
                   user.getName(), 
                   duration.toMillis());
    }
}

// Herança automática em Virtual Threads
public class VirtualThreadPropagation {
    
    static final ScopedValue<String> CORRELATION_ID = ScopedValue.newInstance();
    
    public void parallelProcessing() {
        String correlationId = UUID.randomUUID().toString();
        
        ScopedValue.where(CORRELATION_ID, correlationId)
                  .run(() -> {
                      // Spawnar múltiplas Virtual Threads
                      List<CompletableFuture<String>> tasks = IntStream.range(0, 10)
                          .mapToObj(i -> CompletableFuture.supplyAsync(() -> {
                              // CORRELATION_ID automaticamente disponível!
                              String id = CORRELATION_ID.get();
                              return processTask(i, id);
                          }, Executors.newVirtualThreadPerTaskExecutor()))
                          .toList();
                      
                      // Aguardar todas
                      List<String> results = tasks.stream()
                          .map(CompletableFuture::join)
                          .toList();
                      
                      System.out.println("Parallel results: " + results);
                  });
    }
    
    private String processTask(int taskId, String correlationId) {
        // Simular trabalho
        Thread.sleep(Duration.ofMillis(100));
        return String.format("Task %d completed (correlation: %s)", 
                           taskId, correlationId);
    }
}
```

#### 📊 Comparação: ThreadLocal vs Scoped Values

| Aspecto | ThreadLocal | Scoped Values |
|---------|-------------|---------------|
| **Mutabilidade** | Mutável | Imutável |
| **Limpeza** | Manual (finally) | Automática |
| **Virtual Threads** | Problemas de escala | Otimizado |
| **Herança** | Opcional (`InheritableThreadLocal`) | Automática |
| **Vazamento** | Comum | Impossível |
| **Performance** | Overhead com VT | Eficiente |

📚 **Saiba mais**: [Scoped Values JEP](https://openjdk.org/jeps/429)

---

## 🧵 Virtual Threads Aprimorados

### 🔹 JEP 436: Virtual Threads (Segunda Preview)

#### ❓ O que é?
Segunda iteração dos Virtual Threads com melhorias de performance, debugging e observabilidade.

#### ⚠️ Por que é importante?
Refinamentos baseados no feedback da primeira preview, preparando para finalização no Java 21.

```java
// Melhorias na observabilidade no Java 20
public class VirtualThreadsObservability {
    
    public static void demoDebugging() throws InterruptedException {
        // Criar Virtual Thread com nome
        Thread vt = Thread.ofVirtual()
            .name("demo-virtual-thread")
            .start(() -> {
                System.out.println("Running in: " + Thread.currentThread());
                try {
                    Thread.sleep(Duration.ofSeconds(1));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        
        vt.join();
    }
    
    // Factory melhorada para Virtual Threads
    public static void improvedFactory() {
        ThreadFactory factory = Thread.ofVirtual()
            .name("worker-", 0) // Nomes numerados: worker-0, worker-1, etc
            .factory();
        
        // Usar com executor
        try (var executor = Executors.newThreadPerTaskExecutor(factory)) {
            for (int i = 0; i < 5; i++) {
                final int taskId = i;
                executor.submit(() -> {
                    System.out.printf("Task %d running in %s%n", 
                                    taskId, 
                                    Thread.currentThread().getName());
                    Thread.sleep(Duration.ofMillis(500));
                    return taskId;
                });
            }
        }
    }
    
    // Melhor integração com JFR (Java Flight Recorder)
    public static void jfrIntegration() {
        // Virtual Threads agora aparecem no JFR com mais detalhes
        Thread.startVirtualThread(() -> {
            // Operação que será capturada pelo JFR
            doWork();
        });
    }
    
    private static void doWork() {
        // Simular CPU e I/O
        for (int i = 0; i < 1000; i++) {
            Math.sqrt(i); // CPU
        }
        
        try {
            Thread.sleep(Duration.ofMillis(10)); // I/O
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
    
    // Structured concurrency melhorado
    public static String fetchUserData(Long userId) throws InterruptedException, ExecutionException {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            
            // Tasks paralelas com Virtual Threads
            Supplier<String> userTask = scope.fork(() -> {
                Thread.sleep(Duration.ofMillis(100));
                return "User data for " + userId;
            });
            
            Supplier<String> prefsTask = scope.fork(() -> {
                Thread.sleep(Duration.ofMillis(150));
                return "Preferences for " + userId;
            });
            
            Supplier<String> ordersTask = scope.fork(() -> {
                Thread.sleep(Duration.ofMillis(200));
                return "Orders for " + userId;
            });
            
            // Aguardar todas
            scope.join().throwIfFailed();
            
            // Combinar resultados
            return String.format("Profile: %s, %s, %s", 
                               userTask.get(), 
                               prefsTask.get(), 
                               ordersTask.get());
        }
    }
}
```

---

## 🔀 Pattern Matching Evoluído

### 🔹 JEP 433: Pattern Matching for switch (Quarta Preview)

#### ❓ O que é?
Quarta iteração do pattern matching com melhorias na sintaxe e novos recursos.

#### ⚠️ Por que é importante?
Preparação final para a versão estável no Java 21.

```java
// Pattern matching refinado no Java 20
public class PatternMatching20 {
    
    // Guards mais expressivos
    public static String analyzeNumber(Object obj) {
        return switch (obj) {
            case Integer i when i > 100 -> "Large integer: " + i;
            case Integer i when i > 0 -> "Small positive: " + i;
            case Integer i when i == 0 -> "Zero";
            case Integer i -> "Negative: " + i;
            case Double d when d.isNaN() -> "Not a Number";
            case Double d when d.isInfinite() -> "Infinite";
            case Double d -> String.format("Double: %.2f", d);
            case String s when s.isBlank() -> "Empty string";
            case String s -> "String: " + s;
            case null -> "null value";
            default -> "Unknown type: " + obj.getClass().getSimpleName();
        };
    }
    
    // Pattern matching com Records complexos
    public static String processOrder(Object order) {
        return switch (order) {
            case Order(var id, Customer(var name, var email), var items) 
                when items.size() > 10 -> 
                    "Large order " + id + " for " + name + " (" + items.size() + " items)";
                
            case Order(var id, Customer(var name, var email), var items) 
                when items.stream().anyMatch(item -> item.price() > 1000) ->
                    "High-value order " + id + " for " + name;
                
            case Order(var id, Customer(var name, var email), var items) ->
                    "Regular order " + id + " for " + name + " (" + items.size() + " items)";
                
            case null -> "No order";
            default -> "Invalid order format";
        };
    }
    
    // Nested patterns
    public static String processResponse(Object response) {
        return switch (response) {
            case ApiResponse.Success(UserData(var name, var age), var timestamp) 
                when age >= 18 -> 
                    "Adult user " + name + " (response at " + timestamp + ")";
                
            case ApiResponse.Success(UserData(var name, var age), var timestamp) -> 
                    "Minor user " + name + " (response at " + timestamp + ")";
                
            case ApiResponse.Error(var code, var message) 
                when code >= 500 -> 
                    "Server error: " + message;
                
            case ApiResponse.Error(var code, var message) -> 
                    "Client error: " + message;
                
            default -> "Unknown response";
        };
    }
}

// Records para demonstração
record Order(String id, Customer customer, List<Item> items) {}
record Customer(String name, String email) {}
record Item(String name, double price) {}

sealed interface ApiResponse {
    record Success(UserData data, Instant timestamp) implements ApiResponse {}
    record Error(int code, String message) implements ApiResponse {}
}

record UserData(String name, int age) {}
```

---

## 🌐 Foreign Function & Memory API

### 🔹 JEP 434: Foreign Function & Memory API (Segunda Preview)

#### ❓ O que é?
Segunda preview da API para interoperabilidade com código nativo, com melhorias na usabilidade.

```java
// API melhorada no Java 20
import java.lang.foreign.*;

public class ForeignAPI20 {
    
    public static void memoryOperations() {
        try (Arena arena = Arena.ofConfined()) {
            // Operações de memória melhoradas
            MemorySegment buffer = arena.allocate(1024);
            
            // Write structured data
            buffer.setAtIndex(ValueLayout.JAVA_INT, 0, 42);
            buffer.setAtIndex(ValueLayout.JAVA_LONG, 1, 123456789L);
            buffer.setAtIndex(ValueLayout.JAVA_FLOAT, 2, 3.14159f);
            
            // Read back
            int intValue = buffer.getAtIndex(ValueLayout.JAVA_INT, 0);
            long longValue = buffer.getAtIndex(ValueLayout.JAVA_LONG, 1);
            float floatValue = buffer.getAtIndex(ValueLayout.JAVA_FLOAT, 2);
            
            System.out.printf("Values: %d, %d, %.5f%n", 
                            intValue, longValue, floatValue);
        }
    }
    
    public static void stringOperations() {
        try (Arena arena = Arena.ofConfined()) {
            // String operations improved
            String message = "Hello from Java 20! 🚀";
            MemorySegment nativeString = arena.allocateUtf8String(message);
            
            // Length and content
            long length = nativeString.byteSize();
            String readBack = nativeString.getUtf8String(0);
            
            System.out.println("Native string length: " + length);
            System.out.println("Content: " + readBack);
        }
    }
}
```

---

## 🏗️ Structured Concurrency

### 🔹 JEP 437: Structured Concurrency (Segunda Incubação)

#### ❓ O que é?
Segunda iteração da Structured Concurrency com melhorias na API.

```java
// Melhorias na Structured Concurrency
import jdk.incubator.concurrent.StructuredTaskScope;

public class StructuredConcurrency20 {
    
    public static void improvedAPI() throws InterruptedException {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            
            // API melhorada para fork
            var task1 = scope.fork(() -> {
                Thread.sleep(Duration.ofMillis(500));
                return "Task 1 result";
            });
            
            var task2 = scope.fork(() -> {
                Thread.sleep(Duration.ofMillis(300));
                return "Task 2 result";
            });
            
            // Join com timeout melhorado
            scope.join();
            scope.throwIfFailed();
            
            // Resultados
            System.out.println("Results: " + task1.get() + ", " + task2.get());
        }
    }
    
    public static String raceToSuccess() throws InterruptedException {
        try (var scope = new StructuredTaskScope.ShutdownOnSuccess<String>()) {
            
            // Múltiplas fontes - primeira a responder vence
            scope.fork(() -> {
                Thread.sleep(Duration.ofSeconds(2));
                return "Database result";
            });
            
            scope.fork(() -> {
                Thread.sleep(Duration.ofSeconds(1));
                return "Cache result"; // Mais rápida
            });
            
            scope.fork(() -> {
                Thread.sleep(Duration.ofSeconds(3));
                return "API result";
            });
            
            scope.join();
            return scope.result(); // "Cache result"
        }
    }
}
```

---

## 🎯 Impacto e Importância

Java 20 refineu features importantes:

- ✅ **Scoped Values** introduziram alternativa moderna ao ThreadLocal
- ✅ **Virtual Threads melhorados** prepararam para finalização no Java 21
- ✅ **Pattern Matching refinado** evoluiu para versão final
- ✅ **Foreign Function API** avançou em usabilidade
- ✅ **Structured Concurrency** melhorou API

---

## 📅 Informações da Versão

- **📅 Lançamento**: 21 de março de 2023
- **🔧 Tipo**: Feature Release
- **⚡ Suporte**: Terminado em setembro de 2023
- **🎯 Status**: Importantes refinamentos para Java 21 LTS
- **🔄 Migração**: Simples - principalmente melhorias graduais

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 20 Documentation](https://docs.oracle.com/en/java/javase/20/)
- [Java 20 API Specification](https://docs.oracle.com/en/java/javase/20/docs/api/)
- [All JEPs in Java 20](https://openjdk.org/projects/jdk/20/)

### 🧵 **Scoped Values**
- [JEP 429: Scoped Values (Incubator)](https://openjdk.org/jeps/429)
- [Scoped Values Tutorial](https://www.baeldung.com/java-scoped-values)
- [ThreadLocal vs Scoped Values](https://www.infoq.com/articles/java-scoped-values/)

### 🧵 **Virtual Threads**
- [JEP 436: Virtual Threads (Second Preview)](https://openjdk.org/jeps/436)
- [Virtual Threads Improvements](https://www.baeldung.com/java-virtual-threads-improvements)

### 🔀 **Pattern Matching**
- [JEP 433: Pattern Matching for switch (Fourth Preview)](https://openjdk.org/jeps/433)
- [Pattern Matching Evolution](https://www.baeldung.com/java-pattern-matching-evolution)

### 🌐 **Foreign Function & Memory**
- [JEP 434: Foreign Function & Memory API (Second Preview)](https://openjdk.org/jeps/434)
- [Foreign Memory API Guide](https://www.baeldung.com/java-foreign-memory-api-improvements)

### 🏗️ **Structured Concurrency**
- [JEP 437: Structured Concurrency (Second Incubator)](https://openjdk.org/jeps/437)
- [Structured Concurrency Evolution](https://www.baeldung.com/java-structured-concurrency-improvements)

### 💻 **Exemplos e Práticas**
- [Java 20 Features Guide](https://www.baeldung.com/java-20-new-features)
- [Java 20 Migration Tips](https://blog.codefx.org/java/java-20-guide/)
- [Modern Concurrency Patterns](https://github.com/openjdk/jdk20) 
