---
title: "Arquitetura · Sessão 01 — Efeito externo sem registro local"
published: 2026-09-11
description: "O que fazer quando a captura no parceiro passa e a gravação no seu banco falha: gravar a intenção antes de causar o efeito. **Também caiu aqui:** o problema da escrita dupla, tabela outbox e relay, conciliação como rede de segurança, CDC, event sourcing e por que 2PC é rejeitado."
tags: [Arquitetura, Outbox, Pagamentos]
category: Exercícios resolvidos
enunciado: "A captura no adquirente passa, e o processo morre antes de gravar a cobrança no banco: dinheiro cobrado sem registro local. Como desenhar o fluxo para que isso nunca aconteça?"
cover: /covers/sessao-01-outbox.svg
draft: false
---

> Sessão 01 da série **Aprendizado de arquitetura**. O desafio é real; a resposta abaixo foi escrita errada de propósito, para registrar como o raciocínio começa antes de saber a solução.

## 1. Desafio

**Enunciado.** A chave de idempotência está implantada e funcionando. Um dia, o gráfico mostra cobranças que existem na fatura do cliente mas não aparecem no seu banco.

Investigando, o fluxo é: o serviço chama o adquirente, a captura passa, e só depois o serviço grava a cobrança no Postgres. Entre as duas coisas o processo morreu.

Como você desenha isso para que nunca exista dinheiro cobrado sem registro?

**O que ficou de fora do enunciado de propósito:** com que frequência isso acontece, se o adquirente permite consultar o status depois, quanto tempo o cliente aceita esperar pela resposta.

## 2. Resposta dada

> Envolvo a chamada em try/catch. Se a gravação falhar, faço retry algumas vezes; se ainda assim falhar, registro no log e disparo um alerta para o time olhar.

## 3. Onde furou

Retry e alerta tratam o sintoma depois que o dano já existe. Nenhum dos dois muda o fato estrutural: o efeito externo aconteceu antes de existir qualquer registro local.

E se o processo morre de verdade — deploy, OOM, container reiniciado — não há try/catch que rode. O bloco de tratamento morreu junto.

O detalhe mais desconfortável: a chave de idempotência da [Sessão 00](/posts/cobranca-duplicada-no-retry/) não protege aqui, porque ela só existiria dentro da linha que não chegou a ser gravada. O retry seguinte chega sem nada para comparar.

![Diagrama: o efeito externo aconteceu, o processo morreu, e não sobrou registro nenhum do seu lado](/posts/efeito-externo-sem-registro-local/efeito-externo-sem-registro.svg)

## 4. Aprendizado — o problema da escrita dupla

Escrever em dois sistemas que não compartilham transação é a **escrita dupla**. Seu banco não sabe nada sobre o adquirente, e não existe commit que cubra os dois. Uma falha entre eles sempre deixa os dois lados discordando.

O que não resolve, mesmo parecendo que resolve:

- **Inverter a ordem** — gravar antes e chamar depois só troca o problema de lado: registro sem cobrança em vez de cobrança sem registro.
- **Retry no catch** — transforma perda em duplicidade, porque uma falha não te diz se a operação aconteceu ou não.
- **Transação distribuída (2PC)** — o coordenador vira ponto único de falha e a latência não cabe num caminho de pagamento.

O que resolve é inverter o que se escreve primeiro: **grave a intenção antes de causar o efeito.** A linha nasce como PENDENTE, na mesma transação que registra o evento na tabela outbox. Só depois o adquirente é chamado. Se cair em qualquer ponto, sobra um PENDENTE contando exatamente o que faltou terminar.

Duas peças completam o desenho:

- **Relay do outbox** — um processo separado lê a tabela e publica o evento, com retry seguro. Entrega pelo menos uma vez, então quem consome precisa ser idempotente.
- **Conciliação** — um job varre PENDENTE antigo e pergunta o status ao adquirente. É a rede que pega o que escapou.

![Diagrama: intenção gravada como PENDENTE na mesma transação do outbox; relay e conciliação completam o desenho](/posts/efeito-externo-sem-registro-local/grave-intencao-antes-de-agir.svg)

## 5. Padrões nomeados

**Já explicados acima — aqui fica só o nome formal**

- **Dual write problem** — uma operação lógica que precisa escrever em dois sistemas sem transação comum; qualquer falha no meio deixa os dois discordando. *Onde mais aparece:* banco mais fila, banco mais cache, banco mais índice de busca, banco mais API de terceiro. É a mesma forma em todos.
- **Transactional outbox** — dado e evento gravados na mesma transação; a entrega do evento vira um passo separado e repetível. *Onde mais aparece:* qualquer serviço que precisa avisar outro depois de mudar o próprio estado.
- **Write-ahead intent / pending state** — registrar a intenção antes de causar o efeito, para que a falha deixe rastro em vez de silêncio. *Onde mais aparece:* upload em duas etapas, emissão de nota fiscal, provisionamento de recurso em nuvem. É o mesmo princípio do write-ahead log do banco, um nível acima.
- **Reconciliation** — comparar periodicamente seu estado com o do sistema externo e corrigir a diferença. *Onde mais aparece:* fechamento contábil, estoque com marketplace, cobrança recorrente.

**Mencionados de passagem — vale saber o que são**

- **Change Data Capture (CDC)** — em vez de um processo varrer a tabela outbox de tempos em tempos, uma ferramenta lê o log de transações do próprio banco e publica cada mudança conforme ela acontece. O Debezium é o nome mais comum. *Quando usar no lugar do relay por varredura:* quando o atraso de 1 a 5 segundos do polling não cabe, ou quando o volume torna a varredura cara. *O que custa:* mais uma peça de infraestrutura para operar e monitorar, então polling costuma ser o ponto de partida certo.
- **Event sourcing** — em vez de guardar o estado atual e emitir eventos, você guarda só a sequência de eventos e calcula o estado a partir dela. Resolve a escrita dupla por eliminação: não existem duas escritas, existe uma. *Quando aparece:* quando o histórico completo é requisito de negócio, o que é comum em domínio financeiro. *O que custa:* muda o modelo de dados inteiro, então é decisão de arquitetura, não ajuste pontual.
- **Two-phase commit (2PC)** — protocolo em que um coordenador pergunta a todos os participantes se podem confirmar e só então manda confirmar. Existe e funciona, mas o coordenador é ponto único de falha, os participantes seguram travas enquanto esperam, e Kafka nem suporta. *Por que está aqui:* é a resposta que parece óbvia quando alguém aprende o problema, e saber por que ela é rejeitada vale mais do que saber que ela existe.

## 6. Onde eu apertaria numa entrevista

- O relay parou silenciosamente. Como você descobre antes do cliente?
- Quanto tempo um PENDENTE pode ficar pendente antes de virar incidente?
- E se o adquirente responder "não sei" quando a conciliação perguntar?
- A tabela outbox cresce sem parar. Quem limpa, e quando?
- Vale trocar o relay por CDC no seu caso, ou o polling já resolve?

## Fontes

- AWS Prescriptive Guidance — [Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- Confluent — [Understanding the Dual-Write Problem](https://www.confluent.io/blog/dual-write-problem/)
- microservices.io — [Pattern: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)
