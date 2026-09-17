---
title: "Arquitetura de ledger — partidas dobradas, saldos e conciliação"
published: 2026-05-28
updated: 2026-09-16
description: "O que 12 artigos ensinam sobre ledgers de grau financeiro: registro append-only, double-entry garantido pelo banco, saldos materializados, idempotência e conciliação como entregável de engenharia — com exemplos em Java."
tags: [Pagamentos, Banco de Dados, Idempotência]
category: Arquitetura
draft: false
---

Todo sistema que movimenta valor — dinheiro, créditos, pontos — esbarra nos mesmos problemas: como garantir que nada seja criado nem destruído por acidente, como responder "qual era o saldo naquela data" e como perceber quando o número exibido divergiu da verdade. Os artigos resumidos aqui chegam à mesma resposta: **ledger append-only + saldo materializado + conciliação**.

Este post resume 12 artigos sobre o assunto — as séries *How to Scale a Ledger* e *Accounting for Developers*, da Modern Treasury, e mais três textos independentes —, com os exemplos de código convertidos para Java. Cada seção traz a ideia central do artigo, os pontos importantes e o link para o original. Se contabilidade é novidade para você, vale ler antes as seções 8 a 10 (os fundamentos) e depois voltar ao começo.

O modelo que todos compartilham tem três peças: a **account** (conta), a **transaction** (o movimento completo) e as **entries** (os lançamentos de débito e crédito que compõem a transaction):

![O modelo central do ledger: Transaction agrupa entries imutáveis que debitam e creditam accounts](/posts/arquitetura-de-ledger/modelo-account-transaction-entry.svg)

## Vocabulário mínimo

Os termos abaixo aparecem o tempo todo no post:

- **Ledger (livro-razão):** o registro de todos os movimentos de valor de um sistema.
- **Double-entry (partidas dobradas):** todo movimento tem pelo menos um débito e um crédito, e a soma dos débitos é igual à soma dos créditos. Dinheiro sempre sai de algum lugar e entra em outro.
- **Débito e crédito:** não significam "tira" e "põe". O efeito de cada um depende do tipo da conta (a *normalidade*, explicada nas seções 3 e 8).
- **Append-only:** só se acrescentam registros; nada é alterado nem apagado. Um erro se corrige com um novo lançamento, que compensa o anterior.
- **Saldo materializado:** saldo pré-calculado e guardado para leitura rápida, mas sempre derivado dos lançamentos.
- **Drift:** divergência entre o saldo guardado e a soma dos lançamentos.
- **Conciliação:** comparar dois registros que deveriam bater (saldo guardado × lançamentos, ou ledger × extrato do banco) e tratar as diferenças.
- **Idempotência:** repetir a mesma requisição não repete o efeito. O tema tem post próprio: [Cobrança duplicada no retry](/posts/cobranca-duplicada-no-retry/).
- **Liquidação (settlement):** o momento em que o dinheiro efetivamente muda de mãos, em geral depois da autorização.

## 1. Ledger confiável em sistema event-driven, sem transações gigantes

**Visão geral:** como construir um ledger de grau financeiro num sistema distribuído e orientado a eventos **sem** envolver cada operação numa transação de banco gigante. A consistência vem de concorrência otimista, particionamento e restrições de unicidade — não de locks globais.

**Pontos importantes:**

- **Event sourcing:** cada mudança vira um evento imutável (depósito, saque, bloqueio de valor). Em vez de guardar só o saldo final, você guarda todos os eventos, e o saldo pode ser reconstruído a partir deles. Isso dá trilha de auditoria completa e permite reprocessar tudo (*replay*) se a lógica mudar.
- **CQRS (separação entre comando e consulta):** o lado de comando recebe "Sacar \$30" e, se o comando for válido, emite o evento `FundsWithdrawn`. O lado de consulta assina os eventos e atualiza um *read model* (uma tabela otimizada para leitura, como `account_balances`). A consulta de saldo lê essa tabela em vez de reprocessar todos os eventos.
- **O problema de concorrência:** dois eventos quase simultâneos na mesma conta (depósito de \$50 e saque de \$30) podem ler dados desatualizados e perder ou contar dinheiro em dobro se não houver controle.
- **Três técnicas para resolver sem transação gigante:**
  1. **Controle de concorrência otimista (OCC):** cada conta — o *aggregate*, no vocabulário de DDD — tem uma `version` inteira. Ao gravar um evento, você informa a versão que leu; se ela mudou porque outro evento entrou antes, a gravação falha e você recarrega o estado e tenta de novo (*compare-and-swap*). O assunto é aprofundado em [Bloqueio otimista e pessimista](/posts/bloqueio-otimista-e-pessimista/).
  2. **Particionamento por conta:** sistemas como o Kafka particionam as mensagens por uma chave, aqui o `account_id`. Cada partição é consumida em sequência por uma única thread, o que garante ordem serial dentro da mesma conta e paralelismo entre contas diferentes.
  3. **Restrição de unicidade** em `(aggregate_id, version)`: o próprio banco rejeita a segunda inserção com a mesma versão. É a salvaguarda do *compare-and-swap* no nível do banco.
- **Idempotência no replay:** ao reprocessar eventos, guarde o `aggregate_id` e a versão já aplicados; se o evento já foi aplicado, pule. Assim nada é contado duas vezes.
- **Saldo bloqueado × disponível:** ledgers reais precisam de estados como valores reservados (por exemplo, a autorização de um cartão, que bloqueia o valor antes de liquidar). Modele eventos `FundsHeld`, `FundsReleased` e `FundsSettled` e mantenha uma projeção com `held_balance` e `available_balance`.

