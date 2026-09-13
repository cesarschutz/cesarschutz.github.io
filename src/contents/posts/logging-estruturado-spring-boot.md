---
title: "Logging estruturado em Spring Boot — LogstashEncoder vs o nativo do 3.4"
published: 2026-05-19
description: "Cada log como um documento JSON com campos indexáveis, sem regex frágil: o caminho clássico com LogstashEncoder e o suporte nativo do Spring Boot 3.4 (ECS, Logstash, GELF) configurado só por properties — com comparativo e critério de escolha."
tags: [Spring Boot, Logs, Observabilidade]
category: Observabilidade
cover: /covers/logging-estruturado.svg
draft: false
---

**Logging estruturado** é o padrão de emitir cada evento de log como um documento estruturado (geralmente JSON) em vez de texto livre, permitindo que ferramentas como Elasticsearch, Loki, Datadog ou CloudWatch indexem campos individuais (`traceId`, `userId`, `latencyMs`) e façam queries sem regex frágil.

No Spring Boot há dois caminhos principais: o **`LogstashEncoder`** (da biblioteca `logstash-logback-encoder`, padrão de mercado por anos via Logback + XML) e o **structured logging nativo do Spring Boot 3.4** (lançado em novembro/2024), que entrega o mesmo resultado configurando apenas `application.properties`, sem dependência externa, com suporte built-in aos formatos ECS, GELF e Logstash.

## 1. Por que logging estruturado

Log tradicional em texto livre:

```txt
INFO  2026-05-19 10:23:45 [http-nio-8080-exec-1] PedidoService - Pedido 789 processado para user 42 em 152ms
```

Para extrair o `userId` ou medir latência média, é necessário regex frágil. Quando o agregador é Elasticsearch, Loki ou CloudWatch Insights, é muito mais útil que cada informação seja um **campo indexado**. JSON também é o formato esperado por padrões como OpenTelemetry e ECS.

## 2. `LogstashEncoder` — a abordagem clássica

Encoder customizado do Logback fornecido pela biblioteca `net.logstash.logback:logstash-logback-encoder` (mantida pela comunidade em `logfellow/logstash-logback-encoder`). Existe há anos e é o padrão de facto antes do Spring Boot 3.4.

```xml title="pom.xml"
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>9.0</version>
</dependency>
```

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

No código, duas formas úteis de enriquecer o JSON:

**a) MDC (Mapped Diagnostic Context)** — contexto thread-local, ótimo para `traceId` e `userId`:

```java
import org.slf4j.MDC;

MDC.put("userId", "42");
MDC.put("traceId", "abc-123");
log.info("Pedido processado");
MDC.clear();
```

**b) Structured arguments** via `StructuredArguments.kv()`:

```java
import static net.logstash.logback.argument.StructuredArguments.kv;

log.info("Pedido processado {} {}", kv("orderId", 789), kv("amount", 150.50));
```

Saída JSON resultante:

```json
{
  "@timestamp": "2026-05-19T10:23:45.123Z",
  "level": "INFO",
  "thread_name": "http-nio-8080-exec-1",
  "logger_name": "com.exemplo.PedidoService",
  "message": "Pedido processado",
  "userId": "42",
  "traceId": "abc-123",
  "orderId": 789,
  "amount": 150.50,
  "app": "meu-servico",
  "env": "prod"
}
```

Pontos fortes: muito flexível (custom fields, markers, pattern layouts, `LoggingEventCompositeJsonEncoder` para montar o JSON campo a campo). Ponto fraco: configuração XML separada do resto e uma dependência externa a mais.

## 3. Spring Boot 3.4+ — structured logging nativo

A partir do **Spring Boot 3.4**, o framework tem suporte built-in. Sem `logstash-logback-encoder`, sem XML — basta configurar:

```properties title="application.properties"
logging.structured.format.console=ecs
# alternativas:
# logging.structured.format.console=logstash
# logging.structured.format.console=gelf
```

Os três formatos built-in:

- **`ecs`** — Elastic Common Schema (padrão da Elastic, com campos como `log.level`, `service.name`, `process.pid`, `ecs.version`).
- **`logstash`** — compatível com o JSON que o `LogstashEncoder` produz (transição indolor entre as duas abordagens).
- **`gelf`** — Graylog Extended Log Format.

