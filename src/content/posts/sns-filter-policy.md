---
title: "SNS MessageAttributes e Filter Policy — filtrando mensagens antes do SQS"
published: 2026-05-20
updated: 2026-09-16
description: "Como fazer o SNS entregar a cada fila SQS só as mensagens que interessam: atributos de mensagem, filter policy na assinatura, filtro por atributo ou pelo corpo, operadores, limites e cuidados."
tags: [AWS, Mensageria]
category: Arquitetura
draft: false
---

Quando um tópico SNS tem várias filas SQS assinando (o chamado *fan-out*), **cada fila recebe, por padrão, todas as mensagens publicadas no tópico**. Se o consumidor só se interessa por um tipo de evento, ele precisa receber, ler e descartar o resto, pagando por isso. A **filter policy** resolve esse problema: é uma regra em JSON configurada na **assinatura** que faz o próprio SNS decidir quais mensagens entrega àquela fila. O que não passa no filtro não é enviado à fila.

Neste post: como marcar a mensagem com **MessageAttributes** no produtor, como escrever e aplicar a filter policy, como o SNS avalia a regra, a diferença entre filtrar por atributo e pelo corpo da mensagem, e os limites e cuidados.

## Os termos em uma frase

- **Tópico**: o canal onde o produtor publica. **Assinatura** (*subscription*): o vínculo entre o tópico e um destino, como uma fila SQS.
- **MessageAttributes**: metadados opcionais enviados **junto com a mensagem, mas fora do corpo**. Cada atributo tem nome, tipo (`String`, `String.Array`, `Number` ou `Binary`) e valor.
- **Filter policy**: JSON guardado na assinatura que diz quais mensagens ela aceita. Assinatura sem filter policy recebe tudo.

## Como funciona na prática

Ao publicar, o produtor adiciona um atributo que identifica o tipo de evento. Com Spring Cloud AWS, os headers da mensagem viram MessageAttributes do SNS (um header `String` vira atributo do tipo `String`), e o `convertAndSend` do `SnsTemplate` criado pela autoconfiguração serializa o evento em JSON no corpo:

```java title="Produtor (Spring Cloud AWS)"
snsTemplate.convertAndSend(
    topicArn,
    event,                                    // corpo: o evento serializado em JSON
    Map.of("eventType", "OrderCreatedEvent")  // header que vira MessageAttribute no SNS
);
```

Cuidado com a variante `send(topicArn, message)`: ela não converte o payload e publica o `toString()` do objeto, então só use com payload já em `String`.

Sem Spring, o equivalente é preencher `MessageAttributes` na chamada `Publish` da API do SNS, com `DataType` `String` e `StringValue` `OrderCreatedEvent`.

Na assinatura da fila, você configura a filter policy:

```json title="Filter policy da assinatura"
{ "eventType": ["OrderCreatedEvent"] }
```

Ela é gravada no atributo `FilterPolicy` da assinatura, pelo console, pela CLI, pelos SDKs ou por CloudFormation:

```bash title="Aplicando pela AWS CLI"
aws sns set-subscription-attributes \
  --subscription-arn arn:aws:sns:... \
  --attribute-name FilterPolicy \
  --attribute-value '{"eventType": ["OrderCreatedEvent"]}'
```

Resultado: essa fila só recebe mensagens com `eventType = OrderCreatedEvent`. Os outros tipos publicados no mesmo tópico não são entregues a ela. O filtro vale **por assinatura**: no diagrama abaixo, cada fila tem o seu, e uma mensagem que não casa com nenhum deles não chega a fila nenhuma.

![Produtor publica três tipos de evento; o SNS entrega OrderCreatedEvent só à fila A, OrderCancelledEvent só à fila B, e OrderShippedEvent a nenhuma](/posts/sns-filter-policy/filter-policy-fanout.svg)

## Como o SNS avalia a regra

