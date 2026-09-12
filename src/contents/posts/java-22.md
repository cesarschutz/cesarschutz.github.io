---
title: "Java 22 — Foreign Function & Memory API Final"
published: 2026-09-01
description: "Cada novidade do Java 22 (2024) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java]
category: Java
cover: /banners/tech-layers.svg
draft: false
---

## 📖 Sobre o Java 22

Java 22 **finalizou** a **Foreign Function & Memory API**, uma das maiores adições para interoperabilidade nativa em anos. Também introduziu **Unnamed Variables & Patterns** e **String Templates** em segunda preview, além de melhorias significativas em **Structured Concurrency** e **Vector API**.

## 💡 O que são JEPs?
Java 22 incluiu 12 JEPs focados em finalização de APIs críticas, novos padrões de linguagem e melhorias de performance.

---

## 🌐 Interoperabilidade Nativa Finalizada

### 🔹 JEP 454: Foreign Function & Memory API (Final)

#### ❓ O que é?
API **final** para chamar código nativo e manipular memória off-heap sem JNI, com segurança e performance.

#### ⚠️ Por que é importante?
Elimina JNI para a maioria dos casos, oferecendo interoperabilidade nativa mais simples, segura e eficiente.

```java
// Foreign Function & Memory API final no Java 22
import java.lang.foreign.*;
import static java.lang.foreign.ValueLayout.*;

public class ForeignAPIFinal {
    
    // Chamar função C nativa - strlen
    public static void callNativeFunction() throws Throwable {
        // Obter linker para a plataforma
        Linker linker = Linker.nativeLinker();
        
        // Lookup de símbolos na biblioteca padrão
        SymbolLookup stdlib = linker.defaultLookup();
        
        // Encontrar função strlen
        MemorySegment strlenAddress = stdlib.find("strlen")
            .orElseThrow(() -> new RuntimeException("strlen not found"));
        
        // Criar handle para a função
        FunctionDescriptor strlenDescriptor = FunctionDescriptor.of(
            JAVA_LONG,    // retorno: long
            ADDRESS       // parâmetro: char*
        );
        
        MethodHandle strlen = linker.downcallHandle(strlenAddress, strlenDescriptor);
        
        // Usar a função
        try (Arena arena = Arena.ofConfined()) {
            MemorySegment cString = arena.allocateUtf8String("Hello, native world!");
            long length = (long) strlen.invoke(cString);
            
            System.out.println("String length: " + length); // 20
        }
    }
    
    // Operações avançadas com estruturas C
    public static void workWithStructures() {
        // Definir layout de estrutura C
        // struct Point { int x; int y; };
        MemoryLayout pointLayout = MemoryLayout.structLayout(
            JAVA_INT.withName("x"),
            JAVA_INT.withName("y")
        ).withName("Point");
        
        try (Arena arena = Arena.ofConfined()) {
            // Alocar array de pontos
            MemorySegment points = arena.allocateArray(pointLayout, 3);
            
            // Definir pontos
            setPoint(points, 0, pointLayout, 10, 20);
            setPoint(points, 1, pointLayout, 30, 40);
            setPoint(points, 2, pointLayout, 50, 60);
            
            // Ler pontos de volta
            for (int i = 0; i < 3; i++) {
                Point point = getPoint(points, i, pointLayout);
                System.out.printf("Point %d: (%d, %d)%n", i, point.x(), point.y());
            }
        }
    }
    
    private static void setPoint(MemorySegment array, int index, 
                                MemoryLayout layout, int x, int y) {
        MemorySegment point = array.asSlice(index * layout.byteSize(), layout);
        point.set(JAVA_INT, 0, x);  // offset 0 = x
        point.set(JAVA_INT, 4, y);  // offset 4 = y
    }
    
    private static Point getPoint(MemorySegment array, int index, 
                                 MemoryLayout layout) {
        MemorySegment point = array.asSlice(index * layout.byteSize(), layout);
        int x = point.get(JAVA_INT, 0);
        int y = point.get(JAVA_INT, 4);
        return new Point(x, y);
    }
    
    // Callback - Java chamado por código nativo
    public static void callbackExample() throws Throwable {
        Linker linker = Linker.nativeLinker();
        
        // Criar callback Java para código C
        FunctionDescriptor callbackDesc = FunctionDescriptor.of(
            JAVA_INT,     // retorno: int
            JAVA_INT,     // parâmetro: int
            JAVA_INT      // parâmetro: int
        );
        
        // Função Java que será chamada pelo C
        MethodHandle javaCallback = MethodHandles.lookup().findStatic(
            ForeignAPIFinal.class, 
            "addNumbers", 
            MethodType.methodType(int.class, int.class, int.class)
        );
        
        // Criar upcall stub
        try (Arena arena = Arena.ofConfined()) {
            MemorySegment callbackPointer = linker.upcallStub(
                javaCallback, 
                callbackDesc, 
                arena
            );
            
            // Agora callbackPointer pode ser passado para funções C
            System.out.println("Callback created: " + callbackPointer);
        }
    }
    
    public static int addNumbers(int a, int b) {
        System.out.printf("Java callback called: %d + %d%n", a, b);
        return a + b;
    }
    
    // Trabalhar com bibliotecas dinâmicas
    public static void dynamicLibraryExample() throws Throwable {
        // Carregar biblioteca específica (exemplo: libm.so no Linux)
        try {
            SymbolLookup mathLib = SymbolLookup.libraryLookup("m", Arena.global());
            
            // Encontrar função sin
            MemorySegment sinAddress = mathLib.find("sin")
                .orElseThrow(() -> new RuntimeException("sin not found"));
            
            FunctionDescriptor sinDesc = FunctionDescriptor.of(
                JAVA_DOUBLE,  // retorno: double  
                JAVA_DOUBLE   // parâmetro: double
            );
            
            Linker linker = Linker.nativeLinker();
            MethodHandle sin = linker.downcallHandle(sinAddress, sinDesc);
            
            // Chamar sin(π/2) = 1.0
            double result = (double) sin.invoke(Math.PI / 2);
            System.out.printf("sin(π/2) = %.6f%n", result);
            
        } catch (Exception e) {
            System.out.println("Math library not available: " + e.getMessage());
        }
    }
    
    // Performance comparison: JNI vs FFM
    public static void performanceComparison() {
        try (Arena arena = Arena.ofConfined()) {
            // Dados para teste
            int size = 1_000_000;
            MemorySegment nativeArray = arena.allocateArray(JAVA_INT, size);
            
            // Preencher array nativo
            for (int i = 0; i < size; i++) {
                nativeArray.setAtIndex(JAVA_INT, i, i);
            }
            
            // FFM: Somar elementos
            long startTime = System.nanoTime();
            long sum = 0;
            for (int i = 0; i < size; i++) {
                sum += nativeArray.getAtIndex(JAVA_INT, i);
            }
            long ffmTime = System.nanoTime() - startTime;
            
            // Java array para comparação
            int[] javaArray = new int[size];
            for (int i = 0; i < size; i++) {
                javaArray[i] = i;
            }
            
            startTime = System.nanoTime();
            long javaSum = 0;
            for (int value : javaArray) {
                javaSum += value;
            }
            long javaTime = System.nanoTime() - startTime;
            
            System.out.printf("FFM sum: %d (%.2f ms)%n", sum, ffmTime / 1_000_000.0);
            System.out.printf("Java sum: %d (%.2f ms)%n", javaSum, javaTime / 1_000_000.0);
            System.out.printf("FFM overhead: %.2fx%n", (double) ffmTime / javaTime);
        }
    }
}

record Point(int x, int y) {}
```

