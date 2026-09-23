---
title: "CronJob ou endpoint + fila — onde rodar o batch de uma API Spring Boot no Kubernetes"
published: 2026-09-23
description: "Uma API Spring Boot no Kubernetes precisa de uma rotina agendada: CronJob com a mesma imagem e perfil batch, ou endpoint que enfileira no SQS e a própria API consome? Onze critérios, e onde cada um ganha."
tags: [Kubernetes, Spring, Mensageria, Trade-offs]
category: Arquitetura
draft: false
---

Um cenário comum: um microsserviço Spring Boot roda no Kubernetes como API e passa a precisar de uma rotina periódica. Por exemplo, ler uma lista de registros do banco, aplicar validações e publicar parte deles num tópico SNS. A lógica de negócio já está no serviço, então a pergunta não é *se* o código será reaproveitado, e sim *onde* essa rotina vai rodar.

Duas abordagens aparecem com frequência. As duas funcionam e as duas reaproveitam o código, mas os trade-offs são diferentes. Neste post comparo as duas critério por critério, incluindo o que cada uma ganha, e explico por que, para esse tipo de carga, a balança pende para a primeira.

## As duas abordagens

### A — CronJob com a mesma imagem e outro perfil do Spring

A API continua no Deployment de sempre. No horário agendado, o CronJob cria um Job, que sobe um pod com **a mesma imagem da API** e o perfil `batch`: sem camada web, esse pod executa o job com Spring Batch e termina. O exit code informa ao Kubernetes se deu certo.

![Diagrama da abordagem A: o CronJob cria um Job às 03:00, que sobe um pod com a mesma imagem da API e o perfil batch; o pod lê os pendentes no banco, publica no tópico SNS e termina com um exit code; o Deployment da API só compartilha o banco](/posts/cronjob-vs-endpoint-sqs/abordagem-a.svg)

### B — CronJob chama um endpoint, que enfileira no SQS, e a própria API consome

No horário agendado, o CronJob faz um `curl` para um endpoint da API, que responde `202 Accepted` e publica mensagens numa fila SQS. Os próprios pods da API consomem a fila, processam registro a registro e marcam o status no banco. Em caso de erro, a mensagem volta à fila e, depois de N tentativas, vai para a DLQ.

![Diagrama da abordagem B: o CronJob chama POST /processar num endpoint da API, que lê a lista no banco e enfileira mensagens no SQS; um listener dentro dos mesmos pods da API consome a fila, publica no SNS e marca o status; após N falhas a mensagem vai para a DLQ, de onde volta por redrive](/posts/cronjob-vs-endpoint-sqs/abordagem-b.svg)

