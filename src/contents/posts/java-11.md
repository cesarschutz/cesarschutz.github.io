---
title: "Java 11 (LTS) — A Nova Era do Java"
published: 2025-07-02T00:30:00Z
description: "Cada novidade do Java 11 (2018) explicada: o que é, por que importa e exemplos de código. Parte da série completa de atualizações do Java."
tags: [Java, LTS]
category: Java
cover: /covers/java/java-11.svg
draft: false
---

## 📖 Sobre o Java 11

Java 11 marcou um **divisor de águas** na história do Java, sendo a primeira versão LTS após o Java 8. Lançado em setembro de 2018, trouxe mudanças significativas como remoção de módulos legados, APIs modernas e melhorias de performance que definiram o rumo do Java moderno.

## 💡 O que são JEPs?
Java 11 incluiu 17 JEPs que modernizaram a plataforma, removeram tecnologias legadas e introduziram APIs que se tornaram essenciais no desenvolvimento Java atual.

---

## 🌐 APIs de Rede

### 🔹 JEP 321: HTTP Client (Standard API)

#### ❓ O que é?
API nativa moderna para requisições HTTP/1.1 e HTTP/2, substituindo a antiga `HttpURLConnection` e eliminando a necessidade de bibliotecas externas como Apache HttpClient.

#### ⚠️ Por que é importante?
Oferece uma API moderna, assíncrona e que suporta HTTP/2 out-of-the-box, reduzindo dependências externas e melhorando performance das aplicações.

```java
// HTTP GET básico
HttpClient client = HttpClient.newHttpClient();

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.github.com/users/octocat"))
    .header("Accept", "application/json")
    .timeout(Duration.ofSeconds(10))
    .build();

// Síncrono
HttpResponse<String> response = client.send(request, 
    HttpResponse.BodyHandlers.ofString());

System.out.println("Status: " + response.statusCode());
System.out.println("Body: " + response.body());

// Assíncrono com CompletableFuture
CompletableFuture<String> asyncResponse = client.sendAsync(request,
    HttpResponse.BodyHandlers.ofString())
    .thenApply(HttpResponse::body);

asyncResponse.thenAccept(System.out::println);
```

#### 🚀 HTTP/2 e Features Avançadas
```java
// Cliente HTTP/2 com configuração customizada
HttpClient client = HttpClient.newBuilder()
    .version(HttpClient.Version.HTTP_2)  // Preferir HTTP/2
    .connectTimeout(Duration.ofSeconds(20))
    .followRedirects(HttpClient.Redirect.NORMAL)
    .authenticator(Authenticator.getDefault())
    .build();

// POST com JSON
String json = """
    {
        "name": "João Silva",
        "age": 30,
        "email": "joao@example.com"
    }
    """;

HttpRequest postRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://httpbin.org/post"))
    .header("Content-Type", "application/json")
    .header("User-Agent", "MyApp/1.0")
    .POST(HttpRequest.BodyPublishers.ofString(json))
    .build();

// Múltiplas requisições assíncronas
List<CompletableFuture<String>> futures = List.of(
    "https://api.github.com/users/octocat",
    "https://api.github.com/users/torvalds",
    "https://api.github.com/users/gvanrossum"
).stream()
.map(url -> HttpRequest.newBuilder().uri(URI.create(url)).build())
.map(req -> client.sendAsync(req, HttpResponse.BodyHandlers.ofString()))
.map(future -> future.thenApply(HttpResponse::body))
.toList();

// Aguardar todas as respostas
CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
    .thenRun(() -> futures.forEach(f -> 
        f.thenAccept(System.out::println)));
```

#### 📁 Upload e Download de Arquivos
```java
// Upload de arquivo
Path uploadFile = Path.of("documento.pdf");
HttpRequest uploadRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://httpbin.org/post"))
    .header("Content-Type", "application/octet-stream")
    .POST(HttpRequest.BodyPublishers.ofFile(uploadFile))
    .build();

// Download para arquivo
HttpRequest downloadRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://httpbin.org/bytes/1024"))
    .build();

HttpResponse<Path> fileResponse = client.send(downloadRequest,
    HttpResponse.BodyHandlers.ofFile(Path.of("downloaded.bin")));

System.out.println("Arquivo salvo em: " + fileResponse.body());
```