- **Chaves diferentes = E (AND)**: a mensagem precisa satisfazer todas as chaves da policy.
- **Valores no mesmo array = OU (OR)**: basta casar com um deles.
- **Atributo ausente reprova**: se a policy exige `eventType` e a mensagem não tem esse atributo, ela não é entregue (a exceção é `"exists": false`, que casa justamente com a ausência). Atributos da mensagem que a policy não cita são ignorados.
- **Comparação de strings diferencia maiúsculas de minúsculas**, a menos que você use `equals-ignore-case`.

Além da igualdade exata, a policy aceita operadores. Os mais úteis:

| Operador | Exemplo | Casa quando |
|---|---|---|
| `anything-but` | `[{"anything-but": ["OrderShippedEvent"]}]` | o valor **não** é nenhum dos listados |
| `prefix` / `suffix` | `[{"prefix": "Order"}]` | o valor começa (ou termina) com o texto |
| `equals-ignore-case` | `[{"equals-ignore-case": "ordercreatedevent"}]` | igualdade sem diferenciar maiúsculas de minúsculas |
| `numeric` | `[{"numeric": [">=", 100, "<", 500]}]` | o número está na faixa |
| `exists` | `[{"exists": true}]` | o atributo está presente (ou ausente, com `false`) |
| `cidr` | `[{"cidr": "10.0.0.0/24"}]` | o IP pertence à sub-rede |
| `$or` | `{"$or": [{...}, {...}]}` | uma das condições (entre chaves diferentes) é verdadeira |

Um exemplo combinando AND, OR e operadores: aceita pedidos criados **ou** cancelados, de lojas cujo código começa com `loja-`, com valor a partir de 100 (publique `total` como atributo do tipo `Number`):

```json title="Filter policy com operadores"
{
  "eventType": ["OrderCreatedEvent", "OrderCancelledEvent"],
  "store": [{ "prefix": "loja-" }],
  "total": [{ "numeric": [">=", 100] }]
}
```

## Filtrar por atributo ou pelo corpo

O atributo `FilterPolicyScope` da assinatura define onde o SNS procura os campos:

- **`MessageAttributes`** (padrão): a policy é comparada com os atributos da mensagem. Não aceita policy aninhada, compara só atributos `String`, `String.Array` e `Number`, e **ignora atributos `Binary`**.
- **`MessageBody`**: a policy é comparada com os campos do corpo, que precisa ser um objeto JSON válido. Aceita policy aninhada, espelhando a estrutura do JSON.

Por exemplo, para um corpo `{"order": {"status": "CREATED", "total": 250}}`, esta policy aninhada aceita a mensagem:

```json title="Filter policy com escopo MessageBody"
{
  "order": {
    "status": ["CREATED"],
    "total": [{ "numeric": [">=", 100] }]
  }
}
```

Filtrar pelo corpo é útil quando você não controla o produtor e ele não publica atributos. Mesmo assim, o filtro por atributo continua sendo o caminho padrão por dois motivos: **é gratuito**, enquanto o filtro pelo corpo é cobrado por GB de payload analisado (contando tanto as mensagens entregues quanto as filtradas), e não acopla a regra ao formato do payload.

## Por que isso importa

- **Sem filter policy**: todas as mensagens do tópico chegam à fila, e o consumidor recebe e descarta o que não é dele.
- **Com filter policy**: só o que interessa chega. São menos requisições ao SQS (que cobra por requisição: envio, recebimento e exclusão contam), menos transferência de dados do SNS para o SQS (cobrada por volume entregue) e menos processamento desperdiçado no consumidor.
- **O filtro fica na assinatura, não no produtor**: o produtor não precisa saber quem consome. É o desacoplamento clássico do *pub/sub* (publicação e assinatura), só que com entrega seletiva.

MessageAttributes também servem para outras coisas além de filtro, como propagar o ID de rastreamento entre serviços; veja [W3C Trace Context](/posts/w3c-trace-context/).

