---
title: "Java 13 — Text Blocks Preview"
published: 2026-08-23
description: "Cada novidade do Java 13 (2019) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java]
category: Java
cover: /covers/java/java-13.svg
draft: false
---

## 📖 Sobre o Java 13

Java 13 continuou o desenvolvimento de preview features, introduzindo **Text Blocks** para strings multilinha e aprimorando Switch Expressions com a palavra-chave `yield`.

## 💡 JEPs Principais
Java 13 incluiu 5 JEPs, focando em preview features e melhorias de performance.

---

## 📝 Melhorias na Linguagem

### 🔹 JEP 355: Text Blocks (Preview)

#### ❓ O que é?
Strings multilinha sem necessidade de escape, mantendo formatação natural.

#### ⚠️ Por que é importante?
Elimina concatenação verbosa e escapes para HTML, SQL, JSON e outros formatos estruturados.

```java
// Antes - verboso e difícil de ler
String html = "<html>\n" +
              "    <body>\n" +
              "        <h1>Hello World!</h1>\n" +
              "        <p>Welcome to Java 13</p>\n" +
              "    </body>\n" +
              "</html>";

// Java 13 - Text Block limpo
String html = """
    <html>
        <body>
            <h1>Hello World!</h1>
            <p>Welcome to Java 13</p>
        </body>
    </html>
    """;

// SQL complexo
String sql = """
    SELECT u.id, u.name, u.email, p.title
    FROM users u
    INNER JOIN posts p ON u.id = p.user_id
    WHERE u.active = true
      AND p.published_date > '2019-01-01'
    ORDER BY u.name, p.published_date DESC
    """;

// JSON templates
String json = """
    {
        "name": "%s",
        "age": %d,
        "active": %b,
        "addresses": [
            {
                "type": "home",
                "street": "%s"
            }
        ]
    }
    """.formatted(name, age, active, street);
```

### 🔹 JEP 354: Switch Expressions (2nd Preview)

#### ❓ O que é?
Aprimoramento do Switch Expressions com palavra-chave `yield` para casos complexos.

#### ⚠️ Por que é importante?
Permite lógica complexa em switch expressions mantendo retorno de valor.

```java
// yield para casos complexos
String dayType = switch (day) {
    case "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY" -> {
        System.out.println("Weekday: " + day);
        yield "Working day";
    }
    case "FRIDAY" -> {
        System.out.println("TGIF!");
        yield "Last work day";
    }
    case "SATURDAY", "SUNDAY" -> {
        System.out.println("Weekend: " + day);
        yield "Rest day";
    }
    default -> {
        System.out.println("Invalid day: " + day);
        yield "Unknown";
    }
};

// Exemplo prático: calculadora
int calculate(String operation, int a, int b) {
    return switch (operation) {
        case "+" -> a + b;
        case "-" -> a - b;
        case "*" -> a * b;
        case "/" -> {
            if (b == 0) throw new ArithmeticException("Division by zero");
            yield a / b;
        }
        default -> throw new IllegalArgumentException("Unknown operation: " + operation);
    };
}
```

---

## 🗑️ Garbage Collection

### 🔹 JEP 351: ZGC: Uncommit Unused Memory

#### ❓ O que é?
ZGC agora retorna memória não utilizada ao sistema operacional.

```bash
# ZGC com memory uncommitting
java -XX:+UnlockExperimentalVMOptions \
     -XX:+UseZGC \
     -XX:ZUncommitDelay=5 \
     MyApplication
```

---

## 🚀 Performance

### 🔹 JEP 350: Dynamic CDS Archives

#### ❓ O que é?
Permite criar arquivos CDS dinamicamente durante execução da aplicação.

```bash
# Criar CDS dinâmico
java -XX:ArchiveClassesAtExit=app.jsa MyApp

# Usar CDS dinâmico
java -XX:SharedArchiveFile=app.jsa MyApp
```

---

## 🎯 Impacto

Java 13 **consolidou preview features**:

- ✅ **Text Blocks** simplificaram strings complexas
- ✅ **Switch yield** permitiu lógica complexa em expressions
- ✅ **ZGC melhorado** com memory management
- ✅ **Dynamic CDS** melhorou startup performance

---

## 📅 Informações da Versão

- **📅 Lançamento**: 17 de setembro de 2019
- **🔧 Tipo**: Feature Release
- **⚡ Suporte**: Terminado em março de 2020
- **🎯 Status**: Preview features importantes (Text Blocks)

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 13 Documentation](https://docs.oracle.com/en/java/javase/13/)
- [All JEPs in Java 13](https://openjdk.org/projects/jdk/13/)

### 🎯 **Text Blocks**
- [JEP 355: Text Blocks](https://openjdk.org/jeps/355)
- [Text Blocks Tutorial](https://www.baeldung.com/java-text-blocks)

### 💻 **Exemplos**
- [Java 13 Features](https://www.baeldung.com/java-13-new-features)
- [Switch Expressions Guide](https://mkyong.com/java/java-13-switch-expressions/) 
