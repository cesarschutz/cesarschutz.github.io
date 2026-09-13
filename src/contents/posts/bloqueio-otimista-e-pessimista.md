---
title: "Arquitetura · Sessão 03 — Bloqueio otimista e pessimista"
published: 2026-09-13
description: "As duas formas de impedir que duas gravações simultâneas se atropelem: detectar o conflito com coluna de versão, ou evitar travando a linha. Com SQL e Spring Data JPA. **Também caiu aqui:** lost update, `FOR UPDATE` com NOWAIT e SKIP LOCKED, deadlock e como preveni-lo, níveis de isolamento do Postgres, e quando um único UPDATE condicional dispensa os dois."
tags: [Arquitetura, Banco de Dados, Concorrência]
category: Arquitetura
cover: /covers/sessao-03-bloqueios.svg
draft: false
---

> Sessão 03 da série **Aprendizado de arquitetura** — desta vez sem desafio: sessão de estudo puro, a partir de um material que eu trouxe. O tema já tinha aparecido de raspão na [Sessão 00](/posts/cobranca-duplicada-no-retry/), como a alternativa à restrição única.

## 1. O problema que os dois resolvem

Os dois existem para o mesmo defeito, que tem nome: **lost update**, a atualização perdida.

Dois clientes leem a mesma linha, cada um calcula um valor novo a partir do que leu, e os dois gravam. A segunda gravação sobrescreve a primeira, e a primeira desaparece sem erro nenhum. O saldo fica errado e o log está limpo.

Repare que é a mesma família da [Sessão 00](/posts/cobranca-duplicada-no-retry/): ler, decidir e gravar como operações separadas, com uma janela no meio. Lá resolvemos com restrição única, que funciona quando a decisão cabe numa chave. Aqui o caso é outro: a decisão depende do **valor lido**, e não existe chave que expresse isso.

A diferença entre os dois bloqueios cabe numa frase, que é do Martin Fowler: **bloqueio otimista é detecção de conflito; bloqueio pessimista é prevenção de conflito.**

**A analogia que ele usa é controle de versão**, e vale porque você convive com ela todo dia. Duas pessoas precisam mexer no mesmo arquivo.

No jeito otimista — o do Git — as duas baixam o arquivo e editam à vontade, sem pedir permissão a ninguém. Quem termina primeiro sobe sem problema. Quando a segunda tenta subir, o sistema compara e recusa: *isto aqui mudou desde que você baixou.* Aí ela resolve o conflito e sobe de novo.

No jeito pessimista — como o SourceSafe e o CVS antigos faziam — quem chega primeiro faz o *check-out* e trava o arquivo. A segunda pessoa simplesmente não consegue editar até a primeira liberar. Conflito nunca acontece, porque nunca houve duas edições ao mesmo tempo.

**Três consequências que a frase carrega**, e que valem mais do que a frase:

- **Onde o custo cai.** No otimista, o caso normal é gratuito: ninguém espera por ninguém, e só se paga quando o conflito de fato acontece. No pessimista, o custo é cobrado sempre — mesmo quando ninguém mais ia mexer naquela linha, o segundo espera do mesmo jeito. Um cobra por conflito; o outro cobra por acesso.
- **Quem lida com a falha.** **Detecção produz erro, e erro precisa de dono: alguém relê, refaz e tenta outra vez. Prevenção não produz erro nenhum — produz espera.** Por isso o pessimista parece mais simples no código: não há caminho de exceção para escrever. O preço disso está escondido no comportamento sob carga, não no código.
- **O que acontece com o trabalho já feito.** No otimista, a segunda pessoa trabalhou e pode ter que jogar fora. No pessimista, ela nem começou — ficou parada. **Quando o trabalho é caro ou demorado, jogar fora dói; quando é barato, esperar dói mais.**

A aposta de cada um está no próprio nome. Otimista aposta que conflito é raro, e se estiver certo você ganha concorrência de graça. Pessimista aposta que conflito é provável, e se estiver certo você evita um monte de trabalho perdido. **Escolher entre os dois é uma aposta sobre a frequência de conflito na sua carga** — e isso é medição, não gosto pessoal.

## 2. Bloqueio otimista

A aposta é que conflito é raro. Ninguém trava nada; todo mundo lê e trabalha à vontade. Na hora de gravar, a escrita carrega a pergunta junto: *o dado ainda está como eu li?*

A forma de perguntar isso é uma coluna de versão. Todo UPDATE incrementa a versão e filtra pela versão antiga. Se o filtro não casar, o banco devolve zero linhas afetadas — e zero linhas afetadas é a detecção do conflito.

![Diagrama: bloqueio otimista — a escrita carrega a versão lida, e zero linhas afetadas é o conflito detectado](/posts/bloqueio-otimista-e-pessimista/bloqueio-otimista.svg)

