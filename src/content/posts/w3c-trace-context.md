---
title: "W3C Trace Context — correlacionando logs entre microsserviços com o traceparent"
published: 2026-05-20
updated: 2026-09-16
description: "O padrão W3C que leva o mesmo ID de rastreamento por todos os serviços de uma operação: o `traceparent` e o `tracestate`, valores inválidos, a granularidade certa e o ID atravessando o outbox."
tags: [Logs, Microsserviços, Mensageria]
category: Observabilidade
draft: false
---

Quando uma operação passa por vários serviços, cada um grava seus próprios logs. Sem um identificador comum, reconstruir o que aconteceu com **uma** operação vira garimpo: buscar por horário, por ID de cliente, torcer para os relógios baterem. E se cada ferramenta de tracing usa um header próprio, o ID se perde na primeira fronteira entre fornecedores.

O **W3C Trace Context** resolve isso. É uma recomendação do W3C que padroniza como o contexto de rastreamento (quem é a operação e de onde veio a chamada) é propagado entre serviços, de forma que qualquer ferramenta entenda. O campo central é o `traceparent`: com o valor dele em mãos, uma única busca na ferramenta de observabilidade mostra tudo o que aconteceu com a operação, do serviço que a originou até o último consumidor.

Este post mostra a anatomia do `traceparent` e do `tracestate`, os valores que a especificação considera inválidos, a granularidade certa para jobs em lote e como o ID atravessa um fluxo assíncrono com outbox pattern e SNS.

## Trace, span e os IDs do traceparent

Dois termos antes de começar:

- **Trace**: a operação inteira, com todos os passos em todos os serviços.
- **Span**: um passo dentro do trace (uma requisição recebida, uma consulta, uma publicação de mensagem). Um serviço pode gerar vários spans no mesmo trace.

O `traceparent` carrega dois IDs que importam para a correlação:

| ID | O que é | Exemplo de uso |
| --- | --- | --- |
| **trace-id** | ID da operação inteira, o mesmo em todos os serviços | "me mostre tudo sobre esse lote específico" |
| **parent-id** | ID do span de quem fez a chamada (muitas ferramentas chamam de **span-id**); cada passo gera o seu | saber de qual passo veio a chamada que gerou um log |

Além deles, o header traz a versão do formato e as flags de rastreamento.

## Anatomia do traceparent

O valor tem quatro campos separados por hífen, sempre em hexadecimal minúsculo. Este é o exemplo da própria especificação:

