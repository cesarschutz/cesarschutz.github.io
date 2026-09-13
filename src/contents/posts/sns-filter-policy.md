---
title: "SNS MessageAttributes e Filter Policy — filtrando mensagens antes do SQS"
published: 2026-05-20
description: "Como o SNS descarta mensagens na própria infraestrutura, antes de chegarem à fila: atributos de mensagem, filter policies por assinatura, e por que isso reduz processamento e custo no consumidor."
tags: [AWS, SNS, SQS, Mensageria]
category: Arquitetura
cover: /covers/sns-filter.svg
draft: false
---

**MessageAttributes** são metadados enviados junto com uma mensagem SNS, **fora do body**. Eles são indexados pelo próprio SNS — não pelo consumidor. Isso permite configurar **Filter Policies** nas assinaturas SQS: o SNS só entrega a mensagem à fila se os atributos corresponderem ao filtro. Mensagens que não passam **nunca chegam ao SQS** — o filtro roda na infraestrutura do SNS (server-side), sem custo de processamento para o consumidor.

## Como funciona na prática

Ao publicar, o produtor adiciona atributos à mensagem:

```java title="Produtor"
MessageBuilder.withPayload(event)
    .setHeader("eventType", "OrderCreatedEvent")  // vira MessageAttribute no SNS
    .build()
```

Na assinatura SQS, você configura o Filter Policy (JSON):

```json title="Filter Policy da assinatura"
{ "eventType": ["OrderCreatedEvent"] }
```

Resultado: somente mensagens com `eventType = OrderCreatedEvent` chegam a essa fila. Outros tipos publicados no mesmo tópico SNS são descartados antes de chegar ao SQS.

```mermaid
flowchart LR
  P[Produtor] --> T((Tópico SNS))
  T -->|"eventType = A ✓"| Q1[SQS · consumidor A]
  T -->|"eventType = B ✓"| Q2[SQS · consumidor B]
  T -.->|"outros tipos ✗"| X["descartadas no SNS"]
```

## Por que isso importa

- **Sem Filter Policy:** todas as mensagens do tópico chegam à fila — o consumidor recebe e descarta o que não é dele.
- **Com Filter Policy:** só o que interessa chega — menos mensagens recebidas, menos processamento desperdiçado, menor custo (SQS cobra por mensagem recebida).
- O filtro é configurado na **assinatura**, não no produtor — o produtor não precisa saber quem vai consumir. É o desacoplamento clássico do pub/sub, só que com entrega seletiva.
- Limites: até 10 MessageAttributes por mensagem; tipos suportados: String, Number e Binary.

Vale saber que, além dos atributos, o SNS também suporta filtrar **pelo corpo da mensagem** (`FilterPolicyScope: MessageBody`) — útil quando você não controla o produtor. Mas filtrar por atributo continua sendo o caminho padrão: é mais barato de avaliar e não acopla o filtro ao formato do payload.

## Fontes

- AWS — [SNS Subscription Filter Policies](https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html)
- AWS — [SNS Message Attributes](https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html)