**Em SQL puro**

```sql
-- lido antes: saldo = 100, version = 1
UPDATE conta
   SET saldo   = 90,
       version = version + 1
 WHERE id = 1
   AND version = 1;
-- 1 linha afetada  -> gravou
-- 0 linhas afetadas -> alguém mudou a linha nesse meio-tempo
```

O ponto essencial: **a verificação e a escrita são o mesmo comando**. Não existe janela entre uma e outra, e é por isso que funciona sem travar nada.

Dá para usar `updated_at` no lugar da coluna de versão, mas uma versão inteira é mais clara e não sofre com precisão de relógio.

**Em Spring Data JPA**

O Hibernate faz isso sozinho a partir de uma anotação:

```java title="Conta.java"
@Entity
public class Conta {

    @Id
    private Long id;

    private BigDecimal saldo;

    @Version                 // habilita o bloqueio otimista
    private Long version;    // o Hibernate cuida do incremento
}
```

Com isso, todo UPDATE gerado ganha `WHERE id = ? AND version = ?` automaticamente. Se nenhuma linha for afetada, o Spring lança `ObjectOptimisticLockingFailureException` (`OptimisticLockException` na JPA pura).

E como o conflito agora é um erro, alguém precisa decidir o que fazer com ele:

```java title="ContaService.java"
@Retryable(
    retryFor = ObjectOptimisticLockingFailureException.class,
    maxAttempts = 3,
    backoff = @Backoff(delay = 50, multiplier = 2, random = true)
)
@Transactional
public void debitar(Long contaId, BigDecimal valor) {
    Conta conta = repo.findById(contaId).orElseThrow();
    conta.setSaldo(conta.getSaldo().subtract(valor));
    repo.save(conta);
}
```

Dois detalhes que erram sempre. O retry precisa **reler** o dado — retentar com a entidade velha em mãos falha de novo para sempre. E precisa de teto: três tentativas, não um laço infinito.

**O que costuma passar batido:** o bloqueio otimista funciona mesmo entre requisições diferentes, separadas por minutos. É o único dos dois que resolve o caso do usuário que abriu um formulário às 10h e salvou às 10h15 — a transação do banco durou milissegundos, mas a versão lida às 10h ainda é o critério. Por isso o Fowler chama de *offline lock*.

## 3. Bloqueio pessimista

A aposta é a inversa: conflito é provável, então é melhor não deixar acontecer. Quem chega primeiro tranca a linha, e os outros esperam.

![Diagrama: bloqueio pessimista — quem chega primeiro trava a linha com FOR UPDATE e os demais enfileiram até o commit](/posts/bloqueio-otimista-e-pessimista/bloqueio-pessimista.svg)

**Em SQL puro**

```sql
BEGIN;

SELECT saldo
  FROM conta
 WHERE id = 1
   FOR UPDATE;        -- a partir daqui a linha está travada

-- a aplicação confere o saldo e decide

UPDATE conta SET saldo = saldo - 10 WHERE id = 1;

COMMIT;               -- a trava só sai aqui
```

Três variações que valem conhecer, todas do PostgreSQL:

- `FOR UPDATE NOWAIT` — em vez de esperar, falha na hora se a linha estiver travada. Bom quando esperar é pior que desistir.
- `FOR UPDATE SKIP LOCKED` — pula as linhas travadas e pega outra. É como se implementa fila de trabalho em tabela: vários workers pegam itens diferentes sem disputar.
- `lock_timeout` — parâmetro de sessão que limita quanto tempo se espera por uma trava. Sem ele, a espera é indefinida.

**Em Spring Data JPA**

```java title="ContaRepository.java"
public interface ContaRepository extends JpaRepository<Conta, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)   // gera SELECT ... FOR UPDATE
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000"))
    @Query("select c from Conta c where c.id = :id")
    Optional<Conta> findByIdParaAtualizar(@Param("id") Long id);
}
```

O método que usa isso precisa estar dentro de `@Transactional` — fora de transação a trava não tem onde viver.

**O que costuma passar batido:** a trava dura até o commit. Se dentro da transação você chamar o adquirente e ele levar 800 ms, a linha fica travada por 800 ms e todo mundo que quiser aquela linha enfileira atrás. **Nunca chame serviço externo com uma trava na mão.**

## 4. O caso híbrido, que é o mais comum

Muita coisa que parece precisar de trava não precisa, porque dá para deixar o próprio banco calcular:

```sql
UPDATE conta
   SET saldo = saldo - 10
 WHERE id = 1
   AND saldo >= 10;
-- 0 linhas afetadas = saldo insuficiente
```

