---
title: "Java 23 — o que mudou"
published: 2025-07-02T02:30:00Z
description: "Cada novidade do Java 23 (2024) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java]
series: java
cover: /covers/java/java-23.svg
draft: false
---

## 🚀 Java 23 - Primitive Types in Patterns

Java 23 trouxe pattern matching para tipos primitivos como preview.

---

## ⭐ Principais Novidades

### 🔹 Primitive Types in Patterns (Preview)

#### ❓ O que é?
Pattern matching funcionando com tipos primitivos diretamente.

#### 💡 Exemplo Simples
```java
// Pattern matching com primitivos
Object value = 42;
switch (value) {
    case int i when i > 0 -> "Positive: " + i;
    case int i -> "Zero or negative: " + i;
    case double d -> "Double: " + d;
    case String s -> "String: " + s;
    default -> "Other type";
}
```

### 🔹 Structured Concurrency (Preview)

Melhorias na API de concorrência estruturada.

### 🔹 Vector API (Sixth Incubator)

Continuação do desenvolvimento da Vector API.

📚 **Saiba mais**: [Primitive Patterns JEP](https://openjdk.org/jeps/455)

---

## 📅 Informações da Versão

- **📅 Lançamento**: Setembro de 2024
- **🔧 Tipo**: Feature Release
- **⚡ Suporte**: Atual
- **🎯 Status**: Versão mais recente disponível 
