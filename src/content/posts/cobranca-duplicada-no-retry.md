---
title: "Cobrança duplicada no retry"
published: 2026-09-10
updated: 2026-09-16
description: "Por que consultar antes de gravar não impede que um retry cobre o cliente duas vezes, e como resolver com chave de idempotência, restrição única e resposta guardada. Com SQL testado no PostgreSQL."
tags: [Pagamentos, Idempotência, Banco de Dados]
category: Arquitetura
draft: false
---

Um timeout não diz se a operação aconteceu. Quando o app reenvia uma cobrança depois de um timeout, o serviço precisa reconhecer a repetição e não cobrar de novo. Parece simples, mas a solução mais intuitiva, consultar antes de gravar, falha justamente quando o serviço roda em várias instâncias.

O post segue um roteiro: o cenário, a primeira resposta que costuma aparecer, onde ela falha e a solução que funciona (chave de idempotência, restrição única no banco e resposta guardada), com SQL testado no PostgreSQL 17 e os cuidados de produção.

## 1. O cenário

O app do cliente envia uma requisição de cobrança de R\$ 250 para o serviço de autorização. A resposta não chega a tempo e a requisição estoura o timeout. Do lado do cliente, não dá para saber o que aconteceu: o servidor pode ter cobrado, pode ainda estar processando ou pode nem ter recebido o pedido. Então o app reenvia.

O serviço roda em várias instâncias atrás de um load balancer. O reenvio pode cair numa instância diferente da primeira, e pode chegar enquanto a primeira ainda está trabalhando.

Como garantir que o cliente seja cobrado uma vez só?

O nome da propriedade que falta é **idempotência**: uma operação é idempotente quando repeti-la tem o mesmo efeito que executá-la uma vez. A especificação do HTTP (RFC 9110) classifica GET, PUT e DELETE como idempotentes por definição; POST não é. Uma cobrança é um POST, e cada repetição sem proteção vira uma cobrança nova.

**O que o cenário deixa em aberto de propósito:** o volume, se o cliente controla o reenvio, por quanto tempo a garantia precisa valer, o que acontece se o reenvio vier no dia seguinte.

## 2. A primeira resposta

> Antes de gravar a cobrança, o serviço consulta a tabela procurando uma cobrança com o mesmo número de pedido. Se já existir, devolve a que existe. Se não existir, insere e captura.

## 3. Onde ela falha

A ideia está certa: reconhecer o pedido repetido e não cobrar de novo. O problema é **onde** a verificação acontece.

Consultar e depois gravar são duas operações separadas, e entre elas existe uma janela, curta, mas real. Se a requisição original e o reenvio caem em instâncias diferentes ao mesmo tempo, as duas consultam antes de qualquer uma gravar, as duas encontram a tabela vazia e as duas cobram.

Esse defeito tem nome: **condição de corrida do tipo verificar-e-agir** (*check-then-act*). A decisão foi tomada com base num estado que mudou antes da ação.

Isso dificilmente aparece em teste local, onde as requisições costumam chegar em sequência. Aparece em produção, no pico, quando o volume aumenta a chance de as duas coincidirem. O cenário é fácil de reproduzir no PostgreSQL: duas conexões simultâneas que consultam, esperam um segundo e inserem acabam gravando as duas.

![Diagrama: a requisição original e o reenvio caem em instâncias diferentes, as duas consultam antes de qualquer uma gravar e o cliente é cobrado duas vezes](/posts/cobranca-duplicada-no-retry/retry-cobranca-duplicada.svg)

## 4. A solução: gravar primeiro e deixar o banco recusar

A garantia precisa estar em quem consegue decidir sozinho, sem janela: **o banco**.

São três peças:

- **Chave de idempotência**: um identificador que o cliente gera uma vez por intenção de cobrança e repete em todas as tentativas dessa mesma intenção, normalmente num cabeçalho `Idempotency-Key`. A Stripe recomenda um UUID v4 ou outro valor aleatório com entropia suficiente para não colidir, e sem dados pessoais. O id do pedido só serve como chave se cada pedido puder ser cobrado uma única vez; se o mesmo pedido pode ter cobranças legítimas separadas, a chave precisa identificar a cobrança, não o pedido.
- **Restrição única** (`UNIQUE`) no banco sobre essa chave. É ela que transforma "duas gravações" em "uma gravação e uma recusa".
- **Resposta guardada**: a primeira tentativa salva o que respondeu. As seguintes, ao esbarrar na restrição, leem e devolvem exatamente a mesma resposta.