Para arquivo separado e metadados de serviço (formato ECS):

```properties title="application.properties"
logging.structured.format.file=ecs
logging.file.name=app.log

logging.structured.ecs.service.name=meu-servico
logging.structured.ecs.service.version=1.0.0
logging.structured.ecs.service.environment=prod
logging.structured.ecs.service.node-name=${HOSTNAME}
```

Saída ECS típica:

```json
{
  "@timestamp": "2026-05-19T10:23:45.123Z",
  "log.level": "INFO",
  "process.pid": 12345,
  "process.thread.name": "http-nio-8080-exec-1",
  "service.name": "meu-servico",
  "service.version": "1.0.0",
  "service.environment": "prod",
  "log.logger": "com.exemplo.PedidoService",
  "message": "Pedido processado",
  "userId": "42",
  "traceId": "abc-123",
  "ecs.version": "8.11"
}
```

No código continua sendo SLF4J + MDC normal — os campos do MDC vão para o JSON automaticamente. E a **API fluente do SLF4J** é suportada para pares chave-valor diretos:

```java
log.atInfo()
   .setMessage("Pedido processado")
   .addKeyValue("orderId", 789)
   .addKeyValue("amount", 150.50)
   .log();
```

**Formato customizado** — implemente `StructuredLogFormatter<ILoggingEvent>`:

```java title="MeuFormatter.java"
public class MeuFormatter implements StructuredLogFormatter<ILoggingEvent> {
    @Override
    public String format(ILoggingEvent event) {
        return JsonWriter.standard().writeToString(Map.of(
            "ts", event.getInstant().toString(),
            "lvl", event.getLevel().toString(),
            "msg", event.getFormattedMessage(),
            "mdc", event.getMDCPropertyMap()
        ));
    }
}
```

```properties title="application.properties"
logging.structured.format.console=com.exemplo.MeuFormatter
```

## 4. Comparativo rápido

| | LogstashEncoder | Spring Boot 3.4+ nativo |
| --- | --- | --- |
| **Onde se configura** | `logback-spring.xml` | `application.properties` / `yaml` |
| **Dependência extra** | `logstash-logback-encoder` | Nenhuma (built-in) |
| **Formatos** | Logstash (altamente customizável) | ECS, Logstash, GELF, custom |
| **Custom fields** | `<customFields>` no XML | `logging.structured.*` properties |
| **MDC propaga** | Sim | Sim |
| **Structured args** | `StructuredArguments.kv()` | `log.atInfo().addKeyValue(...)` |
| **Versão mínima** | Qualquer Spring Boot | Spring Boot 3.4.0+ |

## 5. Quando escolher cada um

- **Spring Boot 3.4+ nativo:** projetos novos, ou quando se quer **zero dependência extra** e tudo configurado por properties. Mais limpo, padronizado e oficial. Se ECS atende, é o caminho preferencial.
- **`LogstashEncoder`:** projetos em Spring Boot ≤ 3.3, customização avançada (composite encoders elaborados, markers específicos, integrações que dependem do XML), ou ecossistemas que já têm templates internos em cima de Logback XML.

Como o formato `logstash` também está suportado no nativo, **migrar do `LogstashEncoder` para o built-in costuma ser indolor** — o JSON produzido é compatível, então dashboards em Kibana/Grafana e parsers downstream continuam funcionando.

## Fontes

- Spring Boot Reference — [Structured Logging](https://docs.spring.io/spring-boot/reference/features/logging.html#features.logging.structured)
- Spring Blog — [Structured Logging in Spring Boot 3.4](https://spring.io/blog/2024/08/23/structured-logging-in-spring-boot-3-4/)
- GitHub — [logfellow/logstash-logback-encoder](https://github.com/logfellow/logstash-logback-encoder)
- Elastic — [Elastic Common Schema (ECS) Reference](https://www.elastic.co/guide/en/ecs/current/index.html)
- SLF4J — [MDC API](https://www.slf4j.org/api/org/slf4j/MDC.html)
- Baeldung — [Structured Logging in Spring Boot](https://www.baeldung.com/spring-boot-structured-logging)
