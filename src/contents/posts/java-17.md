---
title: "Java 17 (LTS) — A LTS Moderna e Estável"
published: 2026-08-27
description: "Cada novidade do Java 17 (2021) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java, LTS]
category: Java
cover: /banners/tech-nodes.svg
draft: false
---

## 📖 Sobre o Java 17

Java 17 é **a versão LTS atual mais adotada**, marcando um momento especial na evolução do Java. Lançado em setembro de 2021, consolida todas as inovações desde Java 11, oferecendo **Records**, **Sealed Classes**, **Pattern Matching** e **Text Blocks** em versão final. É a escolha padrão para novos projetos que buscam modernidade com estabilidade LTS.

## 💡 O que são JEPs?
Java 17 incluiu 14 JEPs que consolidaram preview features em funcionalidades finais e introduziram melhorias significativas de performance e segurança.

---

## 🏗️ Modelagem de Dados

### 🔹 JEP 409: Sealed Classes (Final)

#### ❓ O que é?
Classes que explicitamente controlam quais outras classes podem estendê-las, oferecendo melhor modelagem de domínio e type safety.

#### ⚠️ Por que é importante?
Permite criar hierarquias de classes fechadas e controladas, melhorando a modelagem de domínio e habilitando pattern matching exhaustivo.

```java
// Modelagem de formas geométricas
public sealed class Shape 
    permits Circle, Rectangle, Triangle {
    
    public abstract double area();
    public abstract double perimeter();
}

// Implementações finais
public final class Circle extends Shape {
    private final double radius;
    
    public Circle(double radius) {
        if (radius <= 0) throw new IllegalArgumentException("Radius must be positive");
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
    
    public double radius() { return radius; }
}

public final class Rectangle extends Shape {
    private final double width, height;
    
    public Rectangle(double width, double height) {
        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException("Dimensions must be positive");
        }
        this.width = width;
        this.height = height;
    }
    
    @Override
    public double area() { return width * height; }
    
    @Override
    public double perimeter() { return 2 * (width + height); }
    
    public double width() { return width; }
    public double height() { return height; }
}

// Sealed interfaces também são possíveis
public sealed interface Payment 
    permits CreditCardPayment, PayPalPayment, CashPayment {
    double amount();
    void process();
}

// Hierarquia não selada dentro de sealed
public sealed class Animal permits Mammal, Bird {
    protected final String name;
    protected Animal(String name) { this.name = name; }
}

public non-sealed class Mammal extends Animal {
    protected Mammal(String name) { super(name); }
}

// Agora qualquer classe pode estender Mammal
public class Dog extends Mammal {
    public Dog(String name) { super(name); }
}

public class Cat extends Mammal {
    public Cat(String name) { super(name); }
}
```

#### 🎯 Pattern Matching com Sealed Classes
```java
// Pattern matching exhaustivo (futuro)
public String processShape(Shape shape) {
    return switch (shape) {
        case Circle c -> "Circle with radius " + c.radius();
        case Rectangle r -> "Rectangle " + r.width() + "x" + r.height();
        case Triangle t -> "Triangle"; 
        // Não precisa de default - compilador sabe que é exhaustivo
    };
}

// Processamento de pagamentos
public void processPayment(Payment payment) {
    switch (payment) {
        case CreditCardPayment cc -> {
            validateCard(cc.cardNumber());
            chargeCard(cc);
        }
        case PayPalPayment pp -> {
            authenticatePayPal(pp.email());
            processPayPal(pp);
        }
        case CashPayment cash -> {
            recordCashTransaction(cash);
        }
    };
}
```