```txt title="traceparent"
00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

| Campo | Tamanho | Valor no exemplo | O que significa |
| --- | --- | --- | --- |
| `version` | 2 caracteres (1 byte) | `00` | versão do formato; a atual é `00` |
| `trace-id` | 32 caracteres (16 bytes) | `4bf92f3577b34da6a3ce929d0e0e4736` | ID do trace, igual em todos os serviços |
| `parent-id` | 16 caracteres (8 bytes) | `00f067aa0ba902b7` | ID do span de quem chamou |
| `trace-flags` | 2 caracteres (8 bits) | `01` | flags; hoje só o bit `sampled` é definido |

No total são 55 caracteres. A recomendação é enviar o nome do header em minúsculas (`traceparent`), e quem recebe precisa aceitá-lo em qualquer caixa.

**As flags são bits, não um número.** O único bit definido é o menos significativo, `sampled` (amostrado): ligado, indica que quem chamou pode ter gravado os dados do trace; desligado (`00`), que não gravou. Como é um campo de bits, a leitura correta usa máscara (`flags & 0x01`), não comparação com `01`. Os demais bits são reservados e devem ir zerados.

A cada salto, o serviço repassa o `trace-id` intacto e normalmente troca o `parent-id` pelo ID do próprio span. É isso que permite montar a árvore de chamadas: o `trace-id` agrupa, o `parent-id` encadeia.

### Valores inválidos

A especificação define quando o `traceparent` não vale:

- **Versão `ff`**: proibida.
- **`trace-id` só com zeros** (`00000000000000000000000000000000`): inválido.
- **`parent-id` só com zeros** (`0000000000000000`): inválido.
- **Caracteres fora do hexadecimal minúsculo** (letras maiúsculas, por exemplo) ou tamanho errado: inválido.

Diante de um valor inválido, o serviço deve ignorar o `traceparent` recebido: começa um trace novo e descarta o `tracestate`. Na prática, não gere esses valores à mão. Use a biblioteca de tracing (o OpenTelemetry já usa o W3C Trace Context como propagador padrão). A especificação recomenda que o `trace-id` seja aleatório e globalmente único, e proíbe usar dados do usuário (como o IP) como semente.

## O tracestate

A especificação define um segundo header, o `tracestate`, para informações específicas de cada fornecedor de tracing. É uma lista de pares `chave=valor` separados por vírgula, com no máximo 32 itens:

```txt title="tracestate"
rojo=00f067aa0ba902b7,congo=t61rcWkgMzE
```

Ele sempre acompanha o `traceparent`: um `tracestate` recebido sem `traceparent` é descartado, e se o `traceparent` for inválido o `tracestate` nem é lido. Para correlacionar logs, o `traceparent` sozinho basta. O `tracestate` só importa quando mais de uma ferramenta de tracing participa do mesmo fluxo.

Os dois campos existem apenas para correlação: a especificação proíbe colocar neles dados pessoais ou sensíveis.

## Fora do HTTP: o traceparent em mensagens

A especificação define o formato para headers HTTP. Outros protocolos têm especificações de extensão, e em mensageria o caminho usual é levar o mesmo valor como metadado da mensagem. No SNS, isso é um **MessageAttribute** (metadado enviado junto com a mensagem, fora do corpo; veja o post sobre [SNS MessageAttributes e Filter Policy](/posts/sns-filter-policy/)).

As convenções semânticas de mensageria do OpenTelemetry chamam isso de **contexto de criação da mensagem**: o produtor cria o contexto e ele deve ser propagado com a mensagem até os consumidores. Sem isso, os traces do consumidor não se ligam diretamente aos do produtor.

## Granularidade importa: por lote, não por execução

Um job que processa 50 lotes poderia usar o mesmo trace-id para todos (um trace por execução do job). Mas isso mistura os logs de todos os lotes: se o lote #47 falhar no consumidor, não dá para isolá-lo. A abordagem recomendada é gerar um **trace-id por lote** (por evento de outbox). Cada evento gravado na tabela de outbox tem seu próprio `traceparent`, que viaja com a mensagem até o consumidor.

Para correlacionar todos os lotes de uma mesma execução ("quantos lotes rodaram na execução das 02h?"), use um **job-run-id** separado no MDC (o contexto de log por thread do SLF4J/Logback), sem misturar com o trace-id do evento. São duas perguntas diferentes, respondidas por dois IDs diferentes. Se a ferramenta for o OpenTelemetry, dá para registrar também essa relação entre traces com **span links**, que associam um span a um ou mais spans, inclusive de outros traces, indicando relação de causa.

## Como o outbox pattern usa na prática

O **outbox pattern** grava o evento numa tabela do próprio banco (a tabela outbox), na mesma transação da mudança de estado. Um processo separado, o **relay**, lê essa tabela e publica os eventos no broker (detalhes no post [Efeito externo sem registro local](/posts/efeito-externo-sem-registro-local/)). O `traceparent` vai junto com o evento em cada etapa:

![O traceparent gravado no outbox viaja pelo relay e SNS até o MDC do consumidor](/posts/w3c-trace-context/propagacao-traceparent.svg)

1. O job produtor inicia um trace novo **por lote** e grava o `traceparent` junto do evento na tabela de outbox.
2. O relay lê o evento e o `traceparent` da tabela.
3. O relay publica no SNS com `PublishBatch` (até 10 mensagens por chamada), levando o `traceparent` como `MessageAttribute` de cada mensagem.
4. O SNS entrega na fila SQS. O consumidor lê o atributo, continua o mesmo trace e coloca o trace-id e o span-id no MDC. Todos os logs dele saem com esses campos.

Com isso, a ferramenta de observabilidade monta a linha do tempo produtor → mensageria → consumidor com uma busca só pelo trace-id. Para os campos do MDC aparecerem como campos pesquisáveis no log, emita logs estruturados (veja [Logging estruturado em Spring Boot](/posts/logging-estruturado-spring-boot/)). O mesmo `trace_id` também pode ligar um [wide event](/posts/wide-events-canonical-log-lines/) ao trace distribuído.

Cuidados nesse fluxo:

- **Raw message delivery**: com a entrega bruta desligada (o padrão), a mensagem chega ao SQS dentro do envelope JSON do SNS, e os atributos vêm no campo `MessageAttributes` desse JSON. Com ela ligada, os atributos chegam como atributos da própria mensagem SQS, mas o limite é de 10: mensagens com mais atributos que isso são descartadas.
- **Nomes no MDC**: o agente Java do OpenTelemetry já injeta `trace_id`, `span_id` e `trace_flags` no MDC do Logback e do Log4j. Se você preencher o MDC à mão, use os mesmos nomes em todos os serviços, ou a busca não junta os logs.

## Fontes

- W3C — [Trace Context (W3C Recommendation, 23/11/2021)](https://www.w3.org/TR/trace-context/)
- OpenTelemetry — [Context Propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- OpenTelemetry — [Traces: Span Context e Span Links](https://opentelemetry.io/docs/concepts/signals/traces/)
- OpenTelemetry — [Semantic conventions for messaging spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- OpenTelemetry Java Instrumentation — [Logger MDC auto-instrumentation](https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/logger-mdc-instrumentation.md)
- AWS — [Amazon SNS message attributes](https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html)
- AWS — [Amazon SNS raw message delivery](https://docs.aws.amazon.com/sns/latest/dg/sns-large-payload-raw-message-delivery.html)
- AWS — [HTTP/HTTPS notification JSON format](https://docs.aws.amazon.com/sns/latest/dg/http-notification-json.html)
- AWS — [PublishBatch (Amazon SNS API Reference)](https://docs.aws.amazon.com/sns/latest/api/API_PublishBatch.html)
