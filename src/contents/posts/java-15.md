---
title: "Java 15 — Sealed Classes Preview e Text Blocks Final"
published: 2026-08-25
description: "Cada novidade do Java 15 (2020) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java]
category: Java
cover: /banners/tech-circuit.svg
draft: false
---

## 📖 Sobre o Java 15

Java 15 introduziu **Sealed Classes** em preview, uma das features mais importantes para controle de hierarquias. Também finalizou **Text Blocks** e melhorou features de preview anteriores como **Pattern Matching** e **Records**. Incluiu melhorias significativas em **ZGC** e **Shenandoah GC**.

## 💡 O que são JEPs?
Java 15 incluiu 14 JEPs focados em controle de herança, GC de baixa latência, e refinamento de features preview.

---

## 🏗️ Controle de Hierarquia

### 🔹 JEP 360: Sealed Classes (Preview)

#### ❓ O que é?
Classes que restringem explicitamente quais outras classes podem estendê-las, proporcionando controle fino sobre hierarquias.

#### ⚠️ Por que é importante?
Permite design mais seguro e expressivo de hierarquias, facilita análise estática e padrões como ADTs (Algebraic Data Types).

```java
// Sealed class para representar formas geométricas
public sealed class Shape
    permits Circle, Rectangle, Triangle {
    
    public abstract double area();
    public abstract double perimeter();
}

// Classes permitidas devem ser final, non-sealed ou sealed
public final class Circle extends Shape {
    private final double radius;
    
    public Circle(double radius) {
        this.radius = radius;
    }
    
    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
    
    @Override
    public double perimeter() {
        return 2 * Math.PI * radius;
    }
    
    public double getRadius() { return radius; }
}

public final class Rectangle extends Shape {
    private final double width, height;
    
    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }
    
    @Override
    public double area() {
        return width * height;
    }
    
    @Override
    public double perimeter() {
        return 2 * (width + height);
    }
    
    public double getWidth() { return width; }
    public double getHeight() { return height; }
}

// Non-sealed permite extensão adicional
public non-sealed class Triangle extends Shape {
    private final double a, b, c;
    
    public Triangle(double a, double b, double c) {
        this.a = a;
        this.b = b;
        this.c = c;
    }
    
    @Override
    public double area() {
        double s = perimeter() / 2;
        return Math.sqrt(s * (s - a) * (s - b) * (s - c));
    }
    
    @Override
    public double perimeter() {
        return a + b + c;
    }
}

// Esta classe NÃO pode estender Shape!
// public class Hexagon extends Shape {} // ERRO DE COMPILAÇÃO

// Pattern matching com sealed classes
public static String describe(Shape shape) {
    return switch (shape) {
        case Circle c -> "Circle with radius " + c.getRadius();
        case Rectangle r -> "Rectangle " + r.getWidth() + "x" + r.getHeight();
        case Triangle t -> "Triangle with perimeter " + t.perimeter();
        // Não precisa de default - todas as possibilidades cobertas!
    };
}
```

