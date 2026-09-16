---
title: "Java 25 (LTS) — Guia das Principais Novidades"
published: 2025-07-02T02:50:00Z
description: "Cada novidade do Java 25 (2025) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java, LTS]
series: java
cover: /covers/java/java-25.svg
draft: false
---

## 📖 Sobre o Java 25

O Java 25 é a próxima versão **LTS (Long-Term Support)** da plataforma Java, com lançamento previsto para **setembro de 2025**. Como versão LTS, receberá suporte e atualizações por pelo menos 8 anos, tornando-se ideal para aplicações empresariais.

## 💡 O que são JEPs?
JEPs (Java Enhancement Proposals) são propostas formais de melhorias na plataforma Java. Cada recurso novo passa por fases:
- **Preview**: Disponível para testes, pode mudar
- **Incubator**: API experimental
- **Final**: Estável e permanente

---

## ⭐ Melhorias na Linguagem

### 🔹 JEP 507: Pattern Matching com Tipos Primitivos (Preview)

#### ❓ O que é?
Até o Java 24, pattern matching funcionava apenas com tipos de referência (objetos). Agora, você pode usar `instanceof` e `switch` diretamente com tipos primitivos como `int`, `double`, etc.

#### ⚠️ Por que é importante?
Elimina a necessidade de boxing/unboxing manual e torna o código mais limpo e intuitivo, especialmente ao trabalhar com APIs que retornam `Object`.

```java
// Antes do Java 25
Object value = getValueFromAPI();
if (value instanceof Integer) {
    Integer i = (Integer) value;
    System.out.println("Valor: " + i);
}

// Java 25 - Direto com primitivos
if (value instanceof int i) {
    System.out.println("Valor: " + i);  // i já é int, não Integer
}

// Switch aprimorado
Object processValue(Object value) {
    return switch (value) {
        case int i when i > 0    -> "Positivo: " + i;
        case int i               -> "Negativo ou zero: " + i;
        case double d            -> "Decimal: " + d;
        case String s            -> "Texto: " + s;
        case null                -> "Valor nulo";
        default                  -> "Tipo não suportado";
    };
}
```

#### 🧠 Conversões Inteligentes
O Java 25 verifica se conversões causariam perda de dados:

```java
Object num = 42;
switch (num) {
    case byte b -> // Funciona! 42 cabe em byte (-128 a 127)
        System.out.println("Byte: " + b);
}

Object big = 1000;
switch (big) {
    case byte b -> // Não executa - 1000 > 127
        System.out.println("Byte: " + b);
    case int i ->  // Este caso executa
        System.out.println("Int: " + i);
}
```

### 🔹 JEP 511: Import de Módulos (Preview)

#### ❓ O que é?
Permite importar todas as classes públicas de um módulo com uma única declaração, similar ao `import *` de outras linguagens.

#### ⚠️ Por que é importante?
Reduz drasticamente o número de imports em arquivos Java, especialmente útil para prototipagem e scripts.

```java
// Antes - arquivo cheio de imports
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.stream.Stream;
import java.util.stream.Collectors;
// ... pode chegar a 50+ imports

// Java 25 - um único import de módulo
import module java.base;

public class DataProcessor {
    // Todas as classes de java.base disponíveis
    Map<String, List<String>> processData(List<String> items) {
        return items.stream()
            .collect(Collectors.groupingBy(s -> s.substring(0, 1)));
    }
}
```

#### 🤝 Resolvendo Conflitos
Quando há classes com mesmo nome em módulos diferentes:

```java
import module java.base;     // contém java.util.List
import module java.desktop;  // contém java.awt.List

// Resolver ambiguidade com import específico
import java.util.List;  // Este "ganha"

List<String> strings = new ArrayList<>();  // usa java.util.List
```

### 🔹 JEP 512: Arquivos Fonte Compactos (Final)

#### ❓ O que é?
Permite escrever programas Java sem declarar uma classe explicitamente. O compilador cria uma classe implícita automaticamente.

#### ⚠️ Por que é importante?
Torna Java mais acessível para iniciantes e perfeito para scripts simples, competindo com linguagens como Python e JavaScript em simplicidade.

