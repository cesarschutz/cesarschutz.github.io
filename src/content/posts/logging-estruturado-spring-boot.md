---
title: "Logging estruturado em Spring Boot — LogstashEncoder vs o suporte nativo do 3.4+"
published: 2026-05-19
updated: 2026-09-16
description: "Cada log como uma linha JSON pesquisável: o caminho clássico com `LogstashEncoder` e o suporte nativo do Spring Boot 3.4+ (ECS, Logstash e GELF), com saídas reais, comparativo e critério de escolha."
tags: [Spring, Logs, Trade-offs]
category: Observabilidade
draft: false
---

Log em texto livre é fácil de ler no terminal e difícil de consultar em produção: para achar todos os pedidos de um usuário, alguém precisa escrever uma regex e torcer para o formato da mensagem não mudar. **Logging estruturado** resolve isso emitindo cada evento de log como um documento estruturado (em geral uma linha JSON). Assim, ferramentas como Elasticsearch, Loki, Graylog, Datadog ou CloudWatch tratam cada informação (`traceId`, `userId`, `orderId`) como um campo próprio, que pode ser filtrado e agregado.

No Spring Boot há dois caminhos, e este post mostra os dois com a saída real que cada um produz:

- o **`LogstashEncoder`**, da biblioteca `logstash-logback-encoder`: o padrão de mercado por anos, configurado no XML do Logback;
- o **structured logging nativo do Spring Boot**, disponível desde a versão 3.4 (lançada em novembro de 2024): configurado só com properties, sem dependência extra, com os formatos ECS, GELF e Logstash prontos.

No final há um comparativo e um critério de escolha.

## 1. Por que logging estruturado

Um log tradicional em texto livre:

```txt
INFO  2026-05-19 10:23:45 [http-nio-8080-exec-1] PedidoService - Pedido 789 processado para user 42 em 152ms
```

Para extrair o `userId` ou calcular a latência média, é preciso uma regex que quebra na primeira mudança da mensagem. A mesma informação em JSON:

```json
{"level":"INFO","message":"Pedido processado","userId":"42","orderId":789,"latencyMs":152}
```

Agora `userId` é um campo. O agregador de logs (o sistema que recebe, armazena e consulta os logs de todos os serviços) filtra por ele diretamente, sem interpretar texto.

O caminho completo, do código até a consulta:

![Fluxo do logging estruturado: a aplicação chama a API SLF4J (log.info, MDC, addKeyValue), o Logback formata o evento como JSON com o LogstashEncoder ou com o suporte nativo do Spring Boot 3.4+, a saída é uma linha JSON por evento no console ou em arquivo, e um coletor envia essas linhas para um backend como Elasticsearch, Loki ou Graylog, onde cada chave vira um campo pesquisável](/posts/logging-estruturado-spring-boot/fluxo-log-json-coletor.svg)

Nas duas abordagens, o código da aplicação usa a API do **SLF4J** (a fachada de logging padrão no ecossistema Java). O que muda é a etapa 2, quem transforma o evento em JSON dentro do **Logback** (a implementação de logging padrão do Spring Boot).

## 2. `LogstashEncoder`: a abordagem clássica

O `LogstashEncoder` é um *encoder* do Logback (o componente que transforma cada evento em bytes de saída) fornecido pela biblioteca `net.logstash.logback:logstash-logback-encoder`, mantida pela comunidade no repositório `logfellow/logstash-logback-encoder`. Antes do Spring Boot 3.4, era o jeito mais comum de ter logs em JSON.

```xml title="pom.xml"
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>9.0</version>
</dependency>
```

Atenção à versão: a linha **9.x** exige Java 17 e usa **Jackson 3** (a mesma geração de Jackson do Spring Boot 4). Num projeto Spring Boot 3, que usa Jackson 2, a 9.0 funciona, mas traz o Jackson 3 como dependência adicional. Se preferir não ter as duas gerações no classpath, use a linha **8.x** (a última é a 8.1), que ainda usa Jackson 2. O Logback já vem com o Spring Boot, então não é preciso declará-lo.

A configuração fica em `logback-spring.xml` (o nome com `-spring` faz o Spring Boot carregar o arquivo e permite usar as extensões dele no XML):

