---
title: "W3C Trace Context — correlacionando logs entre microsserviços com o traceparent"
published: 2026-05-20
description: "O padrão aberto que faz o mesmo ID de rastreamento viajar por todos os serviços de uma operação: a anatomia do traceparent, a granularidade certa (por lote, não por execução) e como ele se encaixa no outbox pattern."
tags: [Observabilidade, Tracing, Microsserviços]
category: Observabilidade
cover: /covers/trace-context.svg
draft: false
---

**W3C Trace Context** é um padrão aberto que define como propagar IDs de rastreamento entre serviços de forma interoperável. O campo central é o `traceparent`, que viaja como header HTTP ou como atributo de mensagem (ex.: `MessageAttribute` no SNS) e carrega dois IDs: o **trace-id** (o mesmo do início ao fim, em todos os serviços) e o **span-id** (único por serviço/etapa). Com ele, dá para buscar na ferramenta de observabilidade **tudo** que aconteceu com uma operação específica — do serviço que originou até o último consumidor — com uma única string.

## Os dois IDs do traceparent

| ID | O que é | Exemplo de uso |
| --- | --- | --- |
| **trace-id** | ID da operação inteira — o mesmo em todos os serviços | "me mostre tudo sobre esse lote específico" |
| **span-id** | ID de um passo — cada serviço gera o seu | identificar qual serviço gerou um log |

## O formato fixo

```txt title="traceparent"
00 - 4bf92f3577b34da6a3ce929d0e0e4736 - 00f067aa0ba902b7 - 01
|         trace-id (128 bits)            span-id (64 bits)  flags
versão    (mesmo em todos os serviços)  (único por serviço) (01 = amostrado)
```

A especificação define ainda um segundo header opcional, o `tracestate`, para dados específicos de cada fornecedor de observabilidade — mas o `traceparent` sozinho já garante a correlação.

## Granularidade importa: por lote, não por execução

Um job que processa 50 lotes poderia usar o mesmo trace-id para todos (um trace por execução do job). Mas isso mistura os logs de todos os lotes — se o lote #47 falhar no consumidor, você não consegue isolá-lo. A abordagem correta é gerar um **trace-id por lote** (por evento de outbox): cada evento gravado na tabela de outbox tem seu próprio `trace_id`, que viaja com a mensagem até o consumidor.

E para correlacionar todos os lotes de uma mesma execução ("quantos lotes rodaram na execução das 02h?"), usa-se um **job-run-id** separado no MDC — sem misturar com o `trace_id` do evento. São duas perguntas diferentes, respondidas por dois IDs diferentes.

## Como o outbox pattern usa na prática

![O traceparent gravado no outbox viaja pelo relay e SNS até o MDC do consumidor](/posts/w3c-trace-context/propagacao-traceparent.svg)

1. O serviço produtor gera um novo `traceparent` **por lote** e grava junto do evento na tabela de outbox.
2. O job de relay lê o campo e envia como `MessageAttribute` no `PublishBatch` do SNS.
3. O consumidor lê o atributo, coloca no MDC, e todos os logs dele saem correlacionados.
4. A ferramenta de observabilidade une a linha do tempo: produtor → mensageria → consumidor, com uma busca só.

## Fontes

- W3C — [Trace Context Specification](https://www.w3.org/TR/trace-context/)
- OpenTelemetry — [Context Propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
