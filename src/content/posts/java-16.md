---
title: "Java 16 — Records e Pattern Matching Finalizados"
published: 2025-07-02T01:20:00Z
description: "Cada novidade do Java 16 (2021) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java]
category: Java
cover: /covers/java/java-16.svg
draft: false
---

## 📖 Sobre o Java 16

Java 16 marcou um **marco importante** ao finalizar **Records** e **Pattern Matching for instanceof**, duas das features mais transformadoras da linguagem. Também introduziu **Vector API** em incubador, melhorias em **Sealed Classes** e **Unix Domain Socket Channels** para melhor performance de IPC.

## 💡 O que são JEPs?
Java 16 incluiu 17 JEPs focados em finalização de features preview, performance SIMD, e melhorias de conectividade.

---

## 🏗️ Modelagem de Dados Finalizada

### 🔹 JEP 395: Records (Final)

#### ❓ O que é?
Records se tornaram **feature final** após refinamentos nas versões preview, oferecendo data classes imutáveis e concisas.

#### ⚠️ Por que é importante?
Elimina definitivamente boilerplate para data classes, estabelecendo um padrão moderno para transferência e armazenamento de dados.

```java
// Records finais no Java 16 com todas as funcionalidades
public record Customer(
    String name,
    String email,
    LocalDate birthDate,
    List<String> preferences,
    Address address
) {
    // Compact constructor com validação completa
    public Customer {
        // Validações robustas
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name cannot be null or blank");
        }
        if (email == null || !isValidEmail(email)) {
            throw new IllegalArgumentException("Invalid email format");
        }
        if (birthDate == null || birthDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Invalid birth date");
        }
        
        // Normalização e cópias defensivas
        name = name.trim();
        email = email.toLowerCase().trim();
        preferences = preferences != null ? List.copyOf(preferences) : List.of();
    }
    
    // Métodos de negócio
    public int getAge() {
        return Period.between(birthDate, LocalDate.now()).getYears();
    }
    
    public boolean isAdult() {
        return getAge() >= 18;
    }
    
    public boolean hasPreference(String preference) {
        return preferences.contains(preference.toLowerCase());
    }
    
    // Métodos "with" para imutabilidade
    public Customer withEmail(String newEmail) {
        return new Customer(name, newEmail, birthDate, preferences, address);
    }
    
    public Customer withPreference(String preference) {
        var newPreferences = new ArrayList<>(preferences);
        newPreferences.add(preference.toLowerCase());
        return new Customer(name, email, birthDate, newPreferences, address);
    }
    
    public Customer withoutPreference(String preference) {
        var newPreferences = preferences.stream()
            .filter(p -> !p.equals(preference.toLowerCase()))
            .toList();
        return new Customer(name, email, birthDate, newPreferences, address);
    }
    
    // Factory methods
    public static Customer guest(String name, String email) {
        return new Customer(
            name, 
            email, 
            LocalDate.of(1900, 1, 1), // Data placeholder
            List.of("guest"), 
            Address.defaultAddress()
        );
    }
    
    public static Customer premium(String name, String email, LocalDate birthDate) {
        return new Customer(
            name, 
            email, 
            birthDate, 
            List.of("premium", "notifications", "newsletter"), 
            null
        );
    }
    
    // Validação customizada
    private static boolean isValidEmail(String email) {
        return email.contains("@") && email.contains(".") && 
               email.indexOf("@") < email.lastIndexOf(".");
    }
}

// Record para endereço
public record Address(
    String street,
    String city,
    String zipCode,
    String country
) {
    public Address {
        if (street == null || street.isBlank()) {
            throw new IllegalArgumentException("Street cannot be null or blank");
        }
        if (city == null || city.isBlank()) {
            throw new IllegalArgumentException("City cannot be null or blank");
        }
        
        street = street.trim();
        city = city.trim();
        zipCode = zipCode != null ? zipCode.trim() : "";
        country = country != null ? country.trim() : "Unknown";
    }
    
    public String getFullAddress() {
        return String.format("%s, %s %s, %s", street, city, zipCode, country);
    }
    
    public static Address defaultAddress() {
        return new Address("Unknown", "Unknown", "", "Unknown");
    }
}

// Record para configuração com builder pattern
public record ServerConfig(
    String host,
    int port,
    boolean ssl,
    Duration timeout,
    Map<String, String> properties,
    List<String> allowedOrigins
) {
    public ServerConfig {
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("Host cannot be null or blank");
        }
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("Port must be between 1 and 65535");
        }
        if (timeout == null || timeout.isNegative()) {
            throw new IllegalArgumentException("Timeout must be positive");
        }
        
        // Cópias defensivas
        properties = properties != null ? Map.copyOf(properties) : Map.of();
        allowedOrigins = allowedOrigins != null ? List.copyOf(allowedOrigins) : List.of();
    }
    
    // Builder inner class
    public static class Builder {
        private String host = "localhost";
        private int port = 8080;
        private boolean ssl = false;
        private Duration timeout = Duration.ofSeconds(30);
        private Map<String, String> properties = new HashMap<>();
        private List<String> allowedOrigins = new ArrayList<>();
        
        public Builder host(String host) {
            this.host = host;
            return this;
        }
        
        public Builder port(int port) {
            this.port = port;
            return this;
        }
        
        public Builder ssl(boolean ssl) {
            this.ssl = ssl;
            return this;
        }
        
        public Builder timeout(Duration timeout) {
            this.timeout = timeout;
            return this;
        }
        
        public Builder property(String key, String value) {
            this.properties.put(key, value);
            return this;
        }
        
        public Builder allowOrigin(String origin) {
            this.allowedOrigins.add(origin);
            return this;
        }
        
        public ServerConfig build() {
            return new ServerConfig(host, port, ssl, timeout, properties, allowedOrigins);
        }
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public String getBaseUrl() {
        String protocol = ssl ? "https" : "http";
        return String.format("%s://%s:%d", protocol, host, port);
    }
}

// Uso prático dos Records finalizados
public class RecordsInAction {
    
    public static void demonstrateRecords() {
        // Customer com validação automática
        var customer = Customer.premium(
            "João Silva",
            "joao@example.com",
            LocalDate.of(1990, 5, 15)
        );
        
        System.out.println("Customer: " + customer.name());
        System.out.println("Age: " + customer.getAge());
        System.out.println("Is adult: " + customer.isAdult());
        System.out.println("Has premium: " + customer.hasPreference("premium"));
        
        // Immutable updates
        var updatedCustomer = customer
            .withPreference("mobile-app")
            .withEmail("joao.silva@newdomain.com");
        
        System.out.println("Updated customer: " + updatedCustomer);
        
        // Server config com builder
        var config = ServerConfig.builder()
            .host("api.example.com")
            .port(443)
            .ssl(true)
            .timeout(Duration.ofSeconds(60))
            .property("max-connections", "1000")
            .property("keep-alive", "true")
            .allowOrigin("https://app.example.com")
            .allowOrigin("https://mobile.example.com")
            .build();
        
        System.out.println("Server URL: " + config.getBaseUrl());
        System.out.println("Timeout: " + config.timeout().toSeconds() + "s");
    }
}

📚 **Saiba mais**: [Records Final JEP](https://openjdk.org/jeps/395)

---

## 🔍 Pattern Matching Finalizado

### 🔹 JEP 394: Pattern Matching for instanceof (Final)

#### ❓ O que é?
Pattern matching para `instanceof` se tornou **feature final**, simplificando verificações de tipo.

#### ⚠️ Por que é importante?
Elimina casting manual redundante, torna código mais legível e menos propenso a erros.

```java
// Pattern matching final no Java 16
public class PatternMatchingExamples {
    