```xml title="logback-spring.xml"
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>traceId</includeMdcKeyName>
            <includeMdcKeyName>userId</includeMdcKeyName>
            <customFields>{"app":"meu-servico","env":"prod"}</customFields>
        </encoder>
    </appender>
    <root level="INFO">
        <appender-ref ref="JSON"/>
    </root>
</configuration>
```

Por padrão o encoder grava **todas** as entradas do MDC (explicado logo abaixo). Os `<includeMdcKeyName>` restringem a saída a essas chaves. Os `<customFields>` acrescentam campos fixos em todos os eventos.

No código, há duas formas úteis de enriquecer o JSON.

**a) MDC (Mapped Diagnostic Context):** um mapa de contexto associado à thread atual. Tudo o que for colocado nele aparece em todos os logs dessa thread até ser removido, o que é ótimo para `traceId` e `userId`:

```java
import org.slf4j.MDC;

MDC.put("userId", "42");
MDC.put("traceId", "abc-123");
try {
    log.info("Pedido processado");
} finally {
    MDC.clear(); // a thread volta ao pool: não deixe contexto vazar para a próxima requisição
}
```

Com Micrometer Tracing no projeto, o próprio Micrometer coloca `traceId` e `spanId` no MDC; você não precisa fazer isso à mão. Para entender como esse ID atravessa serviços, veja [W3C Trace Context](/posts/w3c-trace-context/).

**b) Structured arguments** com `StructuredArguments.kv()`, que viram campos no JSON:

```java
import static net.logstash.logback.argument.StructuredArguments.kv;

log.info("Pedido processado {} {}", kv("orderId", 789), kv("amount", 150.50));
```

Saída real com a configuração acima, executando essa chamada com o MDC do exemplo anterior ainda preenchido (formatada em várias linhas aqui para leitura; no console, cada evento ocupa uma linha):

```json
{
  "@timestamp": "2026-09-17T00:02:57.299280798Z",
  "@version": "1",
  "message": "Pedido processado orderId=789 amount=150.5",
  "logger_name": "com.exemplo.PedidoService",
  "thread_name": "main",
  "level": "INFO",
  "level_value": 20000,
  "traceId": "abc-123",
  "userId": "42",
  "orderId": 789,
  "amount": 150.5,
  "app": "meu-servico",
  "env": "prod"
}
```

Repare que os argumentos que preenchem `{}` aparecem também na mensagem, como `orderId=789`. Se quiser o campo só no JSON, passe o `kv(...)` sem placeholder correspondente. O encoder também grava os pares chave-valor da API fluente do SLF4J (`addKeyValue`, mostrada na próxima seção).

Pontos fortes: muito flexível. Há mascaramento de campos, appenders TCP/UDP para enviar direto ao Logstash e o `LoggingEventCompositeJsonEncoder`, que monta o JSON campo a campo. Pontos fracos: a configuração fica num XML separado do resto e é uma dependência a mais para manter atualizada.

## 3. Spring Boot 3.4+: structured logging nativo

A partir do **Spring Boot 3.4**, o suporte vem no próprio framework. Sem `logstash-logback-encoder` e sem XML, basta uma property:

```properties title="application.properties"
logging.structured.format.console=ecs
# alternativas:
# logging.structured.format.console=logstash
# logging.structured.format.console=gelf
```

Os três formatos prontos:

- **`ecs`**: Elastic Common Schema, o esquema de campos padronizado da Elastic (`log.level`, `service.name`, `process.pid`, `ecs.version` etc.).
- **`logstash`**: o formato JSON do Logstash, com os mesmos nomes de campo padrão do `LogstashEncoder` (`@timestamp`, `@version`, `message`, `logger_name`, `thread_name`, `level`, `level_value`).
- **`gelf`**: Graylog Extended Log Format, o formato JSON do Graylog.

A property `logging.structured.format.console` vale para o console; `logging.structured.format.file` faz o mesmo para o arquivo de log. Para gravar em arquivo e informar os metadados do serviço no formato ECS:

```properties title="application.properties"
logging.structured.format.file=ecs
logging.file.name=app.log

logging.structured.ecs.service.name=meu-servico
logging.structured.ecs.service.version=1.0.0
logging.structured.ecs.service.environment=prod
logging.structured.ecs.service.node-name=${HOSTNAME:local}
```

