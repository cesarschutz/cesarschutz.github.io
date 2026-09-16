---
title: "Java 19 — Virtual Threads Preview"
published: 2025-07-02T01:50:00Z
description: "Cada novidade do Java 19 (2022) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java]
series: java
cover: /covers/java/java-19.svg
draft: false
---

## 📖 Sobre o Java 19

Java 19 introduziu **Virtual Threads** em preview, uma das **maiores inovações** do Java moderno para concorrência. Esta feature revoluciona como lidamos com aplicações altamente concorrentes. Também trouxe melhorias em **Pattern Matching for Switch**, **Foreign Function & Memory API** e **Structured Concurrency**.

## 💡 O que são JEPs?
Java 19 incluiu 7 JEPs focados em concorrência revolucionária, pattern matching avançado e interoperabilidade nativa.

---

## 🧵 Revolução na Concorrência

### 🔹 JEP 425: Virtual Threads (Preview)

#### ❓ O que é?
Threads leves gerenciadas pela JVM que permitem **milhões de threads concorrentes** com overhead mínimo.

#### ⚠️ Por que é importante?
Elimina o limite tradicional de threads do SO, permitindo arquiteturas simples e altamente escaláveis.

```java
// Virtual Threads revolucionando concorrência
public class VirtualThreadsExample {
    
    // Exemplo básico - criando Virtual Threads
    public static void basicVirtualThreads() throws InterruptedException {
        
        // Thread tradicional (pesada)
        Thread platformThread = new Thread(() -> {
            System.out.println("Platform thread: " + Thread.currentThread());
        });
        platformThread.start();
        platformThread.join();
        
        // Virtual Thread (leve)
        Thread virtualThread = Thread.ofVirtual().start(() -> {
            System.out.println("Virtual thread: " + Thread.currentThread());
        });
        virtualThread.join();
        
        // Factory method mais conveniente
        Thread.startVirtualThread(() -> {
            System.out.println("Virtual thread factory: " + Thread.currentThread());
        });
        
        Thread.sleep(100); // Aguardar execução
    }
    
    // Demonstração de escalabilidade - milhões de Virtual Threads
    public static void demonstrateScalability() throws InterruptedException {
        System.out.println("Creating 1 million virtual threads...");
        
        var startTime = System.currentTimeMillis();
        var latch = new CountDownLatch(1_000_000);
        
        // Criar 1 milhão de Virtual Threads
        for (int i = 0; i < 1_000_000; i++) {
            final int threadNum = i;
            Thread.startVirtualThread(() -> {
                try {
                    // Simular trabalho com I/O
                    Thread.sleep(Duration.ofMillis(100));
                    
                    if (threadNum % 100_000 == 0) {
                        System.out.println("Thread " + threadNum + " completed");
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await();
        var endTime = System.currentTimeMillis();
        
        System.out.printf("1 million virtual threads completed in %d ms%n", 
                         endTime - startTime);
    }
    
    // Comparação de performance: Platform vs Virtual Threads
    public static void performanceComparison() throws InterruptedException {
        int numTasks = 10_000;
        
        // Teste com Platform Threads (limitado pelo pool)
        var platformStart = System.currentTimeMillis();
        try (var executor = Executors.newFixedThreadPool(200)) {
            var latch = new CountDownLatch(numTasks);
            
            for (int i = 0; i < numTasks; i++) {
                executor.submit(() -> {
                    try {
                        // Simular I/O blocking
                        Thread.sleep(Duration.ofMillis(50));
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        latch.countDown();
                    }
                });
            }
            
            latch.await();
        }
        var platformTime = System.currentTimeMillis() - platformStart;
        
        // Teste com Virtual Threads (sem limite prático)
        var virtualStart = System.currentTimeMillis();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var latch = new CountDownLatch(numTasks);
            
            for (int i = 0; i < numTasks; i++) {
                executor.submit(() -> {
                    try {
                        // Mesmo trabalho I/O blocking
                        Thread.sleep(Duration.ofMillis(50));
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        latch.countDown();
                    }
                });
            }
            
            latch.await();
        }
        var virtualTime = System.currentTimeMillis() - virtualStart;
        
        System.out.printf("Platform threads (%d tasks): %d ms%n", numTasks, platformTime);
        System.out.printf("Virtual threads (%d tasks): %d ms%n", numTasks, virtualTime);
        System.out.printf("Virtual threads speedup: %.2fx%n", 
                         (double) platformTime / virtualTime);
    }
}

// Servidor web usando Virtual Threads
public class VirtualThreadWebServer {
    
    public static void startServer() throws IOException {
        var server = HttpServer.create(new InetSocketAddress(8080), 0);
        
        // Configurar executor com Virtual Threads
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        
        // Handler simples
        server.createContext("/", exchange -> {
            // Simular processamento que faz I/O
            try {
                Thread.sleep(Duration.ofMillis(100)); // Database call simulation
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            
            String response = "Hello from Virtual Thread: " + Thread.currentThread();
            exchange.sendResponseHeaders(200, response.length());
            
            try (var output = exchange.getResponseBody()) {
                output.write(response.getBytes());
            }
        });
        
        // Handler para demonstrar concorrência
        server.createContext("/heavy", exchange -> {
            try {
                // Simular múltiplas operações I/O
                simulateDBCall();
                simulateAPICall();
                simulateFileOperation();
                
                String response = String.format(
                    "Heavy operation completed by %s at %s", 
                    Thread.currentThread(),
                    Instant.now()
                );
                
                exchange.sendResponseHeaders(200, response.length());
                try (var output = exchange.getResponseBody()) {
                    output.write(response.getBytes());
                }
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                exchange.sendResponseHeaders(500, 0);
            }
        });
        
        server.start();
        System.out.println("Virtual Thread server started on http://localhost:8080");
        System.out.println("Try: curl http://localhost:8080/heavy");
    }
    
    private static void simulateDBCall() throws InterruptedException {
        Thread.sleep(Duration.ofMillis(50));
    }
    
    private static void simulateAPICall() throws InterruptedException {
        Thread.sleep(Duration.ofMillis(30));
    }
    
    private static void simulateFileOperation() throws InterruptedException {
        Thread.sleep(Duration.ofMillis(20));
    }
}

// Cliente HTTP usando Virtual Threads
public class VirtualThreadHTTPClient {
    
    public static void parallelHttpRequests() throws InterruptedException {
        var httpClient = HttpClient.newBuilder()
            .executor(Executors.newVirtualThreadPerTaskExecutor())
            .build();
        
        var urls = List.of(
            "https://jsonplaceholder.typicode.com/posts/1",
            "https://jsonplaceholder.typicode.com/posts/2", 
            "https://jsonplaceholder.typicode.com/posts/3",
            "https://jsonplaceholder.typicode.com/posts/4",
            "https://jsonplaceholder.typicode.com/posts/5"
        );
        
        var startTime = System.currentTimeMillis();
        var latch = new CountDownLatch(urls.size());
        var responses = new ConcurrentHashMap<String, String>();
        
        // Fazer requisições paralelas com Virtual Threads
        for (String url : urls) {
            Thread.startVirtualThread(() -> {
                try {
                    var request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .build();
                    
                    var response = httpClient.send(request, 
                        HttpResponse.BodyHandlers.ofString());
                    
                    responses.put(url, response.body());
                    
                    System.out.printf("Response from %s: %d chars (Thread: %s)%n",
                                    url, 
                                    response.body().length(),
                                    Thread.currentThread().toString().substring(0, 50));
                    
                } catch (Exception e) {
                    System.err.println("Error fetching " + url + ": " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await();
        var totalTime = System.currentTimeMillis() - startTime;
        
        System.out.printf("%nCompleted %d parallel HTTP requests in %d ms%n", 
                         urls.size(), totalTime);
        System.out.printf("Average time per request: %.2f ms%n", 
                         (double) totalTime / urls.size());
    }
}

📚 **Saiba mais**: [Virtual Threads JEP](https://openjdk.org/jeps/425)

---

## 🔀 Pattern Matching Avançado

### 🔹 JEP 427: Pattern Matching for Switch (Terceira Preview)

#### ❓ O que é?
Terceira iteração do pattern matching para switch com melhorias e refinamentos.

#### ⚠️ Por que é importante?
Prepara a feature para finalização com sintaxe mais robusta e casos de uso expandidos.

```java
// Pattern Matching for Switch - terceira preview
public class PatternMatchingSwitch19 {
    