    // Processamento de diferentes tipos de dados
    public static String processData(Object data) {
        if (data instanceof String str && !str.isBlank()) {
            return "Text: " + str.toUpperCase();
        } else if (data instanceof Integer num && num > 0) {
            return "Positive number: " + num;
        } else if (data instanceof Double dbl && !dbl.isNaN() && !dbl.isInfinite()) {
            return "Valid double: " + String.format("%.2f", dbl);
        } else if (data instanceof List<?> list && !list.isEmpty()) {
            return "List with " + list.size() + " elements: " + list;
        } else if (data instanceof Map<?, ?> map && !map.isEmpty()) {
            return "Map with " + map.size() + " entries";
        } else if (data instanceof LocalDate date) {
            return "Date: " + date.format(DateTimeFormatter.ISO_LOCAL_DATE);
        }
        return "Unknown or invalid data: " + data;
    }
    
    // Processamento de hierarquia de shapes com records
    public static double calculateArea(Object shape) {
        if (shape instanceof Circle(var radius)) {
            return Math.PI * radius * radius;
        } else if (shape instanceof Rectangle(var width, var height)) {
            return width * height;
        } else if (shape instanceof Triangle(var a, var b, var c)) {
            // Fórmula de Heron
            double s = (a + b + c) / 2;
            return Math.sqrt(s * (s - a) * (s - b) * (s - c));
        }
        throw new IllegalArgumentException("Unknown shape: " + shape);
    }
    