A ordem se inverte: em vez de verificar e depois gravar, você grava e deixa o banco recusar. A janela some porque verificar e gravar passam a ser a mesma operação.

![Diagrama: as duas tentativas carregam a mesma chave; a restrição única deixa só uma inserção passar e a outra devolve a resposta guardada](/posts/cobranca-duplicada-no-retry/idempotencia-solucao.svg)

### Na prática, com SQL

Uma tabela mínima no PostgreSQL:

```sql title="cobranca.sql"
CREATE TABLE cobranca (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idempotency_key text   NOT NULL,
    pedido_id       bigint NOT NULL,
    valor_centavos  bigint NOT NULL,
    status          text   NOT NULL,  -- PROCESSANDO, CAPTURADA ou RECUSADA
    resposta_http   int,              -- status HTTP devolvido na primeira vez
    resposta_corpo  jsonb,            -- corpo devolvido na primeira vez
    criada_em       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_cobranca_idempotency_key UNIQUE (idempotency_key)
);
```

**Passo 1: registrar a tentativa antes de cobrar.** Toda requisição começa tentando inserir a chave, já com o status `PROCESSANDO`:

```sql
INSERT INTO cobranca (idempotency_key, pedido_id, valor_centavos, status)
VALUES ('5b0e7a52-3f1c-4d7e-9a61-2c8f0d4e7b13', 123, 25000, 'PROCESSANDO')
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id;
```

O `ON CONFLICT ... DO NOTHING` faz o banco ignorar a inserção se a chave já existir, em vez de lançar erro. Como o `RETURNING` só devolve linhas de fato inseridas, o resultado responde à pergunta sem janela nenhuma:

- **1 linha**: esta requisição é a primeira. Confirme a transação (*commit*), chame o adquirente e grave o resultado (passo 2).
- **0 linhas**: a chave já existia. Não cobre; leia o registro (passo 3).

Sem o `ON CONFLICT`, a segunda inserção falha com `duplicate key value violates unique constraint "uq_cobranca_idempotency_key"`. Funciona do mesmo jeito, só que a aplicação precisa tratar a exceção.

**Passo 2: guardar a resposta** depois que o adquirente responder:

```sql
UPDATE cobranca
   SET status         = 'CAPTURADA',
       resposta_http  = 201,
       resposta_corpo = '{"cobranca_id": 1, "status": "CAPTURADA"}'
 WHERE idempotency_key = '5b0e7a52-3f1c-4d7e-9a61-2c8f0d4e7b13';
```

**Passo 3: responder a uma repetição.**

```sql
SELECT status, pedido_id, valor_centavos, resposta_http, resposta_corpo
  FROM cobranca
 WHERE idempotency_key = '5b0e7a52-3f1c-4d7e-9a61-2c8f0d4e7b13';
```

- Se `pedido_id` ou `valor_centavos` forem diferentes dos da requisição atual, a chave foi reaproveitada para outra operação. Recuse: o rascunho da IETF para o cabeçalho `Idempotency-Key` sugere `422 Unprocessable Content`, e a Stripe também devolve erro quando os parâmetros não batem com os da requisição original.
- Se o status for `PROCESSANDO`, a primeira tentativa ainda não terminou. Responda `409 Conflict` para o cliente tentar de novo mais tarde; é o que o mesmo rascunho propõe.
- Se já houver resposta guardada, devolva `resposta_http` e `resposta_corpo` como estão.

### Cuidados

- **Confirme o registro antes de chamar o adquirente.** Se a inserção e a chamada externa ficarem na mesma transação aberta, a segunda inserção com a mesma chave não recusa na hora: o PostgreSQL faz quem tenta inserir esperar até a outra transação terminar. Num teste com PostgreSQL 17, o reenvio ficou parado os dois segundos que a primeira transação levou, e só então recebeu 0 linhas. Sob carga, isso vira conexões presas e fila, e o cliente nunca vê o `PROCESSANDO`.
- **Um `PROCESSANDO` pode ficar órfão.** Se o processo morrer entre o commit e a resposta do adquirente, sobra um registro sem desfecho. Descobrir se a cobrança passou é trabalho de conciliação, tema do post [Efeito externo sem registro local](/posts/efeito-externo-sem-registro-local/).
- **Decida por quanto tempo a chave vale.** A Stripe pode remover chaves com pelo menos 24 horas de idade; uma chave reutilizada depois disso gera uma requisição nova. O rascunho da IETF deixa o prazo para cada API definir e publicar na documentação. Prazo mais longo protege reenvios tardios e custa armazenamento.
- **Decida se erro também fica guardado.** A Stripe guarda o status e o corpo da primeira resposta seja sucesso ou falha, inclusive erros `500`. Com isso, uma nova tentativa depois de uma recusa exige chave nova, porque é uma nova intenção.

