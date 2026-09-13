---
title: "Java 10 — Inferência de Tipos e Performance"
published: 2026-08-20
description: "Cada novidade do Java 10 (2018) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java]
category: Java
cover: /covers/java/java-10.svg
draft: false
---

## 📖 Sobre o Java 10

Java 10 foi o primeiro release no novo ciclo de 6 meses, lançado apenas 6 meses após o Java 9. Embora menor em escopo, trouxe uma das funcionalidades mais aguardadas pelos desenvolvedores: **Local Variable Type Inference** com a palavra-chave `var`.

## 💡 O que são JEPs?
Java 10 incluiu 12 JEPs focados principalmente em melhorias de performance, developer experience e preparação para funcionalidades futuras.

---

## 🎯 Melhorias na Linguagem

### 🔹 JEP 286: Local Variable Type Inference

#### ❓ O que é?
Permite que o compilador infira automaticamente o tipo de variáveis locais usando a palavra-chave `var`, similar ao que existe em C# e outras linguagens modernas.

#### ⚠️ Por que é importante?
Reduz verbosidade do código Java, especialmente com tipos genéricos complexos, tornando o código mais legível e mantendo a type safety em tempo de compilação.

```java
// Antes do Java 10 - Verboso com tipos longos
List<String> nomes = new ArrayList<String>();
Map<String, List<Person>> pessoasPorCidade = new HashMap<String, List<Person>>();
Iterator<Entry<String, Integer>> iterator = map.entrySet().iterator();

// Java 10 - Mais limpo com var
var nomes = new ArrayList<String>();           // List<String> inferido
var pessoasPorCidade = new HashMap<String, List<Person>>(); // Map<String, List<Person>>
var iterator = map.entrySet().iterator();      // Iterator<Entry<String, Integer>>

// Casos simples
var nome = "João Silva";        // String
var idade = 30;                 // int
var salario = 5500.50;         // double
var ativo = true;              // boolean

// Com Streams - elimina types complexos
var nomesComJ = List.of("Ana", "João", "Maria", "José")
    .stream()
    .filter(s -> s.startsWith("J"))
    .map(String::toUpperCase)
    .collect(Collectors.toList());  // List<String> inferido

// Diamond operator fica mais limpo
var pessoas = new ArrayList<Person>();
var cache = new ConcurrentHashMap<String, Object>();

// Com try-with-resources
try (var scanner = new Scanner(System.in);
     var writer = Files.newBufferedWriter(path)) {
    // código aqui
}
```

#### ⚠️ Limitações e Regras do var

```java
public class VarExamples {
    // ❌ NÃO funciona em:
    
    // 1. Campos de classe
    // var campoDeClasse = "erro";  // ERRO
    
    // 2. Parâmetros de método
    // public void metodo(var param) { }  // ERRO
    
    // 3. Tipo de retorno
    // public var metodo() { return "erro"; }  // ERRO
    
    // 4. Sem inicialização
    public void exemplos() {
        // var sem_valor;  // ERRO - precisa de inicialização
        
        // 5. Inicialização com null
        // var nulo = null;  // ERRO - tipo não pode ser inferido
        
        // 6. Lambdas precisam de contexto
        // var lambda = () -> "test";  // ERRO
        // var lambda = (String s) -> s.toUpperCase();  // ERRO
        
        // ✅ Mas funciona com:
        Function<String, String> func = s -> s.toUpperCase();
        var lambda = func;  // OK - tipo Function<String, String> inferido
        
        // 7. Array precisa de tipo explícito no lado direito
        // var array = {1, 2, 3};  // ERRO
        var array = new int[]{1, 2, 3};  // OK
        
        // 8. Expressões polimórficas precisam de cast
        var number = (Number) 42;  // OK - sem cast seria int
    }
}
```

#### 🎯 Boas Práticas com var

```java
// ✅ BOM: Quando o tipo é óbvio do lado direito
var path = Paths.get("arquivo.txt");
var date = LocalDate.now();
var users = userService.findAllUsers();

// ✅ BOM: Com tipos genéricos complexos
var complexMap = new HashMap<String, List<Map<String, Object>>>();

// ❌ EVITAR: Quando o tipo não é claro
var data = getData();        // Que tipo retorna getData()?
var result = process();      // Não fica claro o tipo

// ✅ MELHOR: Seja explícito quando necessário
UserDto userData = getData();
ProcessResult result = process();

// ✅ BOM: Em loops for-each
for (var person : pessoas) {
    System.out.println(person.getName());
}

// ✅ BOM: Com APIs fluentes
var result = Optional.of("test")
    .map(String::toUpperCase)
    .filter(s -> s.length() > 3)
    .orElse("default");
```

#### 🔍 Verificando Tipos Inferidos

```java
// No IDE ou compilação, você pode verificar que tipo foi inferido
var list = new ArrayList<String>();
// Hover no IDE mostra: ArrayList<String>

var stream = list.stream()
    .filter(s -> s.startsWith("A"))
    .map(String::toUpperCase);
// Tipo inferido: Stream<String>
```