O event store se resume a uma tabela `events` (o artigo usa MySQL; aqui, a versão em PostgreSQL):

```sql title="events.sql"
CREATE TABLE events (
    id           BIGSERIAL    PRIMARY KEY,
    aggregate_id VARCHAR(50)  NOT NULL,
    version      INT          NOT NULL,
    event_type   VARCHAR(255) NOT NULL,
    payload      JSONB        NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL,
    UNIQUE (aggregate_id, version)
);
```

O `append` confere a versão esperada e grava os eventos numa transação curta, que envolve só os eventos daquela conta. A conferência sozinha não basta: dois escritores podem ler a mesma versão ao mesmo tempo. Quem fecha essa brecha é a restrição de unicidade — o segundo `INSERT` falha com o código `23505` (`unique_violation`) e vira um conflito de versão:

```java title="EventStore.java"
// Event store com checagem de versão esperada (compare-and-swap)
public class EventStore {

    private static final String UNIQUE_VIOLATION = "23505"; // SQLSTATE do PostgreSQL

    private final DataSource dataSource;

    public EventStore(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // Versão atual (maior version) de uma conta
    private int getCurrentVersion(Connection conn, String accountId) throws SQLException {
        String sql = "SELECT COALESCE(MAX(version), 0) FROM events WHERE aggregate_id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, accountId);
            try (ResultSet rs = stmt.executeQuery()) {
                return rs.next() ? rs.getInt(1) : 0;
            }
        }
    }

    // Append com verificação de versão esperada
    public void append(String accountId, int expectedVersion, List<DomainEvent> events)
            throws SQLException {
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false); // transação curta: só os eventos desta conta
            try {
                // 1) Checa a versão mais recente e compara com a esperada
                int currentVersion = getCurrentVersion(conn, accountId);
                if (currentVersion != expectedVersion) {
                    throw new VersionConflictException(
                        "Version conflict! Expected " + expectedVersion + ", got " + currentVersion);
                }

                // 2) Insere cada evento com a versão seguinte
                String insert = "INSERT INTO events " +
                    "(aggregate_id, version, event_type, payload, created_at) " +
                    "VALUES (?, ?, ?, CAST(? AS JSONB), NOW())";
                try (PreparedStatement stmt = conn.prepareStatement(insert)) {
                    for (DomainEvent event : events) {
                        stmt.setString(1, accountId);
                        stmt.setInt(2, ++currentVersion);
                        stmt.setString(3, event.getClass().getName());
                        stmt.setString(4, event.toPayloadJson());
                        stmt.executeUpdate();
                    }
                }
                conn.commit();
            } catch (SQLException | RuntimeException ex) {
                conn.rollback();
                // 3) Outro escritor gravou a mesma (aggregate_id, version) entre a leitura e o insert
                if (ex instanceof SQLException sqlEx && UNIQUE_VIOLATION.equals(sqlEx.getSQLState())) {
                    throw new VersionConflictException("Version conflict on insert", sqlEx);
                }
                throw ex;
            }
        }
    }
}
```

Quem chama trata o conflito recarregando o estado e revalidando o comando — o saldo pode não ser mais suficiente depois do evento que entrou antes:

```java title="WithdrawHandler.java"
// Retry em caso de conflito de versão
public void handleWithdrawCommand(String accountId, BigDecimal withdrawAmount)
        throws SQLException {
    for (int attempt = 1; ; attempt++) {
        // Reconstrói o estado da conta a partir dos eventos
        List<DomainEvent> events = eventStore.loadEvents(accountId);
        AccountAggregate aggregate = new AccountAggregate(accountId, events);
        int expectedVersion = aggregate.getVersion(); // ex.: 5

        // Regra de negócio: recusa o saque se o saldo não for suficiente
        List<DomainEvent> newEvents = aggregate.withdraw(withdrawAmount);

        try {
            eventStore.append(accountId, expectedVersion, newEvents);
            return;
        } catch (VersionConflictException ex) {
            // Outro evento entrou antes: recarrega e revalida na próxima volta
            if (attempt == MAX_ATTEMPTS) {
                throw ex;
            }
        }
    }
}
```