📚 **Saiba mais**: [Sealed Classes JEP](https://openjdk.org/jeps/409)

### 🔹 JEP 395: Records (Final)

#### ❓ O que é?
Classes compactas para dados imutáveis que geram automaticamente `equals()`, `hashCode()`, `toString()` e getters.

#### ⚠️ Por que é importante?
Elimina boilerplate para data classes, promove imutabilidade e melhora legibilidade do código.

```java
// Record básico
public record Person(String name, int age, String email) {}

// Uso automático de todos os métodos
Person person = new Person("Ana Silva", 30, "ana@example.com");
System.out.println(person.name());     // Ana Silva
System.out.println(person.age());      // 30
System.out.println(person);            // Person[name=Ana Silva, age=30, email=ana@example.com]

// Equals e hashCode funcionam corretamente
Person person1 = new Person("João", 25, "joao@test.com");
Person person2 = new Person("João", 25, "joao@test.com");
System.out.println(person1.equals(person2)); // true
System.out.println(person1.hashCode() == person2.hashCode()); // true

// Record com validação no constructor compacto
public record Product(String name, double price, String category) {
    public Product {
        // Validações aplicadas a todos os constructors
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name cannot be null or blank");
        }
        if (price < 0) {
            throw new IllegalArgumentException("Price cannot be negative");
        }
        if (category == null) {
            throw new IllegalArgumentException("Category cannot be null");
        }
        
        // Normalização
        name = name.trim();
        category = category.toLowerCase();
    }
    
    // Métodos customizados
    public boolean isExpensive() {
        return price > 100.0;
    }
    
    public Product withDiscount(double percentage) {
        if (percentage < 0 || percentage > 100) {
            throw new IllegalArgumentException("Invalid discount percentage");
        }
        double newPrice = price * (100 - percentage) / 100;
        return new Product(name, newPrice, category);
    }
}

// Record com múltiplos constructors
public record Point(int x, int y) {
    
    // Constructor alternativo
    public Point(int value) {
        this(value, value); // Chama constructor canonical
    }
    
    // Métodos úteis
    public double distanceFromOrigin() {
        return Math.sqrt(x * x + y * y);
    }
    
    public Point translate(int deltaX, int deltaY) {
        return new Point(x + deltaX, y + deltaY);
    }
    
    // Static factory methods
    public static Point origin() {
        return new Point(0, 0);
    }
    
    public static Point of(int x, int y) {
        return new Point(x, y);
    }
}

// Record para configuração
public record DatabaseConfig(
    String host, 
    int port, 
    String database, 
    String username, 
    String password,
    int maxConnections
) {
    public DatabaseConfig {
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("Invalid port: " + port);
        }
        if (maxConnections < 1) {
            throw new IllegalArgumentException("Max connections must be positive");
        }
    }
    
    public String jdbcUrl() {
        return "jdbc:postgresql://" + host + ":" + port + "/" + database;
    }
}
```

#### 🔄 Records vs Classes Tradicionais
```java
// Antes - classe tradicional (muito código!)
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

// Java 17 - Record (1 linha!)
public record Person(String name, int age, String email) {}
```

📚 **Saiba mais**: [Records Tutorial](https://openjdk.org/jeps/395)

---

## 🔍 Pattern Matching

### 🔹 JEP 394: Pattern Matching for instanceof (Final)

#### ❓ O que é?
Simplifica verificações de tipo eliminando casting manual, introduzindo variáveis de padrão.

#### ⚠️ Por que é importante?
Reduz código verbose, elimina erros de casting e torna verificações de tipo mais expressivas.

```java
// Antes do Java 17 - verbose e propenso a erros
public String formatValue(Object obj) {
    if (obj instanceof String) {
        String str = (String) obj;  // casting manual obrigatório
        return "String: " + str.toUpperCase();
    } else if (obj instanceof Integer) {
        Integer num = (Integer) obj;  // mais casting manual
        return "Number: " + (num * 2);
    } else if (obj instanceof List) {
        List<?> list = (List<?>) obj;  // casting complexo
        return "List with " + list.size() + " elements";
    }
    return "Unknown type: " + obj.getClass().getSimpleName();
}

// Java 17 - Pattern Matching limpo
public String formatValue(Object obj) {
    if (obj instanceof String str) {           // casting automático!
        return "String: " + str.toUpperCase();
    } else if (obj instanceof Integer num) {   // variável disponível imediatamente
        return "Number: " + (num * 2);
    } else if (obj instanceof List<?> list) {  // funciona com generics
        return "List with " + list.size() + " elements";
    }
    return "Unknown type: " + obj.getClass().getSimpleName();
}

// Exemplo mais complexo: processamento de JSON
public void processJsonValue(Object value) {
    if (value instanceof String str && !str.isBlank()) {
        // Variável str só existe se ambas condições forem verdadeiras
        processStringValue(str.trim());
    } else if (value instanceof Number num && num.doubleValue() > 0) {
        // num só existe se for Number E positivo
        processPositiveNumber(num);
    } else if (value instanceof List<?> list && !list.isEmpty()) {
        // Verificação combinada com pattern matching
        processNonEmptyList(list);
    } else if (value instanceof Map<?, ?> map && map.containsKey("type")) {
        // Pattern matching com verificação de conteúdo
        processTypedMap(map);
    }
}

// Uso em árvores e estruturas recursivas
public sealed interface Node permits LeafNode, BranchNode {}
public record LeafNode(String value) implements Node {}
public record BranchNode(Node left, Node right) implements Node {}

public int countNodes(Node node) {
    if (node instanceof LeafNode leaf) {
        return 1;
    } else if (node instanceof BranchNode branch) {
        return 1 + countNodes(branch.left()) + countNodes(branch.right());
    }
    return 0; // Nunca alcançado por sealed classes
}

// Validação e transformação segura
public Optional<Integer> parsePositiveInt(Object value) {
    if (value instanceof String str && str.matches("\\d+")) {
        int parsed = Integer.parseInt(str);
        return parsed > 0 ? Optional.of(parsed) : Optional.empty();
    } else if (value instanceof Number num && num.intValue() > 0) {
        return Optional.of(num.intValue());
    }
    return Optional.empty();
}
```

#### 🎯 Combinando com Guard Conditions
```java
// Pattern matching com guards (condições adicionais)
public String categorizeValue(Object obj) {
    if (obj instanceof String str && str.length() > 10) {
        return "Long string: " + str.substring(0, 10) + "...";
    } else if (obj instanceof String str && str.length() <= 10) {
        return "Short string: " + str;
    } else if (obj instanceof Integer num && num > 100) {
        return "Large number: " + num;
    } else if (obj instanceof Integer num && num >= 0) {
        return "Small number: " + num;
    } else if (obj instanceof Integer num) {
        return "Negative number: " + num;
    }
    return "Other: " + obj;
}
```

📚 **Saiba mais**: [Pattern Matching for instanceof](https://openjdk.org/jeps/394)

---

## 📝 String e Text Blocks

### 🔹 JEP 378: Text Blocks (Final)

#### ❓ O que é?
Strings multilinha sem necessidade de escape, preservando formatação natural.

#### ⚠️ Por que é importante?
Elimina concatenação verbosa para HTML, SQL, JSON, YAML e outros formatos estruturados.

```java
// Antes - JSON verboso e propenso a erros
String jsonBefore = "{\n" +
                   "  \"user\": {\n" +
                   "    \"name\": \"João Silva\",\n" +
                   "    \"age\": 30,\n" +
                   "    \"active\": true,\n" +
                   "    \"roles\": [\"user\", \"admin\"],\n" +
                   "    \"metadata\": {\n" +
                   "      \"lastLogin\": \"2024-01-15T10:30:00Z\",\n" +
                   "      \"preferences\": {\n" +
                   "        \"theme\": \"dark\",\n" +
                   "        \"language\": \"pt-BR\"\n" +
                   "      }\n" +
                   "    }\n" +
                   "  }\n" +
                   "}";

// Java 17 - Text Block elegante
String json = """
    {
      "user": {
        "name": "João Silva",
        "age": 30,
        "active": true,
        "roles": ["user", "admin"],
        "metadata": {
          "lastLogin": "2024-01-15T10:30:00Z",
          "preferences": {
            "theme": "dark",
            "language": "pt-BR"
          }
        }
      }
    }
    """;

// SQL complexo legível
String complexQuery = """
    WITH user_stats AS (
        SELECT 
            u.id,
            u.name,
            COUNT(p.id) as post_count,
            AVG(p.rating) as avg_rating,
            MAX(p.created_at) as last_post
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
        WHERE u.active = true
          AND u.created_at > '2020-01-01'
        GROUP BY u.id, u.name
        HAVING COUNT(p.id) > 5
    )
    SELECT 
        us.*,
        CASE 
            WHEN us.avg_rating >= 4.5 THEN 'Excellent'
            WHEN us.avg_rating >= 3.5 THEN 'Good'
            WHEN us.avg_rating >= 2.5 THEN 'Average'
            ELSE 'Poor'
        END as performance_category
    FROM user_stats us
    ORDER BY us.post_count DESC, us.avg_rating DESC
    LIMIT 50
    """;

// HTML template
String htmlTemplate = """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>%s</title>
        <style>
            body { 
                font-family: 'Segoe UI', sans-serif; 
                margin: 0; 
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            h1 { 
                color: #333; 
                text-align: center;
                margin-bottom: 30px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>%s</h1>
            <div class="content">
                %s
            </div>
        </div>
    </body>
    </html>
    """;

// YAML configuration
String yamlConfig = """
    application:
      name: MyApp
      version: 1.0.0
      
    server:
      port: 8080
      context-path: /api
      
    database:
      driver: postgresql
      host: localhost
      port: 5432
      name: myappdb
      pool:
        min-size: 5
        max-size: 20
        timeout: 30s
        
    logging:
      level:
        root: INFO
        com.myapp: DEBUG
      pattern: "%d{yyyy-MM-dd HH:mm:ss} - %msg%n"
      
    features:
      - authentication
      - authorization  
      - caching
      - monitoring
    """;
```

#### 🔧 Text Block Features Avançadas
```java
// Controle de indentação
String code = """
    public class Example {
        public void method() {
            System.out.println("Hello");
        }
    }
    """.stripIndent();  // Remove indentação comum

// Formatação com parâmetros (Java 15+)
String message = """
    Olá %s!
    
    Você tem %d mensagens não lidas.
    Última atividade: %s
    
    Status da conta: %s
    """.formatted(userName, messageCount, lastActivity, accountStatus);

// Templates para diferentes formatos
public class TemplateGenerator {
    public String generateDockerfile(String baseImage, String appName, int port) {
        return """
            FROM %s
            
            WORKDIR /app
            
            COPY target/%s.jar app.jar
            
            EXPOSE %d
            
            ENV JAVA_OPTS="-Xmx512m -Xms256m"
            
            CMD ["java", "$JAVA_OPTS", "-jar", "app.jar"]
            """.formatted(baseImage, appName, port);
    }
    
    public String generateKubernetesService(String appName, int port) {
        return """
            apiVersion: v1
            kind: Service
            metadata:
              name: %s-service
              labels:
                app: %s
            spec:
              selector:
                app: %s
              ports:
                - protocol: TCP
                  port: %d
                  targetPort: %d
              type: ClusterIP
            """.formatted(appName, appName, appName, port, port);
    }
}
```

📚 **Saiba mais**: [Text Blocks Guide](https://openjdk.org/jeps/378)

---

## 🎯 Switch Expressions

### 🔹 JEP 361: Switch Expressions (Final)

#### ❓ O que é?
Switch como expressão que retorna valores, com sintaxe mais concisa e sem fall-through.

#### ⚠️ Por que é importante?
Elimina bugs de fall-through, torna código mais funcional e expressivo.

```java
// Antes - switch statement verboso
public String getDayTypeOld(DayOfWeek day) {
    String result;
    switch (day) {
        case MONDAY:
        case TUESDAY:
        case WEDNESDAY:
        case THURSDAY:
        case FRIDAY:
            result = "Weekday";
            break;
        case SATURDAY:
        case SUNDAY:
            result = "Weekend";
            break;
        default:
            result = "Invalid day";
            break;
    }
    return result;
}

// Java 17 - Switch Expression conciso
public String getDayType(DayOfWeek day) {
    return switch (day) {
        case MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY -> "Weekday";
        case SATURDAY, SUNDAY -> "Weekend";
    };  // Não precisa de default - enum é exhaustivo
}

// Casos mais complexos com yield
public int calculateShippingCost(OrderType type, double weight, String destination) {
    return switch (type) {
        case STANDARD -> {
            int baseCost = 10;
            if (weight > 5.0) baseCost += 5;
            if ("INTERNATIONAL".equals(destination)) baseCost *= 3;
            yield baseCost;
        }
        case EXPRESS -> {
            int cost = 25;
            yield "INTERNATIONAL".equals(destination) ? cost * 2 : cost;
        }
        case OVERNIGHT -> {
            if ("INTERNATIONAL".equals(destination)) {
                throw new IllegalArgumentException("Overnight not available internationally");
            }
            yield 50;
        }
    };
}

// Switch com pattern matching (preview em versões posteriores)
public String processPayment(Object payment) {
    return switch (payment) {
        case CreditCard(var number, var expiry) -> 
            "Processing credit card ending in " + number.substring(number.length() - 4);
        case PayPal(var email) -> 
            "Processing PayPal payment for " + email;
        case Cash(var amount) -> 
            "Processing cash payment of $" + amount;
        case null -> 
            "No payment method provided";
        default -> 
            "Unknown payment type: " + payment.getClass().getSimpleName();
    };
}

// Calculadora expressiva
public double calculate(String operation, double a, double b) {
    return switch (operation.toLowerCase()) {
        case "+", "add", "plus" -> a + b;
        case "-", "subtract", "minus" -> a - b;
        case "*", "multiply", "times" -> a * b;
        case "/", "divide" -> {
            if (b == 0) throw new ArithmeticException("Division by zero");
            yield a / b;
        }
        case "^", "power", "pow" -> Math.pow(a, b);
        case "%", "mod", "modulo" -> a % b;
        default -> throw new IllegalArgumentException("Unknown operation: " + operation);
    };
}

// Estado de máquina simplificado
public enum State { IDLE, RUNNING, PAUSED, STOPPED }
public enum Event { START, PAUSE, RESUME, STOP }

public State transition(State currentState, Event event) {
    return switch (currentState) {
        case IDLE -> switch (event) {
            case START -> State.RUNNING;
            case STOP -> State.STOPPED;
            default -> currentState; // Sem transição
        };
        case RUNNING -> switch (event) {
            case PAUSE -> State.PAUSED;
            case STOP -> State.STOPPED;
            default -> currentState;
        };
        case PAUSED -> switch (event) {
            case RESUME -> State.RUNNING;
            case STOP -> State.STOPPED;
            default -> currentState;
        };
        case STOPPED -> switch (event) {
            case START -> State.RUNNING;
            default -> currentState;
        };
    };
}
```

📚 **Saiba mais**: [Switch Expressions Guide](https://openjdk.org/jeps/361)

---

## 🌊 Stream Enhancements

### 🔹 Stream.toList()

#### ❓ O que é?
Método conveniente para coletar Stream em List imutável.

#### ⚠️ Por que é importante?
Elimina verbosidade de `collect(Collectors.toList())` e retorna lista imutável por padrão.

```java
List<String> names = List.of("ana", "joão", "maria", "pedro", "carlos");

// Antes do Java 17 - verboso
List<String> upperNamesOld = names.stream()
    .map(String::toUpperCase)
    .filter(name -> name.length() > 4)
    .collect(Collectors.toList());  // Mutável

// Java 17 - conciso e imutável
List<String> upperNames = names.stream()
    .map(String::toUpperCase)
    .filter(name -> name.length() > 4)
    .toList();  // Imutável!

// Exemplo prático: processamento de dados
public class DataProcessor {
    
    public List<ProductDto> getActiveProducts(List<Product> products) {
        return products.stream()
            .filter(Product::isActive)
            .filter(p -> p.getStock() > 0)
            .map(this::toDto)
            .sorted(Comparator.comparing(ProductDto::name))
            .toList();  // Lista imutável
    }
    
    public List<String> extractValidEmails(List<User> users) {
        return users.stream()
            .map(User::getEmail)
            .filter(Objects::nonNull)
            .filter(this::isValidEmail)
            .map(String::toLowerCase)
            .distinct()
            .toList();
    }
    
    // Combinando com records
    public List<UserSummary> generateUserSummaries(List<User> users) {
        return users.stream()
            .filter(User::isActive)
            .map(user -> new UserSummary(
                user.getName(),
                user.getEmail(),
                user.getOrders().size(),
                user.getTotalSpent()
            ))
            .sorted(Comparator.comparing(UserSummary::totalSpent).reversed())
            .toList();
    }
}

// Record para o exemplo acima
public record UserSummary(
    String name, 
    String email, 
    int orderCount, 
    BigDecimal totalSpent
) {}
```

---

## 🚀 Performance e JVM

### 🔹 JEP 356: Enhanced Pseudo-Random Number Generators

#### ❓ O que é?
Nova API para geradores de números aleatórios com melhor design e performance.

#### ⚠️ Por que é importante?
Oferece algoritmos modernos de geração aleatória com melhor distribuição e performance.

```java
// Nova API RandomGenerator
RandomGenerator random = RandomGenerator.getDefault();

// Diferentes algoritmos disponíveis
RandomGenerator xoshiro = RandomGenerator.of("Xoshiro256PlusPlus");
RandomGenerator l128x256 = RandomGenerator.of("L128X256MixRandom");

// Streams de números aleatórios
List<Integer> randomInts = random.ints(100, 1, 101)  // 100 números entre 1-100
    .boxed()
    .toList();

// Geração paralela para performance
IntStream.range(0, 1_000_000)
    .parallel()
    .map(i -> random.nextInt(1000))
    .distinct()
    .limit(100)
    .forEach(System.out::println);
```

### 🔹 JEP 382: New macOS Rendering Pipeline

#### ❓ O que é?
Pipeline de renderização nativo para macOS usando Metal ao invés de OpenGL deprecated.

#### ⚠️ Por que é importante?
Melhora performance gráfica significativamente no macOS e prepara para futuro sem OpenGL.

### 🔹 JEP 391: macOS/AArch64 Port

#### ❓ O que é?
Suporte nativo para processadores Apple Silicon (M1, M2, etc.).

#### ⚠️ Por que é importante?
Performance nativa em Macs com Apple Silicon, sem emulação Rosetta.

```bash
# Verificar arquitetura
java -XshowSettings:properties -version | grep os.arch
# Saída em Apple Silicon: os.arch = aarch64
```

---

## 🔒 Segurança e Internals

### 🔹 JEP 403: Strongly Encapsulate JDK Internals

#### ❓ O que é?
Torna APIs internas do JDK fortemente encapsuladas, impedindo acesso não autorizado.

#### ⚠️ Por que é importante?
Aumenta segurança e estabilidade, forçando uso de APIs públicas.

```java
// Isso não funciona mais no Java 17:
// sun.misc.Unsafe unsafe = sun.misc.Unsafe.getUnsafe(); // ❌

// Use APIs públicas:
var byteBuffer = ByteBuffer.allocateDirect(1024); // ✅
```

### 🔹 JEP 415: Context-Specific Deserialization Filters

#### ❓ O que é?
Filtros de deserialização específicos por contexto para melhor segurança.

#### ⚠️ Por que é importante?
Previne ataques de deserialização maliciosa de forma mais granular.

---

## 🛠️ Ferramentas

### 🔹 JEP 392: Packaging Tool (jpackage)

#### ❓ O que é?
Ferramenta para criar instaladores nativos de aplicações Java.

#### ⚠️ Por que é importante?
Facilita distribuição de aplicações Java como aplicações nativas do sistema.

```bash
# Criar instalador Windows (.msi)
jpackage --input target/ \
         --name MyApp \
         --main-jar myapp.jar \
         --main-class com.example.Main \
         --type msi \
         --dest dist/

# Criar App Bundle macOS (.app)
jpackage --input target/ \
         --name MyApp \
         --main-jar myapp.jar \
         --main-class com.example.Main \
         --type app-image \
         --dest dist/

# Criar package Debian (.deb)
jpackage --input target/ \
         --name MyApp \
         --main-jar myapp.jar \
         --main-class com.example.Main \
         --type deb \
         --dest dist/
```

---

## 🎯 Impacto e Adoção

Java 17 é **a LTS moderna** mais importante:

- ✅ **Records e Sealed Classes** revolucionaram modelagem de dados
- ✅ **Pattern Matching** simplificou verificações de tipo
- ✅ **Text Blocks** melhoraram legibilidade de código
- ✅ **Switch Expressions** tornaram código mais funcional
- ✅ **Performance excelente** com Apple Silicon e melhorias de GC
- ✅ **Amplamente adotado** pela indústria como padrão
- ✅ **Base sólida** para aplicações modernas

---

## 📊 Comparação com Outras LTS

| Aspecto | Java 8 | Java 11 | **Java 17** | Java 21 |
|---------|---------|---------|-------------|---------|
| **Paradigma** | Funcional | Modular | **Moderno** | Avançado |
| **Data Classes** | ❌ | ❌ | **✅ Records** | ✅ |
| **Pattern Matching** | ❌ | ❌ | **✅ instanceof** | ✅ Avançado |
| **Sealed Classes** | ❌ | ❌ | **✅** | ✅ |
| **Text Blocks** | ❌ | ❌ | **✅** | ✅ |
| **Switch Expressions** | ❌ | ❌ | **✅** | ✅ |
| **Virtual Threads** | ❌ | ❌ | ❌ | ✅ |

---

## 📅 Informações da Versão

- **📅 Lançamento**: 14 de setembro de 2021
- **🔧 Tipo**: LTS (Long Term Support)
- **⚡ Suporte Oracle**: Até setembro de 2029 (Extended até 2032)
- **🆓 Suporte Gratuito**: Eclipse Temurin, Amazon Corretto, Microsoft OpenJDK
- **🎯 Status**: **LTS recomendada** para novos projetos
- **🔄 Migração**: Moderada - requer análise de internal APIs

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 17 Documentation](https://docs.oracle.com/en/java/javase/17/)
- [Java 17 API Specification](https://docs.oracle.com/en/java/javase/17/docs/api/)
- [All JEPs in Java 17](https://openjdk.org/projects/jdk/17/)

### 🔄 **Migração**
- [Migration Guide to Java 17](https://docs.oracle.com/en/java/javase/17/migrate/)
- [Strongly Encapsulated JDK Internals](https://openjdk.org/jeps/403)
- [Third-party Alternatives](https://adoptium.net/migration/)

### 🏗️ **Records e Sealed Classes**
- [Records Tutorial](https://www.baeldung.com/java-record-keyword)
- [Sealed Classes Guide](https://www.baeldung.com/java-sealed-classes-interfaces)
- [Pattern Matching Examples](https://openjdk.org/jeps/394)

### 🎯 **Switch Expressions**
- [Switch Expressions Tutorial](https://www.baeldung.com/java-switch)
- [Modern Java Patterns](https://github.com/winterbe/java8-tutorial)

### 💻 **Ferramentas e Performance**
- [jpackage Guide](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jpackage.html)
- [Apple Silicon Performance](https://www.baeldung.com/java-apple-silicon)
- [GC Tuning Guide](https://docs.oracle.com/en/java/javase/17/gctuning/)

### 🌟 **Exemplos Práticos**
- [Java 17 Features with Examples](https://www.baeldung.com/java-17-new-features)
- [Modern Java Development](https://github.com/openjdk/jdk17)
- [Real-world Java 17 Usage](https://foojay.io/today/java-17-the-new-lts-is-here/) 
