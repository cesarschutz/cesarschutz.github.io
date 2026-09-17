---
title: "Java 29 (próxima LTS) — o que o Java 26 e o 27 já trouxeram"
published: 2026-09-16
description: "O caminho do Java 25 até a próxima LTS, o Java 29 (prevista para setembro de 2027): as JEPs do Java 26 e do 27, o que ainda está em preview, exemplos de código e o que conferir na migração."
tags: [LTS, JVM, Concorrência, Criptografia]
series: java
draft: false
---

> **Última atualização:** 16/09/2026. Cobre o Java 26 (lançado em 17/03/2026) e o Java 27 (lançado em 15/09/2026). O Java 28 ainda está em desenvolvimento, e o conteúdo do Java 29 ainda não foi definido.

A série "Atualizações do Java" acompanha só as versões LTS. Entre uma LTS e outra saem versões intermediárias a cada seis meses, e cada uma pode trazer recursos novos, promover um preview a final ou remover algo antigo. Este post junta o que já saiu desde o Java 25 e diz **em qual versão cada coisa chegou** e em qual status ela está hoje. Ele será atualizado quando o Java 28 e o Java 29 saírem.

O Java 26 chegou à disponibilidade geral (GA, a versão final para produção) em 17 de março de 2026 ([JDK 26](https://openjdk.org/projects/jdk/26/)), e o Java 27, em 15 de setembro de 2026 ([JDK 27](https://openjdk.org/projects/jdk/27/)). A próxima LTS prevista é o **Java 29, em setembro de 2027**.

Essa previsão vem do [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) (atualizado em 15/09/2026). Ele classifica o 26, o 27 e o 28 como não LTS e avisa que essa classificação e as datas ainda podem mudar. Nesse roadmap, cada versão não LTS tem Premier Support só até a seguinte sair: setembro de 2026 para o 26 e março de 2027 para o 27. Para o Java 25, a Oracle informa Premier Support até setembro de 2030; para o Java 29, prevê até setembro de 2032. Outros fornecedores de builds do OpenJDK publicam seus próprios prazos. Na data desta atualização, o OpenJDK ainda não tinha publicado a página do projeto JDK 29.

O post é para quem está no **Java 25** e quer acompanhar o que muda até o 29. O ponto de partida é o [post do Java 25](/posts/java-25/); quem vem do Java 21 deve ler os dois. Para a visão geral de ciclo de releases, distribuições e estratégia de migração, veja o [guia de atualizações do Java](/posts/guia-atualizacoes-java/).

**Como o post está organizado.** Primeiro, uma linha do tempo com todas as trilhas. Depois, os recursos que já são definitivos, agrupados por tema: concorrência, APIs, JVM, ferramentas, segurança e remoções. Em seguida vêm os recursos que continuam em preview ou incubadora, uma lista do que pode quebrar na migração vindo do Java 25 e, por fim, a tabela de todas as JEPs de cada versão, incluindo o que já tem alvo no Java 28. Cada recurso traz a linha **Chegou em**, com a versão e a JEP (a proposta formal de mudança do OpenJDK) em que ele apareceu.

> **Preview e incubadora não são definitivos.** Pela [JEP 12](https://openjdk.org/jeps/12), um recurso em **preview** está completo, mas não é permanente: numa versão futura ele pode virar final, com ou sem ajustes, ou ser removido. Para usá-lo é preciso `--enable-preview` na compilação e na execução, e uma JVM não carrega classes compiladas com os previews de outra versão. Já as APIs em **incubadora** ([JEP 11](https://openjdk.org/jeps/11)) ficam em módulos `jdk.incubator.*`, precisam de `--add-modules` e podem mudar ou sumir com a mesma liberdade. Os exemplos de preview abaixo refletem o Java 27 e podem precisar de ajuste no Java 28 ou no 29.

Os exemplos que só dependem do Java 26 foram compilados e executados no Temurin 26.0.2. Os que usam recursos exclusivos do 27 (`Set.ofLazy`, o `StructuredTaskScope` do 27, o mascaramento de dados do JFR e `-XX:AOTMode=required`) seguem as assinaturas do código-fonte do JDK 27 (tag `jdk-27-ga`) e as notas de release.

## Linha do tempo

![Linha do tempo do Java 25 ao Java 29: trilhas de Lazy Constants, Structured Concurrency, primitivos em patterns, API PEM e Vector API passando por previews e incubadoras; compact object headers e G1 virando padrão no Java 27; outras JEPs de cada versão e o que já é alvo do Java 28](/posts/java-29/linha-do-tempo.svg)

O diagrama mostra cada trilha versão a versão. A linha vermelha marca a data desta atualização: à direita dela, tudo é previsão.

- **Java 26** ([página do projeto](https://openjdk.org/projects/jdk/26/)), 10 JEPs: HTTP/3 no `HttpClient`, cache AOT com qualquer coletor, G1 com menos sincronização, avisos para quem altera campos `final` por reflexão e a remoção da Applet API.
- **Java 27** ([página do projeto](https://openjdk.org/projects/jdk/27/)), 9 JEPs: G1 como padrão em qualquer ambiente, compact object headers por padrão, TLS 1.3 com troca de chaves pós-quântica e mascaramento de dados sensíveis nas gravações do JFR.
- **Java 28** ([página do projeto](https://openjdk.org/projects/jdk/28/)), 6 JEPs com alvo até agora, entre elas a API PEM final e o primeiro preview de Value Objects ([detalhes](#java-28)).

Os recursos em preview e incubadora (Structured Concurrency, primitivos em patterns, Lazy Constants, API PEM e Vector API) estão reunidos em [Ainda em preview ou incubadora](#ainda-em-preview-ou-incubadora).

## Concorrência

### Virtual threads liberam a carrier enquanto esperam a inicialização de uma classe

**Chegou em:** Java 26 (final, [JDK-8369238](https://bugs.openjdk.org/browse/JDK-8369238))

Uma virtual thread não tem thread do sistema operacional própria: ela é executada em cima de uma **carrier thread**, uma thread de plataforma de um pool compartilhado pela JVM. Quando a virtual thread bloqueia, a JVM a "desmonta" da carrier, que fica livre para executar outra virtual thread. Se ela não pode ser desmontada, fica **presa (pinned)** e ocupa a carrier durante toda a espera. O Java 24 resolveu esse problema para `synchronized` (veja [`synchronized` não prende mais virtual threads](/posts/java-25/#synchronized-não-prende-mais-virtual-threads), no post do Java 25), mas ainda havia outros casos.

**O problema.** Até o Java 25, uma virtual thread que precisava de uma classe que outra thread ainda estava inicializando (rodando o bloco `static`, por exemplo) ficava presa à carrier enquanto esperava. No pior caso, todas as carriers ficavam presas nessa espera enquanto o inicializador dependia de uma virtual thread para terminar, e a aplicação inteira travava.

**O que mudou.** Segundo as [notas de release do Java 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html), na maioria dos casos a virtual thread agora é desmontada durante essa espera e libera a carrier. A mudança não é uma JEP e não exige nenhuma alteração no código: basta rodar no Java 26 ou posterior.

## APIs da biblioteca padrão

### HTTP/3 no HttpClient

**Chegou em:** Java 26 (final, [JEP 517](https://openjdk.org/jeps/517))

**O problema.** O `java.net.http.HttpClient` ([JEP 321](https://openjdk.org/jeps/321), Java 11, [HTTP Client no post do Java 11](/posts/java-11/#http-client)) falava HTTP/1.1 e HTTP/2. O HTTP/3, padronizado pela IETF em 2022, troca o TCP pelo QUIC, um protocolo de transporte que roda sobre UDP. A JEP cita as vantagens: handshakes (a negociação inicial da conexão) potencialmente mais rápidos, menos problemas de congestionamento, como o head-of-line blocking (quando um pacote perdido atrasa todas as requisições da conexão), e transporte mais confiável em redes que perdem muitos pacotes.

**O que mudou.** O HTTP/3 é **opt-in**: o padrão continua sendo HTTP/2. Você escolhe `HttpClient.Version.HTTP_3` no cliente ou em cada requisição. Por padrão, se o servidor não fala HTTP/3, o cliente volta para HTTP/2 ou HTTP/1.1 sem erro (a exceção é o modo `HTTP_3_URI_ONLY`, na tabela abaixo). Como não dá para saber de antemão se o servidor fala HTTP/3, a JEP descreve quatro estratégias de descoberta:

| Configuração | Comportamento |
| --- | --- |
| `HTTP_3` como versão preferida da requisição | Tenta HTTP/3 primeiro e cai para HTTP/2 ou HTTP/1.1 se a conexão não abrir em tempo razoável. |
| `HTTP_3` só no cliente, sem versão na requisição | Tenta HTTP/3 e HTTP/2 ou HTTP/1.1 em paralelo e usa a conexão que abrir primeiro. |
| `HttpOption.H3_DISCOVERY` com `Http3DiscoveryMode.ALT_SVC` | Começa em HTTP/2 ou HTTP/1.1 e passa a usar HTTP/3 nas requisições seguintes se o servidor anunciar o serviço alternativo. |
| `HttpOption.H3_DISCOVERY` com `Http3DiscoveryMode.HTTP_3_URI_ONLY` | Usa só HTTP/3 e falha se o servidor não responder por ele. |

As duas últimas estratégias usam a opção de requisição `H3_DISCOVERY` e exigem `HTTP_3` como versão preferida no cliente ou na requisição.

O exemplo abaixo usa a terceira estratégia (`ALT_SVC`). Ele acessa um servidor externo, `www.google.com`, e só chega ao HTTP/3 porque esse servidor anuncia suporte no cabeçalho `Alt-Svc` da resposta. Com um servidor que não anuncia HTTP/3, as duas chamadas saem em `HTTP_2`; sem acesso à internet, `send` lança exceção.

```java title="ClienteHttp3.java"
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpOption;
import java.net.http.HttpOption.Http3DiscoveryMode;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse.BodyHandlers;

public class ClienteHttp3 {
    public static void main(String[] args) throws Exception {
        // Preferência por HTTP/3 em todas as requisições deste cliente
        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_3)
                .build();

        // Servidor externo: o resultado depende de ele anunciar HTTP/3 (Alt-Svc)
        HttpRequest request = HttpRequest.newBuilder(URI.create("https://www.google.com/"))
                .setOption(HttpOption.H3_DISCOVERY, Http3DiscoveryMode.ALT_SVC)
                .GET()
                .build();

        // 1ª chamada: sai por HTTP/2 e lê o Alt-Svc da resposta
        var primeira = client.send(request, BodyHandlers.discarding());
        IO.println(primeira.version());   // HTTP_2

        // 2ª chamada: já usa HTTP/3, se o servidor anunciou
        var segunda = client.send(request, BodyHandlers.discarding());
        IO.println(segunda.version());    // HTTP_3
    }
}
```

No Temurin 26.0.2, com acesso à internet em 16/09/2026, esse programa imprimiu `HTTP_2` e depois `HTTP_3`.

**Quando usar e cuidados.** Vale testar o HTTP/3 com servidores e CDNs que já o oferecem, principalmente em redes com perda de pacotes. Limitações da primeira versão, segundo a JEP: só funciona com o provider TLS padrão (SunJSSE), não há API pública de QUIC nem servidor HTTP/3, e o `java.net.URL` continua só em HTTP/1.1.

### APIs menores sem JEP

Nem toda mudança de API passa por uma JEP. As notas de release registram várias adições pequenas e úteis.

**Java 26** ([notas de release](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html)):

- `Process` implementa `AutoCloseable` (e `Closeable`): fechar o processo garante que ele terminou e libera streams e recursos, então dá para usá-lo em `try`-with-resources.
- `Comparator` ganhou os métodos default `min(T, T)` e `max(T, T)`.
- `UUID.ofEpochMillis(long)` cria UUIDs versão 7, que começam pelo timestamp, em milissegundos, e por isso ficam ordenados pelo instante de criação.
- `Instant.plusSaturating(Duration)` soma sem estourar: no limite, devolve `Instant.MIN` ou `Instant.MAX`. `Duration` ganhou as constantes `MIN` e `MAX`.
- `HttpRequest.BodyPublishers.ofFileChannel(channel, offset, length)` envia só um trecho de um arquivo, útil para upload em partes.
- `java.nio.ByteOrder` virou `enum` e pode ser usado em `switch`.
- Suporte a Unicode 17.0 e ao JDBC 4.5 MR, que inclui os tipos SQL `DECFLOAT` e `JSON`.

```java title="ApisMenores.java"
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.UUID;

public class ApisMenores {
    public static void main(String[] args) throws Exception {
        // Process agora é AutoCloseable: processo e streams são liberados ao sair do bloco
        // (a saída de "java -version" vai para o stream do processo, não aparece aqui)
        try (Process p = new ProcessBuilder("java", "-version").start()) {
            p.waitFor();
        }

        // Comparator ganhou min/max entre dois valores
        Comparator<String> porTamanho = Comparator.comparingInt(String::length);
        IO.println(porTamanho.max("java", "kotlin"));   // kotlin

        // UUID versão 7, ordenável pelo instante de criação
        UUID id = UUID.ofEpochMillis(System.currentTimeMillis());
        IO.println(id.version());                        // 7

        // Soma saturada: em vez de estourar, para no limite
        IO.println(Instant.MAX.minusSeconds(10).plusSaturating(Duration.ofDays(1))
                .equals(Instant.MAX));                   // true
        IO.println(Duration.MAX);                        // PT2562047788015215H30M7.999999999S
    }
}
```

**Java 27** ([notas de release](https://jdk.java.net/27/release-notes)): `KeyStore.getCreationInstant` devolve a data de criação de uma entrada como `Instant`; na Foreign Function & Memory API, `Linker.Option.captureCallState` também inicializa o estado thread-local antes da downcall (a chamada de Java para uma função nativa); e os formatadores ISO predefinidos de `DateTimeFormatter` passam a aceitar offsets curtos, como `+01`, no parsing.

## JVM, GC e desempenho

### G1 com menos sincronização entre aplicação e GC

**Chegou em:** Java 26 (final, [JEP 522](https://openjdk.org/jeps/522))

O G1 divide o heap em regiões e, para não varrer o heap inteiro a cada coleta, anota numa **card table** quais trechos da memória guardam referências para objetos de outras regiões. Quem mantém essa tabela são as **write barriers**: pequenos trechos de código que a JVM injeta na aplicação e que rodam a cada atribuição de referência, como `pedido.cliente = c`. Em segundo plano, threads de otimização do G1 processam a mesma tabela.

**O problema.** Até o Java 25, a aplicação e as threads de otimização mexiam na mesma card table e precisavam se sincronizar. Essa sincronização deixava as write barriers longas e lentas, e elas rodam o tempo todo.

**O que mudou.** A JEP 522 cria uma **segunda card table**. A aplicação escreve numa tabela sem sincronizar, as threads de otimização trabalham na outra, e o G1 troca as duas de forma atômica quando precisa.

![Comparação entre o G1 até o Java 25, com aplicação e threads de otimização disputando uma única card table sincronizada, e o G1 do Java 26, com duas card tables: a aplicação escreve numa, as threads de otimização processam a outra e o G1 troca as duas de forma atômica](/posts/java-29/g1-duas-card-tables.svg)

No diagrama, à esquerda está o modelo antigo, com uma tabela disputada pelos dois lados; à direita, o novo, em que cada lado tem a sua tabela e as setas laranja indicam a troca.

**Resultado e custo.** A JEP relata ganhos de throughput (trabalho feito por unidade de tempo) de 5% a 15% em aplicações que modificam muitos campos de referência, e de até 5% nas demais. No x64, as write barriers caíram de cerca de 50 instruções para 12. O custo é memória nativa: cada card table ocupa 0,2% da capacidade do heap, ou cerca de 2 MB por GB. Não há flag nova: basta usar o G1 no Java 26 ou posterior.

![Dois padrões da JVM que mudam no Java 27: sem flag explícita, o coletor passa a ser sempre G1 (antes era Serial em máquinas com 1 CPU ou menos de 1792 MB), e o cabeçalho de objeto passa de 96 para 64 bits](/posts/java-29/jvm-padroes-java-27.svg)

O Java 27 muda dois padrões da JVM, resumidos no diagrama e detalhados nas duas seções seguintes: o coletor escolhido quando nenhum é informado e o tamanho do cabeçalho dos objetos. Os dois só afetam quem não passa a flag correspondente na linha de comando.

### G1 como coletor padrão em qualquer ambiente

**Chegou em:** Java 27 (final, [JEP 523](https://openjdk.org/jeps/523))

**O problema.** Desde o Java 9 ([JEP 248](https://openjdk.org/jeps/248), veja [G1 como coletor padrão no post do Java 11](/posts/java-11/#g1-como-coletor-padrão)), o G1 era o padrão apenas em máquinas "server". Com 1 CPU ou menos de 1792 MB de memória física, a JVM escolhia o Serial, um coletor mais simples, que usa uma única thread. Assim, a mesma aplicação podia rodar com coletores diferentes conforme a máquina.

**O que mudou.** A JEP 523 afirma que o G1 ficou competitivo com o Serial em qualquer tamanho de heap, em parte graças à JEP 522. Por isso, sem um coletor na linha de comando, a JVM agora escolhe **sempre o G1**. O Serial continua disponível com `-XX:+UseSerialGC`.

**Cuidados.** Na prática, isso atinge principalmente containers com limites baixos, porque a JVM considera os limites do container ao contar CPUs e memória (veja [JVM ciente de contêineres no post do Java 11](/posts/java-11/#jvm-ciente-de-contêineres)). Se o limite é 1 CPU ou menos de 1792 MB e ninguém escolheu o coletor, o Java 27 passa a rodar G1. As flags `AlwaysActAsServerClassMachine` e `NeverActAsServerClassMachine`, que influenciavam essa escolha, foram depreciadas no Java 26 ([notas de release do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html)).

### Compact object headers ligados por padrão

**Chegou em:** Java 24 (experimental, [JEP 450](https://openjdk.org/jeps/450)) → Java 25 (final, [JEP 519](https://openjdk.org/jeps/519)) → Java 27 (final, [JEP 534](https://openjdk.org/jeps/534))

Cada objeto Java carrega um cabeçalho com dados que a JVM usa internamente, como o hash, a idade do objeto para o GC e um ponteiro para a classe. Em arquiteturas de 64 bits, esse cabeçalho ocupava 96 bits; com compact object headers, ocupa 64. Como a maioria dos objetos é pequena (a [JEP 450](https://openjdk.org/jeps/450) cita tamanhos médios de 32 a 64 bytes), o cabeçalho sozinho podia ocupar mais de 20% dos dados vivos, e os 32 bits economizados em cada objeto fazem diferença.

**O que mudou.** No Java 25 o recurso já era de produto, mas era preciso pedir com `-XX:+UseCompactObjectHeaders` (veja [Compact object headers no post do Java 25](/posts/java-25/#compact-object-headers)). No 27, esse é o layout padrão. A JEP 534 cita os experimentos que motivaram a mudança, entre eles um cenário em que o SPECjbb2015 usou 22% menos heap e 8% menos CPU, o uso em centenas de serviços em produção na Amazon e a adoção como padrão no SapMachine, a distribuição da SAP.

**Cuidados.** Para voltar ao layout antigo, use `-XX:-UseCompactObjectHeaders`. As [notas do Java 27](https://jdk.java.net/27/release-notes) avisam que essa flag deve ser depreciada e removida no futuro. O JDK traz arquivos CDS (Class Data Sharing, com metadados de classes já processados para acelerar o startup) separados para cada modo, então desligar o recurso não faz perder esse ganho.

### Cache AOT com qualquer coletor, inclusive ZGC

**Chegou em:** Java 26 (final, [JEP 516](https://openjdk.org/jeps/516))

O cache AOT (ahead-of-time, "antes da execução") do Project Leyden ([JEP 483](https://openjdk.org/jeps/483), Java 24, e [JEP 514](https://openjdk.org/jeps/514), Java 25) melhora startup e warmup. Numa **execução de treino**, a JVM observa a aplicação e grava num arquivo as classes já carregadas e ligadas, além de objetos Java prontos. Nas execuções seguintes, ela reaproveita esse arquivo em vez de refazer o trabalho. O funcionamento está no [post do Java 25](/posts/java-25/#cache-aot-inicialização-e-warmup-mais-rápidos-projeto-leyden).

**O problema.** Até o Java 25, os objetos Java do cache ficavam num formato ligado ao layout de memória dos coletores Serial, Parallel e G1, incompatível com o ZGC. Era preciso escolher entre a latência baixa do ZGC e o startup rápido do cache.

**O que mudou.** A JEP 516 cria um formato **independente de GC**, chamado streamable: as referências entre objetos viram índices lógicos, e uma thread em segundo plano recria os objetos no heap enquanto a aplicação sobe. O formato antigo, mapeável, continua existindo: nele, os objetos são mapeados direto na memória do heap. A JVM escolhe o formato na hora de gravar o cache. Se o treino usou ZGC, `-XX:-UseCompressedOops` ou heap acima de 32 GB, grava no formato streamable; com compressed oops ligado e heap de até 32 GB, grava no formato mapeável. O formato streamable pode ser forçado com `-XX:+AOTStreamableObjects`.

```bash title="aot-com-zgc.sh"
# Treino e criação do cache em um passo (fluxo da JEP 514, Java 25)
java -XX:+UseZGC -XX:AOTCacheOutput=app.aot -jar app.jar

# Produção usando o cache, agora também com ZGC (Java 26+)
java -XX:+UseZGC -XX:AOTCache=app.aot -jar app.jar
```

Por padrão, se o cache não puder ser usado, a JVM emite um aviso e segue sem ele. Com `-XX:AOTMode=on`, ela aborta a inicialização, o que é útil para garantir em produção que o cache está sendo aproveitado ([JEP 483](https://openjdk.org/jeps/483)). No Java 27, `-XX:AOTMode=required` passou a ser um alias de `on` e é a forma recomendada, porque `on` deve ser depreciado e removido ([notas do 27](https://jdk.java.net/27/release-notes)). O Java 26 não conhece o valor `required`: a JVM não inicia com essa flag.

### Outros ajustes de GC e runtime

| Mudança | Versão | Fonte |
| --- | --- | --- |
| G1 passa a lançar `OutOfMemoryError` quando o overhead de GC fica excessivo (`UseGCOverheadLimit`), como o Parallel já fazia | 26 | [Notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html) |
| G1 recupera antes objetos humongous que contêm referências, sem esperar a marcação concorrente | 26 | [Notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html) |
| Sem `-Xms`, o heap inicial passa a ser o mínimo possível (`MinHeapSize`), e não mais 1/64 da memória física | 26 | [Notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html) |
| Padrões de `-XX:MinHeapFreeRatio`/`MaxHeapFreeRatio` no G1 mudam de 40/70 para 0/100, o que na prática desliga esse redimensionamento do heap | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |
| `-XX:InitiatingHeapOccupancyPercent` vira `-XX:G1IHOP` (o nome antigo fica como alias depreciado) | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |
| `UseCompressedClassPointers` fica obsoleta: os ponteiros de classe são sempre comprimidos | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |

## Ferramentas

### JFR mascara dados sensíveis antes de gravar

**Chegou em:** Java 27 (final, [JEP 536](https://openjdk.org/jeps/536))

**O problema.** O JDK Flight Recorder (JFR) é o gravador de eventos de diagnóstico embutido na JVM. Toda gravação guarda os argumentos da linha de comando, as variáveis de ambiente e as system properties iniciais. É útil para diagnóstico, mas senhas passadas por `-D`, tokens em variáveis de ambiente e argumentos como `--dbpassword` iam parar, sem nenhuma proteção, no arquivo `.jfr` que depois é compartilhado ou anexado a um chamado.

**O que mudou.** A partir do Java 27, o JFR **mascara por padrão**, ainda dentro do processo e antes de escrever o arquivo, os valores que batem com uma lista de filtros. Para chaves, a lista inclui padrões como `*password*`, `*secret*`, `*token*`, `*auth*` e `*api*key*`. Para argumentos, cobre formas como `-*password *`, que pega a opção e o valor seguinte. O valor mascarado aparece como `[REDACTED]`. Dá para acrescentar filtros próprios, carregá-los de arquivo ou desligar os padrões:

```bash title="jfr-mascaramento.sh"
# Padrão no Java 27: segredos óbvios já saem como [REDACTED]
java -XX:StartFlightRecording:filename=dump.jfr -jar app.jar

# Acrescentar filtros próprios aos padrões (note o "+")
java -XX:FlightRecorderOptions:'redact-key=+confidencial,redact-argument=+--pin *' \
     -XX:StartFlightRecording:filename=dump.jfr -jar app.jar

# Filtros em arquivo e log de depuração do que foi mascarado
java '-XX:FlightRecorderOptions:redact-argument=@args.txt,redact-key=@keys.txt' \
     -Xlog:jfr+redact=debug -XX:StartFlightRecording:filename=dump.jfr -jar app.jar

# Conferir o resultado
jfr print --events InitialSystemProperty,JVMInformation,InitialEnvironmentVariable dump.jfr

# Desligar os filtros padrão (só se houver motivo)
java -XX:FlightRecorderOptions:redact-key=none,redact-argument=none -jar app.jar
```

**Cuidados.** Sem o `+`, os filtros informados substituem a lista padrão em vez de complementá-la ([JEP 536](https://openjdk.org/jeps/536); o `+` e o `none` também aparecem nas [notas do Java 27](https://jdk.java.net/27/release-notes)). Os filtros padrão reconhecem nomes comuns, como `password` e `token`; um segredo com nome próprio da aplicação só é mascarado se você acrescentar um filtro para ele. No mesmo release, o evento `jdk.SystemProcess` deixou de registrar os argumentos de linha de comando de outros processos da máquina.

### Diagnóstico e ferramentas menores

- **Java 26:** javadoc com tema escuro; o thread dump de `jcmd <pid> Thread.dump_to_file` mostra o dono do lock de threads estacionadas ([notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html)).
- **Java 27:** novo `jcmd <pid> VM.security_properties`, script de autocompletar do `jcmd` para Bash, `-XX:FlightRecorderOptions:help` e contagem de file descriptors abertos em `VM.info` e no `hs_err_pid` ([notas do 27](https://jdk.java.net/27/release-notes)).

## Segurança

### Troca de chaves híbrida pós-quântica no TLS 1.3

**Chegou em:** Java 27 (final, [JEP 527](https://openjdk.org/jeps/527))

Este recurso usa o ML-KEM, algoritmo resistente a computação quântica que entrou no Java 24 (veja [ML-KEM e ML-DSA no post do Java 25](/posts/java-25/#criptografia-resistente-a-computação-quântica-ml-kem-e-ml-dsa)).

**O problema.** Um atacante pode gravar tráfego cifrado hoje e decifrá-lo quando existirem computadores quânticos capazes de quebrar RSA e ECDH. É o ataque conhecido como "harvest now, decrypt later". A IETF definiu esquemas **híbridos** para o TLS 1.3, que combinam um algoritmo resistente a ataques quânticos (ML-KEM) com um tradicional (ECDHE). O resultado continua seguro enquanto pelo menos um dos dois resistir.

**O que mudou.** No TLS, os **named groups** são os algoritmos de troca de chaves que cliente e servidor negociam no início da conexão (o handshake). O JDK implementa três named groups híbridos: `X25519MLKEM768`, `SecP256r1MLKEM768` e `SecP384r1MLKEM1024`. O `X25519MLKEM768` vai para o **topo da lista padrão**, então quem usa `javax.net.ssl` sem escolher grupos passa a oferecê-lo sem mudar código. Os outros dois só são usados se forem configurados. A lista padrão completa fica assim: `X25519MLKEM768, x25519, secp256r1, secp384r1, secp521r1, x448, ffdhe2048, ffdhe3072, ffdhe4096`. Para restringir ou reordenar, use a propriedade `jdk.tls.namedGroups` ou `SSLParameters.setNamedGroups`:

```java title="TlsHibrido.java"
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;

public class TlsHibrido {
    public static void main(String[] args) throws Exception {
        SSLSocket socket = (SSLSocket) SSLContext.getDefault()
                .getSocketFactory().createSocket();
        SSLParameters params = socket.getSSLParameters();
        // Só é preciso mexer aqui se a política exigir grupos específicos
        params.setNamedGroups(new String[] {
                "X25519MLKEM768", "SecP256r1MLKEM768", "x25519", "secp256r1"
        });
        socket.setSSLParameters(params);
        IO.println(String.join(", ", socket.getSSLParameters().getNamedGroups()));
        // X25519MLKEM768, SecP256r1MLKEM768, x25519, secp256r1
    }
}
```

### Outras mudanças de segurança

| Mudança | Versão | Fonte |
| --- | --- | --- |
| Novo algoritmo de `Cipher` `"HPKE"` (Hybrid Public Key Encryption, RFC 9180) com `HPKEParameterSpec` | 26 | [Notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html) |
| Assinatura e verificação de JARs com ML-DSA (`jarsigner` e API `JarSigner`) | 26 | [Notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html) |
| Nova propriedade `jdk.crypto.disabledAlgorithms` para desabilitar algoritmos na camada JCE | 26 | [Notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html) |
| Compressão de certificados TLS 1.3 com zlib (RFC 8879), ligada por padrão | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |
| Chaves privadas ML-KEM e ML-DSA passam a ser codificadas em PKCS#8 no formato `seed` por padrão | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |
| Otimizações de desempenho em ML-KEM e ML-DSA (SHA-3 em x86_64 com AVX-512) e em X25519/Ed25519 (AArch64 e x86_64) | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |

## Removidos e depreciados

### Mutação de campos final por reflexão passa a emitir aviso

**Chegou em:** Java 26 (final, [JEP 500](https://openjdk.org/jeps/500))

**O problema.** Desde o JDK 5, `Field.setAccessible(true)` seguido de `Field.set(...)` altera até campos `final`. Com isso, nem a JVM nem quem lê o código podem confiar que um `final` de instância nunca muda. Para a JVM, isso bloqueia otimizações como o **constant folding**, em que o compilador JIT troca a leitura do campo pelo próprio valor (é o que dá desempenho às [Lazy Constants](#lazy-constants)).

**O que mudou.** No Java 26, alterar um campo `final` por reflexão ainda funciona, mas gera um **aviso**, no máximo um por módulo. A JEP prevê que uma versão futura passe a **lançar exceção** por padrão. O comportamento é controlado por `--illegal-final-field-mutation=allow|warn|debug|deny` (`warn` é o padrão no 26), e a permissão é dada explicitamente com `--enable-final-field-mutation=ALL-UNNAMED` ou com uma lista de módulos. `--add-opens`, a opção usada desde o [encapsulamento forte do Java 16 e 17](/posts/java-17/#encapsulamento-forte-dos-internos-do-jdk) para liberar reflexão profunda, não basta para evitar o aviso.

```java title="FinalMutavel.java" {16}
import java.lang.reflect.Field;

public class FinalMutavel {

    static class Preco {
        private final long centavos;
        Preco(long centavos) { this.centavos = centavos; }
        long centavos() { return centavos; }
    }

    public static void main(String[] args) throws Exception {
        Preco preco = new Preco(1_000);

        Field campo = Preco.class.getDeclaredField("centavos");
        campo.setAccessible(true);   // continua funcionando como antes
        campo.set(preco, 1);         // Java 26+: gera WARNING (padrão warn)

        IO.println(preco.centavos());
    }
}
```

Saída no Temurin 26.0.2:

```text title="saída"
WARNING: Final field centavos in class FinalMutavel$Preco has been mutated reflectively by class FinalMutavel in unnamed module @525b461a (file:/w/FinalMutavel.java)
WARNING: Use --enable-final-field-mutation=ALL-UNNAMED to avoid a warning
WARNING: Mutating final fields will be blocked in a future release unless final field mutation is enabled
1
```

**Cuidados.** Com `--illegal-final-field-mutation=deny`, o mesmo código lança `IllegalAccessException`. A JEP recomenda rodar os testes com `deny` desde já para achar quem faz isso, e em geral o culpado é uma biblioteca, não a aplicação. Outra forma de encontrar é o evento JFR `jdk.FinalFieldMutation`. Para bibliotecas de serialização, a JEP recomenda `sun.reflect.ReflectionFactory` em vez de reflexão profunda.

### Applet API removida

**Chegou em:** Java 9 (depreciado, [JEP 289](https://openjdk.org/jeps/289)) → Java 17 (depreciado para remoção, [JEP 398](https://openjdk.org/jeps/398)) → Java 26 (removido, [JEP 504](https://openjdk.org/jeps/504))

Os navegadores já não executam applets, e desde o Java 11, quando o `appletviewer` foi removido, o JDK não tem mais como rodá-los ([JEP 504](https://openjdk.org/jeps/504); veja também [Nashorn, Pack200, CMS e Applet API no post do Java 11](/posts/java-11/#nashorn-pack200-cms-e-applet-api)). Faltava remover a API. No Java 26 saíram o pacote `java.applet` inteiro, `javax.swing.JApplet`, `java.beans.AppletInitializer` e os membros de `java.beans.Beans` e `javax.swing.RepaintManager` que dependiam deles. Um efeito colateral: `URL.getContent()` e `URLConnection.getContent()` não devolvem mais `java.applet.AudioClip` para conteúdo de áudio. Para tocar áudio, a JEP aponta a `javax.sound.SoundClip`, introduzida no Java 25.

### Outras remoções

| Removido | Versão | Fonte |
| --- | --- | --- |
| `Thread.stop()`: código que chama não compila, e binários antigos recebem `NoSuchMethodError` | 26 | [Notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html) |
| Ferramenta `jrunscript` e módulo `jdk.jsobject` (este segue no JavaFX) | 26 | [Notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html) |
| Suporte a InfiniBand SDP, `setTTL`/`getTTL` de `MulticastSocket` e `DatagramSocketImpl` e `MulticastSocket.send(DatagramPacket, byte)` | 26 | [Notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html) |
| JVM Compiler Interface (JVMCI, a interface para plugar na JVM um compilador JIT escrito em Java, [JEP 243](https://openjdk.org/jeps/243)): módulos `jdk.internal.vm.ci`, `jdk.graal.compiler` e `jdk.graal.compiler.management`, flags `*JVMCI*` e `-XX:+UseGraalJIT` | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |
| Opções `-noclassgc`, `-noverify`, `-verifyremote` e `-Xverify:none` | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |
| `ThreadPoolExecutor.finalize()` | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |
| Mecanismo `VFORK` de `jdk.lang.Process.launchMechanism` (Linux) e a propriedade `java.locale.useOldISOCodes` | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |
| `ffdhe6144` e `ffdhe8192` saem da lista padrão de named groups TLS | 27 | [Notas do 27](https://jdk.java.net/27/release-notes) |

### Depreciações

- **Java 26:** `java.net.SocketPermission` e `Socket.setPerformancePreferences` (e os equivalentes em `SocketImpl` e `ServerSocket`) foram depreciados para remoção. Também foram depreciadas as flags `-Xmaxjitcodesize`, `AlwaysActAsServerClassMachine`, `NeverActAsServerClassMachine`, `AggressiveHeap` e `MaxRAM`. No caso de `MaxRAM`, o valor padrão também deixou de existir, e o dimensionamento do heap usa a memória disponível ([notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html)).
- **Java 27:** o alias `-XX:InitiatingHeapOccupancyPercent` foi depreciado ([notas do 27](https://jdk.java.net/27/release-notes)).
- **Java 28 (ainda não lançado):** port macOS/x64 depreciado para remoção ([JEP 541](https://openjdk.org/jeps/541)). Segundo a JEP, os engenheiros da Oracle deixam de manter esse port a partir do JDK 27.

## Ainda em preview ou incubadora

Nenhum destes recursos é definitivo: todos exigem `--enable-preview` (ou `--add-modules`, no caso da incubadora) e mudaram de API entre uma versão e outra. Todos já existiam como preview ou incubadora no Java 25; cada seção aponta para a explicação original no post do Java 25 e mostra o que mudou desde então. Os exemplos refletem o Java 27.

### Structured Concurrency

**Chegou em:** Java 25 (5ª preview, [JEP 505](https://openjdk.org/jeps/505)) → Java 26 (6ª preview, [JEP 525](https://openjdk.org/jeps/525)) → Java 27 (7ª preview, [JEP 533](https://openjdk.org/jeps/533))

As primeiras versões estão em [Structured Concurrency no post do Java 21](/posts/java-21/#structured-concurrency) e [no post do Java 25](/posts/java-25/#structured-concurrency).

**O problema.** Com `ExecutorService`, nada liga as tarefas ao método que as disparou: se uma falha, as outras continuam; se quem espera é interrompido, as subtarefas nem ficam sabendo; e o thread dump não mostra quem é filho de quem.

**Como funciona.** `StructuredTaskScope` trata um grupo de subtarefas como uma unidade presa a um bloco `try`. A thread que abre o escopo, chamada de thread dona, dispara as subtarefas com `fork` (por padrão, cada uma numa virtual thread), espera tudo com `join` e fecha o escopo ao sair do bloco. A política de conclusão fica num `Joiner`. Na política padrão, se uma subtarefa falhar, as outras são canceladas. O `close()` sempre espera as threads terminarem, então nenhuma sobra depois do bloco. No thread dump em JSON (`jcmd <pid> Thread.dump_to_file -format=json <arquivo>`), a hierarquia de escopos aparece.

![Diagrama do StructuredTaskScope no Java 27: a thread dona abre o escopo, dispara três subtarefas em virtual threads e chama join; com os Joiners prontos, os três desfechos são sucesso com resultado, falha de uma subtarefa com ExecutionException e prazo estourado com ExecutionException causada por CancelledByTimeoutException](/posts/java-29/structured-concurrency.svg)

O diagrama mostra os três desfechos possíveis do `join()` com os `Joiner`s prontos do Java 27. O exemplo abaixo cobre a política padrão e um `Joiner` com prazo:

```java title="Checkout.java" {30-37,43-47}
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.CancelledByTimeoutException;
import java.util.concurrent.StructuredTaskScope.Joiner;
import java.util.concurrent.StructuredTaskScope.Subtask;

public class Checkout {

    record Resumo(String cliente, int itens) {}

    static String buscarCliente() throws InterruptedException {
        Thread.sleep(100);
        return "ana";
    }

    static int contarItens() throws InterruptedException {
        Thread.sleep(150);
        return 3;
    }

    static String consultarEstoque(String sku) throws InterruptedException {
        Thread.sleep(sku.equals("lento") ? 5_000 : 50);
        return sku + ": disponível";
    }

    // Política padrão: se uma subtarefa falhar, as outras são canceladas
    static Resumo carregar() throws ExecutionException, InterruptedException {
        try (var scope = StructuredTaskScope.open()) {
            Subtask<String> cliente = scope.fork(() -> buscarCliente());
            Subtask<Integer> itens = scope.fork(() -> contarItens());

            scope.join(); // Java 27: lança ExecutionException se alguma falhar

            return new Resumo(cliente.get(), itens.get());
        }
    }

    // Todas precisam dar certo dentro do prazo; o resultado já vem como lista
    static List<String> estoque(List<String> skus, Duration prazo)
            throws ExecutionException, InterruptedException {
        try (var scope = StructuredTaskScope.open(
                Joiner.<String>allSuccessfulOrThrow(),
                cf -> cf.withTimeout(prazo))) {
            skus.forEach(sku -> scope.fork(() -> consultarEstoque(sku)));
            return scope.join();
        }
    }

    public static void main(String[] args) throws Exception {
        IO.println(carregar());
        IO.println(estoque(List.of("a1", "b2"), Duration.ofSeconds(1)));
        try {
            estoque(List.of("a1", "lento"), Duration.ofMillis(300));
        } catch (ExecutionException e) {
            if (e.getCause() instanceof CancelledByTimeoutException) {
                IO.println("prazo estourado: subtarefas canceladas");
            }
        }
    }
}
```

Para rodar no Java 27: `java --enable-preview --source 27 Checkout.java`. Pela API do JDK 27, a saída esperada é:

```text title="saída"
Resumo[cliente=ana, itens=3]
[a1: disponível, b2: disponível]
prazo estourado: subtarefas canceladas
```

A lista do segundo passo vem na ordem em que as subtarefas foram disparadas com `fork`.

**O que mudou no caminho.** Cada preview mexeu na API, e código escrito para uma versão costuma não compilar na seguinte:

| Versão | Mudanças na API |
| --- | --- |
| Java 25 ([JEP 505](https://openjdk.org/jeps/505)) | Os construtores públicos deram lugar às fábricas estáticas `open(...)` e a política passou para o `Joiner`. Em caso de falha, `join()` lançava `FailedException`; com prazo estourado, `TimeoutException`. |
| Java 26 ([JEP 525](https://openjdk.org/jeps/525)) | Novo `Joiner.onTimeout()`, para um `Joiner` devolver resultado quando o prazo estoura. `allSuccessfulOrThrow()` passou a devolver uma lista de resultados, e não mais um stream de subtarefas. `anySuccessfulResultOrThrow()` foi renomeado para `anySuccessfulOrThrow()`. O `open` que recebe `Joiner` e configuração passou a aceitar `UnaryOperator` em vez de `Function`. As exceções de `join()` continuaram as mesmas. |
| Java 27 ([JEP 533](https://openjdk.org/jeps/533)) | `StructuredTaskScope` e `Joiner` ganharam um terceiro parâmetro de tipo, `R_X`, com a exceção que `join()` pode lançar. As fábricas prontas passaram a lançar `ExecutionException`, e há sobrecargas que recebem uma `Function` para gerar outra exceção. `FailedException` e `TimeoutException` deixaram de existir. `awaitAll()` foi removido. `onTimeout()` virou `timeout()`, e o estouro de prazo chega como exceção com causa `CancelledByTimeoutException`. Também entrou o `open(UnaryOperator)`. |

Na prática, o tratamento de erro escrito para o 26 precisa mudar no 27:

```java title="TratamentoDeErro.java" del={3} ins={4}
try (var scope = StructuredTaskScope.open()) {
    // ...
} catch (StructuredTaskScope.FailedException e) {   // Java 26
} catch (ExecutionException e) {                    // Java 27
    Throwable causa = e.getCause();                 // exceção da subtarefa que falhou
}
```

Um `Joiner` próprio implementa `result()` e, a partir do 27, `timeout()`; `onFork` e `onComplete` têm implementação default. As assinaturas completas estão na JEP 533 e no [código-fonte do `StructuredTaskScope` na tag `jdk-27-ga`](https://github.com/openjdk/jdk/blob/jdk-27-ga/src/java.base/share/classes/java/util/concurrent/StructuredTaskScope.java).

Existe uma JEP candidata, a [JEP 543](https://openjdk.org/jeps/543), que propõe finalizar a API no Java 28 sem outras mudanças. Em 16/09/2026 ela ainda não tinha alvo no 28.

**Quando usar.** Quando uma operação se divide em subtarefas concorrentes que só fazem sentido juntas, como buscar dados de vários serviços para montar uma resposta. Enquanto a API estiver em preview, concentre o uso em poucos pontos do código: a cada versão do JDK, é ali que o ajuste vai ser necessário.

### Tipos primitivos em patterns, instanceof e switch

**Chegou em:** Java 25 (3ª preview, [JEP 507](https://openjdk.org/jeps/507)) → Java 26 (4ª preview, [JEP 530](https://openjdk.org/jeps/530)) → Java 27 (5ª preview, [JEP 532](https://openjdk.org/jeps/532))

A versão do Java 25 está em [Tipos primitivos em padrões, instanceof e switch no post do Java 25](/posts/java-25/#tipos-primitivos-em-padrões-instanceof-e-switch).

**O problema.** Converter um primitivo para outro menor, como `int` para `byte`, é silencioso: se o valor não cabe, o cast corta bits e o erro segue adiante sem aviso. O `instanceof` sempre serviu para perguntar "é seguro fazer este cast?", mas só funcionava com tipos de referência. Um `switch` também não aceitava `long`, `float`, `double` nem `boolean` como seletor.

**Como funciona.** Com o recurso habilitado, `instanceof` e `switch` aceitam tipos primitivos em qualquer posição de pattern. O teste vale `true` quando a conversão é **exata**, ou seja, quando nenhuma informação se perde. Com `int i = 1000`, `i instanceof byte` é `false`. Com `i = 16_777_217`, `i instanceof float` também é `false`, porque o `float` não representa esse inteiro sem perder precisão. O `switch` passa a funcionar com todos os tipos primitivos e com os wrappers correspondentes. Um `switch` sobre `boolean` que trata `true` e `false` já é exaustivo.

**O que mudou no caminho.** A JEP 530 (Java 26) mudou duas coisas: melhorou a definição de conversão "incondicionalmente exata" e deixou mais rígida a checagem de dominância no `switch`. Com isso, o compilador passa a rejeitar `case` que nunca seriam alcançados, e alguns `switch` que compilavam no Java 25 deixam de compilar. A JEP 532 (Java 27) repete o preview sem mudanças, então quem já ajustou o código para o 26 não precisa mexer de novo.

```java title="PadroesPrimitivos.java"
public class PadroesPrimitivos {

    // instanceof com tipo primitivo: true só se a conversão for exata
    static String classificar(int valor) {
        if (valor instanceof byte b) {
            return "cabe em byte: " + b;
        }
        return "precisa de int: " + valor;
    }

    // switch sobre double, com constante e guarda
    static String descrever(double temperatura) {
        return switch (temperatura) {
            case 0d -> "zero";
            case double t when t < 0 -> "negativa: " + t;
            case double t -> "positiva: " + t;
        };
    }

    // switch sobre boolean: true + false já é exaustivo
    static String estado(boolean ativo) {
        return switch (ativo) {
            case true -> "ligado";
            case false -> "desligado";
        };
    }

    public static void main(String[] args) {
        IO.println(classificar(42));     // cabe em byte: 42
        IO.println(classificar(1000));   // precisa de int: 1000
        IO.println(descrever(-3.5));     // negativa: -3.5
        IO.println(estado(true));        // ligado

        long grande = 16_777_217L;       // 2^24 + 1
        IO.println(grande instanceof float);  // false: float perderia precisão
        IO.println(grande instanceof double); // true
    }
}
```

Para rodar: `java --enable-preview --source 27 PadroesPrimitivos.java` (no Java 26, `--source 26`).

A checagem de dominância mais rígida também pega constantes que um pattern anterior já cobre. O trecho abaixo compila no Java 25 com `--enable-preview` e é rejeitado a partir do 26:

```java title="Dominancia.java" {4-5}
static void teste(int x) {
    switch (x) {
        case float f -> IO.println("float");
        // erro: "this case label is dominated by a preceding case label"
        case 16_777_216 -> IO.println("constante");
        default -> IO.println("outro");
    }
}
```

### Lazy Constants

**Chegou em:** Java 25 (preview, [JEP 502](https://openjdk.org/jeps/502)) → Java 26 (2ª preview, [JEP 526](https://openjdk.org/jeps/526)) → Java 27 (3ª preview, [JEP 531](https://openjdk.org/jeps/531))

No Java 25, a API se chamava Stable Values (veja [Stable Values no post do Java 25](/posts/java-25/#stable-values)); o nome Lazy Constants veio no Java 26.

**O problema.** Um campo `final` precisa ser atribuído no construtor ou no inicializador estático, ou seja, cedo. Se o valor é caro de montar (um logger que lê configuração, uma conexão, um cache), a aplicação paga esse custo na subida, mesmo que nunca use o valor. As saídas de sempre têm seus problemas: o padrão da classe holder só serve para campos `static`, o double-checked locking exige `volatile` e é fácil de errar, e o `ConcurrentHashMap.computeIfAbsent` impede que a JVM trate o valor como constante.

**Como funciona.** Um `java.lang.LazyConstant<T>` nasce vazio, com uma função de cálculo. O primeiro `get()` executa a função e guarda o resultado. A função roda **no máximo uma vez**, mesmo com várias threads chamando `get()` ao mesmo tempo, e depois disso o conteúdo não muda. Segundo a JEP, o conteúdo fica num campo com a anotação interna `@Stable`; se a lazy constant estiver num campo `final`, a JVM pode aplicar constant folding (explicado na seção da [JEP 500](#mutação-de-campos-final-por-reflexão-passa-a-emitir-aviso)) como faria com um `final` comum. Existem também versões preguiçosas das coleções: `List.ofLazy`, `Map.ofLazy` e, a partir do Java 27, `Set.ofLazy`.

![Diagrama do ciclo de vida de uma LazyConstant (criada, primeiro get, inicializada) e comparação entre campo final, LazyConstant e campo não final em número de atribuições, momento do cálculo, constant folding e escrita concorrente](/posts/java-29/lazy-constant.svg)

O diagrama mostra o ciclo de vida de uma lazy constant e a comparação que a JEP 531 faz com campos `final` e não `final`.

```java title="Aplicacao.java" {14-15,18,21-22,25-26}
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class Aplicacao {

    record Conexao(String url) {}
    record Worker(int id) {}
    record Taxa(String moeda, double valor) {}
    enum Opcao { VERBOSE, DRY_RUN, STRICT }

    // Computado no primeiro get(), no máximo uma vez, mesmo com várias threads
    static final LazyConstant<Conexao> CONEXAO =
            LazyConstant.of(() -> abrirConexao("jdbc:postgresql://db/app"));

    // Lista de tamanho fixo: cada posição é computada quando acessada
    static final List<Worker> WORKERS = List.ofLazy(4, Worker::new);

    // Mapa com chaves conhecidas: cada valor é computado quando lido
    static final Map<String, Taxa> TAXAS =
            Map.ofLazy(Set.of("BRL", "USD"), Aplicacao::carregarTaxa);

    // Java 27: a pertinência de cada candidato é decidida sob demanda
    static final Set<Opcao> OPCOES =
            Set.ofLazy(EnumSet.allOf(Opcao.class), Aplicacao::habilitada);

    static Conexao abrirConexao(String url) {
        IO.println("abrindo conexão (uma única vez)");
        return new Conexao(url);
    }

    static Taxa carregarTaxa(String moeda) {
        IO.println("carregando taxa de " + moeda);
        return new Taxa(moeda, moeda.equals("BRL") ? 1.0 : 5.4);
    }

    static boolean habilitada(Opcao opcao) {
        IO.println("avaliando " + opcao);
        return opcao == Opcao.DRY_RUN;
    }

    public static void main(String[] args) {
        IO.println(CONEXAO.get());      // computa aqui
        IO.println(CONEXAO.get());      // devolve o mesmo valor, sem recalcular
        IO.println(WORKERS.get(2));     // só o índice 2 é criado
        IO.println(TAXAS.get("USD"));   // só USD é carregado; BRL, não
        IO.println(OPCOES.contains(Opcao.DRY_RUN)); // só DRY_RUN é avaliado
    }
}
```

Para rodar no Java 27: `java --enable-preview --source 27 Aplicacao.java`. A saída mostra que cada função de cálculo roda só quando o valor é pedido, e uma única vez:

```text title="saída"
abrindo conexão (uma única vez)
Conexao[url=jdbc:postgresql://db/app]
Conexao[url=jdbc:postgresql://db/app]
Worker[id=2]
carregando taxa de USD
Taxa[moeda=USD, valor=5.4]
avaliando DRY_RUN
true
```

No Java 26, `Set.ofLazy` não existe. Sem as linhas de `OPCOES`, o exemplo roda com `--source 26` no Temurin 26.0.2 e imprime as seis primeiras linhas acima.

**Quando usar.** Lazy constants fazem sentido para valores caros que talvez nem sejam usados e que, depois de calculados, nunca mudam: configuração, conexões, loggers, tabelas de consulta. Enquanto a API estiver em preview, prefira usá-la em código que você controla e recompila a cada versão do JDK.

**O que mudou no caminho.**

- **Java 26 (JEP 526):** a API foi renomeada de `StableValue` para `LazyConstant` e ficou só com os casos de alto nível. Saíram os métodos de baixo nível `orElseSet`, `setOrThrow` e `trySet`, e também as fábricas `function` e `intFunction`. As fábricas de coleções foram para `List.ofLazy` e `Map.ofLazy`, e `null` deixou de ser aceito como valor calculado.
- **Java 27 (JEP 531):** saíram `isInitialized()` e `orElse(...)`, e entrou `Set.ofLazy(...)`.

A JEP deixa claro que o ganho de constant folding depende de a JVM confiar em campos `final`. Campos `static final` já são confiáveis. A maioria dos campos `final` de instância ainda pode ser alterada por reflexão, e a JEP cita a intenção de restringir isso no longo prazo, caminho que começou com a [JEP 500](#mutação-de-campos-final-por-reflexão-passa-a-emitir-aviso).

### API PEM

**Chegou em:** Java 25 (preview, [JEP 470](https://openjdk.org/jeps/470)) → Java 26 (2ª preview, [JEP 524](https://openjdk.org/jeps/524)) → Java 27 (3ª preview, [JEP 538](https://openjdk.org/jeps/538))

A primeira versão está em [Codificação PEM de objetos criptográficos no post do Java 25](/posts/java-25/#codificação-pem-de-objetos-criptográficos).

**O problema.** PEM é o formato de texto com `-----BEGIN ...-----` usado para chaves, certificados e CRLs. Até aqui, o JDK não tinha uma API para ler e escrever esse formato: era preciso tirar cabeçalhos e decodificar Base64 à mão, ou recorrer a bibliotecas como o Bouncy Castle.

**Como funciona.** `PEMEncoder` e `PEMDecoder` (em `java.security`) são imutáveis, thread-safe e reutilizáveis. Eles convertem objetos que implementam a interface selada `BinaryEncodable`: chaves assimétricas, `KeyPair`, `X509Certificate`, `X509CRL`, `EncryptedPrivateKeyInfo`, as key specs PKCS#8 e X.509 e a classe genérica `PEM`, que cobre tipos sem API própria, como requisições de certificado PKCS#10.

```java title="ChavesPem.java"
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PEMDecoder;
import java.security.PEMEncoder;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;

public class ChavesPem {
    public static void main(String[] args) throws Exception {
        KeyPair par = KeyPairGenerator.getInstance("EC").generateKeyPair();
        char[] senha = "troque-esta-senha".toCharArray();

        // Codificação: encoders são imutáveis e reutilizáveis
        PEMEncoder encoder = PEMEncoder.of();
        String publicaPem = encoder.encodeToString(par.getPublic());
        String privadaPem = encoder.withEncryption(senha).encodeToString(par.getPrivate());
        IO.println(publicaPem.lines().findFirst().orElseThrow()); // -----BEGIN PUBLIC KEY-----
        IO.println(privadaPem.lines().findFirst().orElseThrow()); // -----BEGIN ENCRYPTED PRIVATE KEY-----

        // Decodificação com o tipo esperado
        PEMDecoder decoder = PEMDecoder.of();
        ECPublicKey publica = decoder.decode(publicaPem, ECPublicKey.class);
        ECPrivateKey privada = decoder.withDecryption(senha).decode(privadaPem, ECPrivateKey.class);
        IO.println(publica.getAlgorithm() + " / " + privada.getAlgorithm()); // EC / EC

        // Ou sem saber o tipo de antemão, com pattern matching
        switch (decoder.decode(publicaPem)) {
            case PublicKey pk -> IO.println("chave pública " + pk.getFormat()); // chave pública X.509
            case PrivateKey sk -> IO.println("chave privada");
            default -> IO.println("outro objeto PEM");
        }
    }
}
```

Para rodar: `java --enable-preview --source 27 ChavesPem.java`. O código é o mesmo no Java 26, onde a interface ainda se chamava `DEREncodable`.

O `default` é obrigatório no `switch` porque o `decode` pode devolver outros tipos, como `KeyPair`, `X509Certificate` ou `PEM`. Mesmo um `switch` que liste todos os tipos públicos precisaria dele: a lista de subtipos de `BinaryEncodable` não é exaustiva, o que, segundo o [Javadoc de `BinaryEncodable`](https://github.com/openjdk/jdk/blob/jdk-27-ga/src/java.base/share/classes/java/security/BinaryEncodable.java), permite ampliá-la no futuro sem quebrar código existente.

**O que mudou no caminho.** No Java 26, `PEMRecord` virou `PEM`, os métodos `encryptKey` de `EncryptedPrivateKeyInfo` viraram `encrypt`, e encoder e decoder passaram a cifrar e decifrar `KeyPair` e `PKCS8EncodedKeySpec`. No Java 27, `DEREncodable` virou `BinaryEncodable`, `PEM` deixou de ser record e virou classe comum, `PEMDecoder.withFactory` virou `withFactoriesOf`, e entrou a exceção não verificada `javax.crypto.CryptoException`. A [JEP 542](https://openjdk.org/jeps/542), já concluída para o Java 28, finaliza a API **sem outras mudanças**. Ou seja: o código escrito para o 27 deve funcionar no 28 sem `--enable-preview`, e é a partir dali que vale trocar o parsing manual de PEM pela API em código de produção.

### Vector API

**Chegou em:** Java 25 (10ª incubadora, [JEP 508](https://openjdk.org/jeps/508)) → Java 26 (11ª incubadora, [JEP 529](https://openjdk.org/jeps/529)) → Java 27 (12ª incubadora, [JEP 537](https://openjdk.org/jeps/537))

A Vector API (veja [Vector API no post do Java 25](/posts/java-25/#vector-api)) expressa cálculos vetoriais que o JIT compila para instruções SIMD da CPU, que aplicam a mesma operação a vários valores de uma vez. Nas duas versões ela voltou sem mudança relevante de API; no 27, só a biblioteca SLEEF usada em ARM e RISC-V foi atualizada. Pelas JEPs, ela fica na incubadora até que os recursos necessários do Project Valhalla cheguem como preview. Em 16/09/2026, o primeiro preview de Value Objects ([JEP 401](https://openjdk.org/jeps/401)), do Valhalla, já tinha alvo no Java 28.

```java title="SomaVetorial.java"
import jdk.incubator.vector.FloatVector;
import jdk.incubator.vector.VectorSpecies;

public class SomaVetorial {
    static final VectorSpecies<Float> ESPECIE = FloatVector.SPECIES_PREFERRED;

    // c[i] = -(a[i]² + b[i]²), processando várias posições por instrução da CPU
    static void calcular(float[] a, float[] b, float[] c) {
        int i = 0;
        int limite = ESPECIE.loopBound(a.length);
        for (; i < limite; i += ESPECIE.length()) {
            var va = FloatVector.fromArray(ESPECIE, a, i);
            var vb = FloatVector.fromArray(ESPECIE, b, i);
            va.mul(va).add(vb.mul(vb)).neg().intoArray(c, i);
        }
        for (; i < a.length; i++) {           // sobra que não completa um vetor
            c[i] = (a[i] * a[i] + b[i] * b[i]) * -1.0f;
        }
    }

    public static void main(String[] args) {
        float[] a = {1, 2, 3, 4, 5, 6, 7, 8, 9};
        float[] b = {9, 8, 7, 6, 5, 4, 3, 2, 1};
        float[] c = new float[a.length];
        calcular(a, b, c);
        IO.println(java.util.Arrays.toString(c));
        // [-82.0, -68.0, -58.0, -52.0, -50.0, -52.0, -58.0, -68.0, -82.0]
    }
}
```

Para rodar: `java --add-modules jdk.incubator.vector SomaVetorial.java`. Sem o `--add-modules`, o pacote não fica visível e a compilação falha. Com ele, a JVM também imprime `WARNING: Using incubator modules: jdk.incubator.vector` antes da saída.

## O que observar vindo do Java 25

Mudanças confirmadas no 26 e no 27 que podem quebrar build, testes ou comportamento em produção:

1. **Recompilar tudo o que usa preview.** Pela [JEP 12](https://openjdk.org/jeps/12), uma JVM não carrega classes que dependem dos previews de outra versão. E as APIs mudaram entre versões: exceções do [`StructuredTaskScope`](#structured-concurrency) (`FailedException` → `ExecutionException`), [`StableValue` → `LazyConstant`](#lazy-constants) sem `isInitialized`/`orElse`, [`DEREncodable` → `BinaryEncodable`](#api-pem). Com a [dominância mais rígida](#tipos-primitivos-em-patterns-instanceof-e-switch) em `switch` com primitivos, alguns `switch` que compilavam deixam de compilar.
2. **Avisos de `final` alterado por reflexão** ([JEP 500](https://openjdk.org/jeps/500), [detalhes](#mutação-de-campos-final-por-reflexão-passa-a-emitir-aviso)). Procure os `WARNING: Final field ...` nos logs e rode os testes com `--illegal-final-field-mutation=deny`. Frameworks de injeção, mocks e serialização são os suspeitos de sempre.
3. **Coletor em containers pequenos** ([JEP 523](https://openjdk.org/jeps/523), [detalhes](#g1-como-coletor-padrão-em-qualquer-ambiente)). Com 1 CPU ou menos de 1792 MB, o padrão passa de Serial para G1. Meça memória e latência e, se preciso, fixe `-XX:+UseSerialGC`.
4. **Layout de objeto** ([JEP 534](https://openjdk.org/jeps/534), [detalhes](#compact-object-headers-ligados-por-padrão)). Os compact object headers vêm ligados. Se algo depender do layout antigo, `-XX:-UseCompactObjectHeaders` desliga.
5. **Flags e dimensionamento de heap.** No 26, sem `-Xms`, o heap inicial passa a ser o mínimo possível; quem dependia do padrão antigo pode fixar `-Xms` ou `-XX:InitialRAMPercentage=1.5625` ([notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html)). No 27, `-noverify`/`-Xverify:none`, `-noclassgc`, `-verifyremote` e `-XX:+UseGraalJIT` foram removidas, `UseCompressedClassPointers` ficou obsoleta, os padrões de `Min/MaxHeapFreeRatio` no G1 mudaram e `InitiatingHeapOccupancyPercent` virou `G1IHOP` ([notas do 27](https://jdk.java.net/27/release-notes)). Revise scripts de startup, Dockerfiles e `JAVA_TOOL_OPTIONS`.
6. **APIs removidas.** `Thread.stop()`, a Applet API e `ThreadPoolExecutor.finalize()`. No último caso, quem sobrescrevia `finalize()` chamando `super.finalize()` passa a chamar `Object.finalize()`, que declara `throws Throwable`, e o código pode deixar de compilar ([notas do 27](https://jdk.java.net/27/release-notes)).
7. **Rede e HTTP.** No 26, o timeout de `HttpRequest.Builder.timeout` passou a cobrir também a leitura do corpo da resposta, e os atributos de `HttpContext` deixaram de ser compartilhados com cada `HttpExchange` no servidor embutido (a propriedade `jdk.httpserver.attributes` restaura o comportamento antigo). No 27, o `HttpServer` passou de casamento por prefixo de string para prefixo de caminho: o contexto `/foo` não casa mais com `/foobar`, e a propriedade `sun.net.httpserver.pathMatcher` restaura o comportamento antigo ([notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html), [notas do 27](https://jdk.java.net/27/release-notes)).
8. **TLS e criptografia no 27.** `X25519MLKEM768` vira o grupo preferido. `ffdhe6144`/`ffdhe8192` saem da lista padrão. A derivação de chave do TLS 1.3 passa a usar chaves `Generic`, e providers JCE que não as suportam podem falhar no handshake (a propriedade `jdk.tls.t13KeyDerivationAlgorithm=TlsPremasterSecret` restaura o comportamento anterior). Chaves privadas ML-KEM e ML-DSA codificadas no 27 (formato `seed`) não são aceitas por versões anteriores por padrão ([notas do 27](https://jdk.java.net/27/release-notes)).
9. **Saídas e exceções que mudaram.** No 26, `DecimalFormat` passou a usar o algoritmo de `Double.toString` (`-Djdk.compat.DecimalFormat=true` restaura o antigo). No 27, o thread dump em JSON usa números nos IDs, e `ZipOutputStream.putNextEntry` lança `ZipException` em vez de `IllegalArgumentException` para nomes que não podem ser codificados ([notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html), [notas do 27](https://jdk.java.net/27/release-notes)).
10. **Dados de locale, TLS e compilação.** No 26, os dados de locale passaram ao CLDR 48 e, no 27, ao CLDR 48.2, com mudanças em formatos de data, hora e número (por exemplo, o separador de milhar suíço); testes que comparam texto formatado podem falhar. Também no 26, conexões RMI sobre TLS passaram a verificar por padrão se o certificado do servidor corresponde ao nome do host (`jdk.rmi.ssl.client.enableEndpointIdentification=false` desliga), e o `KeyManager` `SunX509` passou a checar os certificados locais contra as restrições de algoritmos (`jdk.tls.SunX509KeyManager.certChecking=false` restaura o comportamento antigo). No 27, o `javac` passou a rejeitar anotações `TYPE_USE` em variáveis com tipo inferido, como as declaradas com `var`, inclusive parâmetros de lambda ([notas do 26](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html), [notas do 27](https://jdk.java.net/27/release-notes)).

## Todas as JEPs, versão a versão

Listas conferidas nas páginas oficiais de cada release no OpenJDK; os títulos seguem as páginas das JEPs. Tipos: **Final** (recurso permanente ou mudança de implementação), **Preview**, **Incubadora**, **Experimental**, **Depreciação**, **Remoção**, **Plataforma** (port para sistema operacional ou arquitetura) e **Interno** (mudança no desenvolvimento do próprio OpenJDK, sem efeito para quem usa o JDK).

### Java 26

Lançado em 17 de março de 2026, com 10 JEPs ([JDK 26](https://openjdk.org/projects/jdk/26/)).

<details>
<summary>Ver as 10 JEPs do Java 26</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [500](https://openjdk.org/jeps/500) | Prepare to Make Final Mean Final | Final |
| [504](https://openjdk.org/jeps/504) | Remove the Applet API | Remoção |
| [516](https://openjdk.org/jeps/516) | Ahead-of-Time Object Caching with Any GC | Final |
| [517](https://openjdk.org/jeps/517) | HTTP/3 for the HTTP Client API | Final |
| [522](https://openjdk.org/jeps/522) | G1 GC: Improve Throughput by Reducing Synchronization | Final |
| [524](https://openjdk.org/jeps/524) | PEM Encodings of Cryptographic Objects (Second Preview) | Preview |
| [525](https://openjdk.org/jeps/525) | Structured Concurrency (Sixth Preview) | Preview |
| [526](https://openjdk.org/jeps/526) | Lazy Constants (Second Preview) | Preview |
| [529](https://openjdk.org/jeps/529) | Vector API (Eleventh Incubator) | Incubadora |
| [530](https://openjdk.org/jeps/530) | Primitive Types in Patterns, instanceof, and switch (Fourth Preview) | Preview |

</details>

### Java 27

Lançado em 15 de setembro de 2026, com 9 JEPs ([JDK 27](https://openjdk.org/projects/jdk/27/)).

<details>
<summary>Ver as 9 JEPs do Java 27</summary>

| JEP | Título | Tipo |
| --- | --- | --- |
| [523](https://openjdk.org/jeps/523) | Make G1 the Default Garbage Collector in All Environments | Final |
| [527](https://openjdk.org/jeps/527) | Post-Quantum Hybrid Key Exchange for TLS 1.3 | Final |
| [531](https://openjdk.org/jeps/531) | Lazy Constants (Third Preview) | Preview |
| [532](https://openjdk.org/jeps/532) | Primitive Types in Patterns, instanceof, and switch (Fifth Preview) | Preview |
| [533](https://openjdk.org/jeps/533) | Structured Concurrency (Seventh Preview) | Preview |
| [534](https://openjdk.org/jeps/534) | Compact Object Headers by Default | Final |
| [536](https://openjdk.org/jeps/536) | JFR In-Process Data Redaction | Final |
| [537](https://openjdk.org/jeps/537) | Vector API (Twelfth Incubator) | Incubadora |
| [538](https://openjdk.org/jeps/538) | PEM Encodings of Cryptographic Objects (Third Preview) | Preview |

</details>

### Java 28

Em desenvolvimento. A [página do JDK 28](https://openjdk.org/projects/jdk/28/) ainda não publicou o cronograma, e o roadmap da Oracle prevê o lançamento para março de 2027. Na última atualização da página (27/08/2026), estas eram as JEPs com alvo no 28; a coluna Situação mostra o status de cada JEP em 16/09/2026. "Com alvo" significa que a JEP foi aceita para o 28; "integrada", que o código já entrou no repositório do 28; "concluída", que além disso a JEP foi encerrada como entregue.

<details>
<summary>Ver as 6 JEPs do Java 28</summary>

| JEP | Título | Tipo | Situação |
| --- | --- | --- | --- |
| [401](https://openjdk.org/jeps/401) | Value Objects (Preview) | Preview | Integrada ao 28 |
| [535](https://openjdk.org/jeps/535) | Shenandoah GC: Generational Mode by Default | Final | Com alvo no 28, ainda não integrada |
| [539](https://openjdk.org/jeps/539) | Strict Field Initialization in the JVM (Preview) | Preview | Integrada ao 28 |
| [540](https://openjdk.org/jeps/540) | Simple JSON API (Incubator) | Incubadora | Integrada ao 28 |
| [541](https://openjdk.org/jeps/541) | Deprecate the macOS/x64 Port for Removal | Depreciação | Concluída no 28 |
| [542](https://openjdk.org/jeps/542) | PEM Encodings of Cryptographic Objects | Final | Concluída no 28 |

</details>

Em resumo: **Value Objects** (Project Valhalla) introduz, em preview, objetos imutáveis e sem identidade, distinguidos só pelos valores dos campos, que a JVM pode representar de forma mais eficiente. **Strict Field Initialization** é um recurso de VM em preview, voltado a compiladores que geram class files, no qual o campo precisa ser inicializado antes de qualquer leitura, de modo que `0` e `null` nunca são observados. A **Simple JSON API** (`jdk.incubator.json`) faz parsing e geração de JSON sem biblioteca externa. No **Shenandoah**, o modo geracional vira padrão e o não geracional (`ShenandoahGCMode=satb`) é depreciado. A **API PEM** vira final.

Fora da lista, a [JEP 543](https://openjdk.org/jeps/543) (candidata, sem versão definida) propõe finalizar Structured Concurrency no Java 28. Nada disso está garantido até o Java 28 sair, e este post será atualizado quando isso acontecer.

## Fontes

Consultadas em 16/09/2026.

**Cronograma e suporte**

- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html): Java 29 como próxima LTS prevista (setembro de 2027); 26, 27 e 28 não LTS; prazos de Premier Support
- [JDK 26, página do projeto](https://openjdk.org/projects/jdk/26/): JEPs e GA em 17/03/2026
- [JDK 27, página do projeto](https://openjdk.org/projects/jdk/27/): JEPs, cronograma e GA em 15/09/2026
- [JDK 28, página do projeto](https://openjdk.org/projects/jdk/28/): JEPs com alvo no 28
- [JEP 0 — JEP Index](https://openjdk.org/jeps/0): status das JEPs em andamento
- [Anúncio de GA do JDK 27 (announce@openjdk.org)](https://mail.openjdk.org/archives/list/announce@openjdk.org/thread/ORGGLMN75HFEWP7YL3ZLGHLYHVIBJDYT/)
- [Anúncio de GA do JDK 26 (jdk-dev@openjdk.org)](https://mail.openjdk.org/archives/list/jdk-dev@openjdk.org/thread/2MXXXBJKTJXQD25Q4XGGINKYA33T7D5I/)

**Notas de release**

- [JDK 27 Release Notes (jdk.java.net)](https://jdk.java.net/27/release-notes)
- [JDK 26 Release Notes (Oracle)](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html)
- [JDK-8369238](https://bugs.openjdk.org/browse/JDK-8369238): virtual threads e inicialização de classes

**JEPs**

- Anteriores ao Java 26: [JEP 243](https://openjdk.org/jeps/243), [JEP 248](https://openjdk.org/jeps/248), [JEP 289](https://openjdk.org/jeps/289), [JEP 321](https://openjdk.org/jeps/321), [JEP 398](https://openjdk.org/jeps/398), [JEP 450](https://openjdk.org/jeps/450), [JEP 483](https://openjdk.org/jeps/483), [JEP 470](https://openjdk.org/jeps/470), [JEP 502](https://openjdk.org/jeps/502), [JEP 505](https://openjdk.org/jeps/505), [JEP 507](https://openjdk.org/jeps/507), [JEP 508](https://openjdk.org/jeps/508), [JEP 514](https://openjdk.org/jeps/514), [JEP 519](https://openjdk.org/jeps/519)
- Java 26: [JEP 500](https://openjdk.org/jeps/500), [JEP 504](https://openjdk.org/jeps/504), [JEP 516](https://openjdk.org/jeps/516), [JEP 517](https://openjdk.org/jeps/517), [JEP 522](https://openjdk.org/jeps/522), [JEP 524](https://openjdk.org/jeps/524), [JEP 525](https://openjdk.org/jeps/525), [JEP 526](https://openjdk.org/jeps/526), [JEP 529](https://openjdk.org/jeps/529), [JEP 530](https://openjdk.org/jeps/530)
- Java 27: [JEP 523](https://openjdk.org/jeps/523), [JEP 527](https://openjdk.org/jeps/527), [JEP 531](https://openjdk.org/jeps/531), [JEP 532](https://openjdk.org/jeps/532), [JEP 533](https://openjdk.org/jeps/533), [JEP 534](https://openjdk.org/jeps/534), [JEP 536](https://openjdk.org/jeps/536), [JEP 537](https://openjdk.org/jeps/537), [JEP 538](https://openjdk.org/jeps/538)
- Java 28 (com alvo ou candidata): [JEP 401](https://openjdk.org/jeps/401), [JEP 535](https://openjdk.org/jeps/535), [JEP 539](https://openjdk.org/jeps/539), [JEP 540](https://openjdk.org/jeps/540), [JEP 541](https://openjdk.org/jeps/541), [JEP 542](https://openjdk.org/jeps/542), [JEP 543](https://openjdk.org/jeps/543)
- Processo: [JEP 11 — Incubator Modules](https://openjdk.org/jeps/11) e [JEP 12 — Preview Features](https://openjdk.org/jeps/12)

**Código-fonte do JDK 27 (tag `jdk-27-ga`)**

- [StructuredTaskScope.java](https://github.com/openjdk/jdk/blob/jdk-27-ga/src/java.base/share/classes/java/util/concurrent/StructuredTaskScope.java)
- [LazyConstant.java](https://github.com/openjdk/jdk/blob/jdk-27-ga/src/java.base/share/classes/java/lang/LazyConstant.java) e [Set.java (`Set.ofLazy`)](https://github.com/openjdk/jdk/blob/jdk-27-ga/src/java.base/share/classes/java/util/Set.java)
- [PEMEncoder.java](https://github.com/openjdk/jdk/blob/jdk-27-ga/src/java.base/share/classes/java/security/PEMEncoder.java), [PEMDecoder.java](https://github.com/openjdk/jdk/blob/jdk-27-ga/src/java.base/share/classes/java/security/PEMDecoder.java), [BinaryEncodable.java](https://github.com/openjdk/jdk/blob/jdk-27-ga/src/java.base/share/classes/java/security/BinaryEncodable.java) e [CryptoException.java](https://github.com/openjdk/jdk/blob/jdk-27-ga/src/java.base/share/classes/javax/crypto/CryptoException.java)
- [HttpOption.java](https://github.com/openjdk/jdk/blob/jdk-27-ga/src/java.net.http/share/classes/java/net/http/HttpOption.java)