📚 **Saiba mais**: [Local Variable Type Inference Guide](https://openjdk.org/jeps/286)

---

## 🗑️ Melhorias no Garbage Collection

### 🔹 JEP 307: Parallel Full GC para G1

#### ❓ O que é?
Melhora o G1 Garbage Collector implementando Full GC paralelo, reduzindo o tempo de pausas longas.

#### ⚠️ Por que é importante?
Antes, o G1 usava single-threaded full GC como fallback, causando pausas muito longas. Agora usa parallel full GC, melhorando significativamente a performance.

```bash
# G1GC com parallel full GC (padrão no Java 10+)
java -XX:+UseG1GC MyApplication

# Verificar configurações do G1
java -XX:+UseG1GC -XX:+PrintGCDetails MyApplication

# Tuning típico do G1
java -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \
     -XX:G1HeapRegionSize=16m \
     MyApplication
```

### 🔹 JEP 317: Experimental Garbage Collectors

#### ❓ O que é?
Introduz Epsilon GC, um garbage collector "no-op" que aloca memória mas nunca coleta.

#### ⚠️ Por que é importante?
Útil para testes de performance, aplicações de vida curta, ou quando você quer medir overhead do GC.

```bash
# Epsilon GC - sem coleta de lixo
java -XX:+UnlockExperimentalVMOptions \
     -XX:+UseEpsilonGC \
     MyShortLivedApp

# Útil para:
# - Benchmarks de performance
# - Aplicações que sabem que não precisam de GC
# - Testes de vazamento de memória
```

---

## 🚀 Performance e JVM

### 🔹 JEP 310: Application Class-Data Sharing

#### ❓ O que é?
Estende CDS (Class Data Sharing) para permitir compartilhar metadados de classes de aplicação, não apenas classes do sistema.

#### ⚠️ Por que é importante?
Reduz tempo de startup e footprint de memória ao compartilhar dados de classes entre múltiplas JVMs.

```bash
# 1. Criar lista de classes para CDS
java -XX:+UseAppCDS \
     -XX:DumpLoadedClassList=classes.lst \
     MyApplication

# 2. Criar arquivo CDS
java -XX:+UseAppCDS \
     -Xshare:dump \
     -XX:SharedClassListFile=classes.lst \
     -XX:SharedArchiveFile=app-cds.jsa \
     -cp myapp.jar

# 3. Usar CDS em produção
java -XX:+UseAppCDS \
     -Xshare:on \
     -XX:SharedArchiveFile=app-cds.jsa \
     -cp myapp.jar MyApplication

# Benefícios:
# - Startup 20-30% mais rápido
# - 10-15% menos uso de memória
# - Especialmente útil em containers/microservices
```

### 🔹 JEP 312: Thread-Local Handshakes

#### ❓ O que é?
Permite executar callbacks em threads específicas sem parar todas as threads em uma parada global.

#### ⚠️ Por que é importante?
Melhora latência reduzindo pause times, especialmente importante para aplicações de baixa latência.

```java
// Transparente para desenvolvedores - melhoria interna da JVM
// Beneficia operações como:
// - Biased locking revocation
// - Stack sampling
// - Algumas operações de debug/profiling

// Antes: Para todas as threads
// Agora: Para apenas threads específicas quando necessário
```

---

## 📚 Melhorias em APIs

### 🔹 JEP 296: Consolidar Repositórios JDK

#### ❓ O que é?
Consolida repositórios do OpenJDK em um único repositório para facilitar desenvolvimento.

### 🔹 Optional.orElseThrow() sem parâmetros

#### ❓ O que é?
Adiciona método `orElseThrow()` sem parâmetros ao Optional, equivalente a `get()` mas mais expressivo.

#### ⚠️ Por que é importante?
Torna o código mais expressivo sobre a intenção de que se espera um valor presente.

```java
Optional<String> nome = findUserName(id);

// Java 8-9: verboso ou confuso
String valor1 = nome.get();  // Confuso - pode dar exceção
String valor2 = nome.orElseThrow(NoSuchElementException::new);  // Verboso

// Java 10: expressivo e conciso
String valor3 = nome.orElseThrow();  // Claro que pode lançar exceção

// Exemplo prático
public User findUserById(Long id) {
    return userRepository.findById(id)
        .orElseThrow();  // NoSuchElementException se não encontrar
}

// Com mensagem customizada (ainda melhor)
public User findUserByIdWithMessage(Long id) {
    return userRepository.findById(id)
        .orElseThrow(() -> new UserNotFoundException("User not found: " + id));
}
```

### 🔹 Collectors.toUnmodifiable*()

#### ❓ O que é?
Novos collectors que retornam coleções imutáveis diretamente.

#### ⚠️ Por que é importante?
Elimina necessidade de wrap com `Collections.unmodifiable*()` após coletar.

```java
// Antes do Java 10
List<String> imutavelAntes = pessoas.stream()
    .map(Person::getName)
    .collect(Collectors.toList());
imutavelAntes = Collections.unmodifiableList(imutavelAntes);  // Wrap necessário

// Java 10 - direto
List<String> imutavel = pessoas.stream()
    .map(Person::getName)
    .collect(Collectors.toUnmodifiableList());

Set<String> emails = pessoas.stream()
    .map(Person::getEmail)
    .collect(Collectors.toUnmodifiableSet());

Map<String, Integer> idades = pessoas.stream()
    .collect(Collectors.toUnmodifiableMap(
        Person::getName, 
        Person::getAge
    ));

// Tentativa de modificação resulta em UnsupportedOperationException
// imutavel.add("novo");  // ❌ Erro em runtime
```

### 🔹 List.copyOf(), Set.copyOf(), Map.copyOf()

#### ❓ O que é?
Métodos estáticos para criar cópias imutáveis de coleções existentes.

#### ⚠️ Por que é importante?
Forma segura de criar cópias imutáveis, lidando corretamente com coleções já imutáveis.

```java
List<String> original = Arrays.asList("a", "b", "c");
List<String> copia = List.copyOf(original);  // Cópia imutável

// Otimização inteligente: se original já for imutável, retorna a mesma instância
List<String> jaImutavel = List.of("x", "y", "z");
List<String> "copia"2 = List.copyOf(jaImutavel);  // Retorna a mesma instância!
System.out.println(jaImutavel == copia2);  // true - mesma referência

// Funciona com qualquer Collection
Set<String> conjuntoOriginal = new HashSet<>(Arrays.asList("1", "2", "3"));
Set<String> conjuntoCopia = Set.copyOf(conjuntoOriginal);  // Imutável

Map<String, Integer> mapaOriginal = new HashMap<>();
mapaOriginal.put("a", 1);
mapaOriginal.put("b", 2);
Map<String, Integer> mapaCopia = Map.copyOf(mapaOriginal);  // Imutável

// Null safety - elementos null causam NullPointerException
List<String> comNull = Arrays.asList("a", null, "c");
// List<String> erro = List.copyOf(comNull);  // ❌ NullPointerException
```

---

## 🔧 Outras Melhorias

### 🔹 JEP 313: Remove the Native-Header Generation Tool (javah)

#### ❓ O que é?
Remove a ferramenta `javah` que foi substituída por `javac -h`.

```bash
# Antes: javah
javah -jni MyClass

# Agora: javac com -h
javac -h . MyClass.java
```

### 🔹 JEP 314: Additional Unicode Language-Tag Extensions

#### ❓ O que é?
Suporte adicional para Unicode Language-Tag Extensions.

### 🔹 JEP 316: Heap Allocation on Alternative Memory Devices

#### ❓ O que é?
Permite alocar heap em dispositivos de memória alternativos (como NV-DIMM).

```bash
# Usar memória alternativa para heap
java -XX:AllocateHeapAt=/mnt/nvdimm MyApplication
```

---

## 🎯 Impacto e Adoção

Java 10 estabeleceu o **novo ritmo de releases**:

- ✅ **`var` keyword** reduziu verbosidade significativamente
- ✅ **Performance melhorada** com G1 parallel full GC
- ✅ **Startup mais rápido** com Application CDS
- ✅ **Novo modelo de release** de 6 meses funciona
- ✅ **Base para inovações** futuras nos releases seguintes

---

## 📅 Informações da Versão

- **📅 Lançamento**: 20 de março de 2018
- **🔧 Tipo**: Feature Release
- **⚡ Suporte**: Terminado em setembro de 2018 
- **🎯 Status**: Primeiro release no ciclo de 6 meses
- **🔄 Migração**: Fácil - principalmente additive features

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 10 Documentation](https://docs.oracle.com/javase/10/)
- [Java 10 API Specification](https://docs.oracle.com/javase/10/docs/api/)
- [All JEPs in Java 10](https://openjdk.org/projects/jdk/10/)

### 🎯 **Local Variable Type Inference**
- [JEP 286: Local-Variable Type Inference](https://openjdk.org/jeps/286)
- [var keyword style guide](https://openjdk.org/projects/amber/guides/lvti-style-guide)
- [Local Variable Type Inference FAQ](https://openjdk.org/projects/amber/guides/lvti-faq)

### 🗑️ **Garbage Collection**
- [G1 Garbage Collector](https://docs.oracle.com/javase/10/gctuning/garbage-first-garbage-collector.htm)
- [Epsilon GC Documentation](https://openjdk.org/jeps/318)
- [Application Class Data Sharing](https://openjdk.org/jeps/310)

### 💻 **Exemplos e Guias**
- [Java 10 var examples](https://www.baeldung.com/java-10-local-variable-type-inference)
- [Migration Guide to Java 10](https://blog.codefx.org/java/java-10-guide/)
- [Performance improvements in Java 10](https://www.optaplanner.org/blog/2018/07/03/JavaGCtuningAndSpeedTransitions.html) 