## Limites e cuidados

- **Tamanho da policy**: no máximo **5 chaves** e **150 combinações**. As combinações são o produto da quantidade de valores de cada chave: chaves com 3, 1 e 2 valores dão 3 × 1 × 2 = 6. A policy pode ter até 256 KB.
- **Quantidade de policies**: por padrão, até **200 por tópico** e **10.000 por conta**, ajustáveis pelo Service Quotas.
- **Mudança não é instantânea**: criar ou alterar uma filter policy leva **até 15 minutos** para valer por completo (consistência eventual). Não conclua que o filtro falhou logo após o deploy.
- **Raw message delivery**: com *raw message delivery* ligado (a fila recebe a mensagem sem o envelope JSON do SNS), a assinatura SQS aceita **no máximo 10 atributos**; mensagens com mais que isso são descartadas. Atenção com frameworks: o Spring Cloud AWS também envia como atributos os headers `id` e `timestamp` que toda `Message` do Spring recebe automaticamente.
- **Um filtro errado descarta mensagens em silêncio**: um nome de atributo digitado errado faz a mensagem simplesmente não ser entregue. Monitore a métrica `NumberOfNotificationsFilteredOut` do CloudWatch (e as variantes `-NoMessageAttributes` e `-InvalidAttributes`) para perceber quando o filtro barra mais do que deveria.

## Fontes

- AWS — [Amazon SNS message filtering](https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html)
- AWS — [Amazon SNS subscription filter policies](https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html)
- AWS — [Filter policy constraints in Amazon SNS](https://docs.aws.amazon.com/sns/latest/dg/subscription-filter-policy-constraints.html)
- AWS — [AND/OR logic](https://docs.aws.amazon.com/sns/latest/dg/and-or-logic.html), [Key matching](https://docs.aws.amazon.com/sns/latest/dg/attribute-key-matching.html), [String value matching](https://docs.aws.amazon.com/sns/latest/dg/string-value-matching.html) e [Numeric value matching](https://docs.aws.amazon.com/sns/latest/dg/numeric-value-matching.html)
- AWS — [Amazon SNS example filter policies](https://docs.aws.amazon.com/sns/latest/dg/example-filter-policies.html)
- AWS — [Applying a subscription filter policy in Amazon SNS](https://docs.aws.amazon.com/sns/latest/dg/message-filtering-apply.html)
- AWS — [SetSubscriptionAttributes (FilterPolicyScope)](https://docs.aws.amazon.com/sns/latest/api/API_SetSubscriptionAttributes.html)
- AWS — [Amazon SNS message attributes](https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html)
- AWS — [Monitoring Amazon SNS topics using CloudWatch](https://docs.aws.amazon.com/sns/latest/dg/sns-monitoring-using-cloudwatch.html)
- AWS — [Amazon SNS pricing](https://aws.amazon.com/sns/pricing/) e [Amazon SQS pricing](https://aws.amazon.com/sqs/pricing/)
- Spring Cloud AWS — [Reference: SNS Template](https://docs.awspring.io/spring-cloud-aws/docs/3.4.0/reference/html/index.html#sns-template), código-fonte de [SnsHeaderConverterUtil](https://github.com/awspring/spring-cloud-aws/blob/main/spring-cloud-aws-sns/src/main/java/io/awspring/cloud/sns/core/SnsHeaderConverterUtil.java) (headers viram atributos), [TopicMessageChannel](https://github.com/awspring/spring-cloud-aws/blob/main/spring-cloud-aws-sns/src/main/java/io/awspring/cloud/sns/core/TopicMessageChannel.java) (publicação) e [SnsAutoConfiguration](https://github.com/awspring/spring-cloud-aws/blob/main/spring-cloud-aws-autoconfigure/src/main/java/io/awspring/cloud/autoconfigure/sns/SnsAutoConfiguration.java) (conversor JSON do `SnsTemplate`)