```java
// HelloWorld.java - Sem class, sem public static!
void main() {
    println("Hello, World!");  // println já importado
}

// Pode adicionar métodos e campos
String nome = "Java 25";
int versao = 25;

void main() {
    println("Bem-vindo ao " + nome);
    mostrarInfo();
}

void mostrarInfo() {
    println("Versão: " + versao);
    var entrada = readln("Digite algo: ");  // readln também disponível
    println("Você digitou: " + entrada);
}
```

#### 🤖 Recursos Automáticos
- Import automático de `java.io.IO.*` (print, println, readln)
- Import automático de todo `java.base`
- Não precisa de `public`, `static`, ou `String[] args`

### 🔹 JEP 513: Construtores Flexíveis (Final)

#### ❓ O que é?
Remove a restrição de que `super()` ou `this()` deve ser a primeira linha do construtor, permitindo validação e preparação de dados antes.

#### ⚠️ Por que é importante?
Evita construção de objetos inválidos e permite código mais defensivo, especialmente importante em hierarquias de classes.

```java
// Antes do Java 25 - limitado
class Employee extends Person {
    public Employee(String name, int age, String dept) {
        super(name, age);  // DEVE ser primeiro
        // Validação só depois - tarde demais se super() falhar
        if (age < 18) {
            throw new IllegalArgumentException("Menor de idade");
        }
    }
}

// Java 25 - flexível e seguro
class Employee extends Person {
    private final String department;
    
    public Employee(String name, int age, String dept) {
        // Validar ANTES de construir
        Objects.requireNonNull(name, "Nome obrigatório");
        if (age < 18) {
            throw new IllegalArgumentException("Menor de idade");
        }
        
        // Preparar dados
        var normalizedName = name.trim().toUpperCase();
        
        // Agora sim, construir
        super(normalizedName, age);
        this.department = dept;
    }
}
```

---

## 🧵 APIs de Concorrência

### 🔹 JEP 506: Scoped Values (Final)

#### ❓ O que é?
Uma alternativa moderna ao `ThreadLocal` que é mais segura, eficiente e adequada para Virtual Threads. Valores são imutáveis e automaticamente removidos ao sair do escopo.

#### ⚠️ Por que é importante?
`ThreadLocal` tem problemas de memory leak e não escala bem com milhões de Virtual Threads. Scoped Values resolvem esses problemas.

```java
// Declaração
public class SecurityContext {
    static final ScopedValue<User> CURRENT_USER = ScopedValue.newInstance();
    
    // Uso - valor existe apenas dentro do escopo
    public void processRequest(User user, Runnable task) {
        ScopedValue.where(CURRENT_USER, user)
            .run(task);  // user disponível durante task
        // user automaticamente removido aqui
    }
    
    // Acesso em qualquer ponto do call stack
    public static void checkPermission(String resource) {
        User user = CURRENT_USER.get();
        if (user == null || !user.hasPermission(resource)) {
            throw new AccessDeniedException();
        }
    }
}
```

#### ✅ Vantagens sobre ThreadLocal
- **Imutável**: Não pode ser alterado após definido
- **Bounded**: Automaticamente limpo ao sair do escopo
- **Eficiente**: Otimizado para Virtual Threads
- **Seguro**: Sem riscos de vazamento de memória

### 🔹 JEP 505: Structured Concurrency (5º Preview)

#### ❓ O que é?
Uma nova forma de trabalhar com múltiplas threads que as trata como uma unidade estruturada, similar a como tratamos blocos de código com try-with-resources.

#### ⚠️ Por que é importante?
Torna código concorrente mais fácil de entender e manter, garantindo que threads relacionadas sejam gerenciadas juntas.

```java
// Exemplo básico - buscar dados em paralelo
public UserProfile getUserProfile(Long userId) throws Exception {
    try (var scope = StructuredTaskScope.open()) {
        // Lançar tarefas paralelas
        var userTask = scope.fork(() -> userService.findUser(userId));
        var ordersTask = scope.fork(() -> orderService.findOrders(userId));
        var prefsTask = scope.fork(() -> prefsService.findPreferences(userId));
        
        // Aguardar todas completarem
        scope.join();
        
        // Obter resultados - garantido sem exceções perdidas
        return new UserProfile(
            userTask.get(),
            ordersTask.get(),
            prefsTask.get()
        );
    }
    // Qualquer tarefa não finalizada é cancelada automaticamente
}
```

#### 🎯 Políticas Especializadas