    // Processamento de AST com pattern matching
    public static Object evaluateExpression(Object expr, Map<String, Object> vars) {
        return switch (expr) {
            case NumberLiteral(var value) -> value;
            case StringLiteral(var value) -> value;
            case Variable(var name) -> vars.get(name);
            case BinaryOperation(var left, var op, var right) -> {
                var leftVal = evaluateExpression(left, vars);
                var rightVal = evaluateExpression(right, vars);
                yield evaluateBinaryOp(leftVal, op, rightVal);
            }
            case UnaryOperation(var op, var operand) -> {
                var operandVal = evaluateExpression(operand, vars);
                yield evaluateUnaryOp(op, operandVal);
            }
            default -> throw new IllegalArgumentException("Unknown expression: " + expr);
        };
    }
    
    private static Object evaluateBinaryOp(Object left, String op, Object right) {
        if (left instanceof Number l && right instanceof Number r) {
            return switch (op) {
                case "+" -> l.doubleValue() + r.doubleValue();
                case "-" -> l.doubleValue() - r.doubleValue();
                case "*" -> l.doubleValue() * r.doubleValue();
                case "/" -> l.doubleValue() / r.doubleValue();
                case "%" -> l.doubleValue() % r.doubleValue();
                case "^" -> Math.pow(l.doubleValue(), r.doubleValue());
                default -> throw new UnsupportedOperationException("Unknown operator: " + op);
            };
        } else if (left instanceof String || right instanceof String) {
            return left.toString() + right.toString();
        }
        throw new IllegalArgumentException("Invalid operands for " + op);
    }
    
    private static Object evaluateUnaryOp(String op, Object operand) {
        return switch (op) {
            case "-" -> -(((Number) operand).doubleValue());
            case "+" -> ((Number) operand).doubleValue();
            case "!" -> !((Boolean) operand);
            case "abs" -> Math.abs(((Number) operand).doubleValue());
            case "sqrt" -> Math.sqrt(((Number) operand).doubleValue());
            default -> throw new UnsupportedOperationException("Unknown operator: " + op);
        };
    }
    
    // Validação de entrada com pattern matching
    public static Result<User> validateUser(Object input) {
        if (input instanceof Map<?, ?> map) {
            if (map.get("name") instanceof String name && !name.isBlank() &&
                map.get("email") instanceof String email && email.contains("@") &&
                map.get("age") instanceof Integer age && age >= 0) {
                
                return Result.success(new User(name.trim(), email.toLowerCase(), age));
            }
        }
        return Result.error("Invalid user data");
    }
}

// Records para shapes
record Circle(double radius) {}
record Rectangle(double width, double height) {}
record Triangle(double a, double b, double c) {}

// Records para AST
record NumberLiteral(double value) {}
record StringLiteral(String value) {}
record Variable(String name) {}
record BinaryOperation(Object left, String operator, Object right) {}
record UnaryOperation(String operator, Object operand) {}

// Record para User
record User(String name, String email, int age) {}

// Result type
record Result<T>(T value, String error, boolean success) {
    public static <T> Result<T> success(T value) {
        return new Result<>(value, null, true);
    }
    
    public static <T> Result<T> error(String error) {
        return new Result<>(null, error, false);
    }
}