#### 🔧 Sealed Interfaces e Classes Abstratas
```java
// Sealed interface para representar operações
public sealed interface Operation
    permits Addition, Subtraction, Multiplication, Division {
    
    double execute(double a, double b);
}

public record Addition() implements Operation {
    @Override
    public double execute(double a, double b) {
        return a + b;
    }
}

public record Subtraction() implements Operation {
    @Override
    public double execute(double a, double b) {
        return a - b;
    }
}

public record Multiplication() implements Operation {
    @Override
    public double execute(double a, double b) {
        return a * b;
    }
}

public record Division() implements Operation {
    @Override
    public double execute(double a, double b) {
        if (b == 0) throw new ArithmeticException("Division by zero");
        return a / b;
    }
}

// Sealed enum-like pattern com records
public sealed interface Result<T>
    permits Result.Success, Result.Error {
    
    record Success<T>(T value) implements Result<T> {}
    record Error<T>(String message, Throwable cause) implements Result<T> {}
    
    // Pattern matching helper methods
    default T getOrThrow() {
        return switch (this) {
            case Success<T>(var value) -> value;
            case Error<T>(var message, var cause) -> 
                throw new RuntimeException(message, cause);
        };
    }
    
    default <U> Result<U> map(Function<T, U> mapper) {
        return switch (this) {
            case Success<T>(var value) -> new Success<>(mapper.apply(value));
            case Error<T> error -> (Result<U>) error;
        };
    }
}

// Sealed classes para AST (Abstract Syntax Tree)
public sealed interface Expr
    permits Expr.Literal, Expr.Binary, Expr.Unary, Expr.Variable {
    
    record Literal(Object value) implements Expr {}
    record Binary(Expr left, String operator, Expr right) implements Expr {}
    record Unary(String operator, Expr operand) implements Expr {}
    record Variable(String name) implements Expr {}
}

public class Interpreter {
    public Object evaluate(Expr expr, Map<String, Object> env) {
        return switch (expr) {
            case Expr.Literal(var value) -> value;
            case Expr.Variable(var name) -> env.get(name);
            case Expr.Binary(var left, var op, var right) -> 
                evaluateBinary(evaluate(left, env), op, evaluate(right, env));
            case Expr.Unary(var op, var operand) -> 
                evaluateUnary(op, evaluate(operand, env));
        };
    }
    
    private Object evaluateBinary(Object left, String op, Object right) {
        if (left instanceof Number l && right instanceof Number r) {
            return switch (op) {
                case "+" -> l.doubleValue() + r.doubleValue();
                case "-" -> l.doubleValue() - r.doubleValue();
                case "*" -> l.doubleValue() * r.doubleValue();
                case "/" -> l.doubleValue() / r.doubleValue();
                default -> throw new UnsupportedOperationException("Unknown operator: " + op);
            };
        }
        throw new IllegalArgumentException("Operands must be numbers");
    }
    
    private Object evaluateUnary(String op, Object operand) {
        return switch (op) {
            case "-" -> -(((Number) operand).doubleValue());
            case "!" -> !((Boolean) operand);
            default -> throw new UnsupportedOperationException("Unknown operator: " + op);
        };
    }
}
```