```java
// ShutdownOnFailure - cancela todas se uma falhar
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var task1 = scope.fork(() -> riskyOperation1());
    var task2 = scope.fork(() -> riskyOperation2());
    
    scope.join()
         .throwIfFailed();  // Lança exceção se alguma falhou
    
    // Só chega aqui se AMBAS tiveram sucesso
    processResults(task1.get(), task2.get());
}

// ShutdownOnSuccess - retorna o primeiro que completar
try (var scope = new StructuredTaskScope.ShutdownOnSuccess<String>()) {
    scope.fork(() -> slowDatabase.query());
    scope.fork(() -> fastCache.get());
    scope.fork(() -> mediumSpeedAPI.fetch());
    
    scope.join();
    
    return scope.result();  // Retorna o mais rápido
}
```

### 🔹 JEP 502: Stable Value API (Preview)

#### ❓ O que é?
Uma API para valores que são inicializados uma única vez de forma lazy (preguiçosa) e thread-safe, sem necessidade de sincronização manual.

#### ⚠️ Por que é importante?
Simplifica padrões comuns de inicialização preguiçosa, eliminando código boilerplate e potenciais bugs de concorrência.

```java
public class ConfigManager {
    // Valor estável - inicializado uma vez quando necessário
    private final StableValue<Configuration> config = StableValue.of();
    
    public Configuration getConfig() {
        // Inicializa na primeira chamada, retorna o mesmo nas próximas
        return config.orElseSet(() -> {
            // Código de inicialização executado apenas uma vez
            return loadConfigFromFile();
        });
    }
}

// Uso em singleton thread-safe
public class DatabaseConnection {
    private static final StableValue<DatabaseConnection> INSTANCE = StableValue.of();
    
    public static DatabaseConnection getInstance() {
        return INSTANCE.orElseSet(DatabaseConnection::new);
    }
}
```

---

## ⚡ Performance e Otimizações

### 🔹 JEP 508: Vector API (10º Incubator)

#### ❓ O que é?
API que permite usar instruções SIMD (Single Instruction, Multiple Data) do processador para processar múltiplos dados em paralelo.

#### ⚠️ Por que é importante?
Oferece ganhos de performance de 5-15x para operações matemáticas intensivas, essencial para IA, processamento de imagem e computação científica.

```java
// Exemplo: Multiplicar dois arrays
public void multiplyArrays(float[] a, float[] b, float[] result) {
    var species = FloatVector.SPECIES_PREFERRED;
    
    // Loop vetorizado - processa vários elementos por vez
    int i = 0;
    for (; i < species.loopBound(a.length); i += species.length()) {
        FloatVector va = FloatVector.fromArray(species, a, i);
        FloatVector vb = FloatVector.fromArray(species, b, i);
        va.mul(vb).intoArray(result, i);
    }
    
    // Processar elementos restantes
    for (; i < a.length; i++) {
        result[i] = a[i] * b[i];
    }
}
```

#### 🎨 Casos de Uso
- Machine Learning e IA
- Processamento de imagem e vídeo
- Simulações científicas
- Análise de dados em larga escala

### 🔹 JEP 521: Shenandoah GC Geracional (Final)

#### ❓ O que é?
O Shenandoah é um coletor de lixo que trabalha concorrentemente com a aplicação. A versão geracional separa objetos jovens e velhos para maior eficiência.

#### ⚠️ Por que é importante?
Permite pausas extremamente baixas (menor que 5ms) mesmo com heaps enormes (100GB+), ideal para aplicações que exigem baixa latência.

```bash
# Ativar Shenandoah Geracional
java -XX:+UseShenandoahGC \
     -XX:+ShenandoahGenerational \
     -XX:MaxGCPauseMillis=10 \
     -Xmx32g \
     MyApplication
```

#### 🎁 Benefícios
- Pausas menores que 5ms consistentemente
- Funciona bem com heaps de 1GB a 1TB+
- Ideal para: trading, games, streaming, APIs de baixa latência

### 🔹 JEP 519: Compact Object Headers (Preview)

#### ❓ O que é?
Reduz o overhead de memória de cada objeto Java de 12-16 bytes para apenas 8 bytes.

#### ⚠️ Por que é importante?
Em aplicações com milhões de objetos pequenos, pode economizar 20-30% de memória.

```bash
# Ativar headers compactos
java -XX:+UseCompactObjectHeaders MyApp

# Exemplo de economia:
# ArrayList com 1M de Integer
# Antes: ~20MB (16 bytes/objeto)
# Depois: ~16MB (8 bytes/objeto)
# Economia: 4MB (20%)
```