📚 **Saiba mais**: [Pattern Matching Final JEP](https://openjdk.org/jeps/394)

---

## 🏗️ Hierarquias Aprimoradas

### 🔹 JEP 397: Sealed Classes (Second Preview)

#### ❓ O que é?
Segunda preview de Sealed Classes com melhorias na sintaxe e funcionalidades.

#### ⚠️ Por que é importante?
Refinamentos baseados no feedback da comunidade, preparando para finalização.

```java
// Sealed classes melhoradas no Java 16
public sealed class Result<T, E>
    permits Result.Success, Result.Failure {
    
    public static final class Success<T, E> extends Result<T, E> {
        private final T value;
        
        public Success(T value) {
            this.value = Objects.requireNonNull(value, "Value cannot be null");
        }
        
        public T getValue() { return value; }
        
        @Override
        public String toString() {
            return "Success{value=" + value + "}";
        }
        
        @Override
        public boolean equals(Object obj) {
            return obj instanceof Success<?, ?> other && 
                   Objects.equals(value, other.value);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash("Success", value);
        }
    }
    
    public static final class Failure<T, E> extends Result<T, E> {
        private final E error;
        
        public Failure(E error) {
            this.error = Objects.requireNonNull(error, "Error cannot be null");
        }
        
        public E getError() { return error; }
        
        @Override
        public String toString() {
            return "Failure{error=" + error + "}";
        }
        
        @Override
        public boolean equals(Object obj) {
            return obj instanceof Failure<?, ?> other && 
                   Objects.equals(error, other.error);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash("Failure", error);
        }
    }
    
    // Factory methods
    public static <T, E> Result<T, E> success(T value) {
        return new Success<>(value);
    }
    
    public static <T, E> Result<T, E> failure(E error) {
        return new Failure<>(error);
    }
    
    // Pattern matching helpers
    public boolean isSuccess() {
        return this instanceof Success<T, E>;
    }
    
    public boolean isFailure() {
        return this instanceof Failure<T, E>;
    }
    
    public <U> Result<U, E> map(Function<T, U> mapper) {
        return switch (this) {
            case Success<T, E> success -> Result.success(mapper.apply(success.getValue()));
            case Failure<T, E> failure -> Result.failure(failure.getError());
        };
    }
    
    public <F> Result<T, F> mapError(Function<E, F> mapper) {
        return switch (this) {
            case Success<T, E> success -> Result.success(success.getValue());
            case Failure<T, E> failure -> Result.failure(mapper.apply(failure.getError()));
        };
    }
    
    public T getOrElse(T defaultValue) {
        return switch (this) {
            case Success<T, E> success -> success.getValue();
            case Failure<T, E> failure -> defaultValue;
        };
    }
    
    public T getOrThrow() {
        return switch (this) {
            case Success<T, E> success -> success.getValue();
            case Failure<T, E> failure -> throw new RuntimeException(failure.getError().toString());
        };
    }
}

// Sealed interface para comandos
public sealed interface Command
    permits CreateCommand, UpdateCommand, DeleteCommand, QueryCommand {
    
    String getEntityType();
    LocalDateTime getTimestamp();
}

public record CreateCommand(
    String entityType,
    Map<String, Object> data,
    LocalDateTime timestamp
) implements Command {}

public record UpdateCommand(
    String entityType,
    String id,
    Map<String, Object> changes,
    LocalDateTime timestamp
) implements Command {}

public record DeleteCommand(
    String entityType,
    String id,
    LocalDateTime timestamp
) implements Command {}

public record QueryCommand(
    String entityType,
    Map<String, Object> criteria,
    int limit,
    LocalDateTime timestamp
) implements Command {}

// Command processor com pattern matching
public class CommandProcessor {
    
    public Result<String, String> processCommand(Command command) {
        return switch (command) {
            case CreateCommand(var type, var data, var timestamp) -> {
                if (data.isEmpty()) {
                    yield Result.failure("Create command requires data");
                }
                yield Result.success("Created " + type + " with " + data.size() + " fields");
            }
            case UpdateCommand(var type, var id, var changes, var timestamp) -> {
                if (id == null || id.isBlank()) {
                    yield Result.failure("Update command requires valid ID");
                }
                yield Result.success("Updated " + type + " " + id + " with " + changes.size() + " changes");
            }
            case DeleteCommand(var type, var id, var timestamp) -> {
                if (id == null || id.isBlank()) {
                    yield Result.failure("Delete command requires valid ID");
                }
                yield Result.success("Deleted " + type + " " + id);
            }
            case QueryCommand(var type, var criteria, var limit, var timestamp) -> {
                yield Result.success("Queried " + type + " with " + criteria.size() + " criteria, limit " + limit);
            }
        };
    }
}
```

---

## 🚀 Performance SIMD

### 🔹 JEP 338: Vector API (First Incubator)

#### ❓ O que é?
API incubator para operações vetorizadas SIMD, permitindo computação paralela em nível de CPU.

#### ⚠️ Por que é importante?
Habilita operações matemáticas de alta performance que aproveitam instruções SIMD modernas.

```java
// Vector API incubator no Java 16
import jdk.incubator.vector.*;

public class VectorOperationsExample {
    
    private static final VectorSpecies<Float> SPECIES = FloatVector.SPECIES_256;
    
    // Operações vetorizadas básicas
    public static void basicVectorOperations() {
        float[] a = {1.0f, 2.0f, 3.0f, 4.0f, 5.0f, 6.0f, 7.0f, 8.0f};
        float[] b = {2.0f, 3.0f, 4.0f, 5.0f, 6.0f, 7.0f, 8.0f, 9.0f};
        float[] result = new float[a.length];
        
        // Operação vetorizada: result = a + b
        for (int i = 0; i < a.length; i += SPECIES.length()) {
            var va = FloatVector.fromArray(SPECIES, a, i);
            var vb = FloatVector.fromArray(SPECIES, b, i);
            var vr = va.add(vb);
            vr.intoArray(result, i);
        }
        
        System.out.println("Vector addition result: " + Arrays.toString(result));
    }
    
    // Multiplicação de matrizes vetorizada
    public static float[] matrixVectorMultiply(float[][] matrix, float[] vector) {
        int rows = matrix.length;
        int cols = matrix[0].length;
        float[] result = new float[rows];
        
        for (int row = 0; row < rows; row++) {
            float sum = 0.0f;
            int i = 0;
            
            // Processar com vetores
            for (; i < SPECIES.loopBound(cols); i += SPECIES.length()) {
                var vm = FloatVector.fromArray(SPECIES, matrix[row], i);
                var vv = FloatVector.fromArray(SPECIES, vector, i);
                var product = vm.mul(vv);
                sum += product.reduceLanes(VectorOperators.ADD);
            }
            
            // Processar elementos restantes
            for (; i < cols; i++) {
                sum += matrix[row][i] * vector[i];
            }
            
            result[row] = sum;
        }
        
        return result;
    }
    
    // Operações matemáticas complexas
    public static void complexMathOperations() {
        float[] values = new float[1024];
        float[] results = new float[1024];
        
        // Inicializar com valores
        for (int i = 0; i < values.length; i++) {
            values[i] = (float) Math.random() * 100;
        }
        
        // Operação complexa vetorizada: result = sqrt(x^2 + 1) * sin(x)
        for (int i = 0; i < SPECIES.loopBound(values.length); i += SPECIES.length()) {
            var v = FloatVector.fromArray(SPECIES, values, i);
            
            // x^2 + 1
            var squared = v.mul(v);
            var plusOne = squared.add(1.0f);
            
            // sqrt(x^2 + 1)
            var sqrt = plusOne.lanewise(VectorOperators.SQRT);
            
            // sin(x) - aproximação usando lanewise
            var sin = v.lanewise(VectorOperators.SIN);
            
            // Resultado final
            var result = sqrt.mul(sin);
            result.intoArray(results, i);
        }
        
        System.out.println("Complex operation completed on " + values.length + " elements");
    }
    
    // Comparação de performance
    public static void performanceComparison() {
        int size = 10_000_000;
        float[] a = new float[size];
        float[] b = new float[size];
        float[] result1 = new float[size];
        float[] result2 = new float[size];
        
        // Inicializar arrays
        Random random = new Random();
        for (int i = 0; i < size; i++) {
            a[i] = random.nextFloat();
            b[i] = random.nextFloat();
        }
        
        // Operação escalar tradicional
        long startTime = System.nanoTime();
        for (int i = 0; i < size; i++) {
            result1[i] = a[i] * b[i] + 1.0f;
        }
        long scalarTime = System.nanoTime() - startTime;
        
        // Operação vetorizada
        startTime = System.nanoTime();
        for (int i = 0; i < SPECIES.loopBound(size); i += SPECIES.length()) {
            var va = FloatVector.fromArray(SPECIES, a, i);
            var vb = FloatVector.fromArray(SPECIES, b, i);
            var result = va.mul(vb).add(1.0f);
            result.intoArray(result2, i);
        }
        
        // Processar elementos restantes
        for (int i = SPECIES.loopBound(size); i < size; i++) {
            result2[i] = a[i] * b[i] + 1.0f;
        }
        long vectorTime = System.nanoTime() - startTime;
        
        System.out.printf("Scalar time: %.2f ms%n", scalarTime / 1_000_000.0);
        System.out.printf("Vector time: %.2f ms%n", vectorTime / 1_000_000.0);
        System.out.printf("Speedup: %.2fx%n", (double) scalarTime / vectorTime);
    }
}
```

📚 **Saiba mais**: [Vector API Incubator JEP](https://openjdk.org/jeps/338)

---

## 🔌 Conectividade Melhorada

### 🔹 JEP 380: Unix Domain Socket Channels

#### ❓ O que é?
Suporte nativo para Unix Domain Sockets para comunicação inter-processo eficiente.

#### ⚠️ Por que é importante?
Oferece comunicação IPC mais rápida e segura em sistemas Unix/Linux.

```java
// Unix Domain Sockets no Java 16
import java.nio.channels.*;
import java.net.*;

public class UnixDomainSocketExample {
    
    // Servidor usando Unix Domain Socket
    public static void startServer(String socketPath) throws IOException {
        UnixDomainSocketAddress address = UnixDomainSocketAddress.of(socketPath);
        
        try (ServerSocketChannel serverChannel = ServerSocketChannel.open(StandardProtocolFamily.UNIX)) {
            serverChannel.bind(address);
            System.out.println("Server listening on: " + socketPath);
            
            while (true) {
                try (SocketChannel clientChannel = serverChannel.accept()) {
                    handleClient(clientChannel);
                } catch (IOException e) {
                    System.err.println("Error handling client: " + e.getMessage());
                }
            }
        }
    }
    
    private static void handleClient(SocketChannel clientChannel) throws IOException {
        ByteBuffer buffer = ByteBuffer.allocate(1024);
        
        while (clientChannel.read(buffer) > 0) {
            buffer.flip();
            
            // Echo back to client
            while (buffer.hasRemaining()) {
                clientChannel.write(buffer);
            }
            
            buffer.clear();
        }
    }
    
    // Cliente usando Unix Domain Socket
    public static void connectClient(String socketPath, String message) throws IOException {
        UnixDomainSocketAddress address = UnixDomainSocketAddress.of(socketPath);
        
        try (SocketChannel channel = SocketChannel.open(StandardProtocolFamily.UNIX)) {
            channel.connect(address);
            
            // Enviar mensagem
            ByteBuffer buffer = ByteBuffer.wrap(message.getBytes());
            channel.write(buffer);
            
            // Ler resposta
            buffer.clear();
            int bytesRead = channel.read(buffer);
            buffer.flip();
            
            String response = new String(buffer.array(), 0, bytesRead);
            System.out.println("Server response: " + response);
        }
    }
    
    // Exemplo de uso para comunicação entre microsserviços
    public static class MicroserviceCommunication {
        private final String socketPath;
        
        public MicroserviceCommunication(String serviceName) {
            this.socketPath = "/tmp/" + serviceName + ".sock";
        }
        
        public void startService() throws IOException {
            // Limpar socket existente
            Files.deleteIfExists(Path.of(socketPath));
            
            UnixDomainSocketAddress address = UnixDomainSocketAddress.of(socketPath);
            
            try (ServerSocketChannel serverChannel = ServerSocketChannel.open(StandardProtocolFamily.UNIX)) {
                serverChannel.bind(address);
                System.out.println("Microservice listening on: " + socketPath);
                
                // Configurar permissões do socket
                Path socketFile = Path.of(socketPath);
                socketFile.toFile().setReadable(true, false);
                socketFile.toFile().setWritable(true, false);
                
                while (!Thread.currentThread().isInterrupted()) {
                    try (SocketChannel clientChannel = serverChannel.accept()) {
                        processRequest(clientChannel);
                    }
                }
            }
        }
        
        private void processRequest(SocketChannel channel) throws IOException {
            ByteBuffer lengthBuffer = ByteBuffer.allocate(4);
            channel.read(lengthBuffer);
            lengthBuffer.flip();
            
            int messageLength = lengthBuffer.getInt();
            ByteBuffer messageBuffer = ByteBuffer.allocate(messageLength);
            channel.read(messageBuffer);
            messageBuffer.flip();
            
            String request = new String(messageBuffer.array());
            String response = handleBusinessLogic(request);
            
            // Enviar resposta
            byte[] responseBytes = response.getBytes();
            ByteBuffer responseBuffer = ByteBuffer.allocate(4 + responseBytes.length);
            responseBuffer.putInt(responseBytes.length);
            responseBuffer.put(responseBytes);
            responseBuffer.flip();
            
            channel.write(responseBuffer);
        }
        
        private String handleBusinessLogic(String request) {
            // Simular processamento
            return "Processed: " + request.toUpperCase();
        }
        
        public String sendRequest(String targetService, String request) throws IOException {
            String targetSocketPath = "/tmp/" + targetService + ".sock";
            UnixDomainSocketAddress address = UnixDomainSocketAddress.of(targetSocketPath);
            
            try (SocketChannel channel = SocketChannel.open(StandardProtocolFamily.UNIX)) {
                channel.connect(address);
                
                // Enviar request com tamanho
                byte[] requestBytes = request.getBytes();
                ByteBuffer buffer = ByteBuffer.allocate(4 + requestBytes.length);
                buffer.putInt(requestBytes.length);
                buffer.put(requestBytes);
                buffer.flip();
                
                channel.write(buffer);
                
                // Ler resposta
                ByteBuffer lengthBuffer = ByteBuffer.allocate(4);
                channel.read(lengthBuffer);
                lengthBuffer.flip();
                
                int responseLength = lengthBuffer.getInt();
                ByteBuffer responseBuffer = ByteBuffer.allocate(responseLength);
                channel.read(responseBuffer);
                responseBuffer.flip();
                
                return new String(responseBuffer.array());
            }
        }
    }
}
```

📚 **Saiba mais**: [Unix Domain Socket Channels JEP](https://openjdk.org/jeps/380)

---

## 🎯 Impacto e Importância

Java 16 consolidou mudanças fundamentais:

- ✅ **Records final** estabeleceram padrão moderno para data classes
- ✅ **Pattern Matching final** simplificaram verificações de tipo
- ✅ **Vector API** introduziram computação SIMD
- ✅ **Unix Domain Sockets** melhoraram comunicação IPC
- ✅ **Sealed Classes refinadas** prepararam para finalização
- ✅ **Encapsulation by default** melhoraram segurança

---

## 📅 Informações da Versão

- **📅 Lançamento**: 16 de março de 2021
- **🔧 Tipo**: Feature Release
- **⚡ Suporte**: Terminado em setembro de 2021
- **🎯 Status**: Marco - Records e Pattern Matching finais
- **🔄 Migração**: Simples - principalmente consolidação

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 16 Documentation](https://docs.oracle.com/en/java/javase/16/)
- [Java 16 API Specification](https://docs.oracle.com/en/java/javase/16/docs/api/)
- [All JEPs in Java 16](https://openjdk.org/projects/jdk/16/)

### 🏗️ **Records Final**
- [JEP 395: Records](https://openjdk.org/jeps/395)
- [Records Complete Tutorial](https://www.baeldung.com/java-record-keyword)
- [Records Best Practices](https://www.infoq.com/articles/java-record-types/)

### 🔍 **Pattern Matching Final**
- [JEP 394: Pattern Matching for instanceof](https://openjdk.org/jeps/394)
- [Pattern Matching Guide](https://www.baeldung.com/java-pattern-matching-instanceof)

### 🚀 **Vector API**
- [JEP 338: Vector API (Incubator)](https://openjdk.org/jeps/338)
- [Vector API Tutorial](https://www.baeldung.com/java-vector-api)
- [SIMD Programming Guide](https://www.infoq.com/articles/java-vector-api/)

### 🔌 **Unix Domain Sockets**
- [JEP 380: Unix-Domain Socket Channels](https://openjdk.org/jeps/380)
- [Unix Sockets Tutorial](https://www.baeldung.com/java-unix-domain-socket)

### 💻 **Exemplos e Práticas**
- [Java 16 Features Guide](https://www.baeldung.com/java-16-new-features)
- [Modern Java Development](https://github.com/openjdk/jdk16)
- [Java 16 Migration Guide](https://blog.codefx.org/java/java-16-guide/) 