Aqui não há leitura prévia, então não há janela, então não há lost update. O banco resolve tudo dentro de um comando, e o `UPDATE` já pega uma trava de linha por conta própria, sem você pedir.

Essa é a primeira pergunta a se fazer antes de escolher entre otimista e pessimista: **dá para escrever isso como um único comando?** Se der, nenhum dos dois é necessário.

## 5. Como escolher

| | Otimista | Pessimista |
| --- | --- | --- |
| **Estratégia** | detecta o conflito ao gravar | evita o conflito antes |
| **Custo normal** | nenhum — ninguém espera | espera de quem chega depois |
| **Custo sob disputa** | retentativas, que podem virar avalanche | fila, e risco de deadlock |
| **Quem trata a falha** | a aplicação, relendo e tentando | ninguém — já foi serializado |
| **Funciona entre requisições?** | sim | não, só dentro da transação |
| **Onde encaixa** | conflito raro, leitura pesada, edição por tela | conflito frequente, operação crítica, transação curta |

A recomendação do Fowler, que envelheceu bem: comece otimista, porque é mais simples e não tem os defeitos de tempo de execução do pessimista. A pergunta certa não é "quando usar otimista", é **"quando o otimista sozinho não basta"**.

No meu domínio, o critério prático é a taxa de disputa da mesma linha. Cadastro de cooperado, limite, parâmetro de produto: otimista. Saldo de uma única conta em dia de pico, ou contador de uso de limite: pessimista, ou melhor ainda, um único UPDATE condicional.

## 6. Padrões nomeados

**Já explicados acima — aqui fica só o nome formal**

- **Lost update** — duas leituras, dois cálculos, duas escritas, e uma delas desaparece sem erro. *Onde mais aparece:* contador de estoque, saldo, qualquer campo calculado a partir do valor lido.
- **Optimistic Offline Lock** — nome do padrão no catálogo do Fowler. "Offline" porque vale além da transação do banco, atravessando requisições. *Onde mais aparece:* ETag e `If-Match` em HTTP são o mesmo padrão na web; `_rev` no CouchDB; edição concorrente de documento.
- **Pessimistic Offline Lock** — o par do anterior. *Onde mais aparece:* check-out de arquivo em sistemas de versão antigos, reserva de assento, qualquer "só um por vez".

**Mencionados de passagem — vale saber o que são**

- **Deadlock** — duas transações travam as mesmas linhas em ordem invertida e ficam esperando uma pela outra para sempre. O Postgres detecta e mata uma das duas com erro. A prevenção é banal e quase nunca feita: **travar sempre na mesma ordem**, por exemplo ordenando por id. *Só acontece no pessimista* — no otimista ninguém espera, então não há ciclo de espera.
- **Níveis de isolamento** — a outra forma de tratar concorrência, no nível da transação inteira em vez de linha a linha. O Postgres usa READ COMMITTED por padrão, que **não** impede lost update entre transações separadas — daí a necessidade de bloqueio explícito. REPEATABLE READ e SERIALIZABLE impedem, mas ao custo de abortar transações que a aplicação precisa saber retentar. *Vale saber que existe:* é pergunta clássica de entrevista sênior.
- **SELECT ... FOR UPDATE SKIP LOCKED como fila** — truque conhecido para usar tabela como fila de trabalho sem broker. *Por que importa:* aparece muito em sistema financeiro, para processar lote com vários workers.

## 7. Onde eu apertaria numa entrevista

- Você colocou `@Version` e o conflito virou exceção. Quem trata? E o que o usuário final vê?
- Sob disputa alta, o otimista entra em avalanche de retentativas. Como você percebe isso antes do cliente?
- Uma transação com `FOR UPDATE` chama o adquirente por dentro. O que acontece com as outras requisições daquela conta?
- Como você evita deadlock quando precisa travar duas linhas na mesma transação?
- O time quer subir o isolamento para SERIALIZABLE e "resolver de uma vez". Que argumento você traz?

## Fontes

- Martin Fowler — [Optimistic Offline Lock](https://www.martinfowler.com/eaaCatalog/optimisticOfflineLock.html) (*Patterns of Enterprise Application Architecture*)
- Martin Fowler — [Pessimistic Offline Lock](https://martinfowler.com/eaaCatalog/pessimisticOfflineLock.html)
- PostgreSQL — [Explicit Locking (FOR UPDATE, NOWAIT, SKIP LOCKED)](https://www.postgresql.org/docs/current/explicit-locking.html)
- PostgreSQL — [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- Vlad Mihalcea — [artigos sobre explicit locking em JPA e Hibernate](https://vladmihalcea.com/tag/explicit-locking/)
- Stormatics — [Ensuring Safe Data Modifications in PostgreSQL](https://stormatics.tech/blogs/ensuring-safe-data-modifications-in-postgresql-part-2)