Se omitidos, `service.name` e `service.version` usam `spring.application.name` e `spring.application.version`. O `:local` em `${HOSTNAME:local}` é o valor padrão caso a variável de ambiente não exista.

Saída ECS real no Spring Boot 4.1 (de novo formatada para leitura):

```json
{
  "@timestamp": "2026-09-17T00:02:12.652696333Z",
  "log": { "level": "INFO", "logger": "com.exemplo.PedidoService" },
  "process": { "pid": 7, "thread": { "name": "main" } },
  "service": {
    "name": "meu-servico",
    "version": "1.0.0",
    "environment": "prod",
    "node": { "name": "12a3227b5c6d" }
  },
  "message": "Pedido processado",
  "traceId": "abc-123",
  "userId": "42",
  "orderId": 789,
  "amount": 150.5,
  "ecs": { "version": "8.11" }
}
```

Na versão 3.4, o ECS saía com nomes "achatados" (`"log.level": "INFO"`, `"process.pid": 39599`). A partir da **3.5**, a saída passou ao formato aninhado mostrado acima, para melhorar a compatibilidade com os backends. Se você tem parsers ou dashboards montados sobre a 3.4, confira antes de atualizar.

No código continua sendo SLF4J com MDC: os três formatos incluem as entradas do MDC no JSON automaticamente. Para pares chave-valor de um único log, use a **API fluente do SLF4J** (disponível desde o SLF4J 2):

```java
log.atInfo()
   .setMessage("Pedido processado")
   .addKeyValue("orderId", 789)
   .addKeyValue("amount", 150.50)
   .log();
```

Os `orderId` e `amount` da saída ECS acima vieram dessa chamada.

**Ajustes finos por properties.** O Spring Boot permite mexer no JSON sem escrever código:

```properties title="application.properties"
# campos fixos em todo evento (equivalente ao <customFields>)
logging.structured.json.add.app=meu-servico
logging.structured.json.add.env=prod
# remover um campo e renomear outro (process.pid passa a sair como process.procid)
logging.structured.json.exclude=log.level
logging.structured.json.rename.process.pid=procid
```

A partir da 3.5 também há as properties `logging.structured.json.stacktrace.*`, que limitam o tamanho das stack traces gravadas no JSON.

**Formato próprio.** Se nenhum dos três formatos atende, implemente `StructuredLogFormatter<ILoggingEvent>` (para Logback) e aponte a property para o nome completo da classe:

```java title="MeuFormatter.java"
package com.exemplo;

import ch.qos.logback.classic.spi.ILoggingEvent;
import org.springframework.boot.json.JsonWriter;
import org.springframework.boot.logging.structured.StructuredLogFormatter;

public class MeuFormatter implements StructuredLogFormatter<ILoggingEvent> {

    private final JsonWriter<ILoggingEvent> writer = JsonWriter.<ILoggingEvent>of((members) -> {
        members.add("ts", ILoggingEvent::getInstant);
        members.add("lvl", ILoggingEvent::getLevel);
        members.add("msg", ILoggingEvent::getFormattedMessage);
        members.add("mdc", ILoggingEvent::getMDCPropertyMap);
    }).withNewLineAtEnd();

    @Override
    public String format(ILoggingEvent event) {
        return this.writer.writeToString(event);
    }
}
```

```properties title="application.properties"
logging.structured.format.console=com.exemplo.MeuFormatter
```

O `withNewLineAtEnd()` é importante: o formatter devolve a linha inteira, e sem a quebra de linha os eventos saem colados uns nos outros. A saída:

```json
{"ts":"2026-09-17T00:02:16.646690335Z","lvl":"INFO","msg":"Pedido processado","mdc":{"traceId":"abc-123","userId":"42"}}
```

**Se você já tem um `logback-spring.xml` próprio**, as properties sozinhas não bastam: troque o encoder do appender pelo `org.springframework.boot.logging.logback.StructuredLogEncoder`, usando `${CONSOLE_LOG_STRUCTURED_FORMAT}` (ou `${FILE_LOG_STRUCTURED_FORMAT}`) como formato, conforme a documentação.