## 5. Padrões nomeados

**Já explicados acima; aqui fica só o nome formal**

- **Idempotency Key**: o cliente marca a intenção com um identificador, e o servidor garante que ela produza efeito uma vez só, chegue quantas vezes chegar. *Onde mais aparece:* webhooks, APIs públicas de pagamento, comandos consumidos de fila.
- **Check-then-act race condition**: verificar um estado e agir com base nele em duas operações separadas; entre uma e outra, o estado muda. Na forma mais geral é catalogada como TOCTOU (*time-of-check to time-of-use*, CWE-367). *Onde mais aparece:* reserva de estoque, cadastro por e-mail, débito de saldo e o clássico "verifica se o arquivo existe antes de criar".
- **Restrição única como mecanismo de concorrência**: usar a integridade do banco no lugar de coordenação na aplicação. A decisão fica atômica porque acontece dentro da própria escrita. *Onde mais aparece:* slug de URL, número de matrícula, qualquer regra do tipo "só pode existir um".

**Mencionados de passagem; vale saber o que são**

- **Entrega pelo menos uma vez** (*at-least-once delivery*): a mensagem pode chegar repetida, mas não se perde. É a garantia padrão do Kafka, da fila Standard do SQS e do RabbitMQ com confirmações (*acks*) na publicação e no consumo, e é o que qualquer retry HTTP produz. "Exatamente uma vez" existe só em escopos limitados, como a deduplicação de 5 minutos das filas FIFO do SQS ou as transações dentro do próprio Kafka; quando o efeito sai para um sistema externo, a documentação do Kafka lembra que o destino precisa cooperar. Na prática, entrega-se pelo menos uma vez e o consumidor é idempotente, o que produz o mesmo efeito final. *Onde mais aparece:* toda arquitetura de eventos, e é por isso que idempotência e mensageria andam juntas.
- **Bloqueio pessimista e bloqueio otimista**: as alternativas à restrição única. No pessimista (`SELECT ... FOR UPDATE`), você trava a linha e os concorrentes esperam até você terminar; funciona, mas cria contenção e risco de deadlock sob carga. No otimista, você adiciona uma coluna de versão e só grava se a versão não mudou; quem perde tenta de novo. Os dois precisam de uma linha que já exista. Neste cenário a cobrança ainda não existe, então seria preciso travar outra linha, como a do pedido, o que é mais um motivo para preferir a restrição única. *Quando usar no lugar dela:* quando a decisão depende de ler e combinar valores e não cabe numa única chave. *Onde mais aparece:* edição concorrente de cadastro, controle de saldo, qualquer "leu, calculou, gravou". Os dois são detalhados no post [Bloqueio otimista e pessimista](/posts/bloqueio-otimista-e-pessimista/).

## 6. Onde eu apertaria numa entrevista

- Por quanto tempo a chave vale? Um dia, um mês, para sempre? O que essa escolha custa em armazenamento, e o que acontece com o reenvio que chega depois do prazo?
- Um registro está em `PROCESSANDO` há dez minutos. Quem decide se a cobrança passou, e com base em quê?
- E se a captura no adquirente passar, mas a gravação da resposta no banco falhar?
- Como isso muda se a cobrança virar um evento assíncrono, consumido de uma fila, em vez de uma chamada síncrona?

## Fontes

- IETF — [RFC 9110: HTTP Semantics, seção 9.2.2 (métodos idempotentes)](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- IETF — [The Idempotency-Key HTTP Header Field (Internet-Draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- Stripe — [Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- PostgreSQL 17 — [Index Uniqueness Checks](https://www.postgresql.org/docs/17/index-unique-checks.html)
- PostgreSQL 17 — [INSERT (ON CONFLICT e RETURNING)](https://www.postgresql.org/docs/17/sql-insert.html)
- PostgreSQL 17 — [Constraints (Unique Constraints)](https://www.postgresql.org/docs/17/ddl-constraints.html)
- MITRE — [CWE-367: Time-of-check Time-of-use (TOCTOU) Race Condition](https://cwe.mitre.org/data/definitions/367.html)
- Apache Kafka — [Design: Message Delivery Semantics](https://kafka.apache.org/42/design/design/)
- AWS — [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- AWS — [Exactly-once processing in Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html)
- RabbitMQ — [Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- ByteByteGo — [How to Avoid Double Payment](https://bytebytego.com/guides/how-to-avoid-double-payment/)