#### 🎁 Vantagens sobre JNI
- **Sem glue code**: Não precisa escrever C para interop
- **Type safe**: Verificação de tipos em tempo de compilação
- **Memory safe**: Gestão automática de memória com Arena
- **Performance**: Comparable ao JNI, às vezes mais rápido
- **Portabilidade**: Funciona em todas as plataformas

📚 **Saiba mais**: [FFM API Guide](https://openjdk.org/jeps/454)

---

## 🎯 Unnamed Variables & Patterns

### 🔹 JEP 456: Unnamed Variables & Patterns (Preview)

#### ❓ O que é?
Permite usar `_` para indicar variáveis não utilizadas, tornando o código mais limpo e expressivo.

#### ⚠️ Por que é importante?
Elimina warnings de "variável não utilizada" e torna explícita a intenção de ignorar valores.

```java
// Unnamed Variables & Patterns no Java 22
public class UnnamedVariables {
    
    // Variáveis não utilizadas em pattern matching
    public static String analyzeShape(Object shape) {
        return switch (shape) {
            case Circle(var radius, _) -> // Ignorar cor
                "Circle with radius: " + radius;
            case Rectangle(var width, var height, _) -> // Ignorar cor
                "Rectangle " + width + "x" + height;
            case Triangle(var a, var b, var c, _) -> // Ignorar cor
                "Triangle with sides: " + a + ", " + b + ", " + c;
            default -> "Unknown shape";
        };
    }
    
    // Try-catch ignorando exceção
    public static String parseNumber(String str) {
        try {
            int value = Integer.parseInt(str);
            return "Valid number: " + value;
        } catch (NumberFormatException _) { // Exceção ignorada intencionalmente
            return "Invalid number";
        }
    }
    
    // Enhanced for loop ignorando índice
    public static void processItems(List<String> items) {
        int index = 0;
        for (String _ : items) { // Ignorar item individual
            System.out.println("Processing item at index: " + index++);
        }
    }
    
    // Lambda ignorando parâmetros
    public static void eventHandling() {
        List<String> items = List.of("a", "b", "c", "d", "e");
        
        // Ignorar índice em operações de stream
        items.stream()
             .map(_ -> "processed") // Ignorar valor original
             .forEach(System.out::println);
        
        // Thread com Runnable ignorando parâmetros
        CompletableFuture.runAsync(_ -> {
            System.out.println("Task executed");
        });
    }
    
    // Múltiplas variáveis unnamed
    public static void multipleUnnamed() {
        record Response(int status, String body, Map<String, String> headers, long timestamp) {}
        
        Response response = new Response(200, "OK", Map.of(), System.currentTimeMillis());
        
        // Só interessa status e body
        switch (response) {
            case Response(var status, var body, _, _) when status == 200 -> 
                System.out.println("Success: " + body);
            case Response(var status, _, _, _) when status >= 400 -> 
                System.out.println("Error: " + status);
            default -> 
                System.out.println("Other status");
        }
    }
    
    // Nested unnamed patterns
    public static void nestedUnnamed() {
        record User(String name, Address address, List<String> tags) {}
        record Address(String street, String city, String country) {}
        
        User user = new User("João", new Address("Rua A", "São Paulo", "Brasil"), 
                           List.of("developer", "java"));
        
        // Só interessa nome e cidade
        switch (user) {
            case User(var name, Address(_, var city, _), _) -> 
                System.out.printf("User %s from %s%n", name, city);
        }
    }
    
    // Unnamed em assignments
    public static void unnamedAssignments() {
        Map<String, Integer> map = Map.of("a", 1, "b", 2, "c", 3);
        
        // Só interessa no valor, não na chave
        for (var entry : map.entrySet()) {
            var _ = entry.getKey();   // Chave ignorada explicitamente
            var value = entry.getValue();
            System.out.println("Value: " + value);
        }
        
        // Em operações que retornam valor não utilizado
        List<String> list = new ArrayList<>();
        var _ = list.add("item"); // add() retorna boolean, mas não nos interessa
    }
}
```

📚 **Saiba mais**: [Unnamed Variables JEP](https://openjdk.org/jeps/456)

---

## 📝 String Templates Melhorados

### 🔹 JEP 459: String Templates (Segunda Preview)

#### ❓ O que é?
Segunda iteração dos String Templates com melhorias de segurança e usabilidade.

#### ⚠️ Por que é importante?
Oferece interpolação de strings mais segura que concatenação manual, especialmente importante para SQL e HTML.

```java
// String Templates melhorados no Java 22
public class StringTemplates22 {
    
    // Template básico
    public static void basicTemplates() {
        String name = "João";
        int age = 30;
        
        // Template literal
        String message = STR."Hello, \{name}! You are \{age} years old.";
        System.out.println(message);
        
        // Com expressões
        String calculation = STR."2 + 2 = \{2 + 2}, sqrt(16) = \{Math.sqrt(16)}";
        System.out.println(calculation);
    }
    
    // Template com formatação
    public static void formattedTemplates() {
        double price = 1234.56;
        String product = "Laptop";
        
        // FMT template para formatação
        String formatted = FMT."Product: %-10s\{product} | Price: $%,.2f\{price}";
        System.out.println(formatted);
        
        // Múltiplas linhas
        String report = FMT."""
            Product Report
            ==============
            Name: %s\{product}
            Price: $%,.2f\{price}
            Tax: $%,.2f\{price * 0.1}
            Total: $%,.2f\{price * 1.1}
            """;
        System.out.println(report);
    }
    
    // Template customizado para SQL seguro
    public static StringTemplate.Processor<String, RuntimeException> SQL = 
        StringTemplate.Processor.of((StringTemplate st) -> {
            StringBuilder sb = new StringBuilder();
            List<Object> parameters = new ArrayList<>();
            
            Iterator<String> fragmentIter = st.fragments().iterator();
            Iterator<Object> valueIter = st.values().iterator();
            
            sb.append(fragmentIter.next());
            while (valueIter.hasNext()) {
                Object value = valueIter.next();
                sb.append("?"); // Placeholder para prepared statement
                parameters.add(value);
                sb.append(fragmentIter.next());
            }
            
            // Em uma implementação real, usaria PreparedStatement
            System.out.println("SQL: " + sb);
            System.out.println("Parameters: " + parameters);
            
            return sb.toString();
        });
    
    public static void safeSqlTemplates() {
        String tableName = "users";
        String userName = "admin'; DROP TABLE users; --";
        int minAge = 18;
        
        // SQL template previne SQL injection
        String query = SQL."""
            SELECT * FROM \{tableName} 
            WHERE name = \{userName} 
            AND age >= \{minAge}
            """;
        
        // Saída mostra SQL parametrizado seguro
    }
    
    // Template para JSON
    public static StringTemplate.Processor<String, RuntimeException> JSON = 
        StringTemplate.Processor.of((StringTemplate st) -> {
            StringBuilder sb = new StringBuilder();
            
            Iterator<String> fragmentIter = st.fragments().iterator();
            Iterator<Object> valueIter = st.values().iterator();
            
            sb.append(fragmentIter.next());
            while (valueIter.hasNext()) {
                Object value = valueIter.next();
                
                // Escape JSON
                if (value instanceof String str) {
                    sb.append("\"").append(escapeJson(str)).append("\"");
                } else if (value instanceof Number || value instanceof Boolean) {
                    sb.append(value);
                } else {
                    sb.append("\"").append(escapeJson(String.valueOf(value))).append("\"");
                }
                
                sb.append(fragmentIter.next());
            }
            
            return sb.toString();
        });
    
    private static String escapeJson(String str) {
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
    
    public static void jsonTemplates() {
        String name = "João \"João\" Silva";
        int age = 30;
        boolean active = true;
        
        String json = JSON."""
            {
                "name": \{name},
                "age": \{age},
                "active": \{active},
                "created": \{Instant.now()}
            }
            """;
        
        System.out.println("Safe JSON: " + json);
    }
    
    // Template para HTML seguro
    public static void htmlTemplates() {
        String userInput = "<script>alert('XSS')</script>";
        String userName = "João & Maria";
        
        // HTML template com escape automático
        var HTML = StringTemplate.Processor.of((StringTemplate st) -> {
            StringBuilder sb = new StringBuilder();
            
            Iterator<String> fragmentIter = st.fragments().iterator();
            Iterator<Object> valueIter = st.values().iterator();
            
            sb.append(fragmentIter.next());
            while (valueIter.hasNext()) {
                Object value = valueIter.next();
                sb.append(escapeHtml(String.valueOf(value)));
                sb.append(fragmentIter.next());
            }
            
            return sb.toString();
        });
        
        String safeHtml = HTML."""
            <div>
                <h1>Welcome, \{userName}!</h1>
                <p>Your input: \{userInput}</p>
            </div>
            """;
        
        System.out.println("Safe HTML: " + safeHtml);
    }
    
    private static String escapeHtml(String str) {
        return str.replace("&", "&amp;")
                  .replace("<", "&lt;")
                  .replace(">", "&gt;")
                  .replace("\"", "&quot;")
                  .replace("'", "&#x27;");
    }
}
```

📚 **Saiba mais**: [String Templates JEP](https://openjdk.org/jeps/459)

---

## 🏗️ Structured Concurrency Aprimorada

### 🔹 JEP 462: Structured Concurrency (Third Preview)

#### ❓ O que é?
Terceira preview com melhorias na API e novos padrões de uso.

```java
// Structured Concurrency melhorada
import jdk.incubator.concurrent.StructuredTaskScope;

public class StructuredConcurrency22 {
    
    public static void basicExample() throws InterruptedException {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            
            Future<String> user = scope.fork(() -> fetchUser(123L));
            Future<List<String>> orders = scope.fork(() -> fetchOrders(123L));
            Future<String> preferences = scope.fork(() -> fetchPreferences(123L));
            
            scope.join();           // Aguardar todas
            scope.throwIfFailed();  // Lançar se alguma falhou
            
            // Combinar resultados
            String result = combineResults(user.resultNow(), 
                                         orders.resultNow(), 
                                         preferences.resultNow());
            System.out.println(result);
        }
    }
    
    // Timeout customizado
    public static void withTimeout() throws InterruptedException {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            
            Future<String> slowTask = scope.fork(() -> {
                Thread.sleep(Duration.ofSeconds(5));
                return "Slow result";
            });
            
            Future<String> fastTask = scope.fork(() -> {
                Thread.sleep(Duration.ofMillis(100));
                return "Fast result";
            });
            
            // Timeout de 2 segundos
            scope.joinUntil(Instant.now().plusSeconds(2));
            scope.throwIfFailed();
            
            System.out.println("Fast task: " + fastTask.resultNow());
            // slowTask será cancelada
            
        } catch (TimeoutException e) {
            System.out.println("Operations timed out");
        }
    }
}

private static String fetchUser(Long id) {
    Thread.sleep(Duration.ofMillis(200));
    return "User " + id;
}

private static List<String> fetchOrders(Long userId) {
    Thread.sleep(Duration.ofMillis(300));
    return List.of("Order 1", "Order 2");
}

private static String fetchPreferences(Long userId) {
    Thread.sleep(Duration.ofMillis(150));
    return "Dark theme";
}

private static String combineResults(String user, List<String> orders, String prefs) {
    return String.format("%s has %d orders, prefers %s", user, orders.size(), prefs);
}
```

---

## 🎯 Impacto e Importância

Java 22 consolidou APIs fundamentais:

- ✅ **Foreign Function & Memory API final** revolucionou interoperabilidade nativa
- ✅ **Unnamed Variables** melhoraram expressividade do código
- ✅ **String Templates** ofereceram interpolação segura
- ✅ **Structured Concurrency** evoluiu para mais robustez
- ✅ **Vector API** continuou desenvolvimento para computação paralela

---

## 📅 Informações da Versão

- **📅 Lançamento**: 19 de março de 2024
- **🔧 Tipo**: Feature Release
- **⚡ Suporte**: Terminado em setembro de 2024
- **🎯 Status**: APIs nativas finalizadas, novos padrões introduzidos
- **🔄 Migração**: Simples - principalmente adições

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 22 Documentation](https://docs.oracle.com/en/java/javase/22/)
- [Java 22 API Specification](https://docs.oracle.com/en/java/javase/22/docs/api/)
- [All JEPs in Java 22](https://openjdk.org/projects/jdk/22/)

### 🌐 **Foreign Function & Memory API**
- [JEP 454: Foreign Function & Memory API](https://openjdk.org/jeps/454)
- [FFM API Tutorial](https://www.baeldung.com/java-foreign-function-memory-api)
- [Replacing JNI with FFM](https://www.infoq.com/articles/java-foreign-function-memory-api/)

### 🎯 **Unnamed Variables**
- [JEP 456: Unnamed Variables & Patterns (Preview)](https://openjdk.org/jeps/456)
- [Unnamed Variables Guide](https://www.baeldung.com/java-unnamed-variables)

### 📝 **String Templates**
- [JEP 459: String Templates (Second Preview)](https://openjdk.org/jeps/459)
- [String Templates Tutorial](https://www.baeldung.com/java-string-templates)
- [Safe String Interpolation](https://www.infoq.com/articles/java-string-templates/)

### 🏗️ **Structured Concurrency**
- [JEP 462: Structured Concurrency (Third Preview)](https://openjdk.org/jeps/462)
- [Structured Concurrency Guide](https://www.baeldung.com/java-structured-concurrency)

### 💻 **Exemplos e Práticas**
- [Java 22 Features Guide](https://www.baeldung.com/java-22-new-features)
- [Java 22 Migration Tips](https://blog.codefx.org/java/java-22-guide/)
- [Modern Java Development](https://github.com/openjdk/jdk22) 