## 4. Comparativo rápido

| | `LogstashEncoder` | Spring Boot 3.4+ nativo |
| --- | --- | --- |
| **Onde se configura** | `logback-spring.xml` | `application.properties` / `application.yaml` |
| **Dependência extra** | `logstash-logback-encoder` | Nenhuma |
| **Formatos** | Logstash JSON; JSON livre com o composite encoder | ECS, Logstash, GELF ou formatter próprio |
| **Campos fixos** | `<customFields>` no XML | `logging.structured.json.add.*` |
| **MDC no JSON** | Sim | Sim |
| **Campos por evento** | `StructuredArguments.kv()` e `addKeyValue(...)` | `addKeyValue(...)` |
| **Destino** | Console, arquivo e appenders TCP/UDP próprios | Console e arquivo |
| **Requisitos** | 9.x: Java 17 e Jackson 3; 8.x: Jackson 2 | Spring Boot 3.4 ou superior |

## 5. Quando escolher cada um

- **Nativo do Spring Boot 3.4+:** projetos novos ou já na 3.4+, quando os formatos prontos atendem e você quer tudo configurado por properties, sem dependência extra. Se o backend é da Elastic, o ECS é o caminho natural; se é Graylog, o GELF.
- **`LogstashEncoder`:** projetos em versões anteriores ao Spring Boot 3.4, ou quando você precisa do que só a biblioteca oferece: composite encoders elaborados, mascaramento de dados, markers e structured arguments da própria biblioteca, envio direto por TCP/UDP ou configurações Logback XML já padronizadas na empresa.

**Migrar do `LogstashEncoder` para o nativo** costuma ser simples se você escolher o formato `logstash`: os nomes dos campos padrão são os mesmos, o MDC e os pares da API fluente continuam virando campos, e dashboards em Kibana ou Grafana construídos sobre esses campos tendem a continuar funcionando. Antes de migrar, porém, procure no código o que não tem equivalente direto: chamadas a `StructuredArguments.kv()` e aos `Markers` da biblioteca (troque por `addKeyValue`), `<customFields>` (troque por `logging.structured.json.add.*`) e appenders TCP/UDP (passe a coletar do console ou do arquivo). Compare uma amostra da saída antiga com a nova antes de desligar a anterior.

Com a infraestrutura de JSON pronta, o próximo passo é decidir *o que* registrar. Um padrão que tira bom proveito disso é emitir um único evento rico por requisição: veja [Wide Events e Canonical Log Lines](/posts/wide-events-canonical-log-lines/).

## Fontes

- Spring Boot Reference — [Logging: Structured Logging](https://docs.spring.io/spring-boot/reference/features/logging.html#features.logging.structured)
- Spring Boot Wiki — [Spring Boot 3.4 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.4-Release-Notes) (introdução do structured logging com ECS, GELF e Logstash)
- Spring Boot Wiki — [Spring Boot 3.5 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.5-Release-Notes) (ECS no formato aninhado e customização de stack traces) e [issue #45063](https://github.com/spring-projects/spring-boot/issues/45063)
- Spring Boot API — [StructuredLogFormatter](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/logging/structured/StructuredLogFormatter.html)
- Spring Boot Reference — [Tracing: Logging Correlation IDs](https://docs.spring.io/spring-boot/reference/actuator/tracing.html)
- Spring Blog — [Structured Logging in Spring Boot 3.4](https://spring.io/blog/2024/08/23/structured-logging-in-spring-boot-3-4/)
- GitHub — [logfellow/logstash-logback-encoder](https://github.com/logfellow/logstash-logback-encoder) (README: requisitos, campos padrão, MDC, pares chave-valor, custom fields e structured arguments)
- Elastic — [Elastic Common Schema (ECS) Reference](https://www.elastic.co/docs/reference/ecs)
- Graylog — [GELF](https://go2docs.graylog.org/current/getting_in_log_data/gelf.html)
- SLF4J — [MDC API](https://www.slf4j.org/api/org/slf4j/MDC.html) e [Fluent Logging API](https://www.slf4j.org/manual.html#fluent)
- Baeldung — [Structured Logging in Spring Boot](https://www.baeldung.com/spring-boot-structured-logging)