**Fonte:** [Building a Reliable Ledger in an Event-Sourced System Without Big DB Transactions](https://new2026.medium.com/building-a-reliable-ledger-in-an-event-sourced-system-without-big-db-transactions-879061a7ff87)

## 2. How to Scale a Ledger, Part I — por que usar um banco de ledger

**Visão geral:** toda empresa que move dinheiro em escala precisa de um ledger — um banco de dados double-entry — como fonte única da verdade, em vez de espalhar a lógica financeira pelos modelos de domínio (o objeto "pedido", "corrida", "reserva").

**Pontos importantes:**

- **Por que os modelos tradicionais falham em escala:**
  - as exigências de relatório e auditoria crescem (é preciso saber origem e destino de cada centavo);
  - os dados ficam fragmentados entre vários serviços e produtos SaaS que não se integram;
  - a performance degrada (jobs de repasse perdem o prazo, a checagem de autorização de cartão atrasa);
  - cenários de falha (cobrança a mais, saldo insuficiente, fraude) ficam mais frequentes e difíceis de reverter.
- **Modelo de dados central:** **accounts** (porções separadas de valor), **transactions** (eventos monetários atômicos) e **entries** (os débitos e créditos individuais que compõem a transaction).
- **As quatro garantias de um ledger escalável:**
  1. **Imutabilidade** — estados passados sempre podem ser recuperados; as mudanças são permanentes e consultáveis.
  2. **Double-entry obrigatório** — não dá para mover dinheiro sem informar a origem e o destino.
  3. **Controle de concorrência** — o mesmo dinheiro não pode ser gasto duas vezes, mesmo com escritas paralelas ou fora de ordem.
  4. **Agregações eficientes** — somar eventos financeiros de um período é rápido.
- **O problema da "tradução":** engenheiros de produto falam a língua do domínio (pedidos, corridas, reservas), mas precisam traduzi-la para a língua de finanças (débitos, créditos, ativos, passivos) — com eventos que chegam fragmentados, de APIs diferentes e de registros que mudam.
- **Consequência real de erros:** um líder de produto de uma grande empresa de pagamentos contou que, todo mês, o time financeiro notava "alguns milhões de dólares" sumidos do ledger. O dinheiro continuava no banco; o que se perdia era a **atribuição** (o registro de a quem ele pertence).
- **Por que não construir do zero:** um ledger double-entry performático e confiável leva anos de esforço e dezenas de engenheiros sênior; hoje há bancos de dados de ledger prontos.

**Fonte:** [How to Scale a Ledger, Part I](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-i)

## 3. Part II — mapeando eventos financeiros

**Visão geral:** detalha os três objetos centrais (account, entry, transaction), como mapear eventos financeiros reais neles e como calcular os diferentes tipos de saldo.

**Pontos importantes:**

- **Dois princípios básicos:** todo evento monetário é registrado num modelo double-entry consistente, e **todos os saldos** mostrados a usuários e sistemas são **lidos desse modelo** (nunca de um campo mutável solto).
- **Account = porção separada de valor**, numa moeda. Ela deve informar três saldos:
  - **Posted (lançado):** apenas o que já liquidou.
  - **Pending (pendente):** o que já liquidou mais o que deve liquidar.
  - **Available (disponível):** o que pode sair agora — desconta as saídas previstas e não conta as entradas ainda não liquidadas.
- **O ciclo de vida de um cartão de crédito** ilustra como cada ação afeta esses saldos: compra de passagem (pendente), liquidação, pagamento da fatura, pré-autorização de hotel e sua liberação.
- **Entry = registro imutável de movimento.** Saldos nunca são alterados diretamente; toda mudança entra como uma entry. Os campos centrais (`amount`, `direction`) são imutáveis; o único campo mutável é `discarded_at`, usado só para substituir entries pendentes.
- **Descartar × reverter:** só entries `pending` podem ser substituídas; entries `posted` e `archived` são permanentes. Descartar a pendente, em vez de criar uma entry de reversão, mantém o histórico limpo — os débitos reais do cliente não se misturam com débitos criados só para reverter.
- **Normalidade da conta (ponto-chave):** cada conta é **debit normal** (usos de recursos: ativos e despesas — aumentam com débito) ou **credit normal** (fontes de recursos: passivos, patrimônio líquido e receita — aumentam com crédito). Com números positivos e negativos, um depósito não conseguiria aumentar as duas contas envolvidas ao mesmo tempo, porque uma delas teria de ficar negativa para a soma fechar.
- **Cinco campos para calcular qualquer saldo:** `posted_debits`, `posted_credits`, `pending_debits`, `pending_credits` e `normal_balance`. O ledger deve buscar esses cinco campos rapidamente e só calcular os saldos quando alguém pedir.

As fórmulas do artigo, em Java (lembrando que, no modelo da Modern Treasury, os totais `pending_*` já incluem o que está `posted`):

```java title="BalanceCalculator.java"
enum NormalBalance { CREDIT, DEBIT }

public class BalanceCalculator {

    // Posted balance
    public BigDecimal postedBalance(NormalBalance normal,
                                    BigDecimal postedCredits,
                                    BigDecimal postedDebits) {
        return switch (normal) {
            case CREDIT -> postedCredits.subtract(postedDebits);
            case DEBIT  -> postedDebits.subtract(postedCredits);
        };
    }

    // Pending balance
    public BigDecimal pendingBalance(NormalBalance normal,
                                     BigDecimal pendingCredits,
                                     BigDecimal pendingDebits) {
        return switch (normal) {
            case CREDIT -> pendingCredits.subtract(pendingDebits);
            case DEBIT  -> pendingDebits.subtract(pendingCredits);
        };
    }

    // Available balance
    public BigDecimal availableBalance(NormalBalance normal,
                                       BigDecimal postedCredits,
                                       BigDecimal postedDebits,
                                       BigDecimal pendingCredits,
                                       BigDecimal pendingDebits) {
        return switch (normal) {
            case CREDIT -> postedCredits.subtract(pendingDebits);
            case DEBIT  -> postedDebits.subtract(pendingCredits);
        };
    }
}
```

**Fonte:** [How to Scale a Ledger, Part II](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-ii)

## 4. Part III — o modelo de transaction

**Visão geral:** a **transaction**, que agrupa as entries, é o que garante movimento de dinheiro atômico e obriga o double-entry. Sem ela, dá para deixar o ledger inconsistente registrando só parte de um movimento.

**Pontos importantes:**

- **Uma transaction garante:** **atomicidade** (todas as entries têm sucesso ou falham juntas), **consistência** (nada de mudanças parciais) e **double-entry** (entries sempre balanceadas).
- **O risco sem transaction:** se a entry de débito grava, mas a de crédito falha (por exemplo, por um problema de rede), um lado foi debitado e o outro não recebeu nada — o dinheiro se perdeu.
- **A API só deve permitir criar transactions, nunca entries avulsas.** Assim o cliente não consegue deixar um movimento pela metade; as entries são gerenciadas internamente.
- **Três estados da transaction:**
  1. **Pending** (estado inicial): grava débito e crédito como `pending`, ainda não finalizados.
  2. **Posted** (finalizado): como entries são imutáveis, as pendentes são descartadas e novas entries `posted` são criadas.
  3. **Archived** (cancelado antes de ser lançado): só transactions pendentes podem ser arquivadas; as entries pendentes são descartadas e novas entries `archived` são criadas, preservando o histórico do cancelamento.
- **Tudo ou nada:** todas as entries não descartadas de uma transaction têm o mesmo status que ela, e por isso mudam de status juntas.

**Fonte:** [How to Scale a Ledger, Part III](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-iii)

## 5. Part IV — registrar × autorizar

**Visão geral:** um ledger opera em dois modos. No **recording** (registro), ele só anota o que já aconteceu em outros sistemas; no **authorizing** (autorização), aprova ou nega transactions ativamente. A maioria das implementações só escala bem em um dos dois; o ideal é escolher o modo no nível da entry.

**Pontos importantes:**

- **Recording:** alto volume de escrita (milhares por segundo ou mais), processamento assíncrono (as leituras podem ficar alguns segundos defasadas, com consistência eventual) e suporte a consultas complexas. Aqui o ledger **não é** a fonte da verdade — ele reflete o que já aconteceu em outro lugar (banco, processadora de cartão).
  - **`effective_at`:** data e hora informadas pelo cliente para retroagir a transaction ao momento em que o dinheiro realmente se moveu. Todas as entries herdam o `effective_at` da transaction.
  - **Versões do saldo da conta:** como saldos passados podem mudar, cada conta tem uma `version` incrementada sempre que uma entry é criada ou modificada. Cada entry guarda o `account_version` correspondente, o que permite saber exatamente quais entries compõem um saldo.
  - **Casos de uso:** exibir detalhes da conta, repasses (payouts), gestão de empréstimos, cripto.
- **Authorizing:** consistência *read-after-write* (a leitura logo após a escrita já enxerga o novo saldo), volume menor (a performance degrada perto de 100 entries por segundo numa mesma conta), verificações de saldo e controle de concorrência. É o modo para mover dinheiro em tempo real, validando se há saldo — carteiras digitais e autorização de cartão.
  - **Version locking:** o cliente envia a versão da conta junto com o pedido, e o ledger rejeita se a versão no banco for outra (bloqueio otimista). O algoritmo: inicia a transação de banco → grava a entry → atualiza a versão da conta com condição na versão atual → faz commit se a atualização aconteceu, senão rollback.
  - **Balance locking:** o version locking sofre com *hot accounts* — contas com tanta escrita que a versão muda antes de o cliente conseguir usá-la. A alternativa é condicionar a escrita ao **saldo** (por exemplo, `gte: 0`: só grava se o saldo não ficar negativo). No exemplo do artigo, o mesmo resultado sai em 2 chamadas em vez de 6, e a API expressa melhor a intenção.
- **Modo misto (o ideal):** decidir entre recording e authorizing **por entry**, não por conta. Numa autorização de cartão, a entry da conta do cliente precisa de balance lock e consistência forte, enquanto a entry da conta da processadora (liquidada uma vez por dia) pode ter consistência eventual e alto volume. As duas continuam atômicas na mesma transaction.

**Fonte:** [How to Scale a Ledger, Part IV](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-iv)

## 6. Part V — imutabilidade e double-entry a fundo

**Visão geral:** aprofunda duas das quatro garantias: imutabilidade (qualquer estado passado do ledger pode ser reconstruído) e double-entry (dinheiro não pode ser criado nem destruído).

**Pontos importantes:**

- **Imutabilidade apesar de campos mutáveis:** o saldo das accounts muda, transactions passam de pending para posted ou archived, entries podem ser descartadas — mas tudo é construído sobre um **log append-only imutável**. Nada é apagado de fato.
- **Como consultar estados passados:** as entries de uma conta num dado instante são as que têm `effective_at` menor ou igual a esse instante e não tinham sido descartadas até lá (consulta abaixo).
- **Versões para precisão:** só a data e hora não bastam, porque várias entries podem ter o mesmo `effective_at` ou `discarded_at`. As versões da conta gravadas nas entries dizem exatamente quais entries formam um saldo, e as versões passadas da transaction permitem reconstruir estados anteriores.
- **Log de auditoria:** além do estado, registre **o que** mudou, **quem** mudou e **quando** (várias chaves de API, usuários internos pelo painel administrativo). O artigo recomenda um log de auditoria ao lado do ledger.
- **Validação do double-entry:** toda transaction precisa de pelo menos uma entry de débito e uma de crédito, e **débitos = créditos em cada moeda**.
- **Por que balancear por moeda:** numa compra de 1 ETH com dólares, validar só o total quebra — dá para creditar ETH criado do nada e debitar dólares que simplesmente somem. O certo é **agrupar as entries por moeda** e validar cada grupo. Uma conversão de moeda sempre envolve pelo menos 4 contas (a plataforma precisa de uma conta em ETH de onde sai a cripto e de uma em dólar onde entra o dinheiro do cliente); modelar com só 2 contas e uma taxa de câmbio não funciona, porque a taxa varia no tempo e não existe uma taxa única aceita por todos.

```java title="EntryRepository.java"
// Busca as entries presentes numa conta num determinado effective time
public List<Entry> findEntriesAt(String accountId, Instant timestamp) throws SQLException {
    String sql =
        "SELECT * FROM entries " +
        "WHERE account_id = ? " +
        "  AND effective_at <= ? " +
        "  AND (discarded_at IS NULL OR discarded_at >= ?)";
    try (Connection conn = dataSource.getConnection();
         PreparedStatement stmt = conn.prepareStatement(sql)) {
        stmt.setString(1, accountId);
        stmt.setTimestamp(2, Timestamp.from(timestamp));
        stmt.setTimestamp(3, Timestamp.from(timestamp));
        try (ResultSet rs = stmt.executeQuery()) {
            List<Entry> entries = new ArrayList<>();
            while (rs.next()) {
                entries.add(Entry.fromResultSet(rs));
            }
            return entries;
        }
    }
}
```

**Fonte:** [How to Scale a Ledger, Part V](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-v)

## 7. Part VI — concorrência, performance e o job de conciliação

**Visão geral:** as duas últimas garantias — controle de concorrência (evitar gastar o mesmo dinheiro duas vezes) e performance (leitura rápida de saldo) — e o **job que detecta drift no cache de saldo**, que fecha o padrão "registro + saldo + conciliação". É o artigo que melhor mostra a conciliação interna na prática.

**Pontos importantes:**

- **Chaves de idempotência:** o cenário clássico — o cliente envia o pedido, o ledger demora, o cliente estoura o timeout e tenta de novo; o pedido original termina e o ledger cria a transaction duas vezes. A solução é deduplicar com uma chave de idempotência: uma string enviada pelo cliente e **gerada fora do loop de retry**, para que todas as tentativas usem a mesma. Se o ledger recebe uma chave que já conhece, devolve a resposta da primeira requisição. As chaves ficam guardadas por 24 horas.
- **Performance — cache de saldo:** calcular o saldo somando as entries é O(n) e fica lento com dezenas ou centenas de milhares de entries. A solução é **cachear** `pending_debits`, `pending_credits`, `posted_debits` e `posted_credits` numa linha da conta.
  - **Cache do saldo atual:** reflete todas as entries e é atualizado **de forma síncrona** quando entries de autorização são gravadas, porque é ele que sustenta o balance locking. Quem faz a conta de forma atômica é o banco.
  - **Cache de saldo por data efetiva:** mais complexo, com duas abordagens — *anchoring* (guarda o saldo do fim de cada dia e aplica as entries do dia por cima) e *resulting balances* (guarda o saldo resultante após cada entry, útil para contas com muitas entries no mesmo dia). No anchoring, a atualização é assíncrona: as entries entram numa fila e o cache é atualizado em lotes.
- **Monitorando o drift do cache (o job de conciliação):** ler o saldo do cache melhora a performance, mas o cache pode divergir das entries, que são a fonte da verdade. O tratamento tem três passos:
  1. **Verificar regularmente** se o saldo em cache de cada conta bate com a **soma das entries**.
  2. **Desligar automaticamente** a leitura do cache nas contas com drift.
  3. Oferecer **ferramentas de backfill** (recalcular o cache a partir das entries) e um runbook para o plantão investigar e corrigir o drift.

![O job de conciliação compara a soma das entries com o saldo em cache e, se houver drift, desliga a leitura do cache e aciona backfill e runbook](/posts/arquitetura-de-ledger/job-de-conciliacao.svg)

- **Tópicos avançados de escala:** *account categories* (um modelo em grafo para agregar grupos de contas em relatórios); busca de transactions com paginação por cursor, não por offset; **filas de escrita assíncronas** que absorvem picos de carga — as fintechs líderes passam facilmente de 5.000 QPS (requisições por segundo); e sharding de contas entre bancos, seja manual, seja com bancos distribuídos como Spanner ou CockroachDB — com o desafio de manter a atomicidade do double-entry entre shards.

```java title="RetryComIdempotencia.java"
// Idempotency key gerada FORA do loop de retry (mesma string em todas as tentativas)
String idempotencyKey = UUID.randomUUID().toString();
TransactionResponse response = null;

for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    response = createTransaction(idempotencyKey);
    if (response.isSuccessful()) {
        break;
    }
}
```

```java title="ReconciliationJob.java"
// Conceito do job de conciliação: comparar saldo em cache com a soma das entries
public void reconcileAccount(String accountId) throws SQLException {
    BigDecimal cachedBalance = balanceCache.getBalance(accountId);
    BigDecimal computedBalance = sumAllEntries(accountId); // SUM() sobre as entries

    if (cachedBalance.compareTo(computedBalance) != 0) {
        // Drift detectado: desliga a leitura do cache e alerta o plantão (backfill + runbook)
        balanceCache.disableReads(accountId);
        alerting.raiseDrift(accountId, cachedBalance, computedBalance);
    }
}
```

**Fonte:** [How to Scale a Ledger, Part VI](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-vi)

## 8. Accounting for Developers, Part I — os fundamentos

**Visão geral:** introdução à contabilidade para desenvolvedores: os conceitos de double-entry traduzidos para termos técnicos, para quem constrói sistemas que movem dinheiro.

**Pontos importantes:**

- **Princípio central:** toda transaction registra **de onde o dinheiro veio** e **em que foi usado**. Com isso você reconstrói saldos em qualquer data, rastreia o movimento com auditabilidade total e alinha a lógica do sistema com as finanças reais.
- **Falha mais comum:** o software criar ou destruir registros de dinheiro por acidente. Os sintomas: registros internos diferentes do extrato do banco, ferramentas de conciliação apontando divergências, saldos que não fazem sentido diante das transactions. Uber, Square e Airbnb são citadas como empresas que adotaram double-entry.
- **Conceitos:** **account** (porção separada de valor), **transaction** (evento atômico que afeta saldos; tem pelo menos duas entries, afeta duas ou mais contas e mantém o ledger balanceado) e **ledger** (log de eventos com impacto monetário).
- **Não altere saldos diretamente:** guarde transactions imutáveis e **sempre calcule o saldo a partir delas**. Alterar o saldo direto parece mais simples e eficiente, mas gera um sistema propenso a erros difíceis de detectar e de conciliar.
- **Debit normal × credit normal:** contas debit normal representam o que você tem ou os usos do dinheiro (ativos, despesas) e aumentam com débito; contas credit normal representam o que você deve ou as fontes do dinheiro (passivos, patrimônio líquido, receita) e aumentam com crédito.

| Tipo de conta | Débito | Crédito |
| --- | --- | --- |
| Ativo (asset) | + | − |
| Passivo (liability) | − | + |
| Patrimônio líquido (equity) | − | + |
| Receita (revenue) | − | + |
| Despesa (expense) | + | − |

- **Ledger balanceado:** a soma dos saldos das contas credit normal é igual à soma dos saldos das contas debit normal. Se não bate, o sistema criou ou perdeu dinheiro do nada.
- **Detalhe contraintuitivo:** duas contas podem aumentar **ao mesmo tempo**. No exemplo do artigo, a Modern Bagelry, uma loja on-line de bagels, recebe um aporte de \$1 milhão: o caixa (ativo, debit normal) sobe com um débito e o patrimônio líquido (credit normal) sobe com um crédito.

**Fonte:** [Accounting for Developers, Part I](https://www.moderntreasury.com/journal/accounting-for-developers-part-i)

## 9. Part II — o ledger de uma carteira digital

**Visão geral:** aplica os fundamentos construindo, passo a passo, o ledger de uma carteira digital no estilo do Venmo: requisitos → plano de contas → modelagem das transactions → modelagem do banco.

**Pontos importantes:**

- **Plano de contas (chart of accounts) do app:** **Cash** (o dinheiro real no banco) → ativo, debit normal; **saldo da carteira de cada usuário** (uma conta por usuário) → passivo, credit normal (a empresa "deve" esse dinheiro ao usuário); **taxas de processamento de cartão** → despesa, debit normal; **receita** com tarifas → credit normal.
- **Três transactions modeladas:**
  1. **Transferência (\$100 de A para B):** debita a carteira de quem envia e credita a de quem recebe.
  2. **Depósito com cartão:** crédito de \$300 na carteira, contrabalançado por dois débitos — taxa de cartão (\$6, ou 2%) e caixa (\$294). Um único evento com várias entries.
  3. **Saque:** saque de \$500 com tarifa de 0,5% (\$2,50) → debita \$502,50 da carteira, credita \$497,50 no caixa e \$2,50 na receita.
- **Modelagem do banco:** `accounts` (`id`, `user_id`, `account_type`, `normality`), `transactions` (`id`, `timestamp`, `description`) e `entries` (`id`, `transaction_id`, `account_id`, `amount`, `direction`). **Invariante a garantir:** soma dos débitos = soma dos créditos **em cada transaction**.

```java title="ModeloLedger.java"
enum Normality { DEBIT, CREDIT }
enum Direction { DEBIT, CREDIT }

// userId é nulo nas contas internas; accountType: "USER_WALLET", "CASH", "REVENUE", "CARD_FEES"
record Account(long id, Long userId, String accountType, Normality normality) {}

record Entry(long id, long transactionId, long accountId, BigDecimal amount, Direction direction) {}

record LedgerTransaction(long id, Instant timestamp, String description, List<Entry> entries) {

    // Invariante: soma dos débitos == soma dos créditos
    boolean isBalanced() {
        return total(Direction.DEBIT).compareTo(total(Direction.CREDIT)) == 0;
    }

    private BigDecimal total(Direction direction) {
        return entries.stream()
            .filter(e -> e.direction() == direction)
            .map(Entry::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

O depósito do artigo, montado com esse modelo:

```java title="Deposito.java"
// Contas: 1 = carteira do Art, 2 = taxas de cartão, 3 = caixa
var deposito = new LedgerTransaction(10, Instant.now(), "Depósito com cartão", List.of(
    new Entry(100, 10, 1, new BigDecimal("300.00"), Direction.CREDIT),
    new Entry(101, 10, 2, new BigDecimal("6.00"), Direction.DEBIT),
    new Entry(102, 10, 3, new BigDecimal("294.00"), Direction.DEBIT)));

System.out.println(deposito.isBalanced()); // true
```

Com várias moedas, a mesma checagem deve ser feita em cada moeda, como mostra a Part V.

**Fonte:** [Accounting for Developers, Part II](https://www.moderntreasury.com/journal/accounting-for-developers-part-ii)

## 10. Part III — um marketplace de empréstimos

**Visão geral:** aplica os princípios num marketplace de empréstimos entre pessoas (P2P), com juros, amortização, investidores e tomadores.

**Pontos importantes:**

- **Dois tipos de dado:** o **histórico** (o que já aconteceu, baseado em transactions lançadas) fica no ledger; o **prospectivo** (taxas de juros, prazos, divisão de cada parcela entre juros e principal) fica **fora** dele, numa **tabela de amortização**. Separar os dois mantém o ledger limpo.
- **Plano de contas:** caixa (debit normal), receita de juros (credit normal) e **duas contas por usuário** (principal e juros). As contas do investidor são credit normal (a plataforma deve a ele); as do tomador são debit normal (ele deve à plataforma).
- **Cinco transactions modeladas:** depósito do investidor; desembolso ao tomador; **apropriação mensal de juros**; pagamento mensal do tomador; pagamento ao investidor no vencimento. Na apropriação de juros, o investidor recebe 4,8% ao ano e o tomador paga 12%: credita \$40 por mês nos juros do investidor, debita \$50 nos juros do tomador, e a diferença de \$10 vai para a **receita** — o spread da plataforma.
- **Arquitetura final:** um **ledger central** com as restrições de double-entry, um **Transaction Logic Service** (converte eventos e webhooks em entries válidas), uma **tabela de amortização** (calcula as parcelas) e um **plano de contas** com pelo menos 6 tipos de conta.

**Fonte:** [Accounting for Developers, Part III](https://www.moderntreasury.com/journal/accounting-for-developers-part-iii)

## 11. Arquitetura de plataformas de fidelidade (Open Loyalty)

**Visão geral:** a arquitetura de plataformas de pontos e fidelidade — um domínio onde o mesmo padrão de ledger aparece fora do dinheiro. O artigo defende plataformas modulares e API-first, com o **ledger de pontos** como um dos componentes centrais.

**Pontos importantes:**

- **Componentes centrais:** motor de regras (avalia as ações do cliente e decide o que disparar), **ledger de pontos** (cada ponto ganho, resgatado, transferido ou expirado, com trilha de auditoria completa), serviço de entrega das recompensas (*fulfillment*), camada de API, camada de eventos e mensageria e camada de dados do cliente.
- **O ledger de pontos é um dos componentes mais exigentes:** quando o cliente conclui uma compra, **os pontos devem ser creditados exatamente uma vez**, mesmo que a requisição seja repetida ou processada duas vezes. Um ledger que erra isso produz erros de saldo difíceis de detectar e caros de corrigir. Plataformas modernas o tratam como **serviço independente**, e não como um campo no cadastro do cliente.
- **Idempotência na API é essencial** — concessão ou resgate duplicado de pontos é um risco operacional real.
- **Fluxo ponta a ponta:** compra → chamada de API → a camada de eventos roteia para o motor de regras → o motor avalia campanhas e categoria do cliente → o fulfillment gera a recompensa → **o ledger é atualizado com registro de auditoria** → o evento "recompensa emitida" segue para os outros sistemas. As falhas ficam contidas: se o fulfillment atrasa, a atualização do ledger ainda termina.
- **Quando essa complexidade não é necessária:** num programa simples, no início ou em um único canal, uma plataforma tudo-em-um é mais pragmática. A arquitetura deve seguir as necessidades reais do programa.

**Fonte:** [Loyalty System Architecture](https://www.openloyalty.io/insider/loyalty-system-architecture-how-modern-platforms-are-built)

## 12. Payment Ledger Architecture (Trio) — os 6 fatores

**Visão geral:** define um ledger de pagamentos por seis fatores e apresenta a stack em que a maioria dos sistemas em produção converge. É o resumo mais direto e prático do conjunto.

**Os 6 fatores:**

1. **Double-entry como invariante do banco, não da aplicação:** débito, crédito e metadados da mesma entry são gravados numa **única transação atômica de banco**. Uma CHECK constraint ou uma validação antes do commit confirma que a entry soma zero. Errar isso gera drift de saldo silencioso.
   Um cuidado prático: no PostgreSQL, uma CHECK constraint só enxerga a linha que está sendo gravada. Se débito e crédito ficam em linhas separadas, a soma precisa ser validada por um *constraint trigger* adiado para o fim da transação (`DEFERRABLE INITIALLY DEFERRED`) ou pela aplicação antes do commit.
2. **Derivar saldos das entries, nunca guardar um saldo corrente:** uma coluna `balance` mutável **sofre drift** com escrita concorrente, falha parcial, correção manual ou migração. Em escala, fazer `SUM()` a cada leitura fica caro, então crie um **saldo materializado**: uma visão em cache, otimizada para leitura, recalculada quando novas entries são lançadas — e **sempre conferida contra as entries na conciliação**.
3. **Journals imutáveis com reversões explícitas (sem UPDATE nem DELETE):** o *journal* é a tabela de lançamentos, e ela precisa ser inalterável para valer em auditorias (SOC 2, PCI DSS, exames de AML/KYC). Reverter = lançar uma **nova** entry compensatória. O usuário de banco usado pelo posting engine (o serviço que grava os lançamentos) **não deve ter permissão** de UPDATE ou DELETE nas tabelas de journal.
4. **Modelo de três saldos:** **ledger balance** (liquidado), **pending** (em trânsito) e **available** (o que pode ser gasto agora). Juntar os três num só aumenta o risco de o cliente gastar mais do que tem, inclusive valores bloqueados ou ainda em trânsito.
5. **CQRS — separar escrita e leitura:** a escrita é fortemente consistente, atômica e durável; a leitura é rápida, via saldo materializado. Quando o saldo alimenta uma **decisão financeira**, o posting engine valida contra o journal, não contra a visão materializada, que pode estar defasada.
6. **Conciliação como entregável de engenharia, não planilha do financeiro:** há a correção **interna** (entries balanceadas, saldos derivados batendo com o journal) e a **externa** (o ledger batendo com processadora, bandeira, banco parceiro e câmara de compensação). O caminho é um **pipeline automatizado** que roda todo dia ou após cada janela de liquidação, compara linha a linha e expõe as divergências com classificação de severidade (diferença de prazo × divergência real), alertas e acompanhamento das exceções. Segundo o artigo, o colapso da Synapse em 2024 foi em grande parte uma falha de conciliação do ledger.

**A stack de referência:**

![Stack de referência: posting engine grava no journal do PostgreSQL e publica no Kafka; o balance materializer mantém os saldos, com Redis para contas quentes; o pipeline de conciliação compara arquivos externos com o journal e registra exceções](/posts/arquitetura-de-ledger/stack-de-referencia.svg)

No diagrama, o **posting engine** valida o double-entry, grava as entries atomicamente no **journal** (PostgreSQL, append-only) e publica o evento `JournalEntryPosted` no **Kafka**. O **balance materializer** consome esses eventos e mantém os três saldos, usando **Redis** para contas muito movimentadas. O **pipeline de conciliação** roda em jobs agendados (Airflow, Dagster ou Prefect): lê os arquivos externos — relatórios da processadora, extratos bancários, arquivos da bandeira —, compara cada linha com o journal e grava as divergências numa tabela de exceções, com alertas. Para volumes muito altos, o artigo cita bancos SQL distribuídos como CockroachDB e Google Spanner.

**Construir ou comprar:** construa se o ledger é diferencial competitivo, se o time já construiu ledgers em produção ou se os requisitos vão além do que um Ledger-as-a-Service (LaaS, ledger oferecido como serviço) suporta. Use LaaS ou open-source (Formance Ledger, Blnk) se o ledger é infraestrutura e o tempo até o mercado importa mais. A maioria começa melhor com LaaS ou open-source e migra para uma solução própria quando a plataforma deixa de atender algum requisito.

**Fonte:** [Payment Ledger Architecture: How Modern Fintechs Design Ledgers](https://trio.dev/payment-ledger-architecture-fintech/)

## Síntese — o padrão em que os 12 artigos convergem

Independentemente do domínio — banco digital, carteira, marketplace, programa de pontos —, o desenho final é o mesmo:

- **Cada movimento** é uma entry imutável num ledger append-only, protegida por **chave de idempotência** para nunca ser lançada duas vezes.
- **O saldo** é um **saldo materializado**: um cache de leitura rápida, atualizado de forma síncrona quando sustenta autorizações (seção 7) ou de forma assíncrona a partir dos eventos (seção 12) — mas sempre **derivado e reconstruível** a partir das entries, nunca a fonte da verdade.
- **A conciliação** é um job ou pipeline que soma as entries de cada conta, compara com o saldo materializado, detecta drift, desliga a leitura do cache da conta afetada e alerta — e, havendo sistema externo, confere o ledger também contra ele.
- **Double-entry vale além do dinheiro.** Levando o raciocínio dos artigos para um programa de pontos: ao conceder pontos, credita-se a conta do cliente e debita-se uma conta interna de pontos emitidos. Assim a soma sempre fecha e qualquer drift fica detectável.

Quando um efeito externo (a captura no parceiro, por exemplo) pode dar certo sem que o registro local seja gravado, a conciliação externa ganha um aliado: gravar a intenção antes de agir, tema de [Efeito externo sem registro local](/posts/efeito-externo-sem-registro-local/).

## Fontes

Os 12 artigos resumidos:

- [Building a Reliable Ledger in an Event-Sourced System Without Big DB Transactions](https://new2026.medium.com/building-a-reliable-ledger-in-an-event-sourced-system-without-big-db-transactions-879061a7ff87) — Medium
- [How to Scale a Ledger, Part I](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-i) — Modern Treasury
- [How to Scale a Ledger, Part II](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-ii) — Modern Treasury
- [How to Scale a Ledger, Part III](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-iii) — Modern Treasury
- [How to Scale a Ledger, Part IV](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-iv) — Modern Treasury
- [How to Scale a Ledger, Part V](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-v) — Modern Treasury
- [How to Scale a Ledger, Part VI](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-vi) — Modern Treasury
- [Accounting for Developers, Part I](https://www.moderntreasury.com/journal/accounting-for-developers-part-i) — Modern Treasury
- [Accounting for Developers, Part II](https://www.moderntreasury.com/journal/accounting-for-developers-part-ii) — Modern Treasury
- [Accounting for Developers, Part III](https://www.moderntreasury.com/journal/accounting-for-developers-part-iii) — Modern Treasury
- [Loyalty system architecture: How modern platforms are built](https://www.openloyalty.io/insider/loyalty-system-architecture-how-modern-platforms-are-built) — Open Loyalty
- [Payment Ledger Architecture: How Modern Fintechs Design Ledgers](https://trio.dev/payment-ledger-architecture-fintech/) — Trio

Documentação usada nos exemplos e observações técnicas:

- [PostgreSQL — Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) (CHECK constraint só valida a linha gravada)
- [PostgreSQL — CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html) (constraint triggers adiados)
- [PostgreSQL — Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html) (`23505 unique_violation`)
