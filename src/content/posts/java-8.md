---
title: "Java 8 (LTS) — A Revolução Funcional"
published: 2025-07-02T00:00:00Z
description: "Cada novidade do Java 8 (2014) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java, LTS]
category: Java
cover: /covers/java/java-8.svg
draft: false
---

## 📖 Sobre o Java 8

Java 8 foi **a versão mais transformadora** da história do Java, introduzindo programação funcional e modernizando drasticamente a linguagem. Lançado em março de 2014, permanece como uma das versões mais utilizadas em produção até hoje.

## 💡 O que são JEPs?
JEPs (Java Enhancement Proposals) são propostas formais de melhorias. O Java 8 introduziu várias mudanças fundamentais que definiram o futuro da linguagem.

---

## 🎯 Programação Funcional

### 🔹 JEP 126: Lambda Expressions

#### ❓ O que é?
Expressões lambda permitem tratar funções como valores, habilitando programação funcional no Java. É uma forma concisa de escrever funções anônimas.

#### ⚠️ Por que é importante?
Revolucionou como escrevemos código Java, tornando-o mais conciso, legível e expressivo. Eliminou a verbosidade de classes anônimas e abriu caminho para APIs funcionais.

```java
// Antes do Java 8 - Verboso e difícil de ler
List<String> nomes = Arrays.asList("Ana", "João", "Maria", "Pedro");
Collections.sort(nomes, new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return a.compareToIgnoreCase(b);
    }
});

// Java 8 - Conciso e claro
Collections.sort(nomes, (a, b) -> a.compareToIgnoreCase(b));

// Ainda mais simples com method reference
Collections.sort(nomes, String::compareToIgnoreCase);

// Exemplos diversos de lambda
Runnable task = () -> System.out.println("Hello World");
Function<String, Integer> stringLength = s -> s.length();
Predicate<String> isEmpty = s -> s.isEmpty();
Consumer<String> printer = System.out::println;
```

#### 🧠 Sintaxe Lambda
```java
// Sem parâmetros
() -> System.out.println("Hello")

// Um parâmetro
x -> x * 2

// Múltiplos parâmetros
(x, y) -> x + y

// Bloco de código
(x, y) -> {
    int sum = x + y;
    return sum * 2;
}
```