    // Pattern matching com records
    public static String analyzeShape(Object shape) {
        return switch (shape) {
            case Circle(var radius) -> 
                "Circle with area: " + (Math.PI * radius * radius);
            case Rectangle(var width, var height) -> 
                "Rectangle with area: " + (width * height);
            case Triangle(var a, var b, var c) -> {
                double s = (a + b + c) / 2;
                double area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
                yield "Triangle with area: " + area;
            }
            case null -> "No shape provided";
            default -> "Unknown shape: " + shape.getClass().getSimpleName();
        };
    }
    
    // Pattern matching com guards aprimorados
    public static String categorizeNumber(Object obj) {
        return switch (obj) {
            case Integer i when i > 0 -> "Positive integer: " + i;
            case Integer i when i < 0 -> "Negative integer: " + i;
            case Integer i -> "Zero";
            case Double d when d.isNaN() -> "Not a number";
            case Double d when d.isInfinite() -> "Infinite";
            case Double d when d > 0 -> "Positive double: " + d;
            case Double d when d < 0 -> "Negative double: " + d;
            case Double d -> "Zero double";
            case String s when s.isBlank() -> "Empty or blank string";
            case String s -> "String: " + s;
            case null -> "null value";
            default -> "Unknown type: " + obj.getClass().getSimpleName();
        };
    }
    