---

## 🔒 Segurança e Criptografia

### 🔹 JEP 510: API de Derivação de Chaves (Final)

#### ❓ O que é?
API nativa para derivação segura de chaves criptográficas a partir de senhas, incluindo suporte para PBKDF2.

#### ⚠️ Por que é importante?
Padroniza e simplifica a implementação de autenticação segura, seguindo as melhores práticas da indústria.

```java
// Criar hash seguro de senha
public byte[] hashPassword(String password, byte[] salt) 
        throws GeneralSecurityException {
    
    SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
    
    PBEKeySpec spec = new PBEKeySpec(
        password.toCharArray(),
        salt,
        120_000,  // iterações (OWASP 2024)
        256       // bits de saída
    );
    
    SecretKey key = factory.generateSecret(spec);
    return key.getEncoded();
}

// Verificar senha
public boolean verifyPassword(String password, byte[] salt, byte[] hash) 
        throws GeneralSecurityException {
    
    byte[] calculatedHash = hashPassword(password, salt);
    return MessageDigest.isEqual(calculatedHash, hash);  // Comparação segura
}
```

### 🔹 JEP 470: Suporte PEM (Preview)

#### ❓ O que é?
Suporte nativo para ler e escrever certificados e chaves no formato PEM, amplamente usado em HTTPS/TLS.

#### ⚠️ Por que é importante?
Elimina a necessidade de bibliotecas externas como BouncyCastle para operações básicas com certificados.

```java
// Carregar certificado PEM
CertificateFactory cf = CertificateFactory.getInstance("X.509");
try (var input = Files.newInputStream(Path.of("server.crt"))) {
    X509Certificate cert = (X509Certificate) cf.generateCertificate(input);
}

// Carregar chave privada
KeyFactory kf = KeyFactory.getInstance("RSA");
String pemKey = Files.readString(Path.of("server.key"));
byte[] keyBytes = PEMDecoder.decode(pemKey);  // Nova API
PrivateKey privateKey = kf.generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
```

---

## 🔧 Mudanças Técnicas

### 🔹 JEP 503: Remoção do Suporte 32-bit

Java 25 suporta apenas sistemas 64-bit. Aplicações 32-bit precisam usar Java 21 LTS ou anterior.

### 🔹 JEP 509: CPU Profiling Aprimorado (Experimental)

Java Flight Recorder agora oferece profiling de CPU mais detalhado:

```bash
java -XX:StartFlightRecording=cpu-profiling=detailed,filename=profile.jfr MyApp
```

## 🔹 Outras Melhorias

- **JEP 514**: CLI simplificada para AOT (Ahead-of-Time compilation)
- **JEP 515**: Profiling por método em AOT
- **JEP 518**: Sampling cooperativo no JFR
- **JEP 520**: Method-level tracing

---

## 🛠️ Como Usar

#### 🧪 Habilitando Features Preview

```bash
# Compilar com preview
javac --enable-preview --release 25 MyApp.java

# Executar com preview
java --enable-preview MyApp

# Maven
<configuration>
    <release>25</release>
    <compilerArgs>
        <arg>--enable-preview</arg>
    </compilerArgs>
</configuration>
```

#### 🔬 Módulos Incubator

```bash
# Para Vector API
java --add-modules jdk.incubator.vector MyApp
```

---

## 📅 Cronograma

- **Setembro 2025**: Lançamento Java 25 LTS
- **Suporte até 2033+**: Mínimo 8 anos de atualizações
- **Próxima LTS**: Java 29 (2028)

---

## 🎯 Resumo

Java 25 representa uma evolução significativa focada em:

1. **Modernização da Linguagem**: Pattern matching completo, imports simplificados
2. **Produtividade**: Arquivos compactos, construtores flexíveis
3. **Concorrência Moderna**: Scoped Values e Structured Concurrency
4. **Performance**: Vector API, GC aprimorado, headers compactos
5. **Segurança**: APIs nativas para criptografia moderna

É a versão LTS ideal para novos projetos e modernização de aplicações existentes.

---

📚 **Para saber mais**: [OpenJDK](https://openjdk.org) | [Inside Java](https://inside.java) | [JEPs](https://openjdk.org/jeps) 