📚 **Saiba mais**: [Oracle Lambda Tutorial](https://docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html)

### 🔹 JEP 107: Method References

#### ❓ O que é?
Sintaxe ainda mais concisa para referenciar métodos existentes, usando o operador `::`.

#### ⚠️ Por que é importante?
Torna o código ainda mais limpo quando você apenas está chamando um método existente, sem adicionar lógica nova.

```java
List<String> nomes = Arrays.asList("ana", "joão", "maria");

// Lambda tradicional
nomes.forEach(nome -> System.out.println(nome));

// Method reference - mais limpo
nomes.forEach(System.out::println);

// Tipos de method references
// 1. Método estático
Function<String, Integer> parser = Integer::parseInt;

// 2. Método de instância de objeto específico
String prefix = "Hello ";
Function<String, String> greeter = prefix::concat;

// 3. Método de instância de objeto arbitrário
Function<String, String> upperCase = String::toUpperCase;

// 4. Constructor reference
Supplier<List<String>> listSupplier = ArrayList::new;
Function<String, StringBuilder> sbCreator = StringBuilder::new;
```

---

## 🌊 Stream API

### 🔹 JEP 107: Stream API

#### ❓ O que é?
API para processamento de coleções de forma declarativa e funcional, permitindo operações como filter, map, reduce de forma fluente.

#### ⚠️ Por que é importante?
Revolucionou como processamos dados em Java. Código mais legível, menos propenso a bugs, e com suporte nativo para paralelização.

```java
List<Person> pessoas = Arrays.asList(
    new Person("Ana", 25, "SP"),
    new Person("João", 30, "RJ"), 
    new Person("Maria", 35, "SP"),
    new Person("Pedro", 20, "MG")
);

// Exemplo complexo: Pessoas de SP, maiores de 21, ordenadas por idade
List<String> resultado = pessoas.stream()
    .filter(p -> "SP".equals(p.getEstado()))  // Filtrar por estado
    .filter(p -> p.getIdade() > 21)           // Filtrar por idade
    .sorted(Comparator.comparing(Person::getIdade))  // Ordenar
    .map(Person::getNome)                     // Extrair nome
    .collect(Collectors.toList());            // Coletar resultado

// Operações estatísticas
IntSummaryStatistics stats = pessoas.stream()
    .mapToInt(Person::getIdade)
    .summaryStatistics();

System.out.println("Média de idade: " + stats.getAverage());
System.out.println("Idade máxima: " + stats.getMax());
```

#### 🚀 Streams Paralelos
```java
// Processamento paralelo automático
long count = pessoas.parallelStream()
    .filter(p -> p.getIdade() > 25)
    .count();

// ForkJoinPool é usado automaticamente
List<String> processedNames = pessoas.parallelStream()
    .map(p -> heavyProcessing(p.getNome()))
    .collect(Collectors.toList());
```

#### 📊 Collectors Úteis
```java
// Agrupamento
Map<String, List<Person>> porEstado = pessoas.stream()
    .collect(Collectors.groupingBy(Person::getEstado));

// Particionamento
Map<Boolean, List<Person>> adultos = pessoas.stream()
    .collect(Collectors.partitioningBy(p -> p.getIdade() >= 18));

// String joining
String nomes = pessoas.stream()
    .map(Person::getNome)
    .collect(Collectors.joining(", ", "[", "]"));
```

📚 **Saiba mais**: [Oracle Stream API Guide](https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html)

---

## 🛡️ Programação Defensiva

### 🔹 Optional

#### ❓ O que é?
Container que pode ou não conter um valor não-nulo, forçando o desenvolvedor a lidar explicitamente com a ausência de valores.

#### ⚠️ Por que é importante?
Reduz drasticamente NullPointerExceptions e torna o código mais seguro e expressivo. Força tratamento explícito de casos onde valores podem estar ausentes.

```java
public class UserService {
    // Retorno claro: pode ou não ter usuário
    public Optional<User> findUserById(Long id) {
        User user = database.find(id);
        return Optional.ofNullable(user);
    }
    
    // Uso seguro do Optional
    public String getUserDisplayName(Long id) {
        return findUserById(id)
            .map(User::getName)                    // Se existe, pega nome
            .filter(name -> !name.trim().isEmpty()) // Se não vazio
            .orElse("Usuário Anônimo");            // Valor padrão
    }
    
    // Operações avançadas
    public void sendNotification(Long userId) {
        findUserById(userId)
            .filter(User::isActive)                // Apenas ativos
            .map(User::getEmail)                   // Pegar email
            .filter(email -> email.contains("@"))  // Validar email
            .ifPresent(this::sendEmail);           // Enviar se válido
    }
}

// Anti-patterns - NÃO faça
// Optional.get() sem verificar - derrota o propósito
// Optional.of(null) - vai lançar exceção
// if (optional.isPresent()) { optional.get() } - use ifPresent()
```

#### 🎯 Métodos Úteis do Optional
```java
Optional<String> opt = Optional.of("Hello");

// Valores padrão
opt.orElse("Default");                    // Valor fixo
opt.orElseGet(() -> expensiveCalculation()); // Lazy evaluation
opt.orElseThrow(() -> new RuntimeException()); // Exceção customizada

// Transformações
opt.map(String::toUpperCase);             // Transformar se presente
opt.flatMap(this::findRelated);          // Evitar Optional<Optional<T>>
opt.filter(s -> s.length() > 5);         // Filtrar por condição

// Ações
opt.ifPresent(System.out::println);      // Executar se presente
opt.ifPresentOrElse(                     // Java 9+
    System.out::println,
    () -> System.out.println("Empty")
);
```

📚 **Saiba mais**: [Oracle Optional Guide](https://docs.oracle.com/javase/8/docs/api/java/util/Optional.html)

---

## 🔧 Melhorias em Interfaces

### 🔹 Default Methods

#### ❓ O que é?
Permite adicionar métodos com implementação padrão em interfaces, sem quebrar classes que já as implementam.

#### ⚠️ Por que é importante?
Permite evolução de APIs sem quebrar compatibilidade. Foi essencial para adicionar métodos de Stream à Collection API existente.

```java
public interface Vehicle {
    // Método abstrato tradicional
    void start();
    void stop();
    
    // Método padrão - pode ser sobrescrito
    default void honk() {
        System.out.println("Beep beep!");
    }
    
    // Método padrão mais complexo
    default String getInfo() {
        return String.format("Vehicle: %s", this.getClass().getSimpleName());
    }
    
    // Pode chamar outros métodos
    default void startAndHonk() {
        start();
        honk();
    }
}

public class Car implements Vehicle {
    @Override
    public void start() {
        System.out.println("Car engine starting...");
    }
    
    @Override
    public void stop() {
        System.out.println("Car engine stopping...");
    }
    
    // honk() é herdado automaticamente
    // Pode sobrescrever se necessário
    @Override
    public String getInfo() {
        return "Fast car";
    }
}

// Múltiplas interfaces com default methods
public interface Flyable {
    default void fly() {
        System.out.println("Flying...");
    }
}

public class FlyingCar implements Vehicle, Flyable {
    // Se há conflito de nomes, deve resolver explicitamente
    @Override
    public void honk() {
        Vehicle.super.honk(); // Chama implementação específica
        System.out.println("Flying car honk!");
    }
}
```

### 🔹 Static Methods em Interfaces

#### ❓ O que é?
Permite métodos estáticos em interfaces, úteis para factory methods e utilitários relacionados.

#### ⚠️ Por que é importante?
Permite agrupar funcionalidades relacionadas na mesma interface, melhorando organização do código.

```java
public interface MathUtils {
    // Métodos estáticos utilitários
    static double pi() {
        return 3.14159265359;
    }
    
    static double circleArea(double radius) {
        return pi() * radius * radius;
    }
    
    // Factory method
    static MathUtils advanced() {
        return new AdvancedMathUtils();
    }
}

// Uso direto
double area = MathUtils.circleArea(5.0);
```

---

## 📅 Nova API de Data e Hora

### 🔹 JSR 310: Date and Time API

#### ❓ O que é?
API completamente nova para trabalhar com datas e horários, imutável e thread-safe, substituindo as problemáticas classes Date e Calendar.

#### ⚠️ Por que é importante?
As antigas classes Date e Calendar tinham problemas sérios: eram mutáveis, não thread-safe, e confusas. A nova API resolve todos esses problemas.

```java
// Classes principais
LocalDate date = LocalDate.now();              // 2024-01-15
LocalTime time = LocalTime.now();              // 14:30:00
LocalDateTime datetime = LocalDateTime.now();  // 2024-01-15T14:30:00
ZonedDateTime zoned = ZonedDateTime.now();     // 2024-01-15T14:30:00-03:00[America/Sao_Paulo]

// Criação de datas específicas
LocalDate birthday = LocalDate.of(1990, Month.DECEMBER, 25);
LocalTime meetingTime = LocalTime.of(14, 30, 0);
LocalDateTime meeting = LocalDateTime.of(2024, 1, 15, 14, 30);

// Operações matemáticas - sempre retorna nova instância (imutável)
LocalDate tomorrow = date.plusDays(1);
LocalDate nextWeek = date.plusWeeks(1);
LocalDate nextMonth = date.plusMonths(1);
LocalDate lastYear = date.minusYears(1);

// Formatação e parsing
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
String formatted = date.format(formatter);           // "15/01/2024"
LocalDate parsed = LocalDate.parse("25/12/2024", formatter);

// Formatação localizada
DateTimeFormatter brFormat = DateTimeFormatter.ofLocalizedDate(FormatStyle.FULL)
    .withLocale(new Locale("pt", "BR"));
String brFormatted = date.format(brFormat); // "segunda-feira, 15 de janeiro de 2024"
```

#### 🌍 Trabalhando com Zonas Horárias
```java
// ZonedDateTime para timestamps precisos
ZoneId saoPaulo = ZoneId.of("America/Sao_Paulo");
ZoneId tokyo = ZoneId.of("Asia/Tokyo");

ZonedDateTime now = ZonedDateTime.now(saoPaulo);
ZonedDateTime tokyoTime = now.withZoneSameInstant(tokyo);

// Período e duração
LocalDate start = LocalDate.of(2024, 1, 1);
LocalDate end = LocalDate.of(2024, 12, 31);
Period period = Period.between(start, end);
System.out.println(period.getMonths() + " meses"); // 11 meses

LocalTime startTime = LocalTime.of(9, 0);
LocalTime endTime = LocalTime.of(17, 30);
Duration duration = Duration.between(startTime, endTime);
System.out.println(duration.toHours() + " horas"); // 8 horas
```

#### ⏰ Classes Especializadas
```java
// Year, YearMonth para casos específicos
Year currentYear = Year.now();
boolean isLeap = currentYear.isLeap();

YearMonth month = YearMonth.of(2024, 2);
int daysInMonth = month.lengthOfMonth(); // 29 (ano bissexto)

// MonthDay para datas recorrentes (aniversários)
MonthDay christmas = MonthDay.of(Month.DECEMBER, 25);
boolean isChristmasToday = christmas.equals(MonthDay.from(LocalDate.now()));

// Instant para timestamps UTC
Instant timestamp = Instant.now();
long epochMilli = timestamp.toEpochMilli();
```

📚 **Saiba mais**: [Oracle Date/Time Tutorial](https://docs.oracle.com/javase/tutorial/datetime/)

---

## 🚀 Performance e JVM

### 🔹 Melhorias na JVM

#### **Permanent Generation Removida**
- **Antes**: PermGen causava `OutOfMemoryError: PermGen space`
- **Java 8**: Substituída por **Metaspace** (memória nativa)
- **Benefício**: Expansão automática, sem mais erros de PermGen

```bash
# Configuração antiga (não funciona mais)
# -XX:PermSize=256m -XX:MaxPermSize=512m

# Nova configuração
-XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m
```

#### **Compact Profiles**
Subconjuntos do JRE para dispositivos com recursos limitados:

```bash
# Profile 1: APIs básicas (~10MB)
# Profile 2: + RMI, XML, etc. (~17MB)  
# Profile 3: + Security, Management (~32MB)
```

### 🔹 Nashorn JavaScript Engine

#### ❓ O que é?
Engine JavaScript escrita em Java, substituindo o Rhino, com performance muito superior.

#### ⚠️ Por que é importante?
Permite executar JavaScript no JVM com performance próxima ao V8, útil para templates e scripting.

```java
ScriptEngineManager manager = new ScriptEngineManager();
ScriptEngine engine = manager.getEngineByName("JavaScript");

// Executar JavaScript
Object result = engine.eval("Math.sqrt(64)");
System.out.println(result); // 8.0

// Passar objetos Java para JavaScript
engine.put("javaObject", new MyClass());
engine.eval("javaObject.method()");
```

📚 **Saiba mais**: [Nashorn Guide](https://docs.oracle.com/javase/8/docs/technotes/guides/scripting/nashorn/)

---

## 🛠️ Ferramentas e Utilitários

### 🔹 jjs - JavaScript Shell

```bash
# Executar JavaScript
jjs script.js

# REPL interativo
jjs
jjs> print("Hello from Nashorn")
```

### 🔹 jdeps - Dependency Analyzer

```bash
# Analisar dependências de JAR
jdeps myapp.jar

# Verificar dependências de APIs internas
jdeps -jdkinternals myapp.jar
```

---

## 📈 Outras Melhorias Importantes

### 🔹 Annotations em Tipos
```java
// Annotations podem ser usadas em qualquer lugar
List<@NonNull String> names;
Map<@NonEmpty String, @Positive Integer> ages;
```

### 🔹 Repeating Annotations
```java
@Repeatable(Authors.class)
@interface Author {
    String name();
}

@Author(name = "John")
@Author(name = "Jane") 
public class Book {
    // ...
}
```

### 🔹 Base64 API Nativa
```java
// Codificar
String encoded = Base64.getEncoder().encodeToString("Hello".getBytes());

// Decodificar
byte[] decoded = Base64.getDecoder().decode(encoded);
```

---

## 🎯 Impacto e Legado

Java 8 foi **a mudança mais significativa** desde o Java 5:

- ✅ **Programação Funcional** mainstream no Java
- ✅ **Código mais conciso** e expressivo
- ✅ **Performance melhorada** com Streams paralelos  
- ✅ **Menos bugs** com Optional e imutabilidade
- ✅ **APIs modernas** que influenciaram outras linguagens
- ✅ **Base sólida** para todas as versões futuras

---

## 📅 Informações da Versão

- **📅 Lançamento**: 18 de março de 2014
- **🔧 Tipo**: LTS (Long Term Support)  
- **⚡ Suporte Oracle**: Até janeiro 2019 (público)
- **🏢 Suporte Comercial**: Até 2030+ (Oracle)
- **🆓 Suporte Gratuito**: Amazon Corretto, Eclipse Temurin
- **🎯 Status**: Ainda amplamente usado em produção

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 8 Documentation](https://docs.oracle.com/javase/8/)
- [Java 8 API Specification](https://docs.oracle.com/javase/8/docs/api/)
- [JEPs do Java 8](https://openjdk.org/projects/jdk8/)

### 🎓 **Tutoriais e Guias**
- [Oracle Lambda Tutorial](https://docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html)
- [Stream API Guide](https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html)
- [Date/Time API Tutorial](https://docs.oracle.com/javase/tutorial/datetime/)
- [Optional Best Practices](https://www.oracle.com/technical-resources/articles/java/java8-optional.html)

### 💻 **Exemplos e Práticas**
- [Java 8 Stream Examples](https://winterbe.com/posts/2014/07/31/java8-stream-tutorial-examples/)
- [Lambda Expressions Guide](https://www.baeldung.com/java-8-lambda-expressions-tips)
- [Modern Java Best Practices](https://github.com/winterbe/java8-tutorial) 