    // Pattern matching para processamento de dados complexos
    public static String processApiResponse(Object response) {
        return switch (response) {
            case ApiResponse.Success(var data, var status) when status == 200 -> 
                "Success with data: " + data;
            case ApiResponse.Success(var data, var status) -> 
                "Success with status " + status + ": " + data;
            case ApiResponse.Error(var message, var code) when code >= 500 -> 
                "Server error (" + code + "): " + message;
            case ApiResponse.Error(var message, var code) when code >= 400 -> 
                "Client error (" + code + "): " + message;
            case ApiResponse.Error(var message, var code) -> 
                "Error (" + code + "): " + message;
            case ApiResponse.Loading() -> 
                "Request in progress...";
            case null -> 
                "No response";
            default -> 
                "Unexpected response type";
        };
    }
}

// Records para demonstração
record Circle(double radius) {}
record Rectangle(double width, double height) {}
record Triangle(double a, double b, double c) {}

// Sealed interface para API responses
sealed interface ApiResponse 
    permits ApiResponse.Success, ApiResponse.Error, ApiResponse.Loading {
    
    record Success(String data, int status) implements ApiResponse {}
    record Error(String message, int code) implements ApiResponse {}
    record Loading() implements ApiResponse {}
}
```

📚 **Saiba mais**: [Pattern Matching Switch JEP](https://openjdk.org/jeps/427)

---

## 🌐 Interoperabilidade Nativa

### 🔹 JEP 424: Foreign Function & Memory API (Preview)

#### ❓ O que é?
API preview para chamar código nativo e gerenciar memória externa de forma segura.

#### ⚠️ Por que é importante?
Permite interoperabilidade eficiente com bibliotecas nativas sem JNI.

```java
// Foreign Function & Memory API
import java.lang.foreign.*;

public class ForeignFunctionExample {
    
    public static void nativeMemoryOperations() {
        try (var arena = Arena.ofConfined()) {
            // Alocar memória nativa
            var segment = arena.allocate(1024);
            
            // Escrever dados
            segment.setInt(0, 42);
            segment.setLong(4, 123456789L);
            segment.setFloat(12, 3.14159f);
            segment.setDouble(16, 2.71828);
            
            // Ler dados de volta
            int intValue = segment.getInt(0);
            long longValue = segment.getLong(4);
            float floatValue = segment.getFloat(12);
            double doubleValue = segment.getDouble(16);
            
            System.out.printf("Native memory - Int: %d, Long: %d, Float: %.5f, Double: %.5f%n",
                            intValue, longValue, floatValue, doubleValue);
        }
    }
    
    public static void stringOperations() {
        try (var arena = Arena.ofConfined()) {
            // Alocar string nativa
            String javaString = "Hello from Java 19! 🚀";
            var nativeString = arena.allocateUtf8String(javaString);
            
            // Ler string de volta
            String readBack = nativeString.getUtf8String(0);
            
            System.out.println("Original: " + javaString);
            System.out.println("From native: " + readBack);
            System.out.println("Equal: " + javaString.equals(readBack));
        }
    }
    
    public static void arrayOperations() {
        try (var arena = Arena.ofConfined()) {
            // Array de inteiros nativo
            int[] javaArray = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
            var nativeArray = arena.allocateArray(ValueLayout.JAVA_INT, javaArray);
            
            // Ler array de volta
            int[] readBack = nativeArray.toArray(ValueLayout.JAVA_INT);
            
            System.out.println("Java array: " + Arrays.toString(javaArray));
            System.out.println("Native array: " + Arrays.toString(readBack));
            System.out.println("Arrays equal: " + Arrays.equals(javaArray, readBack));
            
            // Modificar array nativo
            for (int i = 0; i < javaArray.length; i++) {
                nativeArray.setAtIndex(ValueLayout.JAVA_INT, i, javaArray[i] * 2);
            }
            
            int[] modified = nativeArray.toArray(ValueLayout.JAVA_INT);
            System.out.println("Modified: " + Arrays.toString(modified));
        }
    }
}
```

---

## 🏗️ Concorrência Estruturada

### 🔹 JEP 428: Structured Concurrency (Incubator)

#### ❓ O que é?
API incubator para tratar múltiplas tarefas concorrentes como uma única unidade de trabalho.

#### ⚠️ Por que é importante?
Simplifica programação concorrente e melhora observabilidade e tratamento de erros.

```java
// Structured Concurrency incubator
import jdk.incubator.concurrent.StructuredTaskScope;