Vale dizer logo: a abordagem B não é um antipadrão. A Microsoft lista "um timer externo chama uma API que dispara a tarefa" como forma válida de acionar processamento em background ([Azure Well-Architected — Background jobs](https://learn.microsoft.com/azure/well-architected/reliability/background-jobs)). A discussão aqui é de trade-off.

## O padrão por trás da abordagem A

Rodar a mesma base de código como tipos diferentes de processo é um princípio do [12-Factor App (fator VIII, Concurrency)](https://12factor.net/concurrency): o processo web atende HTTP e o worker executa tarefas longas de background.

Chris Jones, arquiteto da AWS Professional Services, descreve exatamente essa evolução em [Rethinking Java @Scheduled Tasks in Kubernetes](https://thenewstack.io/rethinking-java-scheduled-tasks-in-kubernetes/). Primeiro vem o `@Scheduled` dentro da API, depois um CronJob chamando um endpoint via `curl`, e por fim um CronJob que usa a mesma imagem da API com um ponto de entrada alternativo. O mesmo padrão está no [AWS Open Source Blog](https://aws.amazon.com/blogs/opensource/alternative-jar-entry-points-using-a-dependency-injection-framework-for-existing-java-applications/), com [código de exemplo](https://github.com/aws-samples/multiple-entry-points-with-dependency-injection). No Spring, o jeito idiomático de fazer isso é por perfil ([Spring Boot — Profiles](https://docs.spring.io/spring-boot/reference/features/profiles.html)).

O próprio time do Spring documenta como rodar Spring Batch como Job no Kubernetes em [Spring Batch on Kubernetes: Efficient batch processing at scale](https://spring.io/blog/2021/01/27/spring-batch-on-kubernetes-efficient-batch-processing-at-scale).

## Critério a critério

### 1. Disputa de recursos com quem atende o usuário

Na abordagem B, o consumidor da fila roda dentro dos pods da API. Batch e requisições passam a dividir o mesmo processo:

- **Pool de conexões.** O [HikariCP](https://github.com/brettwooldridge/HikariCP), pool padrão do Spring Boot, tem 10 conexões por padrão. Cada conexão ocupada pelo processamento é uma conexão que as requisições da API esperam, até estourar o timeout.
- **CPU.** O limite de CPU do container é um só: o que o batch consome, a API perde em latência.
- **Heap.** A heap é a área de memória da JVM onde vivem os objetos. Processar em volume aumenta o trabalho do garbage collector, e as pausas dele atingem a aplicação inteira. No limite, um `OutOfMemoryError` derruba o pod e leva junto as requisições em andamento.

Isolar recursos por tipo de carga, para que uma não esgote a outra, é o padrão Bulkhead, popularizado por Michael Nygard em *Release It!* e documentado pela Microsoft ([Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead)). Kleppmann ajuda a entender por que as duas cargas não combinam: serviços online são medidos por tempo de resposta e disponibilidade, e sistemas batch por throughput ([Designing Data-Intensive Applications, cap. 10](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/ch10.html)). O Borg, gerenciador de clusters do Google e antecessor do Kubernetes, trata serviços e batch como classes distintas de carga ([Verma et al., EuroSys 2015](https://research.google/pubs/pub43438/)).

Na abordagem A, o job tem pod próprio, com limites próprios de CPU e memória e pool próprio de conexões.

**Ressalva:** o banco continua compartilhado. O pod separado isola o processo, não o banco. Por isso o job deve ter um pool pequeno e chunks bem dimensionados.

### 2. Deploy da API no meio do processamento

Na abordagem B, um deploy da API durante a janela do batch acontece no meio do processamento. No rolling update, cada pod recebe SIGTERM e tem o grace period (30 segundos por padrão) para encerrar antes de ser morto ([Kubernetes — fluxo de término de pods](https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/), [CNCF](https://www.cncf.io/blog/2024/12/19/decoding-the-pod-termination-lifecycle-in-kubernetes-a-comprehensive-guide/); o ciclo completo está em [SIGTERM e SIGKILL](/posts/sigterm-sigkill-kubernetes/)). O graceful shutdown do Spring Boot espera as requisições HTTP em andamento, não um lote inteiro ([Spring Boot — Graceful shutdown](https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html)). Na prática:

- o listener para de buscar mensagens e tenta concluir as que já tem em mãos;
- o que não termina volta à fila depois do visibility timeout e é reprocessado. Se o registro já tinha sido publicado no SNS mas a mensagem não foi apagada, ele é enviado de novo;
- durante o rolling update, parte do lote é processada pela versão antiga do código e parte pela nova.

![Diagrama de sequência: com o lote em andamento, o Kubernetes envia SIGTERM ao pod v1 da API, que para de buscar mensagens e tem 30 segundos para concluir o que tem em mãos; vem o SIGKILL, as mensagens não concluídas reaparecem na fila depois do visibility timeout e o pod v2 processa o restante; parte do lote sai pela v1 e parte pela v2](/posts/cronjob-vs-endpoint-sqs/deploy-no-meio-do-lote.svg)

Dá para aumentar o grace period, mas isso deixa todo deploy mais lento e ainda não cobre um lote inteiro. O resultado costuma ser o time evitando deploy na janela do batch.

Na abordagem A, o deploy da API não toca no pod do job. Nem uma atualização do próprio CronJob afeta o que já está rodando: as mudanças valem só para os Jobs criados depois, e os que já começaram seguem sem alteração ([Kubernetes — CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)). O job de hoje termina com a versão com que começou, e a nova versão entra na próxima execução.

### 3. Recurso reservado o dia inteiro

No Kubernetes, cada pod declara quanto de memória e CPU reserva no cluster (os *requests*). Essa reserva vale durante toda a vida do pod, e o Kubernetes não a aumenta só nos minutos em que o batch roda. O Vertical Pod Autoscaler ajusta tamanhos com base no histórico de uso, mas não foi feito para um pico curto uma vez por dia.

Na abordagem B, cada réplica da API precisa reservar memória para o pico do batch, 24 horas por dia. Um exemplo com números hipotéticos: a API precisa de 512 MB e o batch de mais 1 GB. Com três réplicas, são 4,5 GB reservados o tempo todo. Na abordagem A, são 1,5 GB para a API e 1 GB só durante a execução, porque o pod do Job existe apenas enquanto roda ([Kubernetes — Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)). O artigo da AWS citado acima usa o mesmo argumento: com CronJob, os recursos são usados só durante a execução, em vez de um pod rodando o tempo todo.

Sobre a fatura: o SQS custa pouco, e o nível gratuito inclui 1 milhão de requisições por mês ([Amazon SQS — Pricing](https://aws.amazon.com/sqs/pricing/)). O custo que pesa não é a conta do SQS, é o custo total de propriedade: recurso reservado e peças para provisionar, proteger e monitorar em cada ambiente.

### 4. Autoscaling reagindo ao batch, e não aos usuários

O [HPA (Horizontal Pod Autoscaler)](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) adiciona e remove réplicas da API conforme uma métrica, normalmente CPU. A premissa é que CPU alta significa mais usuários. Com o batch dentro da API, essa premissa quebra:

- o HPA sobe réplicas que nenhum usuário está usando, e você paga por elas;
- na abordagem B, cada réplica nova também vira consumidor da fila, e a pressão sobre o banco e o SNS aumenta sem que ninguém tenha decidido isso;
- quando o batch termina, a CPU cai e o HPA remove réplicas, possivelmente no meio do processamento (ver critério 2);
- a métrica perde significado: não dá mais para saber se a API escalou por demanda real ou por causa do batch.

Na abordagem A, o HPA da API continua reagindo só ao tráfego.

### 5. Quando o destino cai: retry, DLQ e redrive

Imagine o SNS indisponível por uma hora.

- **Abordagem B:** o consumidor tenta publicar e falha. A mensagem não é apagada e volta à fila, até atingir o `maxReceiveCount` e ir para a DLQ. Em uma hora de indisponibilidade, boa parte do lote pode terminar na DLQ. Quando o SNS volta, essas mensagens ficam paradas até alguém fazer o redrive para a fila principal. E a DLQ passa a misturar falha de infraestrutura com dado realmente problemático, justamente o que ela deveria separar.
- **Abordagem A:** o SDK da AWS tenta algumas vezes com backoff. Esgotadas as tentativas, o job falha com exit code diferente de zero e os registros continuam pendentes no banco. O Kubernetes executa de novo (`backoffLimit`) ou a próxima execução agendada pega os pendentes, sem intervenção manual.

![Diagrama comparando as duas abordagens com o SNS fora do ar: na B, o listener falha, a mensagem volta à fila até o maxReceiveCount e vai para a DLQ, e alguém precisa fazer o redrive quando o SNS volta; na A, o SDK retenta com backoff, o job falha com exit code diferente de zero, os registros seguem pendentes no banco e a próxima execução os pega](/posts/cronjob-vs-endpoint-sqs/destino-fora-do-ar.svg)

A abordagem B pode chegar ao mesmo comportamento, pausando o consumidor quando o destino cai ou automatizando o redrive, mas isso é desenho e código a mais. Há ainda o risco de retry em várias camadas ao mesmo tempo: SDK, listener e reentrega da fila. A [Amazon Builders' Library](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter) recomenda concentrar o retry num único ponto da pilha, porque cada camada extra multiplica a carga sobre quem já está com problema.

### 6. O que vai dentro da mensagem?

A abordagem B esconde uma decisão de desenho: o que cada mensagem carrega?

- **Uma mensagem "processe a lista de hoje":** um único consumidor processa tudo e o lote inteiro fica preso a uma mensagem. Não há paralelismo. Se o pod morre, a mensagem só reaparece depois do visibility timeout, que pode chegar a 12 horas ([SQS — CreateQueue](https://docs.aws.amazon.com/cli/v1/reference/sqs/create-queue.html)), e processamentos longos precisam estender esse timeout enquanto rodam.
- **Uma mensagem por registro:** alguém precisa ler a lista do banco e publicar uma mensagem para cada registro. Esse alguém é o endpoint que recebeu a chamada. Ou seja, a parte pesada de ler a lista volta para dentro da API.

Na abordagem A, o reader do Spring Batch lê a lista de forma paginada, dentro do pod do job.

### 7. Um endpoint a mais para proteger

Na abordagem B existe uma rota HTTP que dispara processamento em lote. Ela precisa ser protegida, e o CronJob precisa se autenticar para chamá-la: obter um token e montar a requisição, geralmente em shell. Em ambientes regulados, expor lógica de negócio como endpoint pode nem ser permitido. É exatamente o argumento do artigo de Chris Jones para trocar o CronJob que chama a API via `curl` por um CronJob que roda a própria imagem ([The New Stack](https://thenewstack.io/rethinking-java-scheduled-tasks-in-kubernetes/)).

### 8. Visibilidade por execução

Na abordagem A, cada execução é um objeto com início, fim e resultado:

- o Kubernetes marca o Job como concluído ou falho pelo exit code do container, e métricas como `kube_job_status_failed`, do [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics), permitem alertar sem código adicional;
- o Spring Batch grava cada execução nas tabelas de metadados ([Spring Batch — Meta-Data Schema](https://docs.spring.io/spring-batch/reference/schema-appendix.html)). `BATCH_JOB_EXECUTION` guarda início, fim e status. `BATCH_STEP_EXECUTION` guarda quantos itens foram lidos (`READ_COUNT`), gravados (`WRITE_COUNT`), filtrados (`FILTER_COUNT`) e pulados.

Na abordagem B, a visibilidade é por mensagem: DLQ, métricas da fila, logs e alertas. Isso é bom para enxergar itens com falha. Mas responder "o lote de hoje terminou? quantos foram enviados?" exige criar tabela, contadores e lógica próprios. Não é impossível; é trabalho que na abordagem A já vem pronto.

### 9. Resposta perdida na rede: o gatilho dispara duas vezes

Na abordagem B, entre o agendador e o processamento existe uma chamada HTTP, e chamadas HTTP falham de um jeito traiçoeiro. O endpoint recebe a requisição, enfileira a lista e responde `202`, mas a resposta se perde no caminho: timeout no ingress ou no load balancer, conexão resetada, instabilidade de rede. O `curl` termina com erro, o pod do CronJob sai com exit code diferente de zero e o Kubernetes, seguindo o `backoffLimit`, executa de novo. O endpoint recebe a segunda chamada e enfileira a lista outra vez. Se houver retry configurado em algum proxy intermediário, como ingress ou service mesh, a requisição pode ser reenviada sem que o CronJob sequer perceba.

![Diagrama de sequência: o CronJob faz POST /processar, o endpoint enfileira a lista de hoje e responde 202, mas a resposta se perde na rede; o curl sai com erro, o Kubernetes executa o pod de novo, o endpoint recebe a segunda chamada e enfileira a lista outra vez; a lista fica na fila em dobro](/posts/cronjob-vs-endpoint-sqs/gatilho-dispara-duas-vezes.svg)

O problema é de fundo: quem chama não consegue distinguir "a requisição não chegou" de "a requisição chegou, mas a resposta não voltou". A Amazon Builders' Library resume assim: um timeout ou uma falha não significa que os efeitos colaterais não aconteceram, e repetir a chamada pode duplicá-los. A saída é tornar a operação idempotente ([Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-apis/)). Na abordagem B, isso significa construir uma [chave de idempotência](/posts/cobranca-duplicada-no-retry/) no gatilho, por exemplo registrando a execução por data de referência antes de enfileirar.

A coluna de status no banco ajuda, mas não resolve sozinha. Com a lista duplicada na fila, as duas cópias de um mesmo registro podem ser processadas ao mesmo tempo por pods diferentes. As duas leem "pendente" antes de qualquer uma marcar "enviado", e o registro sai duas vezes. Evitar isso exige que o consumidor reserve o registro com uma [atualização condicional](/posts/bloqueio-otimista-e-pessimista/#4-o-update-condicional-que-muitas-vezes-dispensa-os-dois) antes de enviar. Mais uma peça a construir.

Na abordagem A, esse modo de falha não existe: não há chamada de rede entre o agendador e o processamento. O CronJob cria o Job pela API do Kubernetes, e o processamento é o próprio pod, então não há resposta para perder. A duplicidade rara do próprio CronJob (critério 10) é barrada pelo JobRepository.

![Diagrama de sequência da abordagem A: o CronJob cria o Job de hoje, o Kubernetes sobe o pod, o pod registra a execução da data de referência no JobRepository, processa, marca COMPLETED ou FAILED e devolve o exit code; no caso raro de o CronJob criar um segundo Job, o outro pod tenta registrar a mesma execução e o JobRepository recusa](/posts/cronjob-vs-endpoint-sqs/sem-resposta-para-perder.svg)

### 10. Duplicidade que existe nas duas abordagens

Algumas fontes de duplicidade não dependem da escolha:

- **O próprio CronJob.** A documentação avisa que, em certas circunstâncias, um CronJob pode criar dois Jobs para o mesmo horário, ou nenhum, e por isso pede que os jobs sejam idempotentes ([Kubernetes — CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)). Na abordagem A, isso já está coberto: `concurrencyPolicy: Forbid` impede que uma execução comece antes de a anterior terminar, e o JobRepository do Spring Batch bloqueia uma segunda execução com os mesmos parâmetros identificadores, como a data de referência. A criação da execução roda com isolamento SERIALIZABLE justamente para isso ([Spring Batch — Configuring a JobRepository](https://docs.spring.io/spring-batch/reference/job/configuring-repository.html)). Na abordagem B, a proteção precisa ser construída no gatilho, como descrito no critério 9.
- **A reentrega da fila (só na B).** A fila standard do SQS entrega cada mensagem pelo menos uma vez e pode entregar cópias ([SQS — Standard queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html)). O consumidor precisa ser idempotente por registro.
- **A publicação no SNS.** Publicar e só depois marcar o registro deixa uma janela: se o processo cair entre as duas coisas, o registro volta a ser enviado. Vale nas duas abordagens, então o consumidor do tópico deve ser idempotente em qualquer caso. É a mesma janela do post [Efeito externo sem registro local](/posts/efeito-externo-sem-registro-local/), agora com o tópico no papel do adquirente.

### 11. Retomar de onde parou: empate

As duas abordagens retomam. Na B, pela coluna de status e pela reentrega da fila. Na A, pelo padrão *process indicator* documentado pelo Spring Batch: uma coluna marca os registros processados e o reader traz só os pendentes ([Spring Batch — Process Indicator](https://docs.spring.io/spring-batch/reference/readers-and-writers/process-indicator.html)). A diferença não está em conseguir retomar, e sim em como cada abordagem se comporta quando a interrupção vem de um deploy (critério 2) ou de uma indisponibilidade do destino (critério 5).

## Onde a abordagem B ganha

- **Paralelismo dinâmico e elasticidade.** A fila distribui o trabalho conforme cada consumidor fica livre, e dá para escalar consumidores pela profundidade da fila. A abordagem A também paraleliza, com step multi-thread e partitioning no [Spring Batch](https://docs.spring.io/spring-batch/reference/scalability.html) ou com [Indexed Jobs](https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/) no Kubernetes, mas a divisão é estática: se uma partição for mais lenta, as outras terminam e ficam esperando. Antes de otimizar, vale o conselho da própria documentação do Spring Batch: muitos problemas se resolvem com um job de uma thread e um processo, então meça primeiro.
- **Sem custo de partida.** Os pods já estão quentes. A abordagem A sobe uma JVM a cada execução, o que é irrelevante para um job diário e relevante para um job a cada minuto.
- **Disparo sob demanda e fluxo contínuo.** Qualquer sistema pode enfileirar trabalho a qualquer momento. Se os itens chegam ao longo do dia como eventos, e não como uma lista fixa, a fila é o modelo natural.
- **Isolamento de falha por item, de fábrica.** Um item problemático vai para a DLQ sem travar os demais. Na abordagem A isso também existe (skip, status de inválido), mas precisa ser configurado.
- **Menos conceitos novos.** Não há Spring Batch para aprender nem tabelas de metadados para manter.
- **Respaldo de princípio.** O 12-Factor ([fator IX, Disposability](https://12factor.net/disposability)) recomenda, para workers, uma fila que devolva o trabalho quando o processo morre. O modelo de worker com fila é legítimo; o problema é consumi-la dentro da API.

## O preço da abordagem A

- **Uma JVM por execução**, com alguns segundos de inicialização.
- **CronJob tem idiossincrasias:** pode criar dois Jobs ou nenhum, então idempotência é obrigatória.
- **O pod do job não é imortal.** Drenagem de nó ou falta de recurso também o encerram. Se ele morre abruptamente, a execução fica como `STARTED` no JobRepository, e o restart falha até alguém corrigir os metadados ([Spring blog](https://spring.io/blog/2021/01/27/spring-batch-on-kubernetes-efficient-batch-processing-at-scale)).
- **Paralelismo estático**, como descrito acima.
- **Release acoplado.** Mesma imagem significa que todo deploy da API leva junto uma nova versão do job, aplicada na próxima execução. Se os dois precisarem evoluir em ritmos diferentes, separe em módulos e imagens.
- **A curva do Spring Batch** e as tabelas de metadados.

## Resumo

| Critério | A — CronJob, mesma imagem, perfil `batch` | B — Endpoint + SQS consumido na API |
|---|---|---|
| Disputa de recursos com a API | Pod próprio | Mesmo processo |
| Deploy durante o processamento | Não afeta o job | Interrompe, reprocessa e mistura versões |
| Recurso reservado | Só durante a execução | Pico do batch, o dia inteiro |
| Autoscaling da API | Reage só ao tráfego | Reage também ao batch |
| Destino fora do ar | Job falha, próxima execução retoma | Mensagens na DLQ, exige redrive |
| Leitura da lista | No pod do job | Dentro da API |
| Endpoint a proteger | Não existe | Existe |
| Visibilidade por execução | Pronta (Job + tabelas `BATCH_*`) | Precisa ser construída |
| Resposta perdida na rede | Não se aplica: não há chamada entre gatilho e processamento | Gatilho dispara de novo e enfileira em dobro |
| Duplicidade do CronJob | `Forbid` + JobRepository | Controle próprio no gatilho |
| Retomar de onde parou | Empate | Empate |
| Paralelismo | Estático | Dinâmico e elástico |
| Custo de partida | JVM a cada execução | Pods já quentes |
| Disparo sob demanda | Menos natural | Natural |
| Conceitos novos | Spring Batch | Só a fila |

## Como montar a abordagem A

Uma imagem, dois perfis. Os beans de Job e Step ficam sob `@Profile("batch")`, e o perfil da API desliga a execução automática de jobs:

```yaml title="application.yml (API)"
spring:
  batch:
    job:
      enabled: false
```

```yaml title="application-batch.yml (worker)"
spring:
  main:
    web-application-type: none
  batch:
    job:
      name: enviarRegistrosJob
```

O `main` propaga o exit code só no perfil `batch`. Sem isso, um job com status FAILED termina com código 0 e o Kubernetes registra sucesso:

```java title="App.java"
public static void main(String[] args) {
    var ctx = SpringApplication.run(App.class, args);
    if (ctx.getEnvironment().acceptsProfiles(Profiles.of("batch"))) {
        System.exit(SpringApplication.exit(ctx));
    }
}
```

E o CronJob usa a mesma imagem da API (o que cada campo garante, e o que não garante, está em [Kubernetes CronJob — concorrência, retries e tempo máximo de execução](/posts/kubernetes-cronjob-concorrencia/)):

```yaml title="cronjob.yaml"
apiVersion: batch/v1
kind: CronJob
metadata:
  name: enviar-registros
spec:
  schedule: "0 3 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: worker
              image: meu-servico:1.2.3   # a mesma imagem do Deployment da API
              env:
                - name: SPRING_PROFILES_ACTIVE
                  value: batch
```

Referências para essa configuração: [Spring Boot — Spring Batch](https://docs.spring.io/spring-boot/reference/io/spring-batch.html) e [Spring Boot — Batch how-to](https://docs.spring.io/spring-boot/how-to/batch.html).

## Conclusão

Para uma lista fixa no banco, processada em horário agendado e com processamento leve por item, a abordagem A vence nos critérios que mais pesam: isolamento de recursos, deploy independente, recurso reservado só quando necessário, nenhuma chamada de rede entre o gatilho e o processamento e menos peças para operar. A visibilidade por execução vem de brinde.

A abordagem B passa à frente quando os itens chegam continuamente como eventos, quando o processamento por item é pesado ou variável, ou quando o volume pede elasticidade. Nesse caso, porém, consuma a fila num Deployment próprio, no estilo [Web-Queue-Worker](https://learn.microsoft.com/azure/architecture/guide/architecture-styles/web-queue-worker), e não dentro da API. Caso contrário, os critérios 1 a 4 continuam valendo. E, se o gatilho continuar sendo uma chamada HTTP, ele precisa ser idempotente (critério 9).

A fila resolve. Mas, para chegar ao mesmo lugar, você constrói e opera mais peças, reserva recurso na API o dia inteiro e mantém o processamento disputando espaço com quem atende o usuário.

## Fontes

**Livros e papers**

- Michael Nygard, *Release It!* (Pragmatic Bookshelf) — padrão Bulkhead
- Martin Kleppmann, [*Designing Data-Intensive Applications*, cap. 10](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/ch10.html)
- Verma et al., [Large-scale cluster management at Google with Borg](https://research.google/pubs/pub43438/), EuroSys 2015

**Padrões e guias de arquitetura**

- [The Twelve-Factor App — Concurrency](https://12factor.net/concurrency) e [Disposability](https://12factor.net/disposability)
- [Microsoft — Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead)
- [Microsoft — Web-Queue-Worker](https://learn.microsoft.com/azure/architecture/guide/architecture-styles/web-queue-worker)
- [Microsoft — Background jobs](https://learn.microsoft.com/azure/well-architected/reliability/background-jobs)
- [Amazon Builders' Library — Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter)
- [Amazon Builders' Library — Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-apis/)

**Artigos**

- Chris Jones, [Rethinking Java @Scheduled Tasks in Kubernetes](https://thenewstack.io/rethinking-java-scheduled-tasks-in-kubernetes/) (The New Stack)
- Chris Jones, [Alternative JAR Entry Points Using Java Dependency Injection Frameworks](https://aws.amazon.com/blogs/opensource/alternative-jar-entry-points-using-a-dependency-injection-framework-for-existing-java-applications/) (AWS Open Source Blog) e [código de exemplo](https://github.com/aws-samples/multiple-entry-points-with-dependency-injection)
- Mahmoud Ben Hassine, [Spring Batch on Kubernetes: Efficient batch processing at scale](https://spring.io/blog/2021/01/27/spring-batch-on-kubernetes-efficient-batch-processing-at-scale) (Spring blog)
- CNCF, [Decoding the Pod Termination Lifecycle in Kubernetes](https://www.cncf.io/blog/2024/12/19/decoding-the-pod-termination-lifecycle-in-kubernetes-a-comprehensive-guide/)

**Documentação**

- Kubernetes: [Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/), [CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/), [término de pods](https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/), [HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/), [Indexed Jobs](https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/)
- Spring Boot: [Profiles](https://docs.spring.io/spring-boot/reference/features/profiles.html), [Spring Batch](https://docs.spring.io/spring-boot/reference/io/spring-batch.html), [Batch how-to](https://docs.spring.io/spring-boot/how-to/batch.html), [Graceful shutdown](https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html)
- Spring Batch: [Configuring a JobRepository](https://docs.spring.io/spring-batch/reference/job/configuring-repository.html), [Process Indicator](https://docs.spring.io/spring-batch/reference/readers-and-writers/process-indicator.html), [Meta-Data Schema](https://docs.spring.io/spring-batch/reference/schema-appendix.html), [Scaling and Parallel Processing](https://docs.spring.io/spring-batch/reference/scalability.html)
- Amazon SQS: [CreateQueue](https://docs.aws.amazon.com/cli/v1/reference/sqs/create-queue.html), [Standard queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html), [Pricing](https://aws.amazon.com/sqs/pricing/)
- [HikariCP](https://github.com/brettwooldridge/HikariCP) · [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics)