📚 **Saiba mais**: [Java HTTP Client Guide](https://openjdk.org/groups/net/httpclient/intro.html)

---

## 📝 Melhorias em String

### 🔹 JEP 323: Novos Métodos String

#### ❓ O que é?
Adiciona métodos úteis à classe `String` para operações comuns que antes exigiam código verbose ou bibliotecas externas.

#### ⚠️ Por que é importante?
Simplifica manipulação de strings e melhora legibilidade do código, especialmente para processamento de texto e validações.

```java
// isBlank() - verifica se string está vazia ou contém apenas espaços
String vazia = "";
String espacos = "   ";
String conteudo = "  hello  ";

System.out.println(vazia.isBlank());     // true
System.out.println(espacos.isBlank());   // true
System.out.println(conteudo.isBlank());  // false

// Diferença entre isBlank() e isEmpty()
String apenasEspacos = "   ";
System.out.println(apenasEspacos.isEmpty());  // false
System.out.println(apenasEspacos.isBlank());  // true

// lines() - converte string multilinhas em Stream<String>
String multiline = """
    Primeira linha
    Segunda linha
    Terceira linha
    """;

List<String> linhas = multiline.lines()
    .filter(line -> !line.isBlank())
    .map(String::trim)
    .collect(Collectors.toList());

// Processamento de CSV simples
String csv = "João,30,São Paulo\nMaria,25,Rio de Janeiro\nPedro,35,Belo Horizonte";
csv.lines()
   .map(line -> line.split(","))
   .forEach(fields -> System.out.printf("Nome: %s, Idade: %s, Cidade: %s%n", 
                                        fields[0], fields[1], fields[2]));

// repeat() - repete string N vezes
String separator = "=".repeat(50);      // 50 caracteres =
String pattern = "Java ".repeat(3);     // "Java Java Java "
String indent = " ".repeat(4);          // 4 espaços para indentação

// Criando tabelas ASCII simples
System.out.println("+" + "-".repeat(20) + "+");
System.out.println("| " + "Nome".repeat(1) + " ".repeat(15) + "|");
System.out.println("+" + "-".repeat(20) + "+");

// strip(), stripLeading(), stripTrailing() - melhor que trim()
String textoComEspacos = "   hello world   ";
System.out.println("'" + textoComEspacos.strip() + "'");         // 'hello world'
System.out.println("'" + textoComEspacos.stripLeading() + "'");  // 'hello world   '
System.out.println("'" + textoComEspacos.stripTrailing() + "'"); // '   hello world'

// strip() vs trim() - diferença com caracteres Unicode
String unicodeSpaces = "\u2000\u2001hello\u2002\u2003";  // Unicode spaces
System.out.println("trim: '" + unicodeSpaces.trim() + "'");      // Não remove todos
System.out.println("strip: '" + unicodeSpaces.strip() + "'");    // Remove todos
```

#### 🛠️ Casos Práticos
```java
// Validação de formulários
public boolean isValidInput(String input) {
    return input != null && !input.isBlank();
}

// Processamento de logs
public void processLogFile(String logContent) {
    logContent.lines()
        .filter(line -> !line.isBlank())
        .filter(line -> line.contains("ERROR"))
        .forEach(this::handleError);
}

// Formatação de output
public void printSection(String title) {
    String border = "=".repeat(title.length() + 4);
    System.out.println(border);
    System.out.println("| " + title + " |");
    System.out.println(border);
}
```

📚 **Saiba mais**: [String API Enhancements](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/String.html)

---

## 📁 Melhorias em Arquivos

### 🔹 JEP 323: Files readString() e writeString()

#### ❓ O que é?
Métodos convenientes para ler e escrever arquivos de texto completos como String, eliminando boilerplate code.

#### ⚠️ Por que é importante?
Simplifica drasticamente operações comuns com arquivos de texto, reduzindo código de ~10 linhas para 1 linha.

```java
// Ler arquivo inteiro como String
try {
    String content = Files.readString(Path.of("config.properties"));
    System.out.println(content);
} catch (IOException e) {
    System.err.println("Erro ao ler arquivo: " + e.getMessage());
}

// Escrever String para arquivo
try {
    String config = """
        app.name=MyApplication
        app.version=1.0.0
        app.debug=true
        """;
    
    Files.writeString(Path.of("app.properties"), config);
    System.out.println("Arquivo salvo com sucesso!");
} catch (IOException e) {
    System.err.println("Erro ao escrever arquivo: " + e.getMessage());
}

// Com charset específico
Files.writeString(Path.of("utf8-file.txt"), "Acentuação: ção, ã, õ", 
    StandardCharsets.UTF_8);

// Com opções de escrita
Files.writeString(
    Path.of("log.txt"), 
    LocalDateTime.now() + ": Aplicação iniciada\n",
    StandardCharsets.UTF_8,
    StandardOpenOption.CREATE,
    StandardOpenOption.APPEND
);
```

#### 🔄 Casos Práticos
```java
// Configuração simples
public class ConfigManager {
    private final Path configFile = Path.of("app.config");
    
    public void saveConfig(Map<String, String> config) throws IOException {
        String content = config.entrySet().stream()
            .map(entry -> entry.getKey() + "=" + entry.getValue())
            .collect(Collectors.joining("\n"));
        
        Files.writeString(configFile, content);
    }
    
    public Map<String, String> loadConfig() throws IOException {
        return Files.readString(configFile)
            .lines()
            .filter(line -> line.contains("="))
            .map(line -> line.split("=", 2))
            .collect(Collectors.toMap(
                parts -> parts[0].trim(),
                parts -> parts[1].trim()
            ));
    }
}

// Template simples
public String generateHTML(String title, String content) throws IOException {
    String template = Files.readString(Path.of("template.html"));
    return template
        .replace("{{title}}", title)
        .replace("{{content}}", content);
}

// Backup de dados
public void backupData(Object data) throws IOException {
    String json = objectMapper.writeValueAsString(data);
    String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    Files.writeString(Path.of("backup-" + timestamp + ".json"), json);
}
```

📚 **Saiba mais**: [Files API Documentation](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/nio/file/Files.html)

---

## 🔧 Melhorias na Linguagem

### 🔹 JEP 323: Local-Variable Syntax for Lambda Parameters

#### ❓ O que é?
Permite usar `var` em parâmetros de lambda, principalmente para adicionar anotações que antes não eram possíveis.

#### ⚠️ Por que é importante?
Permite anotar parâmetros lambda sem perder a concisão da inferência de tipos, útil para validação e documentação.

```java
// Antes do Java 11 - não era possível anotar parâmetros lambda inferidos
list.stream()
    .map((@NonNull String s) -> s.toUpperCase())  // ❌ Erro - precisa especificar tipo
    .collect(Collectors.toList());

// Java 11 - usando var para permitir anotações
list.stream()
    .map((@NonNull var s) -> s.toUpperCase())     // ✅ Funciona!
    .collect(Collectors.toList());

// Exemplos práticos com validação
List<String> emails = List.of("user@example.com", "admin@site.org", "invalid-email");

// Validação com anotações
List<String> validEmails = emails.stream()
    .filter((@Valid var email) -> isValidEmail(email))  // Anotação para ferramentas
    .collect(Collectors.toList());

// Múltiplas anotações
BiFunction<String, String, String> concatenator = 
    (@NonNull var first, @NonNull var second) -> first + " " + second;

// Anotações personalizadas para logging/monitoring
list.stream()
    .filter((@Monitored var item) -> item.isActive())
    .map((@Traced var item) -> transform(item))
    .collect(Collectors.toList());
```

#### 🎯 Quando Usar var em Lambdas
```java
// ✅ BOM: Quando precisa de anotações
stream.map((@NonNull var s) -> s.toUpperCase())

// ❌ DESNECESSÁRIO: Quando não há anotações
stream.map((var s) -> s.toUpperCase())  // Preferir: s -> s.toUpperCase()

// ✅ BOM: Consistência quando alguns parâmetros precisam de anotação
BiFunction<String, String, String> func = 
    (@NonNull var a, var b) -> a + b;  // var em ambos para consistência
```

📚 **Saiba mais**: [Lambda Parameter Annotations](https://openjdk.org/jeps/323)

### 🔹 JEP 330: Launch Single-File Source-Code Programs

#### ❓ O que é?
Permite executar arquivos `.java` diretamente sem compilação explícita, útil para scripts e prototipagem rápida.

#### ⚠️ Por que é importante?
Torna Java mais acessível para scripts e testes rápidos, competindo com linguagens interpretadas para tarefas simples.

```java
// Arquivo: Hello.java
public class Hello {
    public static void main(String[] args) {
        if (args.length > 0) {
            System.out.println("Hello, " + args[0] + "!");
        } else {
            System.out.println("Hello, World!");
        }
    }
}
```

```bash
# Executar diretamente (sem javac)
$ java Hello.java
Hello, World!

$ java Hello.java João
Hello, João!

# Com classpaths (se necessário)
$ java -cp libs/*:. Script.java

# Passar propriedades do sistema
$ java -Dapp.env=dev Script.java
```

#### 🛠️ Scripts Úteis
```java
// Arquivo: WebServer.java - Servidor HTTP simples
import com.sun.net.httpserver.*;
import java.net.InetSocketAddress;
import java.io.IOException;

public class WebServer {
    public static void main(String[] args) throws IOException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8080;
        
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", exchange -> {
            String response = "Hello from Java 11!";
            exchange.sendResponseHeaders(200, response.length());
            exchange.getResponseBody().write(response.getBytes());
            exchange.close();
        });
        
        server.start();
        System.out.println("Server running on http://localhost:" + port);
    }
}

// Executar: java WebServer.java 9000
```

📚 **Saiba mais**: [Single-File Source-Code Programs](https://openjdk.org/jeps/330)

---

## 🛡️ Optional Enhancements

### 🔹 Optional.isEmpty()

#### ❓ O que é?
Método que verifica se um Optional está vazio, sendo o oposto lógico de `isPresent()`.

#### ⚠️ Por que é importante?
Melhora legibilidade do código quando você quer verificar especificamente se um Optional está vazio.

```java
Optional<String> name = findUserName(userId);

// Antes do Java 11 - não muito intuitivo
if (!name.isPresent()) {
    System.out.println("Nome não encontrado");
}

// Java 11 - mais claro e direto
if (name.isEmpty()) {
    System.out.println("Nome não encontrado");
}

// Casos práticos
public void processUser(Long userId) {
    Optional<User> user = userRepository.findById(userId);
    
    if (user.isEmpty()) {
        throw new UserNotFoundException("User not found: " + userId);
    }
    
    // Processar usuário...
}

// Em streams e validações
List<Optional<String>> optionals = getOptionalValues();
long emptyCount = optionals.stream()
    .filter(Optional::isEmpty)  // Method reference limpo
    .count();

// Validação de formulário
public boolean hasValidData(UserForm form) {
    return findValidationErrors(form).isEmpty();  // Mais legível que !isPresent()
}
```

📚 **Saiba mais**: [Optional API Documentation](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/Optional.html)

---

## 🗑️ Garbage Collection

### 🔹 JEP 318: Epsilon Garbage Collector

#### ❓ O que é?
Um garbage collector "no-op" que aloca memória mas nunca executa coleta, útil para testes de performance e aplicações de vida curta.

#### ⚠️ Por que é importante?
Permite medir overhead real do GC, testar aplicações sem GC, e otimizar aplicações de vida muito curta.

```bash
# Ativar Epsilon GC
java -XX:+UnlockExperimentalVMOptions \
     -XX:+UseEpsilonGC \
     MyApplication

# Útil para:
# - Benchmarks de performance pura
# - Aplicações que fazem pouquíssimas alocações
# - Testes de vazamento de memória
# - Medição de overhead do GC

# Exemplo: testar performance sem GC
java -XX:+UnlockExperimentalVMOptions \
     -XX:+UseEpsilonGC \
     -Xmx4g \
     PerformanceTest
```

### 🔹 JEP 333: ZGC (Experimental)

#### ❓ O que é?
Garbage collector experimental focado em baixa latência, com pause times menores que 10ms independente do tamanho do heap.

#### ⚠️ Por que é importante?
Permite aplicações com heaps enormes (TBs) mantendo latência consistentemente baixa, crucial para aplicações real-time.

```bash
# Ativar ZGC (experimental)
java -XX:+UnlockExperimentalVMOptions \
     -XX:+UseZGC \
     -Xmx32g \
     MyLowLatencyApp

# Características do ZGC:
# - Pause times < 10ms
# - Suporta heaps de 8MB a 16TB
# - Colored pointers para operação concorrente
# - Ideal para aplicações de baixa latência
```

📚 **Saiba mais**: [ZGC Documentation](https://openjdk.org/jeps/333)

---

## 🚀 Performance e JVM

### 🔹 JEP 328: Flight Recorder

#### ❓ O que é?
Torna o Java Flight Recorder (JFR) open source e disponível em todas as builds OpenJDK.

#### ⚠️ Por que é importante?
Oferece profiling de baixo overhead (< 1%) para monitoramento de produção e análise de performance.

```bash
# Ativar JFR durante execução
java -XX:+FlightRecorder \
     -XX:StartFlightRecording=duration=60s,filename=app.jfr \
     MyApplication

# Analisar com Java Mission Control
jmc app.jfr

# Configurações customizadas
java -XX:+FlightRecorder \
     -XX:FlightRecorderOptions=settings=profile \
     -XX:StartFlightRecording=duration=30m,filename=prod-profile.jfr \
     ProductionApp
```

### 🔹 JEP 331: Low-Overhead Heap Profiling

#### ❓ O que é?
API JVMTI para sampling de alocações de heap com baixo overhead.

#### ⚠️ Por que é importante?
Permite identificar memory hotspots em produção sem impacto significativo na performance.

📚 **Saiba mais**: [Flight Recorder Guide](https://docs.oracle.com/javacomponents/jmc-5-4/jfr-runtime-guide/)

---

## ❌ Remoções e Depreciações

### 🔹 JEP 320: Remove Java EE and CORBA Modules

#### ❓ O que foi removido?
Módulos Java EE e CORBA que estavam deprecated desde Java 9.

#### ⚠️ Impacto na migração
Aplicações que usavam essas tecnologias precisam adicionar dependências externas.

```xml
<!-- Dependências necessárias se usava Java EE -->
<dependency>
    <groupId>jakarta.xml.bind</groupId>
    <artifactId>jakarta.xml.bind-api</artifactId>
    <version>4.0.0</version>
</dependency>

<dependency>
    <groupId>jakarta.activation</groupId>
    <artifactId>jakarta.activation-api</artifactId>
    <version>2.1.0</version>
</dependency>
```

### 🔹 JavaFX Separado

#### ❓ O que mudou?
JavaFX foi separado do JDK e agora é distribuído independentemente.

```xml
<!-- JavaFX como dependência externa -->
<dependency>
    <groupId>org.openjfx</groupId>
    <artifactId>javafx-controls</artifactId>
    <version>19</version>
</dependency>
```

### 🔹 Nashorn JavaScript Engine Deprecated

#### ❓ O que mudou?
Nashorn foi marcado para depreciação, sendo removido no Java 15.

```java
// Deprecated - será removido
ScriptEngine engine = new ScriptEngineManager().getEngineByName("nashorn");

// Alternativa: GraalVM JavaScript engine
```

📚 **Saiba mais**: [Migration Guide](https://docs.oracle.com/en/java/javase/11/migrate/)

---

## 🎯 Impacto e Adoção

Java 11 foi **divisor de águas** na história do Java:

- ✅ **Primeira LTS moderna** pós-Java 8
- ✅ **HTTP Client nativo** eliminou dependências
- ✅ **APIs simplificadas** (String, Files) melhoraram DX
- ✅ **Performance superior** com novos GCs
- ✅ **Remoção de legados** limpou a plataforma
- ✅ **Base sólida** para versões futuras
- ✅ **Amplamente adotado** pela indústria

---

## 📅 Informações da Versão

- **📅 Lançamento**: 25 de setembro de 2018
- **🔧 Tipo**: LTS (Long Term Support)
- **⚡ Suporte Oracle**: Até setembro de 2026 (Extended até 2032)
- **🆓 Suporte Gratuito**: Eclipse Temurin, Amazon Corretto, etc.
- **🎯 Status**: LTS amplamente usado em produção
- **🔄 Migração**: Requer análise de módulos removidos

---

## 🔗 Links Úteis

### 📚 **Documentação Oficial**
- [Java 11 Documentation](https://docs.oracle.com/en/java/javase/11/)
- [Java 11 API Specification](https://docs.oracle.com/en/java/javase/11/docs/api/)
- [All JEPs in Java 11](https://openjdk.org/projects/jdk/11/)

### 🔄 **Migração**
- [Migration Guide from Java 8](https://docs.oracle.com/en/java/javase/11/migrate/)
- [Removed and Deprecated Features](https://docs.oracle.com/en/java/javase/11/migrate/removed-apis.html)
- [Third-party Replacements](https://stackoverflow.com/questions/43574426/how-to-resolve-java-lang-noclassdeffounderror-javax-xml-bind-jaxbexception)

### 🌐 **HTTP Client**
- [HTTP Client Tutorial](https://openjdk.org/groups/net/httpclient/intro.html)
- [HTTP/2 Guide](https://www.baeldung.com/java-9-http-client)
- [Async HTTP Examples](https://mkyong.com/java/java-11-httpclient-examples/)

### 🗑️ **Garbage Collection**
- [ZGC Documentation](https://wiki.openjdk.org/display/zgc)
- [Epsilon GC Guide](https://openjdk.org/jeps/318)
- [Flight Recorder Tutorial](https://docs.oracle.com/javacomponents/jmc-5-4/jfr-runtime-guide/)

### 💻 **Exemplos e Práticas**
- [Java 11 Features Examples](https://www.baeldung.com/java-11-new-features)
- [Modern Java Development](https://github.com/winterbe/java8-tutorial)
- [Java 11 Migration Checklist](https://blog.codefx.org/java/java-11-migration-guide/) 