📚 **Saiba mais**: [Sealed Classes JEP](https://openjdk.org/jeps/360)

---

## 🔍 Pattern Matching Melhorado

### 🔹 JEP 375: Pattern Matching for instanceof (Second Preview)

#### ❓ O que é?
Segunda iteração do pattern matching, com melhorias baseadas no feedback da comunidade.

#### ⚠️ Por que é importante?
Refinamentos na sintaxe e comportamento para preparar a feature para o status final.

```java
// Pattern matching melhorado no Java 15
public String processUserInput(Object input) {
    if (input instanceof String str && !str.isBlank()) {
        return "Text: " + str.trim();
    } else if (input instanceof Integer num && num > 0) {
        return "Positive number: " + num;
    } else if (input instanceof List<?> list && !list.isEmpty()) {
        return "List with " + list.size() + " elements";
    } else if (input instanceof Map<?, ?> map && !map.isEmpty()) {
        return "Map with " + map.size() + " entries";
    }
    return "Invalid or empty input";
}

// Combinação com sealed classes
public double calculateArea(Shape shape) {
    if (shape instanceof Circle circle) {
        return Math.PI * circle.getRadius() * circle.getRadius();
    } else if (shape instanceof Rectangle rect) {
        return rect.getWidth() * rect.getHeight();
    } else if (shape instanceof Triangle triangle) {
        // Usar fórmula de Heron
        double s = triangle.perimeter() / 2;
        return Math.sqrt(s * (s - triangle.getA()) * 
                        (s - triangle.getB()) * 
                        (s - triangle.getC()));
    }
    throw new IllegalArgumentException("Unknown shape type");
}
```

---

## 📦 Records Melhorados

### 🔹 JEP 384: Records (Second Preview)

#### ❓ O que é?
Segunda preview dos Records com melhorias na validação e métodos customizados.

#### ⚠️ Por que é importante?
Refinamentos baseados no uso real preparando para o status final no Java 16.

```java
// Records melhorados no Java 15
public record Person(String name, int age, String email) {
    
    // Compact constructor com validação melhorada
    public Person {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name cannot be null or blank");
        }
        if (age < 0 || age > 150) {
            throw new IllegalArgumentException("Age must be between 0 and 150");
        }
        if (email != null && !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        
        // Normalização automática
        name = name.trim();
        email = email != null ? email.toLowerCase().trim() : null;
    }
    
    // Métodos utilitários
    public boolean isAdult() {
        return age >= 18;
    }
    
    public boolean hasEmail() {
        return email != null && !email.isBlank();
    }
    
    public Person withAge(int newAge) {
        return new Person(name, newAge, email);
    }
    
    public Person withEmail(String newEmail) {
        return new Person(name, age, newEmail);
    }
}

// Record para dados de configuração
public record DatabaseConfig(
    String host,
    int port,
    String database,
    String username,
    Optional<String> password,
    Map<String, String> properties
) {
    public DatabaseConfig {
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("Host cannot be null or blank");
        }
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("Port must be between 1 and 65535");
        }
        if (database == null || database.isBlank()) {
            throw new IllegalArgumentException("Database cannot be null or blank");
        }
        
        // Criar cópias imutáveis
        properties = Map.copyOf(properties);
    }
    
    public String getConnectionUrl() {
        return String.format("jdbc:postgresql://%s:%d/%s", host, port, database);
    }
    
    public DatabaseConfig withHost(String newHost) {
        return new DatabaseConfig(newHost, port, database, username, password, properties);
    }
    
    public DatabaseConfig withProperty(String key, String value) {
        var newProperties = new HashMap<>(properties);
        newProperties.put(key, value);
        return new DatabaseConfig(host, port, database, username, password, newProperties);
    }
}
```

---

## 📝 Text Processing Final

### 🔹 JEP 378: Text Blocks (Final)

#### ❓ O que é?
Text Blocks se tornaram feature final com todos os refinamentos implementados.

#### ⚠️ Por que é importante?
Elimina definitivamente a verbosidade de strings multilinha em Java.

```java
// Text Blocks finais no Java 15
public class JsonTemplates {
    
    public static final String USER_RESPONSE = """
        {
            "user": {
                "id": %d,
                "name": "%s",
                "email": "%s",
                "preferences": {
                    "theme": "%s",
                    "notifications": %b,
                    "language": "%s"
                },
                "metadata": {
                    "created_at": "%s",
                    "last_login": "%s",
                    "active": %b
                }
            }
        }
        """;
    
    public static final String SQL_QUERY = """
        SELECT 
            u.id,
            u.name,
            u.email,
            COUNT(o.id) as order_count,
            SUM(o.total) as total_spent,
            MAX(o.created_at) as last_order
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.active = true
          AND u.created_at > ?
          AND (u.email IS NOT NULL AND u.email != '')
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(o.id) > 0
        ORDER BY total_spent DESC, last_order DESC
        LIMIT ?
        """;
    
    public static final String HTML_TEMPLATE = """
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>%s</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .highlight {
                    background-color: #fffacd;
                    padding: 2px 4px;
                    border-radius: 3px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>%s</h1>
                <p>%s</p>
                <div class="highlight">
                    Powered by Java 15 Text Blocks
                </div>
            </div>
        </body>
        </html>
        """;
}

// Uso prático dos templates
public class TemplateService {
    
    public String generateUserJson(User user) {
        return JsonTemplates.USER_RESPONSE.formatted(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getTheme(),
            user.hasNotifications(),
            user.getLanguage(),
            user.getCreatedAt(),
            user.getLastLogin(),
            user.isActive()
        );
    }
    
    public String generateReportPage(String title, String content) {
        return JsonTemplates.HTML_TEMPLATE.formatted(
            title,
            title,
            content
        );
    }
}
```

---

## 🗂️ Classes Dinâmicas

### 🔹 JEP 371: Hidden Classes

#### ❓ O que é?
Classes que não são descobríveis via reflection normal, úteis para frameworks e bytecode dinâmico.

#### ⚠️ Por que é importante?
Melhora performance de frameworks que geram classes dinamicamente, reduzindo memory leaks.

```java
// Hidden Classes para geração dinâmica
import java.lang.invoke.MethodHandles;

public class DynamicClassGenerator {
    
    public static Class<?> createHiddenClass(String className, byte[] bytecode) {
        try {
            var lookup = MethodHandles.lookup();
            return lookup.defineHiddenClass(bytecode, true)
                        .lookupClass();
        } catch (IllegalAccessException e) {
            throw new RuntimeException("Failed to create hidden class", e);
        }
    }
    
    // Exemplo de uso para proxy dinâmico
    public static Object createProxy(Class<?> targetInterface, InvocationHandler handler) {
        // Gerar bytecode para implementar a interface
        byte[] bytecode = generateProxyBytecode(targetInterface);
        
        // Criar hidden class
        Class<?> proxyClass = createHiddenClass(
            targetInterface.getName() + "$Proxy", 
            bytecode
        );
        
        try {
            var constructor = proxyClass.getConstructor(InvocationHandler.class);
            return constructor.newInstance(handler);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create proxy instance", e);
        }
    }
    
    private static byte[] generateProxyBytecode(Class<?> targetInterface) {
        // Implementação usando ASM ou ByteBuddy
        // para gerar bytecode que implementa a interface
        return new byte[0]; // Placeholder
    }
}

// Hidden classes não aparecem em class loading normal
public class SecurityManager {
    
    public boolean isHiddenClass(Class<?> clazz) {
        return clazz.isHidden();
    }
    
    public void auditClassLoading() {
        // Hidden classes não aparecem aqui
        var loadedClasses = getLoadedClasses();
        loadedClasses.stream()
                    .filter(cls -> !cls.isHidden())
                    .forEach(cls -> log("Loaded: " + cls.getName()));
    }
    
    private Class<?>[] getLoadedClasses() {
        // Obter classes carregadas
        return new Class<?>[0]; // Placeholder
    }
    
    private void log(String message) {
        System.out.println(message);
    }
}
```

---

## 🚀 Garbage Collection

### 🔹 JEP 377: ZGC Production Ready

#### ❓ O que é?
ZGC se torna production ready com latência ultra-baixa consistente.

#### ⚠️ Por que é importante?
Permite aplicações com requisitos de latência extrema sem comprometer throughput.

```bash
# ZGC production ready no Java 15
java -XX:+UseZGC -Xmx32g MyApp

# Com tuning para latência mínima
java -XX:+UseZGC \
     -XX:+UnlockExperimentalVMOptions \
     -XX:ZCollectionInterval=5 \
     -XX:ZAllocationSpikeTolerance=5 \
     -Xmx64g MyApp

# Monitoramento ZGC
java -XX:+UseZGC \
     -XX:+LogVMOutput \
     -XX:+TraceClassLoading \
     -XX:LogFile=gc.log MyApp
```

### 🔹 JEP 379: Shenandoah GC Production Ready

#### ❓ O que é?
Shenandoah GC também se torna production ready com baixa latência.

```bash
# Shenandoah production ready
java -XX:+UseShenandoahGC -Xmx16g MyApp

# Com configurações otimizadas
java -XX:+UseShenandoahGC \
     -XX:ShenandoahGCHeuristics=adaptive \
     -XX:+ShenandoahUncommit \
     -Xmx32g MyApp
```

---

## 🔐 Segurança

### 🔹 JEP 339: Edwards-Curve Digital Signature Algorithm (EdDSA)

#### ❓ O que é?
Implementação do algoritmo de assinatura digital EdDSA conforme RFC 8032.

#### ⚠️ Por que é importante?
Fornece assinaturas mais rápidas e seguras para aplicações modernas.

```java
// EdDSA no Java 15
import java.security.*;
import java.security.spec.*;

public class EdDSAExample {
    
    public static void demonstrateEdDSA() throws Exception {
        // Gerar par de chaves EdDSA
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("EdDSA");
        KeyPair keyPair = keyGen.generateKeyPair();
        
        PrivateKey privateKey = keyPair.getPrivate();
        PublicKey publicKey = keyPair.getPublic();
        
        // Dados a serem assinados
        String message = "Hello, Java 15 EdDSA!";
        byte[] data = message.getBytes();
        
        // Assinar dados
        Signature signature = Signature.getInstance("EdDSA");
        signature.initSign(privateKey);
        signature.update(data);
        byte[] digitalSignature = signature.sign();
        
        // Verificar assinatura
        signature.initVerify(publicKey);
        signature.update(data);
        boolean isValid = signature.verify(digitalSignature);
        
        System.out.println("Message: " + message);
        System.out.println("Signature valid: " + isValid);
        System.out.println("Signature length: " + digitalSignature.length + " bytes");
        
        // Comparar com RSA (tradicionalmente maior)
        demonstrateRSAComparison();
    }
    
    private static void demonstrateRSAComparison() throws Exception {
        // RSA para comparação
        KeyPairGenerator rsaKeyGen = KeyPairGenerator.getInstance("RSA");
        rsaKeyGen.initialize(2048);
        KeyPair rsaKeyPair = rsaKeyGen.generateKeyPair();
        
        Signature rsaSig = Signature.getInstance("SHA256withRSA");
        rsaSig.initSign(rsaKeyPair.getPrivate());
        rsaSig.update("Hello, RSA!".getBytes());
        byte[] rsaSignature = rsaSig.sign();
        
        System.out.println("RSA signature length: " + rsaSignature.length + " bytes");
        System.out.println("EdDSA is more compact and faster!");
    }
    
    public static void main(String[] args) throws Exception {
        demonstrateEdDSA();
    }
}
```

---

## 🎯 Impacto e Importância

Java 15 consolidou features importantes:

- ✅ **Sealed Classes** introduziram controle fino de hierarquias
- ✅ **Text Blocks final** eliminaram verbosidade de strings
- ✅ **ZGC/Shenandoah production** viabilizaram latência ultra-baixa
- ✅ **EdDSA** modernizou criptografia
- ✅ **Hidden Classes** melhoraram frameworks dinâmicos
- ✅ **Pattern Matching refinado** preparou para finalização

---

## 📅 Informações da Versão

- **📅 Lançamento**: 15 de setembro de 2020
- **🔧 Tipo**: Feature Release
- **⚡ Suporte**: Terminado em março de 2021
- **🎯 Status**: Consolidou features preview importantes
- **🔄 Migração**: Simples - principalmente melhorias graduais

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 15 Documentation](https://docs.oracle.com/en/java/javase/15/)
- [Java 15 API Specification](https://docs.oracle.com/en/java/javase/15/docs/api/)
- [All JEPs in Java 15](https://openjdk.org/projects/jdk/15/)

### 🏗️ **Sealed Classes**
- [JEP 360: Sealed Classes](https://openjdk.org/jeps/360)
- [Sealed Classes Tutorial](https://www.baeldung.com/java-sealed-classes-interfaces)
- [Sealed Classes Best Practices](https://www.infoq.com/articles/java-sealed-classes/)

### 📝 **Text Blocks Final**
- [JEP 378: Text Blocks](https://openjdk.org/jeps/378)
- [Text Blocks Complete Guide](https://www.baeldung.com/java-text-blocks)

### 🗂️ **Hidden Classes**
- [JEP 371: Hidden Classes](https://openjdk.org/jeps/371)
- [Hidden Classes Explained](https://www.baeldung.com/java-hidden-classes)

### 🚀 **Garbage Collection**
- [JEP 377: ZGC Production](https://openjdk.org/jeps/377)
- [JEP 379: Shenandoah Production](https://openjdk.org/jeps/379)
- [Low Latency GC Comparison](https://www.baeldung.com/jvm-experimental-garbage-collectors)

### 🔐 **Segurança**
- [JEP 339: EdDSA](https://openjdk.org/jeps/339)
- [EdDSA Implementation Guide](https://www.baeldung.com/java-edwards-curve-digital-signature-algorithm)

### 💻 **Exemplos e Práticas**
- [Java 15 Features Guide](https://www.baeldung.com/java-15-new-features)
- [Modern Java Development](https://github.com/openjdk/jdk15)
- [Java 15 Migration Tips](https://blog.codefx.org/java/java-15-guide/) 