public class StructuredConcurrencyExample {
    
    // Exemplo básico de tarefas estruturadas
    public static void basicExample() throws InterruptedException {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            
            // Submeter múltiplas tarefas
            var task1 = scope.fork(() -> {
                Thread.sleep(1000);
                return "Result from task 1";
            });
            
            var task2 = scope.fork(() -> {
                Thread.sleep(500);
                return "Result from task 2";
            });
            
            var task3 = scope.fork(() -> {
                Thread.sleep(750);
                return "Result from task 3";
            });
            
            // Aguardar todas as tarefas
            scope.join();
            scope.throwIfFailed();
            
            // Coletar resultados
            System.out.println("Task 1: " + task1.resultNow());
            System.out.println("Task 2: " + task2.resultNow());
            System.out.println("Task 3: " + task3.resultNow());
        }
    }
    
    // Exemplo com shutdown on success
    public static String findFirst() throws InterruptedException {
        try (var scope = new StructuredTaskScope.ShutdownOnSuccess<String>()) {
            
            // Múltiplas fontes de dados - primeira que responder vence
            scope.fork(() -> {
                Thread.sleep(2000);
                return "Data from source 1";
            });
            
            scope.fork(() -> {
                Thread.sleep(1000);
                return "Data from source 2"; // Esta será mais rápida
            });
            
            scope.fork(() -> {
                Thread.sleep(3000);
                return "Data from source 3";
            });
            
            scope.join();
            
            return scope.result();
        }
    }
    
    // Processamento paralelo de lista
    public static void parallelProcessing() throws InterruptedException {
        var items = List.of("item1", "item2", "item3", "item4", "item5");
        var results = new ConcurrentLinkedQueue<String>();
        
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            
            // Processar cada item em paralelo
            for (String item : items) {
                scope.fork(() -> {
                    // Simular processamento
                    Thread.sleep(500);
                    String processed = "Processed: " + item.toUpperCase();
                    results.add(processed);
                    return processed;
                });
            }
            
            scope.join();
            scope.throwIfFailed();
            
            System.out.println("Parallel processing results:");
            results.forEach(System.out::println);
        }
    }
}
```

📚 **Saiba mais**: [Structured Concurrency JEP](https://openjdk.org/jeps/428)

---

## 🎯 Impacto e Importância

Java 19 revolucionou a concorrência:

- ✅ **Virtual Threads** permitiram milhões de threads concorrentes
- ✅ **Pattern Matching refinado** preparou para finalização
- ✅ **Foreign Function API** avançou interoperabilidade nativa
- ✅ **Structured Concurrency** simplificou programação paralela
- ✅ **Record Patterns** expandiram capacidades de matching

---

## 📅 Informações da Versão

- **📅 Lançamento**: 20 de setembro de 2022
- **🔧 Tipo**: Feature Release
- **⚡ Suporte**: Terminado em março de 2023
- **🎯 Status**: Marco - Virtual Threads introduzidas
- **🔄 Migração**: Simples - principalmente features preview

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 19 Documentation](https://docs.oracle.com/en/java/javase/19/)
- [Java 19 API Specification](https://docs.oracle.com/en/java/javase/19/docs/api/)
- [All JEPs in Java 19](https://openjdk.org/projects/jdk/19/)

### 🧵 **Virtual Threads**
- [JEP 425: Virtual Threads (Preview)](https://openjdk.org/jeps/425)
- [Virtual Threads Tutorial](https://www.baeldung.com/java-virtual-threads)
- [Virtual Threads Performance Guide](https://www.infoq.com/articles/java-virtual-threads-performance/)

### 🔀 **Pattern Matching**
- [JEP 427: Pattern Matching for switch (Third Preview)](https://openjdk.org/jeps/427)
- [Pattern Matching Advanced Guide](https://www.baeldung.com/java-pattern-matching-switch)

### 🌐 **Foreign Function & Memory**
- [JEP 424: Foreign Function & Memory API (Preview)](https://openjdk.org/jeps/424)
- [Foreign Memory API Tutorial](https://www.baeldung.com/java-foreign-memory-api)

### 🏗️ **Structured Concurrency**
- [JEP 428: Structured Concurrency (Incubator)](https://openjdk.org/jeps/428)
- [Structured Concurrency Guide](https://www.baeldung.com/java-structured-concurrency)

### 💻 **Exemplos e Práticas**
- [Java 19 Features Guide](https://www.baeldung.com/java-19-new-features)
- [Virtual Threads Best Practices](https://blog.codefx.org/java/virtual-threads/)
- [Modern Concurrency Patterns](https://github.com/openjdk/jdk19) 
