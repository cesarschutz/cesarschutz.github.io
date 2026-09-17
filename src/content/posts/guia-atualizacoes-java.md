---
title: "Guia de atualizações do Java"
published: 2025-07-14
updated: 2026-09-16
description: "Como planejar a migração entre LTS do Java: ciclo de releases, distribuições e licenças, versões mínimas do ecossistema, processo em cinco fases com rollback, segurança, desempenho, containers e CI."
tags: [LTS, Migração, JVM, Gradle]
series: java
draft: false
---

Este guia é para quem precisa **planejar e executar a troca de versão do Java** num sistema real: o desenvolvedor que vai conduzir a migração e o arquiteto que precisa justificar prazo, custo e risco. Ele não repete o que mudou em cada versão. Isso fica nos posts da série [Atualizações do Java](/java/), um por LTS. Aqui fica o **como migrar**: ciclo de releases e prazos de suporte, escolha da distribuição e da licença, versões mínimas de frameworks e ferramentas de build, um processo em cinco fases, critérios de avanço e rollback, ferramentas de análise e os cuidados com segurança, desempenho, containers e CI.

Para usar o guia junto com a série:

1. Leia [Como funciona o ciclo de releases](#como-funciona-o-ciclo-de-releases) e [Distribuições de JDK](#distribuições-de-jdk) para decidir **para qual versão e com qual JDK** migrar.
2. Abra o post de **cada LTS entre a sua versão e a de destino**. Quem sai do Java 11 para o 25 lê os posts do [17](/posts/java-17/), do [21](/posts/java-21/) e do [25](/posts/java-25/), com atenção à seção "O que observar na migração" de cada um.
3. Volte ao guia para montar o plano: [processo em cinco fases](#o-processo-de-migração-em-cinco-fases), [ambientes e rollback](#ambientes-critérios-de-avanço-e-rollback) e o [checklist](#checklist-da-migração).

Situação em 16 de setembro de 2026: o **Java 25** é a LTS mais recente, o Java 27 saiu no dia anterior e a próxima LTS prevista é o **Java 29**, em setembro de 2027.

## Como funciona o ciclo de releases

Até o Java 9, cada versão esperava seus grandes recursos ficarem prontos: foram três anos e meio entre o Java 8 (março de 2014) e o Java 9 (setembro de 2017). Em setembro de 2017, Mark Reinhold, arquiteto-chefe da plataforma na Oracle, propôs [uma *feature release* a cada seis meses](https://mreinhold.org/blog/forward-faster), em março e setembro, a partir de março de 2018. O Java 10 foi a primeira versão desse calendário, e a [JEP 322](https://openjdk.org/jeps/322) adaptou o número de versão a ele. Na prática:

- **O calendário é fixo.** O que não fica pronto a tempo entra na versão seguinte. Pela [JEP 3](https://openjdk.org/jeps/3), o conjunto de recursos de cada versão é congelado cerca de três meses antes do lançamento, na fase chamada *Rampdown Phase One*.
- **Recursos grandes chegam em etapas.** Um recurso em **preview** está completo, mas pode mudar ou sair; só funciona com `--enable-preview` na compilação e na execução ([JEP 12](https://openjdk.org/jeps/12)). Uma API em **incubadora** fica num módulo `jdk.incubator.*`, adicionado com `--add-modules` ([JEP 11](https://openjdk.org/jeps/11)). Nenhum dos dois deve ir para produção.
- **Correções de segurança saem em datas conhecidas.** As atualizações do OpenJDK seguem o calendário de *Critical Patch Updates* (CPU) da Oracle: terceira terça-feira de janeiro, abril, julho e outubro ([JDK 25 Updates](https://wiki.openjdk.org/display/JDKUpdates/JDK+25u)). Em 2026 a Oracle passou a publicar também atualizações mensais de segurança; detalhes em [Patches de segurança](#patches-de-segurança).

O post do [Java 11](/posts/java-11/#uma-versão-nova-a-cada-seis-meses) conta essa mudança em detalhe, com o novo formato do número de versão.

### LTS e versões intermediárias

Nem toda versão recebe atualizações por muito tempo. A diferença que importa para produção:

| | LTS (*Long-Term Support*) | Versão intermediária (não LTS) |
|---|---|---|
| **Versões** | 8, 11, 17, 21, 25; próxima: 29 | 9, 10, 12 a 16, 18 a 20, 22 a 24, 26, 27, 28 |
| **Frequência** | a cada dois anos desde o 17 | a cada seis meses |
| **Atualizações** | por anos; o prazo depende do fornecedor | só até a versão seguinte sair |
| **Uso típico** | produção | experimentar recursos novos ou times que atualizam a cada seis meses |

A proposta de 2017 previa uma LTS a cada três anos (11 e 17). Em 2021, Reinhold propôs [encurtar esse intervalo para dois anos](https://mreinhold.org/blog/forward-even-faster), e o [roadmap da Oracle](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) adotou: 21, 25 e, previsto, 29.

Um detalhe que costuma confundir: **LTS é uma promessa do fornecedor do JDK, não do projeto OpenJDK**. O projeto mantém repositórios de atualização para as versões antigas ([JDK Updates](https://openjdk.org/projects/jdk-updates/)), mas quem publica binários atualizados, e por quanto tempo, é cada fornecedor: Oracle, Eclipse Adoptium, Amazon, Azul, Red Hat, Microsoft e outros. Os prazos de cada um estão em [Distribuições de JDK](#distribuições-de-jdk).

### Linha do tempo e janelas de suporte

![Linha do tempo de 2014 a 2036 com as LTS 8, 11, 17, 21, 25 e 29: para cada uma, a data de lançamento, a barra azul do Premier Support e a barra laranja do Extended Support da Oracle; abaixo, as versões não LTS com suporte de seis meses e uma linha vermelha marcando setembro de 2026](/posts/guia-atualizacoes-java/linha-do-tempo-lts.svg)

O diagrama usa as datas do [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html), atualizado em 15/09/2026. *Premier Support* é o suporte padrão da assinatura da Oracle; *Extended Support* é a extensão paga depois dele. Três leituras para o planejamento:

- **Java 8 e 11** seguem com Extended Support até dezembro de 2030 e janeiro de 2032, mas só para quem paga. Atualizações gratuitas dependem de outro fornecedor.
- **Java 17** tem Premier Support da Oracle até setembro de 2026, e várias distribuições gratuitas encerram as atualizações dele em 2027. Quem está nele deve planejar o salto, de preferência direto para o 25.
- **Java 25** é o destino natural hoje: Premier Support até setembro de 2030. O Java 29 está previsto para setembro de 2027, e a própria Oracle avisa que a classificação LTS e as datas podem mudar.

### O que cada LTS mudou

Cada salto tem um post próprio na série. O resumo abaixo serve para dimensionar o trabalho; os detalhes, com exemplos e a lista de JEPs (*JDK Enhancement Proposals*, as propostas que descrevem cada mudança), ficam nos posts:

| LTS | Lançamento | Para quem vem do | Em uma frase |
|---|---|---|---|
| [Java 8](/posts/java-8/) | mar/2014 | Java 7 | lambdas, Stream API, `java.time` e Metaspace no lugar do PermGen |
| [Java 11](/posts/java-11/) | set/2018 | Java 8 | sistema de módulos, `var`, `HttpClient` e remoção dos módulos Java EE e CORBA |
| [Java 17](/posts/java-17/) | set/2021 | Java 11 | records, sealed classes, text blocks e encapsulamento forte dos internos do JDK |
| [Java 21](/posts/java-21/) | set/2023 | Java 17 | virtual threads, pattern matching para `switch` e Sequenced Collections |
| [Java 25](/posts/java-25/) | set/2025 | Java 21 | Scoped Values, cache AOT, compact object headers e Security Manager desativado |
| [Java 29](/posts/java-29/) | set/2027 (previsto) | Java 25 | acompanha o que o 26, o 27 e o 28 já trouxeram |

As datas de lançamento vêm das páginas do OpenJDK para o [JDK 8](https://openjdk.org/projects/jdk8/), [11](https://openjdk.org/projects/jdk/11/), [17](https://openjdk.org/projects/jdk/17/), [21](https://openjdk.org/projects/jdk/21/) e [25](https://openjdk.org/projects/jdk/25/); a do 29 vem do roadmap da Oracle.

## Distribuições de JDK

As distribuições são construídas a partir do **mesmo código-fonte do OpenJDK**, e as principais são certificadas pelo TCK (*Technology Compatibility Kit*, a bateria oficial de testes de compatibilidade com o Java SE). A diferença está no prazo de atualização, no suporte comercial e na licença, não nos recursos da linguagem.

### Prazos por fornecedor

Datas publicadas por cada fornecedor, conferidas em 16/09/2026. "Pelo menos" indica que o fornecedor pode estender o prazo:

| Distribuição | Java 8 | Java 11 | Java 17 | Java 21 | Java 25 | Custo |
|---|---|---|---|---|---|---|
| [Eclipse Temurin](https://adoptium.net/support/) | pelo menos dez/2030 | pelo menos out/2027 | pelo menos out/2027 | pelo menos dez/2029 | pelo menos set/2031 | gratuito; a Eclipse não vende suporte |
| [Amazon Corretto](https://aws.amazon.com/corretto/faqs/) | dez/2030 | jan/2032 | out/2029 | out/2030 | out/2032 | gratuito |
| [Microsoft Build of OpenJDK](https://learn.microsoft.com/java/openjdk/support) | não publica | pelo menos set/2027 | pelo menos set/2027 | pelo menos set/2028 | pelo menos set/2030 | gratuito; suporte pago via Azure |
| [Red Hat build of OpenJDK](https://access.redhat.com/articles/1299013) | nov/2026 (ELS até dez/2032) | ELS até jan/2032 | dez/2027 | dez/2029 | dez/2030 | incluído na assinatura do RHEL; ELS é pago à parte |
| [Azul Zulu / Azul Core](https://www.azul.com/products/azul-support-roadmap/) | dez/2030 | jan/2032 | set/2029 | set/2031 | set/2033 | builds Zulu gratuitos; datas do suporte pago |
| [BellSoft Liberica](https://bell-sw.com/support/) | mar/2031 | mar/2032 | mar/2030 | mar/2032 | mar/2034 | gratuito; datas do suporte pago |
| [IBM Semeru](https://www.ibm.com/support/pages/semeru-runtimes-support) | dez/2030 | out/2027 | out/2027 | dez/2029 | set/2030 | gratuito; suporte pago à parte |
| [Oracle JDK](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) | Extended até dez/2030 | Extended até jan/2032 | Extended até set/2029 | Extended até set/2031 | Extended até set/2033 | assinatura; gratuito só no prazo da NFTC |

Três observações sobre a tabela:

- **Red Hat e Java 8**: o suporte completo termina em 30/11/2026, e a Red Hat informa que os builds do OpenJDK 8 publicados depois de 1º de julho de 2025 não são certificados pelo TCK. O **ELS** (*Extended Life Cycle Support*) é uma assinatura adicional.
- **Microsoft** não publica build do Java 8; na própria página de suporte, indica o Temurin para essa versão.
- **IBM Semeru** usa a JVM [Eclipse OpenJ9](https://eclipse.dev/openj9/) em vez da HotSpot. As flags de GC e o comportamento de memória são diferentes; avalie com testes próprios antes de trocar.

Os builds do OpenJDK que a Oracle publica em [jdk.java.net](https://jdk.java.net/) são gratuitos, mas cada versão recebe só as atualizações publicadas até a versão seguinte: para o Java 25, até janeiro de 2026 ([Oracle Java SE Licensing FAQ](https://www.oracle.com/java/technologies/javase/jdk-faqs.html)). Não servem para produção de longo prazo.

### Como escolher

![Fluxo de decisão para escolher a distribuição: sem necessidade de SLA, Amazon Corretto na AWS, Microsoft Build of OpenJDK no Azure e Eclipse Temurin nos demais casos; com SLA, Red Hat build of OpenJDK para clientes RHEL, Oracle JDK com assinatura para clientes Oracle e Azul, BellSoft ou IBM para os demais; em destaque, evitar em produção os builds do jdk.java.net e o Oracle JDK sem assinatura após o prazo da NFTC](/posts/guia-atualizacoes-java/escolha-da-distribuicao.svg)

O fluxo começa pela pergunta que mais pesa no custo: **a empresa precisa de um contrato com SLA** (*Service Level Agreement*, prazo garantido de atendimento) para o JDK? Se não precisa, qualquer distribuição gratuita serve, e a escolha segue a infraestrutura: Corretto na AWS e Microsoft no Azure, que são os JDKs mantidos pelos próprios provedores dessas nuvens, e Temurin nos demais casos, por ter imagens oficiais no Docker Hub e o prazo mínimo publicado. Se precisa de SLA, o caminho mais barato costuma ser aproveitar um contrato que já existe.

A caixa vermelha lista as duas armadilhas mais comuns: usar em produção os builds do jdk.java.net, que param de receber correções, e continuar com o Oracle JDK depois que a licença gratuita daquela versão expirou, assunto da próxima seção.

## Custos e licenças

A resposta curta para "Java é pago?" é **não**: dá para rodar Java em produção sem pagar licença. O custo aparece em dois casos, ao usar o **Oracle JDK** fora das condições gratuitas ou ao **contratar suporte**.

- **OpenJDK** usa a licença [GPLv2 com Classpath Exception](https://openjdk.org/legal/gplv2+ce.html). A exceção garante que rodar a sua aplicação sobre o JDK não obriga a publicar o código dela sob a GPL. O Temurin, por exemplo, é distribuído sob essa licença, sem custo ([FAQ do Adoptium](https://adoptium.net/docs/faq/)).
- **Oracle JDK 8 (a partir do 8u211, de abril de 2019), Oracle JDK 11 e Oracle JDK 17 a partir do 17.0.13** usam a licença **OTN** (*Oracle Technology Network*), que permite, sem custo, uso pessoal, desenvolvimento, testes, prototipação e demonstração. **Uso em produção exige assinatura** ([Oracle Java SE Licensing FAQ](https://www.oracle.com/java/technologies/javase/jdk-faqs.html)).
- **Oracle JDK 21 e 25** usam a **NFTC** (*Oracle No-Fee Terms and Conditions*), que permite uso gratuito inclusive em produção, mas com prazo: as atualizações de uma LTS ficam sob a NFTC só **até um ano depois do lançamento da LTS seguinte**. Depois disso, as novas atualizações passam para a OTN. Para o 17, a NFTC valeu até setembro de 2024; para o 21, vale até **setembro de 2026**, e as atualizações a partir do CPU de outubro de 2026 estão planejadas sob a OTN ([roadmap da Oracle](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)); para o 25, até setembro de 2028. As versões não LTS ficam sob a NFTC durante os seis meses de vida.

Quem roda Oracle JDK 21 em produção sem assinatura precisa decidir agora: trocar para uma distribuição OpenJDK, migrar para o Oracle JDK 25 (gratuito até setembro de 2028) ou contratar a assinatura.

### Java SE Universal Subscription

Desde 23 de janeiro de 2023, a assinatura da Oracle é a **Java SE Universal Subscription**, cobrada **por funcionário**, e não por processador ou por usuário do Java ([FAQ da assinatura](https://www.oracle.com/java/technologies/java-se-subscription-faq.html)). A lista de preços define "funcionário" como todos os empregados em tempo integral, parcial e temporários da empresa, mais os de agentes, terceirizados e consultores que apoiam as operações internas, contando todos, e não só quem usa Java ([lista de preços](https://www.oracle.com/assets/java-se-subscription-pricelist-5028356.pdf)):

| Funcionários | US\$ por funcionário por mês |
|---|---|
| 1 a 999 | 15,00 |
| 1.000 a 2.999 | 12,00 |
| 3.000 a 9.999 | 10,50 |
| 10.000 a 19.999 | 8,25 |
| 20.000 a 29.999 | 6,75 |
| 30.000 a 39.999 | 5,70 |
| 40.000 a 49.999 | 5,25 |
| 50.000 ou mais | sob consulta |

O exemplo da própria lista: uma empresa com 28.000 funcionários paga 28.000 × US\$ 6,75 × 12 = **US\$ 2.268.000 por ano**, mesmo que poucos sistemas usem Java. Por isso o levantamento de onde roda Oracle JDK é o primeiro passo de qualquer revisão de custo.

Duas mudanças recentes na oferta da Oracle:

- **GraalVM saiu dos produtos Java SE.** O GraalVM for JDK 24 foi a última versão licenciada e suportada como parte da assinatura Java SE ([roadmap da Oracle](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)). O GraalVM continua sendo lançado em calendário próprio, sob a licença GFTC ([FAQ do GraalVM](https://www.graalvm.org/faq/)).
- **A assinatura passou a incluir atualizações mensais de segurança** (*Critical Security Patch Updates*), além das trimestrais ([página da assinatura](https://www.oracle.com/java/java-se-subscription/)).

Em resumo: **a licença é evitável em praticamente todos os cenários** com uma distribuição OpenJDK. O que se compra com dinheiro é SLA, prazo estendido e responsabilidade contratual.

## Quando migrar

A pergunta útil não é "qual a versão mais nova?", e sim **"quanto custa ficar parado?"**. Uma versão sem atualizações deixa de receber correções de segurança, frameworks passam a exigir versões mais novas (veja a tabela abaixo) e cada LTS pulada acumula mais mudanças para tratar de uma vez. Um bom gatilho é o fim das atualizações gratuitas da sua distribuição, visto na [tabela de prazos](#prazos-por-fornecedor).

### Estratégia por perfil

| Perfil | Quando adotar a nova LTS | Pré-requisito | Exemplo |
|---|---|---|---|
| **Conservador** | depois de meses de validação, com janela de mudança e rollback ensaiado | homologação com carga realista | core bancário, saúde, sistemas regulados |
| **Balanceado** | quando os frameworks e agentes que você usa declaram suporte oficial | suíte automatizada confiável | e-commerce, backoffice, a maioria dos serviços |
| **Ágil** | a cada versão, inclusive as não LTS | CI forte e dependências sempre atualizadas | ferramentas internas, protótipos, times de produto |

O mesmo portfólio pode misturar estratégias. Não faz sentido segurar um protótipo no Java 17 "por padrão corporativo", nem levar o core de pagamentos para cada versão de seis meses. Quem está duas ou mais LTS atrás deve ir **direto para a LTS mais recente** que as dependências suportam; parar numa LTS intermediária repete todo o ciclo de testes e implantação.

### Versões mínimas do ecossistema

Antes de escolher a versão de destino, confira o que os frameworks e as ferramentas de build exigem e suportam. Situação em setembro de 2026:

| Projeto | Java mínimo | Versões novas e observações |
|---|---|---|
| [Spring Boot 4.0 e 4.1](https://docs.spring.io/spring-boot/4.1/system-requirements.html) | Java 17 | até o 26 |
| [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html) | Java 17 | até o 25; suporte open source encerrado em 30/06/2026 ([calendário](https://spring.io/projects/spring-boot#support)) |
| [Jakarta EE 11](https://jakarta.ee/specifications/platform/11/) | Java 17 | Jakarta EE 12, em desenvolvimento, [exigirá Java 21](https://jakarta.ee/specifications/platform/12/) |
| [Quarkus 3](https://quarkus.io/guides/getting-started) | Java 17 | o Quarkus 4, anunciado, [vai exigir Java 21](https://quarkus.io/blog/java21/) |
| [Micronaut 5](https://micronaut.io/2026/04/27/micronaut-framework-5-0-with-java-25-baseline/) | Java 25 | o Micronaut 4 exige Java 17 |
| [Hibernate ORM 7.4](https://hibernate.org/orm/releases/7.4/) | Java 17 | 17, 21, 25 ou 26 |
| [Gradle 9](https://docs.gradle.org/current/userguide/compatibility.html) | Java 17 para executar | toolchain e execução com Java 25 desde o 9.1.0; Java 26 desde o 9.4.0 |
| [Maven 3.9](https://maven.apache.org/download.cgi) | Java 8 para executar | o Maven 4, ainda sem versão final, [exige Java 17](https://maven.apache.org/docs/history.html) |
| [Kotlin](https://kotlinlang.org/docs/whatsnew23.html) | — | bytecode do Java 25 desde o 2.3.0; do Java 26 [desde o 2.4.0](https://kotlinlang.org/docs/whatsnew24.html) |
| [JUnit 6](https://docs.junit.org/6.0.0/release-notes.html) | Java 17 | o JUnit 5 continua disponível para quem está abaixo do 17 |
| [Lombok](https://projectlombok.org/changelog) e [Byte Buddy](https://github.com/raphw/byte-buddy/blob/master/release-notes.md) | — | Java 25 desde o Lombok 1.18.40 e o Byte Buddy 1.17.5 |

Frameworks e ferramentas costumam declarar suporte a uma versão do Java alguns meses depois do lançamento dela. Até o Gradle 9.7.1, por exemplo, o Java 27 ainda não aparece como suportado na matriz de compatibilidade.

Dois efeitos práticos: **quem está no Java 8 ou 11 não consegue usar uma linha do Spring Boot com suporte open source**, e **quem quer usar o Java 25** precisa de versões recentes de Gradle, Kotlin e das bibliotecas que geram bytecode.

## O que observar em cada salto

Cada post da série termina com uma seção de cuidados de migração. O resumo abaixo mostra o tipo de problema de cada salto; siga o link para a lista completa:

- **Java 8 → 11**: o JDK foi dividido em módulos, as APIs internas passaram a ser encapsuladas e os módulos Java EE e CORBA (JAXB, JAX-WS, `javax.annotation`) saíram do JDK ([JEP 320](https://openjdk.org/jeps/320)); a correção é declarar essas dependências explicitamente. O número de versão também mudou de `1.8.0_nnn` para `11.0.n`, o que quebra código que interpreta essa string. Detalhes em [O que observar na migração a partir do Java 8](/posts/java-11/#o-que-observar-na-migração-a-partir-do-java-8).
- **Java 11 → 17**: o acesso por reflexão aos internos do JDK, que no 11 gerava só um aviso, passou a lançar `InaccessibleObjectException` ([JEP 396](https://openjdk.org/jeps/396) e [JEP 403](https://openjdk.org/jeps/403)), e a opção `--illegal-access` deixou de funcionar. A solução definitiva é atualizar a biblioteca; `--add-opens` é paliativo. Detalhes em [O que observar na migração a partir do Java 11](/posts/java-17/#o-que-observar-na-migração-a-partir-do-java-11).
- **Java 17 → 21**: poucas quebras de código. Os pontos são o UTF-8 como charset padrão ([JEP 400](https://openjdk.org/jeps/400)), a finalização depreciada para remoção ([JEP 421](https://openjdk.org/jeps/421)), o aviso ao carregar agentes dinamicamente ([JEP 451](https://openjdk.org/jeps/451)) e a revisão de `synchronized` e `ThreadLocal` para quem adotar virtual threads. Detalhes em [O que observar na migração a partir do Java 17](/posts/java-21/#o-que-observar-na-migração-a-partir-do-java-17).
- **Java 21 → 25**: o Security Manager foi desativado permanentemente ([JEP 486](https://openjdk.org/jeps/486)), e a JVM não inicia se uma opção de linha de comando tentar ativá-lo; métodos de acesso a memória de `sun.misc.Unsafe` passam a emitir aviso ([JEP 498](https://openjdk.org/jeps/498)), assim como o uso de JNI ([JEP 472](https://openjdk.org/jeps/472)); o ZGC ficou só geracional ([JEP 490](https://openjdk.org/jeps/490)). Detalhes em [O que observar na migração a partir do Java 21](/posts/java-25/#o-que-observar-na-migração-a-partir-do-java-21).
- **Java 25 → 29**: o que já saiu no 26 e no 27, como avisos ao alterar campos `final` por reflexão ([JEP 500](https://openjdk.org/jeps/500)), G1 como coletor padrão em qualquer ambiente ([JEP 523](https://openjdk.org/jeps/523)) e compact object headers ligados por padrão ([JEP 534](https://openjdk.org/jeps/534)), está em [O que observar vindo do Java 25](/posts/java-29/#o-que-observar-vindo-do-java-25).

Na prática, o que quebra costuma estar nas **dependências**, e não no código da aplicação. Bibliotecas que geram ou manipulam bytecode (ASM, Byte Buddy, cglib), agentes de APM e frameworks que usam reflexão profunda são os primeiros lugares para olhar, porque dependem de detalhes internos da JVM.

## O processo de migração em cinco fases

O processo abaixo vale para qualquer salto. A ideia central é **separar variáveis**: primeiro se descobre o que vai quebrar, depois se resolve o que dá para resolver ainda na versão atual, e só então se troca o JDK.

![Processo de migração em cinco fases: análise e preparação na versão atual; migração do build, testes e implantação gradual na versão alvo; para cada fase, o que fazer e com que resultado se sai dela; impedimentos novos nas fases 3 a 5 voltam para o backlog](/posts/guia-atualizacoes-java/processo-em-fases.svg)

A coluna da direita do diagrama é o critério para encerrar cada fase. Se um impedimento novo aparece depois (uma flag removida, um agente incompatível), ele volta para o backlog e é tratado como na fase 2, sem misturar a correção com a troca de JDK.

### Fase 1 — Análise

O objetivo é sair com uma **lista concreta de impedimentos**, não com uma impressão. As ferramentas estão detalhadas em [Ferramentas de migração](#ferramentas-de-migração):

1. Rodar `jdeps --jdk-internals` **com o JDK de destino** nos JARs da aplicação e das dependências, para listar usos de APIs internas do JDK.
2. Rodar `jdeprscan --for-removal` também com o JDK de destino, para listar usos de APIs marcadas para remoção.
3. Levantar a árvore de dependências e conferir, em cada biblioteca central (framework, driver de banco, agente de APM, bibliotecas de bytecode), a partir de qual versão ela suporta o Java de destino:

```bash
# Maven: árvore de dependências com as versões resolvidas
./mvnw dependency:tree

# Gradle: o mesmo para o classpath de execução
./gradlew dependencies --configuration runtimeClasspath
```

4. Listar as **flags de JVM** usadas em scripts, Dockerfiles, manifestos e na variável `JAVA_TOOL_OPTIONS`. Flags removidas impedem a JVM de iniciar.
5. Ler a seção "O que observar na migração" de cada LTS do caminho (links em [O que observar em cada salto](#o-que-observar-em-cada-salto)).

O resultado é o **backlog da migração**: bibliotecas a atualizar, trechos de código a mudar, flags a revisar e uma estimativa de esforço baseada nesses itens.

### Fase 2 — Preparação

Acontece **ainda na versão atual do Java**. O objetivo é reduzir o risco antes de trocar qualquer coisa:

1. **Atualize as dependências** para versões que suportam o Java de destino, uma de cada vez, rodando a suíte a cada passo. Atualizar biblioteca e JVM ao mesmo tempo mistura duas variáveis e torna qualquer regressão difícil de atribuir.
2. **Zere os avisos de depreciação** apontados na análise e deixe o compilador avisar os novos usos:

```xml title="pom.xml"
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <compilerArgs>
            <!-- avisa cada uso de API depreciada -->
            <arg>-Xlint:deprecation</arg>
        </compilerArgs>
    </configuration>
</plugin>
```

3. **Crie um job de CI com o JDK de destino** (veja [CI com as duas versões](#ci-com-as-duas-versões)), mesmo que ele ainda falhe. Ele mostra o progresso a cada commit.
4. **Meça a linha de base de desempenho**: latência (p50, p99), throughput, heap após GC, pausas de GC e tempo de inicialização, com a mesma carga que será usada na fase 4. Sem linha de base, "ficou mais lento?" vira opinião.

### Fase 3 — Migração do build

Com o terreno preparado, a troca tende a ser pequena: mudar a versão no build e na imagem, resolver o que sobrar e revisar as flags de JVM.

**Compile com `--release`, e não com `-source`/`-target`.** As opções `-source` e `-target` definem só a sintaxe aceita e o formato do bytecode; o código continua sendo compilado contra a API do JDK instalado, e uma chamada a um método que não existe na versão alvo só falha em execução. A opção `--release` valida sintaxe **e** API contra a versão escolhida ([documentação do javac](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html)):

```xml title="pom.xml"
<properties>
    <!-- vira --release 25 no maven-compiler-plugin -->
    <maven.compiler.release>25</maven.compiler.release>
</properties>
```

**No Gradle, use toolchain.** A [toolchain](https://docs.gradle.org/current/userguide/toolchains.html) separa o JDK que executa o Gradle do JDK que compila e testa o projeto. O Gradle procura (ou baixa, se configurado) o JDK pedido, e o build deixa de depender do `JAVA_HOME` de cada máquina:

```kotlin title="build.gradle.kts"
java {
    toolchain {
        // compila e testa com Java 25, independentemente do JDK que roda o Gradle
        languageVersion = JavaLanguageVersion.of(25)
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.compilerArgs.add("-Xlint:deprecation")
}
```

Os erros que sobram nesta fase costumam ser pontuais:

- **Flag de JVM removida ou obsoleta.** Uma flag removida impede a JVM de iniciar; uma obsoleta gera só um aviso. No Temurin 25, por exemplo, `-XX:+ZGenerational` produz o aviso `Ignoring option ZGenerational; support was removed in 24.0`. Rode `java <suas flags> -version` com o JDK novo e leia a saída.
- **Biblioteca que acessa internos do JDK.** Um `--add-opens` resolve temporariamente; registre no backlog a atualização da biblioteca e uma data para remover a opção.
- **Agente desatualizado** (APM, cobertura de testes, mocks). Atualize para a versão que declara suporte ao Java de destino.

### Fase 4 — Testes

Quatro camadas, da mais barata para a mais cara:

1. **Suíte completa na versão nova**, com testes unitários e de integração.
2. **Suíte nas duas versões em paralelo** durante a transição, numa matriz de CI. Isso protege a branch principal enquanto nem todo ambiente migrou.
3. **Teste de carga comparado com a linha de base** da fase 2: mesmos cenários, mesma infraestrutura, só a JVM muda. Grave JFR e log de GC nas duas execuções (veja [Medir antes e depois](#medir-antes-e-depois)).
4. **Validação de segurança**: scan de vulnerabilidades das dependências e revisão da configuração de TLS (veja [Segurança](#segurança)).

Quando um comportamento depende da versão do runtime, o JUnit permite condicionar o teste à JVM que o executa. O exemplo abaixo usa o JUnit 5, porque o JUnit 6 exige Java 17, e compila com `--release 11` e documenta a mudança da [JEP 403](https://openjdk.org/jeps/403): no Java 11, `setAccessible(true)` num campo privado de `String` funciona com um aviso; do Java 17 em diante, lança `InaccessibleObjectException`:

```java title="EncapsulamentoTest.java"
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.lang.reflect.InaccessibleObjectException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledForJreRange;
import org.junit.jupiter.api.condition.JRE;

class EncapsulamentoTest {

    @Test
    @EnabledForJreRange(min = JRE.JAVA_17) // ignorado quando a suíte roda no Java 11
    void reflexaoEmInternosDoJdkFalha() throws Exception {
        var campo = String.class.getDeclaredField("value");
        assertThrows(InaccessibleObjectException.class, () -> campo.setAccessible(true));
    }
}
```

[`@EnabledForJreRange`](https://docs.junit.org/current/api/org.junit.jupiter.api/org/junit/jupiter/api/condition/EnabledForJreRange.html) lê a versão da JVM em execução. Assim, a mesma suíte roda nas duas colunas da matriz de CI sem `if` manual.

### Fase 5 — Implantação gradual

Trocar a versão da JVM é uma mudança de infraestrutura e merece o mesmo cuidado de um canário de código: poucas instâncias primeiro, critérios objetivos para avançar e gatilhos de rollback combinados **antes** de começar. A próxima seção detalha como fazer isso.

## Ambientes, critérios de avanço e rollback

![Quatro ambientes em sequência, build e CI, homologação, canário e produção, cada um com seus critérios para avançar; setas vermelhas do canário e da produção levam aos gatilhos de rollback: latência p99 ou taxa de erro acima do limite, erro novo ligado à JVM e OutOfMemoryError, restart em loop ou pausas de GC fora do padrão](/posts/guia-atualizacoes-java/ambientes-e-rollback.svg)

O diagrama mostra a ordem dos ambientes e o que cada um precisa provar antes de liberar o seguinte. Os limites numéricos (quanto de latência a mais é aceitável, por quantos dias observar) dependem do sistema e devem ser combinados com quem responde pela operação antes da migração.

### Ordem dos ambientes e critérios de avanço

1. **Build e CI**: a suíte passa nas duas versões, o `jdeps` não aponta uso novo de API interna e o build não tem avisos novos de depreciação.
2. **Homologação**: o teste de carga fica dentro da meta combinada em relação à linha de base; pausas de GC e heap após GC são comparáveis; o scan de dependências não aponta vulnerabilidade nova.
3. **Canário**: uma parte das instâncias, ou do tráfego, roda a versão nova. Observe por **dias, e não minutos**: problemas de memória e de GC aparecem com carga acumulada. Para avançar, erro e latência p99 precisam ficar na meta, sem `OutOfMemoryError`, restart em loop ou aviso novo da JVM nos logs.
4. **Produção**: todas as instâncias migradas, o [alerta de frota mista](#métricas-e-alerta-de-frota-mista) zerado e a imagem anterior guardada por algumas semanas.

### Gatilhos de rollback

Rollback é voltar para a imagem anterior. Primeiro se restaura o serviço, depois se investiga. Gatilhos típicos:

- latência p99 ou taxa de erro acima do limite combinado, de forma sustentada;
- erro novo e recorrente atribuível à JVM: flag removida, agente incompatível, reflexão bloqueada;
- `OutOfMemoryError`, container morto por falta de memória, restart em loop ou pausas de GC fora do padrão da linha de base.

O rollback só é confiável se tiver sido **ensaiado**: a imagem anterior precisa estar a um comando de distância, e alguém precisa ter feito a volta pelo menos uma vez em homologação.

### Checklist da migração

```markdown title="CHECKLIST-MIGRACAO.md"
## Antes de começar
- [ ] Versão de destino e distribuição escolhidas (prazo de suporte e licença conferidos)
- [ ] jdeps e jdeprscan executados com o JDK de destino e triados
- [ ] Dependências, agentes e flags de JVM inventariados
- [ ] Linha de base de desempenho medida
- [ ] Critérios de avanço e gatilhos de rollback combinados com a operação
- [ ] Rollback ensaiado em homologação

## Durante
- [ ] Dependências atualizadas na versão atual, uma de cada vez
- [ ] CI rodando nas duas versões
- [ ] Build com --release ou toolchain na versão de destino
- [ ] Imagens e flags de JVM revisadas
- [ ] Teste de carga comparado com a linha de base

## Depois
- [ ] Todas as instâncias na versão nova (alerta de frota mista zerado)
- [ ] --add-opens temporários com data para sair
- [ ] Lições registradas: o que quebrou, o que surpreendeu
- [ ] CI agendado contra a próxima versão
```

## Ferramentas de migração

### jdeps: uso de APIs internas

O [`jdeps`](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jdeps.html) vem com o JDK, lê o bytecode e mostra de quais pacotes e módulos um JAR depende. Na migração, o uso principal é `--jdk-internals`, que lista cada classe que usa API interna do JDK e sugere a substituta quando existe. O post do [Java 8](/posts/java-8/#jdeps-análise-de-dependências) mostra a ferramenta desde a origem.

```bash
# classes que usam APIs internas do JDK, com sugestão de substituta
jdeps --jdk-internals --multi-release 25 app.jar

# repita para as dependências, que é onde os problemas costumam estar
for jar in target/dependency/*.jar; do
    jdeps --jdk-internals --multi-release 25 "$jar"
done
```

A opção `--multi-release 25` escolhe qual versão analisar em JARs *multi-release*, que embutem classes diferentes por versão do Java. As dependências podem ser copiadas para `target/dependency` com `./mvnw dependency:copy-dependencies`. No Temurin 25, a saída para um JAR que usa `sun.misc.Unsafe` é esta (resumida):

```text
app.jar -> jdk.unsupported
   exemplo.Legado    -> sun.misc.Unsafe    JDK internal API (jdk.unsupported)
...
JDK Internal API                         Suggested Replacement
----------------                         ---------------------
sun.misc.Unsafe                          See https://openjdk.org/jeps/260
```

Saída vazia significa que o JAR analisado não usa APIs internas.

### jdeprscan: APIs depreciadas

O [`jdeprscan`](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jdeprscan.html), também do JDK, procura usos de APIs anotadas com `@Deprecated`. A lista de depreciações vem **do JDK que executa a ferramenta** ou da versão indicada em `--release`, por isso rode com o JDK de destino:

```bash
# só APIs marcadas para remoção (forRemoval=true): vão quebrar, prioridade máxima
jdeprscan --for-removal app.jar

# todas as depreciações, com um classpath para resolver as dependências
jdeprscan --class-path "$(ls target/dependency/*.jar | paste -sd: -)" target/classes

# lista das APIs marcadas para remoção no Java 25
jdeprscan --release 25 --list --for-removal
```

A lista muda entre versões: há APIs que entram e APIs que saem dela. Por isso o resultado só vale para a versão analisada.

### OpenRewrite: mudanças automáticas

O [OpenRewrite](https://docs.openrewrite.org/) aplica *receitas* de refatoração no código-fonte: troca APIs depreciadas, atualiza a versão do Java no build e ajusta dependências conhecidas. As receitas de migração de Java ficam no artefato `rewrite-migrate-java`, publicado sob a Moderne Source Available License. Para subir um projeto Maven para o Java 25 sem precisar declarar o plugin no `pom.xml`:

```bash
# aplica a receita UpgradeToJava25 e altera os arquivos do projeto
./mvnw -U org.openrewrite.maven:rewrite-maven-plugin:run \
  -Drewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-migrate-java:RELEASE \
  -Drewrite.activeRecipes=org.openrewrite.java.migrate.UpgradeToJava25
```

Num projeto com `<maven.compiler.release>11</maven.compiler.release>`, a receita troca o valor para `25`, entre outros ajustes. Existem receitas equivalentes para outros saltos, como [`Java8toJava11`](https://docs.openrewrite.org/recipes/java/migrate/java8tojava11), [`UpgradeToJava17`](https://docs.openrewrite.org/recipes/java/migrate/upgradetojava17) e [`UpgradeToJava21`](https://docs.openrewrite.org/recipes/java/migrate/upgradetojava21); a lista do que a [`UpgradeToJava25`](https://docs.openrewrite.org/recipes/java/migrate/upgradetojava25) faz está na documentação. Trocar o goal `run` por `dryRun` gera um patch para revisão sem alterar os arquivos ([referência do plugin](https://docs.openrewrite.org/reference/rewrite-maven-plugin)).

Revise o diff como revisaria o de uma pessoa: a receita resolve o mecânico, não decisões de design.

### Outras ferramentas

- **[Java Almanac](https://javaalmanac.io/)**: compara as APIs de duas versões quaisquer (o que foi adicionado, depreciado e removido) e mostra as datas de cada release. Útil para dimensionar um salto.
- **IDEs**: o IntelliJ IDEA tem inspeções de [migração por nível de linguagem](https://www.jetbrains.com/help/inspectopedia/Java-Java-language-level-migration-aids.html), que apontam código que pode usar recursos da versão nova; Eclipse e VS Code também sinalizam uso de API depreciada. Configure o nível de linguagem do projeto para a versão de destino antes de analisar.
- **[SDKMAN!](https://sdkman.io/)**: instala e alterna JDKs na máquina de desenvolvimento. Use o identificador completo da versão: `25-tem` é aceito, mas instala o primeiro build do Java 25, e não a atualização mais recente.

```bash
sdk list java                 # identificadores disponíveis, como 25.0.4-tem
sdk install java 25.0.4-tem   # instala o Temurin 25.0.4
sdk use java 25.0.4-tem       # usa essa versão no shell atual
```

Para testar numa versão sem instalar nada, um container descartável resolve:

```bash
# roda a suíte do projeto atual num JDK 25, sem instalar nada na máquina
docker run --rm -v "$PWD":/app -w /app eclipse-temurin:25-jdk ./mvnw -B verify
```

## Segurança

### O que cada LTS trouxe

Parte do argumento para migrar é segurança. Cada post detalha as mudanças; em resumo:

- **Java 11**: TLS 1.3 ([JEP 332](https://openjdk.org/jeps/332)), acordo de chaves com Curve25519 e Curve448 ([JEP 324](https://openjdk.org/jeps/324)) e ChaCha20-Poly1305 ([JEP 329](https://openjdk.org/jeps/329)). Veja [TLS 1.3](/posts/java-11/#tls-13).
- **Java 17**: assinaturas EdDSA ([JEP 339](https://openjdk.org/jeps/339)), filtros de desserialização por contexto ([JEP 415](https://openjdk.org/jeps/415)) e encapsulamento forte dos internos do JDK ([JEP 403](https://openjdk.org/jeps/403)). Veja [Segurança no Java 17](/posts/java-17/#segurança).
- **Java 21**: API de *Key Encapsulation Mechanism* (KEM), base para algoritmos pós-quânticos ([JEP 452](https://openjdk.org/jeps/452)). Veja [Segurança no Java 21](/posts/java-21/#segurança).
- **Java 25**: criptografia resistente a computação quântica com ML-KEM ([JEP 496](https://openjdk.org/jeps/496)) e ML-DSA ([JEP 497](https://openjdk.org/jeps/497)), API de derivação de chaves ([JEP 510](https://openjdk.org/jeps/510)) e Security Manager desativado ([JEP 486](https://openjdk.org/jeps/486)). Veja [Segurança no Java 25](/posts/java-25/#segurança).
- **Rumo ao 29**: o Java 27 trouxe troca de chaves híbrida pós-quântica no TLS 1.3 ([JEP 527](https://openjdk.org/jeps/527)). Veja [Segurança no Java 29](/posts/java-29/#segurança).

### Patches de segurança

As atualizações de segurança do JDK saem em datas conhecidas. Os *Critical Patch Updates* da Oracle são publicados na **terceira terça-feira de janeiro, abril, julho e outubro** ([Oracle Security Alerts](https://www.oracle.com/security-alerts/)), e os repositórios de atualização do OpenJDK seguem o mesmo calendário ([JDK 25 Updates](https://wiki.openjdk.org/display/JDKUpdates/JDK+25u)). O próximo é em 20 de outubro de 2026.

Em 2026 a Oracle criou os *Critical Security Patch Updates*, correções de segurança menores publicadas na terceira terça-feira dos outros oito meses ([Oracle Security Alerts](https://www.oracle.com/security-alerts/)). Para o Java, a Oracle publicou uma atualização mensal de segurança em 18 de agosto de 2026 e planeja outras ([Inside Java: Transitioning Java to More Frequent Security Updates](https://web.archive.org/web/2026/https://blogs.oracle.com/java/transitioning-java-to-more-frequent-security-updates)); no OpenJDK, essa data corresponde ao 25.0.4.1. Na prática, **a atualização do JDK precisa ser tão rotineira quanto a de dependências**: imagem base atualizada no pipeline e implantação sem cerimônia.

### Restringir algoritmos sem enfraquecer os padrões

O arquivo `conf/security/java.security` do JDK define, entre outras coisas, quais algoritmos o TLS e a validação de certificados recusam. Para endurecer a política sem editar o arquivo do JDK (a edição se perde a cada atualização), aponte um arquivo próprio com `-Djava.security.properties`.

O cuidado principal: **uma propriedade no seu arquivo substitui o valor padrão inteiro**, não acrescenta itens a ele. Um arquivo com `jdk.tls.disabledAlgorithms=SSLv3, RC4, DES` **reabilita** TLS 1.0, TLS 1.1, 3DES e as suítes anônimas que o JDK já bloqueia. Parta sempre do valor padrão da versão que você usa:

```bash
# mostra o padrão do JDK em uso
grep -A4 '^jdk.tls.disabledAlgorithms' "$JAVA_HOME/conf/security/java.security"
```

No Temurin 25.0.4, a saída é:

```properties
jdk.tls.disabledAlgorithms=SSLv3, TLSv1, TLSv1.1, DTLSv1.0, RC4, DES, \
    MD5withRSA, DH keySize < 1024, EC keySize < 224, 3DES_EDE_CBC, anon, NULL, \
    ECDH, TLS_RSA_*, rsa_pkcs1_sha1 usage HandshakeSignature, \
    ecdsa_sha1 usage HandshakeSignature, dsa_sha1 usage HandshakeSignature
```

O arquivo próprio repete esse valor e acrescenta a restrição desejada, por exemplo chaves Diffie-Hellman de pelo menos 2048 bits:

```properties title="seguranca.properties"
# valor padrão do JDK 25 + DH keySize < 2048
jdk.tls.disabledAlgorithms=SSLv3, TLSv1, TLSv1.1, DTLSv1.0, RC4, DES, \
    MD5withRSA, DH keySize < 2048, EC keySize < 224, 3DES_EDE_CBC, anon, NULL, \
    ECDH, TLS_RSA_*, rsa_pkcs1_sha1 usage HandshakeSignature, \
    ecdsa_sha1 usage HandshakeSignature, dsa_sha1 usage HandshakeSignature
```

```bash
java -Djava.security.properties=seguranca.properties -jar app.jar
```

Como o padrão muda entre versões, **revise esse arquivo a cada migração**: um arquivo copiado do Java 17 pode desfazer restrições que o Java 25 adicionou.

### Vulnerabilidades nas dependências

Grande parte da superfície de ataque de uma aplicação Java está nas bibliotecas, como mostrou o Log4Shell ([CVE-2021-44228](https://nvd.nist.gov/vuln/detail/CVE-2021-44228)). O [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) cruza cada dependência com bancos de vulnerabilidades conhecidas e pode falhar o build:

```xml title="pom.xml"
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>13.0.0</version>
    <configuration>
        <!-- o padrão é 11, que nunca falha: CVSS vai de 0 a 10 -->
        <failBuildOnCVSS>7</failBuildOnCVSS>
        <!-- chave da API do NVD lida de uma variável de ambiente -->
        <nvdApiKey>${env.NVD_API_KEY}</nvdApiKey>
    </configuration>
    <executions>
        <execution>
            <goals><goal>check</goal></goals>
        </execution>
    </executions>
</plugin>
```

Dois detalhes da [configuração do plugin](https://dependency-check.github.io/DependencyCheck/dependency-check-maven/configuration.html): sem `failBuildOnCVSS`, o build **nunca** falha, só gera o relatório; e, sem uma [chave da API do NVD](https://nvd.nist.gov/developers/request-an-api-key), a atualização do banco de vulnerabilidades fica extremamente lenta, segundo o [próprio projeto](https://github.com/dependency-check/DependencyCheck). No Gradle, o plugin `org.owasp.dependencycheck` oferece a tarefa `dependencyCheckAnalyze`.

Alternativas com a mesma função: [GitHub Dependabot](https://docs.github.com/code-security/dependabot), que também abre PRs de atualização, útil na fase 2, e [Renovate](https://docs.renovatebot.com/).

## Desempenho

### De onde vêm os ganhos

Números dependem da aplicação e precisam ser medidos. O que se pode afirmar é **de onde** vêm as mudanças de cada salto:

- **Java 8 → 11**: G1 como coletor padrão no lugar do Parallel ([JEP 248](https://openjdk.org/jeps/248)) e *compact strings*, que guardam strings Latin-1 com 1 byte por caractere em vez de 2 ([JEP 254](https://openjdk.org/jeps/254)). Veja [G1 como coletor padrão](/posts/java-11/#g1-como-coletor-padrão).
- **Java 11 → 17**: ZGC e Shenandoah, coletores de pausa curta, prontos para produção ([JEP 377](https://openjdk.org/jeps/377) e [JEP 379](https://openjdk.org/jeps/379)). Veja [ZGC e Shenandoah em produção](/posts/java-17/#zgc-e-shenandoah-em-produção).
- **Java 17 → 21**: virtual threads ([JEP 444](https://openjdk.org/jeps/444)), que permitem muitas threads baratas para código bloqueante de I/O, e ZGC geracional ([JEP 439](https://openjdk.org/jeps/439)). Veja [Virtual threads](/posts/java-21/#virtual-threads).
- **Java 21 → 25**: cache AOT, que antecipa carga e linking de classes e perfis de métodos para acelerar a inicialização ([JEP 483](https://openjdk.org/jeps/483), [JEP 514](https://openjdk.org/jeps/514) e [JEP 515](https://openjdk.org/jeps/515)); compact object headers como opção de produto ([JEP 519](https://openjdk.org/jeps/519)); e `synchronized` sem prender a virtual thread à thread da plataforma ([JEP 491](https://openjdk.org/jeps/491)). Veja [Cache AOT](/posts/java-25/#cache-aot-inicialização-e-warmup-mais-rápidos-projeto-leyden) e [Compact object headers](/posts/java-25/#compact-object-headers).
- **Java 25 → 29**: no 27, compact object headers ligados por padrão ([JEP 534](https://openjdk.org/jeps/534)) e G1 como padrão também em máquinas pequenas ([JEP 523](https://openjdk.org/jeps/523)). Veja [JVM, GC e desempenho no Java 29](/posts/java-29/#jvm-gc-e-desempenho).

### Coletor de lixo: pontos de partida

O coletor certo depende do perfil da aplicação. Três configurações de partida, que precisam ser validadas com carga real:

```bash
# Latência baixa (APIs sensíveis a p99): ZGC, só geracional desde o Java 24.
# No Java 21, o modo geracional exige também -XX:+ZGenerational.
JAVA_OPTS="-XX:+UseZGC"

# Equilíbrio entre throughput e pausas: G1, o padrão.
# MaxGCPauseMillis é uma meta que o G1 persegue, não uma garantia (padrão: 200 ms).
JAVA_OPTS="-XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# Containers: heap como percentual do limite de memória
# e encerramento imediato no primeiro OutOfMemoryError
JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"
```

Uma armadilha frequente: **flags mudam entre versões**. O post do [Java 25](/posts/java-25/#zgc-passa-a-ser-só-geracional) mostra o caso de `ZGenerational`, e o do [Java 29](/posts/java-29/#o-que-observar-vindo-do-java-25) lista as flags removidas no 27. Para ver o valor efetivo de todas as flags na versão nova:

```bash
java -XX:+PrintFlagsFinal -version | grep -E ' (UseZGC|UseG1GC|MaxRAMPercentage) '
```

### Medir antes e depois

Comparar versões exige medir as duas do mesmo jeito.

**Java Flight Recorder (JFR)** é o gravador de eventos da própria JVM: registra alocações, pausas de GC, compilação JIT, locks e I/O. O JDK traz duas configurações prontas, e a descrição de cada uma informa o custo: `default`, "segura para uso contínuo em produção", com overhead tipicamente abaixo de 1%, e `profile`, com mais detalhe e overhead em torno de 2% ([default.jfc](https://github.com/openjdk/jdk/blob/master/src/jdk.jfr/share/conf/jfr/default.jfc) e [profile.jfc](https://github.com/openjdk/jdk/blob/master/src/jdk.jfr/share/conf/jfr/profile.jfc)). Uma gravação antes e outra depois, abertas no [JDK Mission Control](https://openjdk.org/projects/jmc/), mostram o que mudou. O post do [Java 11](/posts/java-11/#flight-recorder-no-openjdk) explica como o JFR chegou ao OpenJDK.

```bash
# grava 5 minutos de eventos com a configuração padrão
java -XX:StartFlightRecording=duration=300s,filename=antes.jfr -jar app.jar

# a configuração "profile" coleta mais detalhe
java -XX:StartFlightRecording=duration=300s,filename=antes.jfr,settings=profile -jar app.jar
```

**Log unificado de GC** ([JEP 271](https://openjdk.org/jeps/271), Java 9), que substituiu `-XX:+PrintGCDetails` e afins. Veja [Logging unificado da JVM](/posts/java-11/#logging-unificado-da-jvm):

```bash
# eventos de GC num arquivo, com o tempo desde a inicialização da JVM
java -Xlog:gc*:file=gc.log:uptime -jar app.jar
```

O log pode ser lido diretamente ou comparado em ferramentas como o [GCeasy](https://gceasy.io/).

**Profiling de CPU e alocação**: quando o JFR mostra que o tempo de CPU mudou, o [async-profiler](https://github.com/async-profiler/async-profiler) mostra onde, com flame graphs. Ele pode ser carregado como agente na inicialização:

```bash
# perfil de CPU dos primeiros 60 segundos, salvo como flame graph em HTML
java -agentpath:/caminho/para/libasyncProfiler.so=start,event=cpu,timeout=60,file=cpu.html \
     -jar app.jar
```

A opção `timeout` encerra a coleta depois do tempo indicado ([opções do profiler](https://github.com/async-profiler/async-profiler/blob/master/docs/ProfilerOptions.md)).

**Microbenchmarks**: use o [JMH](https://github.com/openjdk/jmh) quando a dúvida é sobre um trecho específico de código. Ele cuida do aquecimento, das repetições e da análise estatística que um laço com `System.nanoTime()` ignora.

### Métricas e alerta de frota mista

Se a aplicação exporta métricas com [Micrometer](https://docs.micrometer.io/micrometer/reference/), três métricas revelam diferenças entre versões de JVM: as pausas de GC (`jvm_gc_pause_seconds`), o tamanho do heap ocupado depois de uma coleta completa (`jvm_gc_live_data_size_bytes`; o heap "usado" instantâneo inclui lixo ainda não coletado) e o tempo de inicialização, importante em autoscaling. Os nomes vêm do [JvmGcMetrics](https://github.com/micrometer-metrics/micrometer/blob/main/micrometer-core/src/main/java/io/micrometer/core/instrument/binder/jvm/JvmGcMetrics.java) do Micrometer, já no formato do Prometheus.

Durante a transição, um alerta evita que alguma instância fique esquecida na versão antiga, a chamada **frota mista**. O binder `JvmInfoMetrics` do Micrometer publica a métrica `jvm.info` com as tags `version`, `vendor` e `runtime` ([código-fonte](https://github.com/micrometer-metrics/micrometer/blob/main/micrometer-core/src/main/java/io/micrometer/core/instrument/binder/jvm/JvmInfoMetrics.java)); no Prometheus, ela aparece como `jvm_info`, e `version` traz o valor de `java.runtime.version`, como `21.0.12+8-LTS`. A regra abaixo dispara se alguma instância continuar no Java 21 por mais de um dia:

```yaml title="regras-prometheus.yml"
groups:
  - name: versao-java
    rules:
      - alert: JavaVersaoAntiga
        # [.] casa um ponto literal sem precisar de escape
        expr: count by (instance) (jvm_info{version=~"21[.].*"}) > 0
        for: 24h # ignora reinícios rápidos; só alerta se durar um dia
        labels:
          severity: warning
        annotations:
          summary: "Instância {{ $labels.instance }} ainda roda Java 21"
```

Antes de publicar, `promtool check rules regras-prometheus.yml` valida a sintaxe da regra.

## Containers e CI

### Imagem Docker

O padrão recomendado é o **build em múltiplos estágios**: um estágio com o JDK completo para compilar e outro só com o JRE para executar. A imagem final fica menor e sem ferramentas de build:

```dockerfile title="Dockerfile"
# ---- estágio de build: JDK completo ----
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw -B clean package -DskipTests

# ---- estágio de execução: só o JRE ----
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
```

As duas flags do `ENTRYPOINT`:

- `-XX:MaxRAMPercentage=75.0` define o heap máximo como percentual da memória disponível. A JVM enxerga o limite de memória do container desde o Java 10 ([JVM ciente de contêineres](/posts/java-11/#jvm-ciente-de-contêineres)), mas o padrão é só 25% ([documentação do comando java](https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html)). A folga de 25% é para o que fica **fora** do heap: metaspace, pilhas das threads, buffers diretos e o próprio código da JVM. Sem folga, o container é encerrado por falta de memória sem nenhum erro Java no log.
- `-XX:+ExitOnOutOfMemoryError` encerra a JVM no primeiro `OutOfMemoryError`, em vez de deixá-la funcionando pela metade. Num orquestrador, morrer rápido e ser reiniciado é o comportamento certo.

A imagem `eclipse-temurin:25-jre` não inclui `curl` nem `wget` ([Dockerfiles das imagens](https://github.com/adoptium/containers/tree/main/25/jre/ubuntu)), então um `HEALTHCHECK` baseado em `curl` falharia. Em Kubernetes, a verificação de saúde fica nas probes do manifesto. Hoje, as tags sem sufixo, como `25-jre`, usam o Ubuntu 26.04; para fixar a versão do sistema, use tags como `25-jre-noble`, com Ubuntu 24.04 ([tags no Docker Hub](https://hub.docker.com/_/eclipse-temurin)).

### Kubernetes

No manifesto, o que interage com a JVM são os recursos e as probes:

```yaml title="deployment.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: registry.example.com/app:java25
          resources:
            requests: { memory: "1Gi", cpu: "500m" }
            limits: { memory: "1Gi" }
          startupProbe:            # segura as outras probes até a aplicação iniciar
            httpGet: { path: /actuator/health/liveness, port: 8080 }
            periodSeconds: 5
            failureThreshold: 30   # até 150 s para iniciar
          livenessProbe:           # falhas repetidas: o Kubernetes reinicia o container
            httpGet: { path: /actuator/health/liveness, port: 8080 }
          readinessProbe:          # falha: o pod sai do balanceamento, sem reiniciar
            httpGet: { path: /actuator/health/readiness, port: 8080 }
```

Três pontos que interagem com a JVM:

- O **limite de memória** é a base do cálculo de `MaxRAMPercentage`. Ao migrar, revalide o limite: o consumo fora do heap muda entre versões.
- **Liveness e readiness têm papéis diferentes** ([documentação do Kubernetes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)): a liveness reinicia o container, a readiness só o tira do balanceamento. Usar liveness para detectar sobrecarga transforma um pico de carga em reinícios em cascata.
- A **startup probe** segura as outras probes até a aplicação iniciar, o que evita reinícios em loop se o tempo de inicialização mudar na versão nova. Os caminhos `/actuator/health/liveness` e `/actuator/health/readiness` são os do Spring Boot Actuator ([documentação](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes)); outros frameworks têm equivalentes.

### CI com as duas versões

Durante a transição, o CI roda a suíte **na versão atual e na de destino** a cada push. Com GitHub Actions:

```yaml title=".github/workflows/ci.yml"
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false        # a falha numa versão não cancela a outra
      matrix:
        java: [21, 25]        # versão atual e versão de destino
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: ${{ matrix.java }}
          cache: maven
      - run: ./mvnw -B verify
```

Cada valor da matriz vira um job independente. Com `fail-fast: false`, a falha numa versão não cancela a outra, e o relatório sai completo.

### CI agendado contra a próxima versão

Depois da migração, um workflow **agendado** testa a aplicação contra a versão mais nova e os builds *early access* (EA, versões ainda em desenvolvimento, publicadas em [jdk.java.net](https://jdk.java.net/)). Assim, a próxima migração começa com meses de avisos em vez de surpresas:

```yaml title=".github/workflows/proxima-versao.yml"
name: Próximas versões do Java
on:
  schedule:
    - cron: "0 5 * * 1"       # toda segunda-feira, 05:00 UTC
  workflow_dispatch:          # permite disparar manualmente

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        java: [27, 28-ea]     # versão mais recente e early access da seguinte
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v6
        with:
          distribution: oracle-openjdk   # builds do jdk.java.net, inclusive EA
          java-version: ${{ matrix.java }}
      - run: ./mvnw -B verify
      - name: Uso de APIs internas do JDK
        run: jdeps --jdk-internals target/*.jar
```

A distribuição `oracle-openjdk` do `setup-java` instala os builds GA e EA publicados no jdk.java.net ([documentação do setup-java](https://github.com/actions/setup-java/blob/main/docs/advanced-usage.md)). Ela serve bem para esse teste de compatibilidade, mas não para produção, pelos motivos vistos em [Distribuições de JDK](#distribuições-de-jdk). O [actionlint](https://github.com/rhysd/actionlint) valida a sintaxe dos workflows antes do commit.

Uma falha nesse workflow vira item de backlog, não incidente na semana da migração.

## O que vem até o Java 29

Os grandes projetos do OpenJDK indicam o que vai pesar nas próximas migrações. O acompanhamento versão a versão está no post do [Java 29](/posts/java-29/):

- **[Valhalla](https://openjdk.org/projects/valhalla/)**: *value objects*, objetos sem identidade que a JVM pode representar de forma mais compacta. A [JEP 401](https://openjdk.org/jeps/401) (preview) foi integrada ao Java 28, previsto para março de 2027.
- **[Leyden](https://openjdk.org/projects/leyden/)**: inicialização e aquecimento mais rápidos, com o cache AOT. No Java 26, o cache passou a funcionar com qualquer coletor, inclusive ZGC ([JEP 516](https://openjdk.org/jeps/516)).
- **[Lilliput](https://openjdk.org/projects/lilliput/)**: objetos menores. Os compact object headers viraram produto no 25 ([JEP 519](https://openjdk.org/jeps/519)) e padrão no 27 ([JEP 534](https://openjdk.org/jeps/534)).
- **[Loom](https://openjdk.org/projects/loom/)**: depois das virtual threads (21) e dos Scoped Values (finais no 25, [JEP 506](https://openjdk.org/jeps/506)), a Structured Concurrency segue em preview (sétima preview no 27, [JEP 533](https://openjdk.org/jeps/533)).
- **[Panama](https://openjdk.org/projects/panama/)**: a Foreign Function & Memory API, que substitui o JNI, é final desde o 22 ([JEP 454](https://openjdk.org/jeps/454)); a Vector API continua em incubadora (12ª no 27, [JEP 537](https://openjdk.org/jeps/537)).

Para o planejamento, a leitura é que as quebras estruturais (módulos e encapsulamento) ficaram nos saltos do 8 ao 17. Os saltos recentes trazem mais **avisos de integridade**, como os de `Unsafe` ([JEP 498](https://openjdk.org/jeps/498)), JNI ([JEP 472](https://openjdk.org/jeps/472)) e campos `final` alterados por reflexão ([JEP 500](https://openjdk.org/jeps/500)), que as próprias JEPs apresentam como preparação para restrições em versões futuras. Tratar esses avisos agora barateia a migração para o 29.

## Como manter a próxima migração barata

A primeira migração é a mais cara. As seguintes só ficam baratas se alguns hábitos continuarem depois dela:

- **Dependências atualizadas continuamente**, com Dependabot ou Renovate abrindo PRs. Dependência atualizada aos poucos é o que torna a fase 2 curta.
- **BOMs** (*Bill of Materials*) para versionar famílias de bibliotecas em bloco. Quem usa Spring Boot já recebe as versões testadas em conjunto pelo `spring-boot-dependencies` e não deve fixar versões avulsas das bibliotecas que ele gerencia.
- **CI agendado** contra a versão mais nova e os builds EA, como na seção anterior.
- **Avisos tratados como dívida**: avisos de depreciação no build e avisos da JVM no log (`Unsafe`, JNI, agentes, campos `final`) entram no backlog.
- **Lições registradas**: o que quebrou, qual biblioteca surpreendeu, qual flag mudou. Numa empresa com vários serviços, o segundo time a migrar não deveria redescobrir nada.
- **Radar ligado**: o [Inside Java](https://inside.java/) publica os anúncios técnicos do time do Java na Oracle, e o [roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) mostra quando cada versão perde suporte.

## Perguntas frequentes

**Qual versão usar em produção hoje?**
Java 25, a LTS mais recente. Quem está no 17 ou antes deve mirar direto no 25, se as dependências permitirem; parar numa LTS intermediária repete todo o ciclo de testes e implantação.

**Preciso pagar para usar Java?**
Não. Distribuições OpenJDK como Temurin, Corretto, Microsoft e Zulu são gratuitas, inclusive em produção. Paga-se ao contratar suporte ou ao usar o Oracle JDK em produção fora do prazo da NFTC (veja [Custos e licenças](#custos-e-licenças)).

**Vale a pena sair do Java 8?**
Sim. Além das correções de segurança, o ecossistema já exige versões novas: todas as linhas do Spring Boot com suporte open source exigem Java 17 (veja [Versões mínimas do ecossistema](#versões-mínimas-do-ecossistema)). O caminho é a fase 1 do processo para dimensionar o trabalho e, depois, migrar direto para a LTS mais recente viável.

**Como saber rapidamente se minha aplicação funciona na versão nova?**
Só testes dão certeza, mas dá para estimar barato: `jdeps --jdk-internals` e `jdeprscan --for-removal`, com o JDK de destino, nos JARs da aplicação e das dependências mostram os impedimentos estruturais em minutos. Um `docker run` com a imagem do JDK de destino roda a suíte sem instalar nada.

**OpenJDK e Oracle JDK são diferentes?**
Funcionalmente, não. Desde o Java 11, a Oracle afirma que seus builds do Oracle JDK e do OpenJDK são essencialmente idênticos, com diferenças de empacotamento ([Oracle JDK Releases for Java 11 and Later](https://web.archive.org/web/20191112094256/https://blogs.oracle.com/java-platform-group/oracle-jdk-releases-for-java-11-and-later)). As diferenças relevantes são licença e suporte.

**Preciso modularizar minha aplicação (JPMS)?**
Não. O classpath continua suportado. O impacto do sistema de módulos na migração vem de o *JDK* ter sido modularizado, o que encapsulou APIs internas, e não de uma obrigação para o seu código. Veja [Sistema de módulos](/posts/java-11/#sistema-de-módulos-jpms).

## Glossário

- **LTS** (*Long-Term Support*): versão que o fornecedor atualiza por anos; as demais recebem atualizações só até a versão seguinte.
- **JEP** (*JDK Enhancement Proposal*): documento que descreve uma mudança da plataforma. Exemplo: a [JEP 444](https://openjdk.org/jeps/444) especifica as virtual threads.
- **OpenJDK**: o projeto open source que desenvolve a implementação de referência do Java SE; as distribuições são construídas a partir dele.
- **TCK** (*Technology Compatibility Kit*): conjunto oficial de testes que certifica a compatibilidade de uma implementação com o Java SE.
- **Preview**: recurso completo, mas sujeito a mudança ou remoção; exige `--enable-preview`.
- **Incubadora**: API experimental em módulo `jdk.incubator.*`; exige `--add-modules`.
- **Early access (EA)**: builds de uma versão ainda em desenvolvimento, para teste.
- **CPU** (*Critical Patch Update*): pacote trimestral de correções de segurança da Oracle, seguido pelas atualizações do OpenJDK.
- **NFTC e OTN**: licenças do Oracle JDK. A NFTC permite uso gratuito em produção por um prazo; a OTN restringe o uso gratuito a desenvolvimento, testes e usos pessoais.
- **Classpath e module path**: os dois mecanismos de localização de classes; o segundo chegou com o sistema de módulos no Java 9.
- **Frota mista**: período em que instâncias do mesmo serviço rodam versões diferentes da JVM.

## Fontes

**Ciclo de releases e suporte**

- [Moving Java Forward Faster](https://mreinhold.org/blog/forward-faster) (2017) e [Moving Java Forward Even Faster](https://mreinhold.org/blog/forward-even-faster) (2021), Mark Reinhold
- [JEP 3: JDK Release Process](https://openjdk.org/jeps/3), [JEP 11: Incubator Modules](https://openjdk.org/jeps/11), [JEP 12: Preview Features](https://openjdk.org/jeps/12) e [JEP 322: Time-Based Release Versioning](https://openjdk.org/jeps/322)
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) (atualizado em 15/09/2026)
- Páginas do OpenJDK: [JDK 8](https://openjdk.org/projects/jdk8/), [JDK 11](https://openjdk.org/projects/jdk/11/), [JDK 17](https://openjdk.org/projects/jdk/17/), [JDK 21](https://openjdk.org/projects/jdk/21/), [JDK 25](https://openjdk.org/projects/jdk/25/), [JDK Updates](https://openjdk.org/projects/jdk-updates/) e [JDK 25 Updates](https://wiki.openjdk.org/display/JDKUpdates/JDK+25u)

**Distribuições**

- [Eclipse Temurin: suporte](https://adoptium.net/support/), [FAQ do Adoptium](https://adoptium.net/docs/faq/), [imagens no Docker Hub](https://hub.docker.com/_/eclipse-temurin) e [Dockerfiles das imagens](https://github.com/adoptium/containers/tree/main/25/jre/ubuntu)
- [Amazon Corretto FAQs](https://aws.amazon.com/corretto/faqs/)
- [Microsoft Build of OpenJDK: suporte](https://learn.microsoft.com/java/openjdk/support)
- [Red Hat: OpenJDK Life Cycle and Support Policy](https://access.redhat.com/articles/1299013)
- [Azul Support Roadmap](https://www.azul.com/products/azul-support-roadmap/)
- [BellSoft Liberica: suporte](https://bell-sw.com/support/)
- [IBM Semeru Runtimes: suporte](https://www.ibm.com/support/pages/semeru-runtimes-support) e [Eclipse OpenJ9](https://eclipse.dev/openj9/)
- [jdk.java.net](https://jdk.java.net/)

**Licenças e custos**

- [GPLv2 com Classpath Exception](https://openjdk.org/legal/gplv2+ce.html)
- [Oracle Java SE Licensing FAQ](https://www.oracle.com/java/technologies/javase/jdk-faqs.html)
- [Java SE Universal Subscription](https://www.oracle.com/java/java-se-subscription/), [FAQ da assinatura](https://www.oracle.com/java/technologies/java-se-subscription-faq.html) e [lista de preços](https://www.oracle.com/assets/java-se-subscription-pricelist-5028356.pdf)
- [Oracle JDK Releases for Java 11 and Later](https://web.archive.org/web/20191112094256/https://blogs.oracle.com/java-platform-group/oracle-jdk-releases-for-java-11-and-later) (Oracle, 2018, cópia no Internet Archive)
- [GraalVM FAQ](https://www.graalvm.org/faq/)

**Ecossistema**

- Spring Boot: [requisitos do 4.1](https://docs.spring.io/spring-boot/4.1/system-requirements.html), [requisitos do 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html) e [calendário de suporte](https://spring.io/projects/spring-boot#support)
- Jakarta EE: [Platform 11](https://jakarta.ee/specifications/platform/11/) e [Platform 12](https://jakarta.ee/specifications/platform/12/)
- Quarkus: [Getting started](https://quarkus.io/guides/getting-started) e [Java 21 como base do Quarkus 4](https://quarkus.io/blog/java21/)
- [Micronaut 5.0 com Java 25 como base](https://micronaut.io/2026/04/27/micronaut-framework-5-0-with-java-25-baseline/)
- [Hibernate ORM 7.4](https://hibernate.org/orm/releases/7.4/)
- Gradle: [matriz de compatibilidade](https://docs.gradle.org/current/userguide/compatibility.html) e [toolchains](https://docs.gradle.org/current/userguide/toolchains.html)
- Maven: [download e requisitos](https://maven.apache.org/download.cgi) e [histórico de versões](https://maven.apache.org/docs/history.html)
- Kotlin: [novidades do 2.3.0](https://kotlinlang.org/docs/whatsnew23.html) e [do 2.4.0](https://kotlinlang.org/docs/whatsnew24.html)
- JUnit: [release notes do 6.0.0](https://docs.junit.org/6.0.0/release-notes.html) e [`@EnabledForJreRange`](https://docs.junit.org/current/api/org.junit.jupiter.api/org/junit/jupiter/api/condition/EnabledForJreRange.html)
- [Lombok changelog](https://projectlombok.org/changelog) e [Byte Buddy release notes](https://github.com/raphw/byte-buddy/blob/master/release-notes.md)

**Ferramentas de migração, containers e CI**

- Manuais do JDK 25: [java](https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html), [javac](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html), [jdeps](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jdeps.html) e [jdeprscan](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jdeprscan.html)
- OpenRewrite: [documentação](https://docs.openrewrite.org/), [referência do plugin Maven](https://docs.openrewrite.org/reference/rewrite-maven-plugin) e receitas [Java8toJava11](https://docs.openrewrite.org/recipes/java/migrate/java8tojava11), [UpgradeToJava17](https://docs.openrewrite.org/recipes/java/migrate/upgradetojava17), [UpgradeToJava21](https://docs.openrewrite.org/recipes/java/migrate/upgradetojava21) e [UpgradeToJava25](https://docs.openrewrite.org/recipes/java/migrate/upgradetojava25)
- [Java Almanac](https://javaalmanac.io/), [SDKMAN!](https://sdkman.io/) e [inspeções de migração do IntelliJ IDEA](https://www.jetbrains.com/help/inspectopedia/Java-Java-language-level-migration-aids.html)
- [Kubernetes: liveness, readiness e startup probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/) e [Spring Boot Actuator: probes do Kubernetes](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes)
- [setup-java: uso avançado](https://github.com/actions/setup-java/blob/main/docs/advanced-usage.md) e [actionlint](https://github.com/rhysd/actionlint)

**Segurança**

- [Oracle Critical Patch Updates, Security Alerts and Bulletins](https://www.oracle.com/security-alerts/)
- [Transitioning Java to More Frequent Security Updates](https://web.archive.org/web/2026/https://blogs.oracle.com/java/transitioning-java-to-more-frequent-security-updates) (Oracle, 2026, cópia no Internet Archive)
- [CVE-2021-44228 (Log4Shell)](https://nvd.nist.gov/vuln/detail/CVE-2021-44228) e [chave da API do NVD](https://nvd.nist.gov/developers/request-an-api-key)
- OWASP Dependency-Check: [projeto](https://owasp.org/www-project-dependency-check/), [repositório](https://github.com/dependency-check/DependencyCheck) e [configuração do plugin Maven](https://dependency-check.github.io/DependencyCheck/dependency-check-maven/configuration.html)
- [GitHub Dependabot](https://docs.github.com/code-security/dependabot) e [Renovate](https://docs.renovatebot.com/)

**Desempenho e observabilidade**

- Configurações do JFR no código do JDK: [default.jfc](https://github.com/openjdk/jdk/blob/master/src/jdk.jfr/share/conf/jfr/default.jfc) e [profile.jfc](https://github.com/openjdk/jdk/blob/master/src/jdk.jfr/share/conf/jfr/profile.jfc)
- [JDK Mission Control](https://openjdk.org/projects/jmc/), [GCeasy](https://gceasy.io/), [JMH](https://github.com/openjdk/jmh)
- async-profiler: [repositório](https://github.com/async-profiler/async-profiler) e [opções](https://github.com/async-profiler/async-profiler/blob/master/docs/ProfilerOptions.md)
- Micrometer: [documentação](https://docs.micrometer.io/micrometer/reference/), [JvmGcMetrics](https://github.com/micrometer-metrics/micrometer/blob/main/micrometer-core/src/main/java/io/micrometer/core/instrument/binder/jvm/JvmGcMetrics.java) e [JvmInfoMetrics](https://github.com/micrometer-metrics/micrometer/blob/main/micrometer-core/src/main/java/io/micrometer/core/instrument/binder/jvm/JvmInfoMetrics.java)

**JEPs citadas**

- Até o Java 17: [JEP 248](https://openjdk.org/jeps/248), [JEP 254](https://openjdk.org/jeps/254), [JEP 271](https://openjdk.org/jeps/271), [JEP 320](https://openjdk.org/jeps/320), [JEP 324](https://openjdk.org/jeps/324), [JEP 329](https://openjdk.org/jeps/329), [JEP 332](https://openjdk.org/jeps/332), [JEP 339](https://openjdk.org/jeps/339), [JEP 377](https://openjdk.org/jeps/377), [JEP 379](https://openjdk.org/jeps/379), [JEP 396](https://openjdk.org/jeps/396), [JEP 403](https://openjdk.org/jeps/403), [JEP 415](https://openjdk.org/jeps/415)
- Java 18 a 25: [JEP 400](https://openjdk.org/jeps/400), [JEP 421](https://openjdk.org/jeps/421), [JEP 439](https://openjdk.org/jeps/439), [JEP 444](https://openjdk.org/jeps/444), [JEP 451](https://openjdk.org/jeps/451), [JEP 452](https://openjdk.org/jeps/452), [JEP 454](https://openjdk.org/jeps/454), [JEP 472](https://openjdk.org/jeps/472), [JEP 483](https://openjdk.org/jeps/483), [JEP 486](https://openjdk.org/jeps/486), [JEP 490](https://openjdk.org/jeps/490), [JEP 491](https://openjdk.org/jeps/491), [JEP 496](https://openjdk.org/jeps/496), [JEP 497](https://openjdk.org/jeps/497), [JEP 498](https://openjdk.org/jeps/498), [JEP 506](https://openjdk.org/jeps/506), [JEP 510](https://openjdk.org/jeps/510), [JEP 514](https://openjdk.org/jeps/514), [JEP 515](https://openjdk.org/jeps/515), [JEP 519](https://openjdk.org/jeps/519)
- Depois do Java 25: [JEP 401](https://openjdk.org/jeps/401), [JEP 500](https://openjdk.org/jeps/500), [JEP 516](https://openjdk.org/jeps/516), [JEP 523](https://openjdk.org/jeps/523), [JEP 527](https://openjdk.org/jeps/527), [JEP 533](https://openjdk.org/jeps/533), [JEP 534](https://openjdk.org/jeps/534), [JEP 537](https://openjdk.org/jeps/537)

**Projetos do OpenJDK e acompanhamento**

- [Valhalla](https://openjdk.org/projects/valhalla/), [Leyden](https://openjdk.org/projects/leyden/), [Lilliput](https://openjdk.org/projects/lilliput/), [Loom](https://openjdk.org/projects/loom/) e [Panama](https://openjdk.org/projects/panama/)
- [Inside Java](https://inside.java/)
