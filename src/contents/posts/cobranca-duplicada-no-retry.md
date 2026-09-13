---
title: "Arquitetura · Sessão 00 — Cobrança duplicada no retry"
published: 2026-09-10
description: "Como garantir que um retry não cobre o cliente duas vezes: chave de idempotência e restrição única no banco, em vez de verificar antes de gravar. **Também caiu aqui:** condição de corrida do tipo verifica-e-age, entrega pelo menos uma vez, e as alternativas de bloqueio pessimista e otimista."
tags: [Arquitetura, Idempotência, Pagamentos]
category: Exercícios resolvidos
enunciado: "O app do cliente envia uma cobrança de R$ 250 e a resposta se perde no timeout. O cliente não sabe se passou e reenvia. O serviço roda em várias instâncias atrás de um load balancer. Como garantir que o cliente é cobrado uma vez só?"
cover: /covers/sessao-00-idempotencia.svg
draft: false
---

> Este post abre a série **Aprendizado de arquitetura**: um desafio real, uma resposta inicial (nesta sessão, escrita errada de propósito para exercitar o formato), onde ela fura e o que fica de aprendizado.

## 1. Desafio

**Enunciado.** O app do cliente envia uma requisição de cobrança de R\$ 250 para o serviço de autorização. A resposta se perde no timeout — o cliente não sabe se a cobrança passou ou não, e reenvia. O serviço roda em várias instâncias atrás de um load balancer.

Como você garante que o cliente é cobrado uma vez só?

**O que ficou de fora do enunciado de propósito:** volume, se o cliente controla o reenvio, quanto tempo a garantia precisa durar, o que acontece se o retry vier no dia seguinte.

## 2. Resposta dada

> Antes de gravar a cobrança, o serviço consulta a tabela procurando uma cobrança com o mesmo número de pedido. Se já existir, devolve a que existe. Se não existir, insere e captura.

## 3. Onde furou

A ideia está certa: reconhecer o pedido repetido e não cobrar de novo. O problema é **onde** a verificação acontece.

Consultar e depois gravar são duas operações separadas. Entre uma e outra existe uma janela — curta, mas real. Se as duas requisições caem em instâncias diferentes ao mesmo tempo, as duas consultam antes de qualquer uma gravar, as duas encontram a tabela vazia, e as duas cobram.

Isso não aparece em teste local, porque em teste local as requisições chegam em sequência. Aparece em produção, no pico, quando o volume aumenta a chance de as duas coincidirem.

![Diagrama: duas instâncias consultam antes de qualquer uma gravar — e as duas cobram](/posts/cobranca-duplicada-no-retry/retry-cobranca-duplicada.svg)

## 4. Aprendizado — idempotência não é checar antes de gravar

A garantia precisa estar em quem consegue decidir sozinho, sem janela: **o banco**.

Três peças:

- **Chave de idempotência** — um identificador que o cliente gera e repete em todas as tentativas da mesma intenção. Não pode ser o id do pedido se o mesmo pedido puder ser cobrado legitimamente duas vezes.
- **Restrição única** no banco sobre essa chave. É ela que transforma "duas gravações" em "uma gravação e um erro".
- **Resposta guardada** — a primeira tentativa salva o que respondeu. A segunda, ao esbarrar na restrição, lê e devolve exatamente a mesma resposta.

Invertendo a ordem: em vez de verificar e depois gravar, você grava e deixa o banco recusar. A janela some porque não existem mais duas operações.

![Diagrama: a restrição única no banco decide sozinha — uma gravação passa, a outra recebe a mesma resposta](/posts/cobranca-duplicada-no-retry/idempotencia-solucao.svg)

## 5. Padrões nomeados

**Já explicados acima — aqui fica só o nome formal**

- **Idempotency Key** — o cliente carimba a intenção com um identificador; o servidor garante que ela produz efeito uma vez só, chegue quantas vezes chegar. *Onde mais aparece:* webhooks de qualquer provedor, APIs públicas de pagamento, comandos consumidos de fila.
- **Check-then-act race condition** — verificar um estado e agir com base nele em duas operações separadas; entre uma e outra, o estado muda. *Onde mais aparece:* reserva de estoque, cadastro por e-mail, débito de saldo, e o clássico "verifica se o arquivo existe antes de criar".
- **Unique constraint como mecanismo de concorrência** — usar a integridade do banco no lugar de coordenação na aplicação. A decisão vira atômica porque acontece dentro da própria escrita. *Onde mais aparece:* slug de URL, número de matrícula, qualquer regra do tipo "só pode existir um".

**Mencionados de passagem — vale saber o que são**

- **At-least-once delivery** — garantia em que a mensagem chega pelo menos uma vez, podendo repetir, mas nunca sumir. É o padrão de Kafka, SQS, RabbitMQ e de qualquer retry HTTP. Entrega exatamente-uma-vez de ponta a ponta praticamente não existe: o que se faz na prática é entregar pelo menos uma vez e deixar o consumidor idempotente, que dá o mesmo efeito final por um custo muito menor. *Onde mais aparece:* toda arquitetura de eventos, e é por isso que idempotência e mensageria andam sempre juntas.
- **Bloqueio pessimista e bloqueio otimista** — as duas alternativas à restrição única. No pessimista (`SELECT ... FOR UPDATE`) você tranca a linha e segura os concorrentes até terminar; funciona, mas cria contenção e risco de deadlock sob carga. No otimista você adiciona uma coluna de versão e só grava se a versão não mudou; quem perde, tenta de novo. *Quando usar no lugar da restrição única:* quando a decisão depende de ler e combinar várias linhas, e não cabe numa única chave. *Onde mais aparece:* edição concorrente de cadastro, controle de saldo, qualquer "leu, calculou, gravou".

## 6. Onde eu apertaria numa entrevista

- Por quanto tempo a chave vale? Um dia, um mês, para sempre? O que essa escolha custa em armazenamento?
- E se a primeira tentativa ainda estiver em andamento quando o retry chega — o que a segunda devolve?
- E se a captura no adquirente passar mas a gravação no banco falhar depois?
- Como isso muda se a cobrança virar um evento assíncrono em vez de uma chamada síncrona?

## Fontes

- ByteByteGo — [How to Avoid Double Payment](https://bytebytego.com/guides/how-to-avoid-double-payment/)
- ByteByteGo — [Payment System](https://bytebytego.com/guides/payment-system/)
