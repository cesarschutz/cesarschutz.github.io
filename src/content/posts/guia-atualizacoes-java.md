---
title: "Guia de atualizações do Java"
published: 2025-07-14
description: "Documentação completa de migração: ciclo de releases, distribuições e custos, matriz de compatibilidade, processo em cinco fases, segurança, performance, containers e melhores práticas — com cada ferramenta e configuração explicada."
tags: [Java, Migração]
series: java
cover: /covers/guia-java.svg
draft: false
---

Este guia reúne o que é preciso saber para **planejar e executar uma atualização de versão do Java**: como o ciclo de releases funciona, qual distribuição de JDK adotar, quanto custa, quando vale migrar e um processo em cinco fases com as ferramentas explicadas passo a passo. Ele acompanha a [série sobre cada versão LTS](/java/) — aqui fica o *como migrar*; lá, o *o que mudou* em cada LTS.

## Como funciona o ciclo de releases

Desde 2017 (Java 9), a plataforma abandonou os lançamentos irregulares — que chegaram a levar cinco anos entre versões — e adotou um **ciclo fixo de seis meses**:

- Uma versão nova em **março** e outra em **setembro**, sempre na **terceira terça-feira** do mês.
- O trem não atrasa: funcionalidade pronta entra; funcionalidade atrasada espera o próximo release. É por isso que algumas versões parecem "pequenas" — o valor está na previsibilidade.
- Funcionalidades chegam primeiro como **preview** ou **incubating** (é preciso ativá-las com flag, e podem mudar entre versões) e só depois se tornam finais.

O modelo trouxe quatro benefícios concretos: **inovação contínua** em vez de anos de estagnação, **correções regulares** de segurança em datas conhecidas (os *Critical Patch Updates* trimestrais), **planejamento facilitado** — a empresa sabe hoje quando sai cada versão dos próximos anos — e **feedback rápido** da comunidade sobre features em preview antes de elas virarem definitivas.

### LTS e feature releases

Nem toda versão recebe atualizações por muito tempo. A distinção que importa para produção:

| | LTS (Long-Term Support) | Feature release |
|---|---|---|
| **Exemplos** | 8, 11, 17, 21, 25 | 22, 23, 24, 26 |
| **Frequência** | a cada 2 anos (desde o 17; antes era irregular) | a cada 6 meses |
| **Recebe updates por** | anos (varia por fornecedor) | apenas até a versão seguinte |
| **Uso recomendado** | produção | desenvolvimento, experimentação, quem consegue atualizar a cada 6 meses |

Por que a LTS é a primeira escolha para produção: **estabilidade** (a base recebe só correções, não features novas), **suporte garantido** (patches de segurança por anos), **planejamento previsível** (o ciclo de upgrade da empresa pode seguir o ciclo das LTS) e **ecossistema maduro** (bibliotecas, agentes e ferramentas priorizam testar contra as LTS).

### Modelos de suporte

Um detalhe que costuma confundir: **"LTS" é uma promessa do fornecedor do JDK, não do projeto OpenJDK**. O projeto OpenJDK mantém oficialmente só a versão mais recente; são fornecedores (Oracle, Eclipse Adoptium, Amazon, Azul, Red Hat…) que continuam portando correções para as LTS antigas — cada um com seu prazo. Na prática existem dois modelos:

- **Suporte gratuito (builds OpenJDK)** — atualizações trimestrais de segurança e correções críticas publicadas pelo fornecedor da distribuição, pelo prazo que ele definir (tipicamente 4 anos ou mais para LTS). Sem SLA: se você encontrar um bug, abre issue e espera como todo mundo.
- **Suporte comercial (pago)** — além dos patches por 8+ anos, inclui **suporte técnico 24/7 com SLA**, patches de segurança prioritários (antes da publicação geral, em alguns contratos), **hotfixes sob demanda** para bugs que só afetam você, e consultoria de migração. Faz sentido para aplicações críticas onde "esperar o próximo patch trimestral" não é aceitável.

## Linha do tempo

```
Era clássica (lançamentos irregulares)
1995  Java 1.0
2004  Java 5    — generics, annotations
2014  Java 8    — lambdas e Streams (a versão que "não morre")

Era moderna (ciclo de 6 meses)
2017  Java 9    — sistema de módulos (JPMS)
2018  Java 11   — LTS; primeira LTS do novo ciclo
2021  Java 17   — LTS; sealed classes, records consolidados
2023  Java 21   — LTS; virtual threads
2025  Java 25   — LTS; compact object headers, cache AOT
2026  Java 26   — módulos com import simplificado, HTTP/3
```

### Roadmap

O calendário das próximas versões já é conhecido (é a vantagem do trem de 6 meses); o conteúdo de cada uma é especulação informada a partir dos projetos em andamento:

```
2026  Java 27        — set/2026; candidatos: mais Leyden (AOT), Valhalla em preview?
2027  Java 28 e 29   — LTS seguinte é o 29 (set/2027)
```

Os marcos esperados dos grandes projetos: consolidação do **cache AOT** (Project Leyden) para startup rápido, **compact headers como padrão** (Project Lilliput), e as primeiras previews de **value types** (Project Valhalla) — detalhes na seção [Projetos futuros](#projetos-futuros-do-java).

Os saltos que a maioria das equipes enfrenta na prática são entre LTS: **8 → 11 → 17 → 21 → 25**. A dificuldade de cada um está na [matriz de compatibilidade](#matriz-de-compatibilidade).

## Distribuições de JDK

Todas as distribuições modernas são construídas a partir do **mesmo código-fonte OpenJDK** e passam pelo mesmo teste de compatibilidade (TCK). A diferença está em empacotamento, prazo de suporte e licença — não em funcionalidade.

### Gratuitas

- **[Eclipse Temurin](https://adoptium.net/)** (Eclipse Foundation, ex-AdoptOpenJDK) — a escolha padrão da comunidade: binários para todas as plataformas, imagens Docker oficiais, atualizações pontuais das LTS por ~4 anos. Se não houver um motivo específico para outra, use esta.
- **[Amazon Corretto](https://aws.amazon.com/corretto/)** — a distribuição que a Amazon usa internamente, com prazos de suporte **mais longos que a média** (inclusive para o Java 8, que a Amazon se comprometeu a manter por anos além dos outros). Natural para quem roda na AWS, funciona em qualquer lugar.
- **[Azul Zulu](https://www.azul.com/downloads/)** — builds gratuitos com opção de suporte comercial; útil quando se precisa de combinações incomuns de plataforma/versão ou de builds com JavaFX.

### Comerciais

- **Oracle Java SE Subscription** — suporte oficial da Oracle com SLA, o mais caro do mercado. Ideal para corporações que exigem contrato direto com o fornecedor da plataforma.
- **Red Hat build of OpenJDK** — incluído na assinatura RHEL, sem custo adicional para quem já é cliente; integrado ao ecossistema Red Hat (OpenShift, suporte unificado).
- **IBM Semeru** — usa a JVM **OpenJ9** em vez da HotSpot: footprint de memória menor e startup mais rápido em muitos cenários, mas comportamento de tuning diferente (flags de GC próprias, características de JIT distintas). Vale avaliar caso memória seja o gargalo — sempre com testes próprios, porque benchmarks de terceiros raramente refletem a sua carga.

### Qual escolher

| Cenário | Recomendação | Motivo |
|---|---|---|
| Desenvolvimento e CI | Eclipse Temurin | gratuito, onipresente, imagens Docker oficiais |
| Startup / produção sem contrato | Temurin ou Corretto | gratuitos com atualizações de LTS por anos |
| Java 8 que ainda vai viver anos | Amazon Corretto | prazo de updates mais longo para o 8 |
| Empresa média | Corretto + consultoria pontual | custo-benefício: paga-se ajuda quando precisa |
| Grande empresa / regulado | Oracle, Red Hat ou Azul com contrato | SLA, compliance, responsabilidade contratual |

## Custos e licenças

A pergunta "Java é pago?" tem resposta curta (não) e uma história longa que ainda gera auditoria e susto. O que importa saber:

- **OpenJDK é gratuito para qualquer uso**, inclusive produção comercial. A licença é **GPLv2 com Classpath Exception** — o "Classpath Exception" é o detalhe que importa: ele garante que rodar a sua aplicação sobre o JDK **não** obriga a abrir o código dela (sem ele, a GPL "contaminaria" a aplicação).
- **Oracle JDK 8 e 11** estão sob a licença **OTN**: gratuitos para desenvolvimento e teste, mas **uso comercial em produção exige assinatura paga** desde 2019. Foi essa mudança que gerou a onda de auditorias da Oracle — e a migração em massa para distribuições OpenJDK.
- **Oracle JDK 17 em diante** usa a licença **NFTC**: gratuito inclusive em produção, **mas só até um ano após o lançamento da LTS seguinte** — depois disso, os updates daquela versão voltam a exigir assinatura. É um "gratuito com prazo de validade": quem não presta atenção fica preso entre pagar e rodar sem patches.
- A assinatura da Oracle é cobrada **por funcionário** (modelo introduzido em 2023 — conta-se o quadro inteiro da empresa, não só quem usa Java), o que tornou o custo imprevisível para empresas grandes. Antes era por processador ou usuário nomeado.

### Cenários típicos de custo

| Perfil | Cenário | Custo de licença | Solução usual |
|---|---|---|---|
| Startup | poucos serviços, time pequeno | zero | Temurin ou Corretto |
| Empresa média | dezenas de servidores | zero + consultoria pontual quando precisa | Corretto/Temurin + especialista contratado por projeto |
| Corporação | centenas de cores, compliance | contrato de suporte comercial (negociado por core/funcionário/ano) | Oracle, Azul ou Red Hat com SLA |

A conclusão prática: **o custo de licença é evitável em praticamente todos os cenários** usando distribuições OpenJDK; o que se compra com dinheiro é SLA e responsabilidade contratual, não funcionalidade.

## Quando migrar: estratégias

A pergunta certa não é "qual a versão mais nova?", e sim **"qual o custo de ficar para trás?"**: versões sem updates deixam de receber correção de segurança, as bibliotecas param de testar contra elas e a dívida cresce a cada release perdido — migrar de 8 para 21 dói muito mais do que quatro migrações pequenas teriam doído.

### Por perfil de empresa

- **Conservador** (grandes empresas, sistemas regulados) — produção sempre em LTS; migra quando a LTS seguinte já está madura, com **6 a 12 meses de validação** antes de produção. Prioriza estabilidade sobre inovação. Salto típico: LTS → LTS a cada 2–4 anos.
- **Balanceado** (a maioria das empresas) — produção em LTS, adotando a nova LTS **3 a 6 meses** após o lançamento (tempo de o ecossistema — Spring, agentes de observabilidade, buildpacks — se alinhar); desenvolvimento experimenta as feature releases para conhecer o que vem aí.
- **Ágil** (startups, times de produto com CI forte) — acompanha cada release de 6 meses, aceitando o custo de atualizar dependências com frequência. Exige testes automatizados confiáveis; o ganho é **nunca enfrentar uma migração grande** e usar features novas um ano antes dos concorrentes.

### Por criticidade da aplicação

| Tipo | Exemplo | Versão recomendada | Estratégia |
|---|---|---|---|
| Crítica | core bancário, sistemas de saúde | LTS madura (21 ou 25 já validada) | conservadora: valida por meses, migra com janela e rollback ensaiado |
| Importante | e-commerce, backoffice | LTS atual | balanceada: migra no ritmo do ecossistema |
| Experimental | MVP, protótipo, ferramenta interna | versão mais recente | ágil: o custo de quebrar é baixo e o aprendizado é valioso |

O mesmo portfólio pode (e deve) misturar estratégias: não faz sentido segurar um protótipo no Java 17 "por padrão corporativo", nem arrastar o core de pagamentos para cada release de 6 meses.

## Matriz de compatibilidade

### Dificuldade e tempo por salto

Os tempos são ordens de grandeza para um projeto médio com uma equipe dedicada — o multiplicador real é a quantidade de dependências desatualizadas:

| De → para | Dificuldade | Tempo típico | Observações |
|---|---|---|---|
| **8 → 11** | Média/Alta | 2–6 meses | o salto da era clássica para a moderna: módulos, remoção do Java EE do JDK, mudanças de classloader |
| **8 → 17** | Alta | 4–12 meses | tudo do 8→11 mais o encapsulamento forte dos internals; compensa fazer direto em vez de parar no 11 |
| **8 → 21** | Muito alta | 6–18 meses | mudanças acumuladas de 9 anos de plataforma; exige inventário e planejamento formal |
| **11 → 17** | Baixa/Média | 1–3 meses | poucas quebras de linguagem; o esforço é encapsulamento (`--illegal-access` deixa de funcionar) e bibliotecas |
| **17 → 21** | Baixa | 1–2 meses | muito compatível; o trabalho típico é atualizar frameworks para aproveitar virtual threads |
| **21 → 25** | Baixa | semanas | continuidade; atenção a agentes que usam `Unsafe` (em depreciação) e ao Security Manager (desativado no 24) |

### Pontos de atenção por salto

**Java 8 → 11+** — os três impactos estruturais:

- **Sistema de módulos (JPMS)**: você não precisa modularizar a sua aplicação (o classpath continua funcionando), mas o *JDK* foi modularizado — e isso encapsulou APIs internas que bibliotecas antigas usavam livremente.
- **Remoção do Java EE do JDK**: `javax.xml.bind` (JAXB), `javax.annotation`, JAX-WS, CORBA e afins saíram da plataforma. A correção é adicionar as dependências explicitamente (hoje sob o namespace `jakarta.*`).
- **Versionamento novo**: código que interpretava `java.version` esperando `1.8.x` quebra com `11.x` — um bug bobo e comum em builds antigos.

**Java 11 → 17**:

- **Encapsulamento forte por padrão** (JEP 396/403): o acesso reflexivo a internals do JDK, que no 11 gerava warning, passa a falhar. A flag `--illegal-access=permit` deixa de existir; casos legítimos precisam de `--add-opens` explícito — e a solução de verdade é atualizar a biblioteca que fazia isso.
- **Depreciações concluídas**: Nashorn (JS engine) removido, Applets e Security Manager deprecados.

**Java 17 → 21**:

- Quase nada quebra; o tema é **preparar-se para virtual threads** — revisar usos de `ThreadLocal` (cada virtual thread tem o seu, e milhões deles custam memória) e de `synchronized` em código de I/O (causava *pinning* até o Java 23; resolvido no 24 pelo JEP 491).

**Java 21 → 25**:

- **Security Manager desativado permanentemente** (JEP 486, Java 24): configurações com `-Djava.security.manager` impedem a JVM de subir.
- **`sun.misc.Unsafe` em depreciação ativa** (JEP 471/498): usos passam a gerar warnings em runtime — a fonte quase sempre é uma biblioteca antiga, não seu código.
- **JARs assinados com algoritmos fracos** (SHA-1) deixam de ser verificados.

Regra empírica que se repete em todos os saltos: **quem quebra quase nunca é o seu código — são as dependências**. Bibliotecas que manipulam bytecode (ASM, ByteBuddy, cglib), agentes de APM e frameworks de injeção são os primeiros lugares para olhar.

## O processo de migração em cinco fases

O processo abaixo funciona para qualquer salto; o percentual indica onde o tempo realmente vai — repare que **só 30% é a migração em si**: análise e preparação bem feitas são o que impede a fase 3 de virar um pântano.

### Fase 1 — Análise (≈20% do tempo)

O objetivo é sair desta fase com uma **lista concreta de impedimentos**, não com uma sensação. As ferramentas estão detalhadas na seção [Ferramentas de migração](#ferramentas-de-migração); o fluxo é:

1. Rodar `jdeps --jdk-internals` nos JARs da aplicação **e das dependências** — lista quem usa APIs internas do JDK que deixarão de funcionar.
2. Rodar `jdeprscan --for-removal` — lista usos de APIs cuja remoção já está anunciada.
3. Levantar o inventário de dependências e verificar, no changelog de cada biblioteca central (framework web, driver de banco, agente de APM), qual versão dela suporta o Java de destino:

```bash
# árvore completa de dependências com as versões resolvidas
./gradlew dependencies --configuration runtimeClasspath
```

O resultado da fase é o **backlog da migração**: quais bibliotecas atualizar, quais trechos de código tocar, e uma estimativa honesta de esforço.

### Fase 2 — Preparação (≈25% do tempo)

A preparação acontece **ainda na versão antiga do Java** — essa é a ideia central da fase: reduzir o risco antes de trocar qualquer coisa.

1. **Atualize as dependências** para as versões que suportam o Java de destino, **uma de cada vez**, rodando a suíte de testes a cada atualização. Atualizar biblioteca junto com JVM mistura duas variáveis e torna qualquer regressão difícil de atribuir.
2. **Zere os warnings de depreciação** apontados na análise. Ative o aviso no compilador para que novos usos não passem despercebidos:

```groovy title="build.gradle"
tasks.withType(JavaCompile) {
    // -Xlint:deprecation faz o javac avisar cada uso de API deprecada
    options.compilerArgs += ["-Xlint:deprecation"]
}
```

3. **Monte o ambiente de teste na versão nova** (container, agente de CI ou VM) antes de migrar o projeto — a Fase 4 depende dele.
4. **Estabeleça a linha de base de performance**: colete métricas atuais (latência, throughput, uso de memória, startup) para ter com o que comparar depois. Sem baseline, "ficou mais lento?" vira opinião.

### Fase 3 — Migração (≈30% do tempo)

Com o terreno preparado, a troca em si tende a ser pequena: atualizar a versão nos builds, resolver o que sobrar e ajustar flags de JVM. Dois pontos de configuração merecem explicação.

**Compile com `--release`, não com `source`/`target`.** A diferença é sutil e importante: `source`/`target` só definem a sintaxe e o formato do bytecode, mas deixam o código compilar contra a API do JDK instalado — o build passa e a aplicação quebra em runtime numa JVM mais antiga. `--release` valida **sintaxe e API** contra a versão alvo:

```xml title="pom.xml"
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <!-- valida código E chamadas de API contra o Java 21 -->
        <release>21</release>
        <compilerArgs>
            <arg>-Xlint:deprecation</arg>
        </compilerArgs>
    </configuration>
</plugin>
```

**Use toolchain no Gradle.** A toolchain desacopla o JDK que roda o Gradle do JDK que compila o projeto: o Gradle localiza (ou baixa) o JDK pedido, e o build para de depender do `JAVA_HOME` da máquina de cada pessoa:

```groovy title="build.gradle"
java {
    toolchain {
        // o build usa Java 21 mesmo que o Gradle rode em outro JDK
        languageVersion = JavaLanguageVersion.of(21)
    }
}
```

Os erros restantes nesta fase costumam ser pontuais: um agente desatualizado, uma flag de JVM que mudou de nome (as de GC mudam entre versões — valide com `java -XX:+PrintFlagsFinal -version | grep <flag>`), ou um `--add-opens` temporário para uma biblioteca atrasada.

### Fase 4 — Testes (≈20% do tempo)

Quatro camadas, da mais barata para a mais cara:

1. **Suíte completa na versão nova** — unitários e integração.
2. **Testes nas duas versões em paralelo** durante a transição (matriz de CI — configuração explicada em [DevOps e containers](#devops-e-containers)): protege a branch principal enquanto nem todo ambiente migrou.
3. **Testes de carga comparando com a baseline** da Fase 2 — mesmos cenários, mesma infraestrutura, só a JVM muda.
4. **Validação de segurança** — scan de dependências e revisão das configurações de TLS (seção [Segurança](#segurança)).

Para código que só compila ou só faz sentido em versões novas, o JUnit 5 condiciona o teste ao runtime, sem quebrar o build antigo:

```java
@Test
@EnabledOnJre(JRE.JAVA_21) // ignorado silenciosamente em JVMs mais antigas
void virtualThreadsExecutamTarefas() {
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
        // ...
    }
}

@Test
@DisabledOnJre({ JRE.JAVA_8, JRE.JAVA_11 }) // roda só do 17 em diante
void textBlocksFormatamRelatorio() {
    var texto = """
        relatório
        em múltiplas linhas
        """;
    assertThat(texto).contains("relatório");
}
```

`@EnabledOnJre`/`@DisabledOnJre` leem a versão da JVM que está executando o teste — é o que permite a mesma suíte rodar na matriz de versões do CI sem `if` manual.

### Fase 5 — Deploy (≈5% do tempo)

- **Deploy gradual**: uma instância (ou um percentual do tráfego) na versão nova, o resto na antiga. Trocar a versão da JVM é uma mudança de infraestrutura — merece o mesmo cuidado de um canary de código.
- **Critérios de rollback definidos antes** do deploy, não durante o incidente. Exemplos objetivos: latência p99 acima de X% da baseline, taxa de erro acima de Y, pausas de GC anômalas.
- **Janela de observação de dias, não minutos**: problemas de GC e de memória aparecem com carga acumulada, não no primeiro request.

### Estimativas de tempo

Ordens de grandeza (o intervalo depende de quantas dependências estão desatualizadas e de quanto código toca APIs internas):

| Tamanho do projeto | Migração simples (ex.: 17→21) | Migração complexa (ex.: 8→17+) |
|---|---|---|
| Pequeno (1 serviço, poucas libs) | 1–4 semanas | 2–8 semanas |
| Médio (alguns serviços) | 1–3 meses | 3–6 meses |
| Grande (dezenas de serviços, monolito legado) | 3–6 meses | 6–18 meses |

## Ferramentas de migração

### Análise de código

**`jdeps`** — analisador de dependências do próprio JDK. Lê o bytecode e responde "do que este JAR depende?". Os três usos que importam na migração:

```bash
# 1. Detectar uso de APIs internas do JDK (o uso mais importante):
#    lista cada classe que toca um interno (sun.misc.Unsafe etc.)
#    e sugere a API pública substituta
jdeps --jdk-internals meu-app.jar

# 2. Gerar um module-info.java sugerido, caso você queira
#    modularizar a aplicação (opcional — classpath segue válido)
jdeps --generate-module-info ./saida meu-app.jar

# 3. Analisar considerando as dependências e JARs multi-release
#    (JARs que embutem código específico por versão de Java)
jdeps --module-path libs/ --multi-release 21 meu-app.jar
```

Se a saída do primeiro comando vier vazia, o risco de "API interna" não existe no projeto — rode também contra os JARs das dependências, que é onde os problemas costumam estar.

**`jdeprscan`** — scanner de APIs `@Deprecated`, também embutido no JDK. A distinção entre os dois modos importa:

```bash
# só o que já tem REMOÇÃO anunciada (forRemoval=true):
# isso vai quebrar de verdade — prioridade máxima
jdeprscan --for-removal meu-app.jar

# tudo que está deprecado (inclusive sem previsão de remoção),
# varrendo um diretório de classes compiladas
jdeprscan --class-path libs/* build/classes/
```

**[Java Almanac](https://javaalmanac.io/)** — compara qualquer par de versões: APIs adicionadas e removidas, flags, datas. É a melhor ferramenta para **dimensionar** um salto antes de começar.

### IDEs

As três grandes IDEs ajudam mais do que se costuma aproveitar:

- **IntelliJ IDEA** — as *inspections* têm perfis por versão de Java: apontam API deprecada, sugerem sintaxe nova (switch expressions, records) e o *Problems view* consolida tudo. `Code → Analyze Code` no projeto inteiro gera o relatório da Fase 1.
- **Eclipse IDE** — *quick fixes* para incompatibilidades e o compilador próprio (ECJ) que valida contra a versão alvo.
- **VS Code** — o Extension Pack for Java traz diagnósticos equivalentes via Language Server.

### Gerenciamento de JDKs

**[SDKMAN!](https://sdkman.io/)** resolve o problema de conviver com várias versões na máquina de desenvolvimento:

```bash
sdk install java 21-tem     # instala o Temurin 21
sdk use java 21-tem         # ativa no shell atual
sdk default java 17-tem     # define o padrão da máquina
```

### Ambientes de teste multi-versão

Para reproduzir localmente o que a matriz de CI faz, um script que alterna o `JAVA_HOME` e roda a suíte em cada versão:

```bash title="test-multi-version.sh"
#!/bin/bash
# roda a suíte completa em cada versão instalada;
# falha no primeiro erro (set -e) para o log apontar a versão culpada
set -e
for version in 17 21; do
    echo "==> Testando com Java $version"
    export JAVA_HOME="$HOME/.sdkman/candidates/java/${version}-tem"
    ./mvnw clean test
done
```

E um Dockerfile descartável quando se quer testar numa versão **sem instalar nada** na máquina:

```dockerfile title="Dockerfile.test"
# imagem de teste: builda e testa dentro do container na versão alvo
FROM eclipse-temurin:21-jdk
WORKDIR /app
COPY . .
RUN ./mvnw clean test
```

`docker build -f Dockerfile.test .` compila e testa em Java 21 isoladamente — se passar, a migração do build está OK naquela versão.

## Segurança

### O que cada salto traz de segurança

Parte do argumento para migrar é criptografia moderna — cada LTS parada é uma geração de algoritmos que a aplicação não usa:

- **8 → 11**: **TLS 1.3** nativo (handshake mais rápido e seguro), curvas **Curve25519/Curve448**, cipher suites **ChaCha20-Poly1305** (melhores em hardware sem aceleração AES) e assinaturas **RSASSA-PSS**.
- **11 → 17**: assinaturas **EdDSA** (RFC 8032, mais rápidas e resistentes a erros de implementação), **sealed classes** (modelagem de domínio fechada — menos superfície para extensão maliciosa) e **encapsulamento forte** dos internals do JDK por padrão, fechando uma família inteira de ataques via reflexão.
- **17 → 21**: melhorias de performance no TLS 1.3 e a base para isolamento com virtual threads.
- **21 → 25**: **criptografia pós-quântica** — os algoritmos **ML-KEM** (acordo de chaves) e **ML-DSA** (assinaturas), padronizados pelo NIST, chegam no Java 24; junto vem a **KDF API** (derivação de chaves). E o **Security Manager é desativado permanentemente** (JEP 486) — configurações antigas que o mencionam precisam ser removidas.

### Restringindo algoritmos fracos

O arquivo `java.security` do JDK controla quais algoritmos a JVM aceita. Em vez de editar o arquivo do JDK (que se perde a cada update), aponte um arquivo próprio com as propriedades que você quer sobrescrever:

```properties title="security.properties"
# Desabilita protocolos e algoritmos fracos no TLS:
# SSLv3/RC4/DES são quebrados; MD5withRSA é forjável;
# DH < 2048 bits é vulnerável a Logjam
jdk.tls.disabledAlgorithms=SSLv3, RC4, DES, MD5withRSA, DH keySize < 2048

# Recusa certificados assinados com hash quebrado (MD2/MD5)
# e SHA-1 quando emitido por CA pública (jdkCA)
jdk.certpath.disabledAlgorithms=MD2, MD5, SHA1 jdkCA
```

```bash
# aplica o arquivo por cima do java.security padrão
# e força chaves DH efêmeras de 2048 bits no TLS
java -Djava.security.properties=security.properties \
     -Djdk.tls.ephemeralDHKeySize=2048 \
     -jar app.jar
```

Importante: as versões novas do JDK **já desabilitam a maioria dos algoritmos fracos por padrão** — este mecanismo serve para endurecer além do padrão ou para manter política uniforme numa frota com versões mistas.

### Vulnerabilidades nas dependências

A superfície de ataque de uma aplicação Java está muito mais nas bibliotecas do que no JDK (caso Log4Shell). Duas práticas:

- **Acompanhe os patches trimestrais**: a Oracle publica os *Critical Patch Updates* em datas fixas (janeiro/abril/julho/outubro) e todas as distribuições OpenJDK lançam os equivalentes em seguida — a rotina de aplicar o patch da JVM deve ser tão automática quanto a de dependências. Alertas em [oracle.com/security-alerts](https://www.oracle.com/security-alerts/).
- **Escaneie dependências no build**: o plugin do OWASP cruza cada dependência com o banco de CVEs e **falha o build** se encontrar vulnerabilidade conhecida:

```xml title="pom.xml"
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <executions>
        <execution>
            <goals><goal>check</goal></goals>
        </execution>
    </executions>
</plugin>
```

Alternativas com a mesma função: Snyk, GitHub Dependabot (que também abre PRs de atualização — útil na Fase 2) e `gradle dependencyCheckAnalyze`.

## Performance

### De onde vem o ganho em cada salto

Números exatos dependem da sua aplicação — meça com as ferramentas de [observabilidade](#monitoramento-e-observabilidade). O que se pode afirmar com segurança é a **origem** do ganho:

- **8 → 11**: **G1 vira o coletor padrão** (pausas mais previsíveis que o Parallel GC em heaps grandes); **compact strings** — strings latinas passam a ocupar 1 byte por caractere em vez de 2, tipicamente uma fatia relevante do heap; **string deduplication** no G1 elimina cópias duplicadas de strings de vida longa.
- **11 → 17**: amadurecem **ZGC** e **Shenandoah**, coletores de pausa sub-milissegundo para quem sofre com latência; anos de otimizações de JIT que vêm "de graça" ao trocar a JVM.
- **17 → 21**: **virtual threads** mudam o modelo de escalabilidade de I/O — milhões de threads baratas sem reescrever código bloqueante; **ZGC geracional** (no 21, `-XX:+UseZGC -XX:+ZGenerational`; do 23 em diante é o padrão) reduz drasticamente o custo de coletar objetos jovens.
- **21 → 25**: **compact object headers** (`-XX:+UseCompactObjectHeaders`, produto no 25) reduzem o cabeçalho de cada objeto de 12 para 8 bytes — em aplicações com muitos objetos pequenos isso é heap de volta sem tocar em código; **cache AOT** (Project Leyden) corta o tempo de startup carregando classes pré-processadas; a **Vector API** acelera código numérico com instruções SIMD.

### Tuning por cenário

O GC certo depende do perfil da aplicação — estas são as três configurações de partida (sempre valide com carga real):

```bash
# Baixa latência (APIs sensíveis a p99): ZGC
# pausas sub-milissegundo, independente do tamanho do heap
# (no Java 21, adicione -XX:+ZGenerational; do 23 em diante é o padrão)
JAVA_OPTS="-XX:+UseZGC"

# Alto throughput (batch, processamento): G1 com meta de pausa relaxada
# MaxGCPauseMillis é uma META que o G1 persegue, não uma garantia;
# metas maiores deixam o G1 trabalhar menos vezes e render mais
JAVA_OPTS="-XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+UseStringDeduplication"

# Containers: heap como % do limite de memória do cgroup
# e morte rápida em OOM para o orquestrador reiniciar
JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"
```

Uma armadilha clássica da migração: **flags de GC mudam entre versões** — flags experimentais viram padrão, outras são removidas e derrubam a JVM na subida. Valide o conjunto com `java -XX:+PrintFlagsFinal -version` na versão nova antes do deploy.

### Como medir (em vez de adivinhar)

- **JFR antes e depois** — a forma mais barata de comparar versões com carga real (detalhes em [observabilidade](#monitoramento-e-observabilidade)).
- **[async-profiler](https://github.com/async-profiler/async-profiler)** — quando o JFR aponta que o tempo de CPU mudou, o async-profiler mostra **onde**, com flame graphs:

```bash
# grava um flame graph de CPU dos primeiros 60s da aplicação
java -agentpath:/opt/async-profiler/lib/libasyncProfiler.so=start,event=cpu,duration=60,file=cpu.html \
     -jar app.jar
```

- **JMH** para microbenchmarks — só quando a dúvida é sobre um trecho específico de código; benchmark de trecho sem JMH mede o JIT, não o código.

## DevOps e containers

### Imagem Docker

O padrão recomendado é o **multi-stage build**: um estágio com JDK completo para compilar, outro só com JRE para rodar — a imagem final fica menor (menos superfície de ataque, pull mais rápido) e sem ferramentas de build:

```dockerfile title="Dockerfile"
# ---- estágio de build: JDK completo ----
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests

# ---- estágio de runtime: só o JRE ----
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# health check no nível do container: o Docker marca o container
# como unhealthy se o endpoint parar de responder
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
```

As duas flags do `ENTRYPOINT` explicadas:

- `-XX:MaxRAMPercentage=75.0` — a JVM moderna já enxerga o limite de memória do container (automático desde o Java 10); esta flag define o heap como percentual desse limite. Os 25% de folga são para o que vive **fora** do heap: metaspace, stacks de thread, buffers nativos. Sem folga, o container é morto por OOM pelo orquestrador sem nenhum erro Java no log.
- `-XX:+ExitOnOutOfMemoryError` — derruba o processo no primeiro `OutOfMemoryError`, em vez de deixá-lo agonizando meio-vivo; num orquestrador, morrer rápido e ser reiniciado é o comportamento certo.

E o `--start-period` do health check dá à JVM tempo de subir antes de as falhas contarem.

### Kubernetes

Na migração, o que importa no manifesto são recursos e probes:

```yaml title="deployment.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-app
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: app
          image: myapp:java21
          resources:
            requests: { memory: "512Mi", cpu: "500m" }
            limits:   { memory: "1Gi" }
          livenessProbe:            # falhou repetidamente -> k8s REINICIA o pod
            httpGet: { path: /health/live, port: 8080 }
            initialDelaySeconds: 30
          readinessProbe:           # falhou -> k8s tira o pod do balanceador
            httpGet: { path: /health/ready, port: 8080 }
            initialDelaySeconds: 5
```

Três pontos que interagem com a JVM:

- O **limite de memória** é o número que a JVM usa para calcular o heap (via `MaxRAMPercentage`). Ao migrar de versão, revalide o limite: o consumo fora do heap muda entre versões.
- **Liveness e readiness têm papéis diferentes** — o liveness reinicia o pod (use para travamento real), o readiness só tira do balanceador (use para aquecimento e sobrecarga). Confundir os dois transforma um pico de carga em restart em cascata.
- O `initialDelaySeconds` do liveness precisa acomodar o startup da JVM **com folga** — ou o pod entra em loop de restart justamente quando o tempo de startup variar na versão nova.

### CI: testando as duas versões em paralelo

Durante a transição, o CI deve rodar a suíte **na versão atual e na versão alvo** a cada push — é isso que protege a branch principal enquanto os ambientes migram aos poucos:

```yaml title=".github/workflows/ci.yml"
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        java: [17, 21]     # roda a suíte inteira nas duas versões
      fail-fast: false     # uma versão falhar não cancela a outra
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: ${{ matrix.java }}
      - run: ./mvnw clean verify
```

Cada linha da matriz vira um job independente e paralelo. O `fail-fast: false` garante o relatório completo mesmo quando uma versão quebra — exatamente a informação que se quer durante uma migração.

### CI: vigiando a próxima versão

Depois da migração, um workflow **agendado** (não a cada push, para não custar CI à toa) testa a aplicação contra a próxima versão e os builds early-access — assim a próxima migração começa com meses de avisos em vez de surpresas:

```yaml title=".github/workflows/proxima-versao.yml"
name: Teste contra próximas versões
on:
  schedule:
    - cron: "0 2 * * 1"   # toda segunda, 02:00 — fora do horário de trabalho

jobs:
  early-access:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        java: [25, 26-ea]  # a LTS alvo e o early-access seguinte
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: ${{ matrix.java }}
      - run: ./mvnw clean verify
      - name: Relatório de compatibilidade
        # anexa a análise de internals ao run, para consulta
        run: jdeps --jdk-internals target/*.jar | tee compat-${{ matrix.java }}.txt
      - uses: actions/upload-artifact@v4
        with:
          name: compat-${{ matrix.java }}
          path: compat-*.txt
```

Falhou na segunda-feira? É um issue tranquilo no backlog — não um incidente na semana da migração.

## Monitoramento e observabilidade

Comparar a versão antiga com a nova exige medir as duas do mesmo jeito. As ferramentas, da mais completa para a mais simples:

**Java Flight Recorder (JFR)** — o gravador de eventos da própria JVM: registra alocações, pausas de GC, compilação JIT, I/O e locks com overhead tipicamente abaixo de 1% — dá para usar em produção. Uma gravação antes e outra depois da migração, abertas lado a lado no [Java Mission Control](https://openjdk.org/projects/jmc/), mostram objetivamente o que mudou:

```bash
# grava 5 minutos de eventos num arquivo .jfr
java -XX:StartFlightRecording=duration=300s,filename=antes.jfr -jar app.jar

# ou com o perfil "profile" (mais detalhe, overhead ~2%)
java -XX:StartFlightRecording=duration=300s,filename=antes.jfr,settings=profile -jar app.jar
```

**Log unificado de GC** (Java 9+; substitui as flags antigas `PrintGCDetails`/`PrintGCTimeStamps`):

```bash
# um evento de GC por linha, com timestamp de uptime
java -Xlog:gc*:file=gc.log:uptime -jar app.jar
```

O arquivo pode ser lido diretamente ou analisado no [GCeasy](https://gceasy.io/), que resume pausas, throughput e tendência de heap e **compara dois logs** — o formato ideal para o antes/depois da migração.

**Métricas de aplicação** — se a aplicação exporta métricas (Micrometer/Prometheus), as três que mais revelam diferença entre versões de JVM:

- `jvm_gc_pause_seconds` — pausas de GC (o histograma, não só a média);
- **heap após GC** — a medida real de memória viva (heap "usado" instantâneo mente: inclui lixo ainda não coletado);
- **tempo de startup** — especialmente relevante em autoscaling.

**Alerta de frota mista** — durante a transição, um alerta evita que alguma instância fique esquecida na versão antiga. O Micrometer expõe a versão do runtime como tag; a regra dispara se qualquer instância reportar a versão anterior após a data de corte:

```yaml title="prometheus-rules.yml"
groups:
  - name: java-version
    rules:
      - alert: JavaVersionDesatualizada
        # jvm_info carrega a versão como label; a regra pega quem ficou para trás
        expr: count by (instance) (jvm_info{version=~"17.*"}) > 0
        for: 24h        # tolera reinícios; só alerta se persistir um dia
        labels:
          severity: warning
        annotations:
          summary: "Instância {{ $labels.instance }} ainda está no Java 17"
```

## Projetos futuros do Java

Os grandes projetos do OpenJDK, o que significam e como acompanhar:

### Project Valhalla — value types

Classes que se comportam como primitivos: **sem identidade** (dois `Point(1,2)` são indistinguíveis) e, por isso, passíveis de serem **achatadas na memória** — um array de value objects vira um bloco contíguo, sem ponteiros nem cabeçalhos por elemento:

```java
// sintaxe proposta (preview futuro — pode mudar)
value class Point {
    int x;
    int y;
}

// hoje: array de PONTEIROS para objetos espalhados no heap
// com Valhalla: bloco contíguo de pares (x, y) — cache-friendly
Point[] pontos = new Point[1_000_000];
```

O ganho esperado: memória muito menor para coleções de objetos pequenos e acesso sequencial na velocidade de arrays de primitivos (melhor localidade de cache, menos pressão de GC). É a maior mudança de modelo de memória da história da plataforma — e por isso avança devagar.

### Project Leyden — startup e warmup

Ataca o custo de subida da JVM processando **antecipadamente** o que hoje acontece em runtime (carga de classes, linking, perfil de JIT). O primeiro fruto já é produto: o **cache AOT** (Java 24/25) — a aplicação roda uma vez em modo "treino", grava o cache, e as execuções seguintes pulam o trabalho repetido:

```bash
# executa uma vez gravando o cache de classes/perfis
java -XX:AOTMode=record -XX:AOTConfiguration=app.aotconf -jar app.jar
java -XX:AOTMode=create -XX:AOTConfiguration=app.aotconf -XX:AOTCache=app.aot

# execuções seguintes: startup significativamente menor
java -XX:AOTCache=app.aot -jar app.jar
```

Casos de uso: serverless (cold start), CLIs em Java e autoscaling agressivo.

### Project Lilliput — objetos menores

Reduz o **cabeçalho** que toda instância carrega: eram 12–16 bytes; os *compact object headers* (experimentais no 24, produto no 25 com `-XX:+UseCompactObjectHeaders`) reduzem para **8 bytes**, e a meta de longo prazo é 4. Em aplicações típicas — milhões de objetos pequenos — isso se traduz em heap menor e melhor uso de cache **sem mudar uma linha de código**.

### Project Loom — depois das virtual threads

As virtual threads (21) foram só a primeira entrega. Na sequência: **Scoped Values** (final no 25) — o substituto moderno do `ThreadLocal`, imutável e barato para milhões de threads — e **Structured Concurrency** (ainda em preview), que trata um grupo de tarefas concorrentes como uma unidade com escopo e cancelamento próprios.

### Project Panama — interop nativa

Duas frentes: a **FFM API** (final no 22) substitui o JNI para chamar código nativo — sem código-cola em C, com segurança de memória gerenciada — e a **Vector API** (ainda incubating) expõe instruções SIMD:

```java
// soma dois arrays usando instruções vetoriais da CPU
var species = FloatVector.SPECIES_PREFERRED;
var va = FloatVector.fromArray(species, a, 0);
var vb = FloatVector.fromArray(species, b, 0);
va.add(vb).intoArray(resultado, 0); // compila para SIMD nativo
```

Para o planejamento de migrações, a leitura conjunta é: **os saltos de LTS tendem a continuar ficando mais baratos** — as quebras estruturais (módulos, encapsulamento) ficaram no passado, e os projetos atuais entregam ganhos que não exigem mudança de código.

## Melhores práticas

### Estratégia de versionamento

**Para produção:**

1. **Use sempre LTS** — hoje, 25 (ou 21 enquanto o ecossistema que você usa não a suportar por completo).
2. **Espere o ecossistema** — 3 a 6 meses após o lançamento de uma LTS, frameworks e agentes já a suportam oficialmente; para sistemas críticos, espere mais.
3. **Teste em staging com carga real** antes de produção — a seção de [processo](#o-processo-de-migração-em-cinco-fases) detalha como.
4. **Monitore a frota** — o alerta de versão da seção de [observabilidade](#monitoramento-e-observabilidade) pega instâncias esquecidas.
5. **Tenha rollback ensaiado** — não "um plano no papel": a imagem anterior a um comando de distância.

**Para desenvolvimento:** experimente as feature releases (elas mostram o que vem na próxima LTS), use preview features apenas em código descartável — elas **mudam ou somem** entre versões — e rode os early-access builds no CI agendado para dar feedback cedo.

### Gestão de dependências

Use **BOMs** (Bill of Materials) para versionar famílias de bibliotecas em bloco — o BOM garante que todos os artefatos do Spring (ou Jackson, ou JUnit) venham de versões testadas juntas, o que elimina a classe de bug "versões incompatíveis entre si na mesma família":

```xml title="pom.xml"
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-framework-bom</artifactId>
            <version>6.2.0</version>
            <type>pom</type>
            <scope>import</scope>  <!-- importa as versões do BOM -->
        </dependency>
    </dependencies>
</dependencyManagement>
```

Complete com **Dependabot/Renovate** abrindo PRs de atualização continuamente — dependência atualizada aos poucos é exatamente o que torna a Fase 2 da próxima migração curta.

### Playbook de migração

Documente o processo num playbook vivo — o template abaixo cabe num README e transforma a migração de "projeto heroico" em rotina repetível:

```markdown title="MIGRATION-PLAYBOOK.md"
## Checklist pré-migração
- [ ] Análise de compatibilidade (jdeps/jdeprscan) executada e triada
- [ ] Dependências atualizadas para versões compatíveis
- [ ] Baseline de performance coletada (JFR + métricas)
- [ ] Plano de rollback documentado E testado
- [ ] Time ciente das mudanças da versão alvo

## Ordem dos ambientes
1. Desenvolvimento -> 2. CI/testes -> 3. Staging -> 4. Produção (canary)

## Critérios de aprovação
- [ ] Suíte completa verde nas duas versões
- [ ] Performance dentro de 5% da baseline
- [ ] Sem regressão de segurança (scan de dependências verde)
- [ ] 72h de produção canary sem alerta

## Gatilhos de rollback
- Degradação de latência p99 > 10% sustentada
- Qualquer erro novo recorrente atribuível à JVM
- Pausas de GC fora do padrão da baseline
```

### Melhoria contínua

A primeira migração é a mais cara; as seguintes só ficam baratas se o aprendizado for capturado: **colete métricas** durante e depois, **documente as lições** no playbook (qual biblioteca surpreendeu? qual flag mudou?), **compartilhe com os outros times** — numa empresa com vários serviços, o segundo time a migrar não deveria redescobrir nada — e **mantenha o radar ligado**: a assinatura do [Inside Java](https://inside.java/) e o CI agendado contra early-access fazem o trabalho de vigia.

## Perguntas frequentes

**Qual versão usar em produção hoje?**
Java 25 LTS para projetos novos e para quem já está no 21. Quem está no 17 ou anterior deve mirar direto na LTS mais recente que o seu framework suportar — não há motivo para migrar para uma LTS intermediária.

**Preciso pagar para usar Java?**
Não. Distribuições OpenJDK (Temurin, Corretto, Zulu…) são gratuitas inclusive para produção. Pagamento só entra se você quiser **suporte comercial** — ou se usar Oracle JDK 8/11 em produção, que exige licença ([detalhes acima](#custos-e-licenças)).

**Vale a pena sair do Java 8?**
Sim, e o argumento nem é só segurança: o ecossistema parou de olhar para trás (Spring Boot 3 exige 17+), e cada ano parado torna o salto inevitável mais caro. O caminho: Fase 1 do processo para dimensionar, e migração direto para a LTS mais recente viável.

**Como sei se minha aplicação funciona na versão nova?**
Não dá para saber sem testar — mas dá para **estimar barato**: `jdeps --jdk-internals` e `jdeprscan --for-removal` nos seus JARs e nos das dependências revelam os impedimentos estruturais em minutos.

**OpenJDK e Oracle JDK são diferentes?**
Funcionalmente, não — desde o Java 11 o Oracle JDK é construído do mesmo código OpenJDK. As diferenças são licença e suporte.

**Preciso modularizar minha aplicação (JPMS)?**
Não. O classpath tradicional continua plenamente suportado. Módulos são opcionais para aplicações; o impacto do JPMS na migração vem do *JDK* ter sido modularizado, não de uma obrigação para o seu código.

## Glossário

- **LTS** (Long-Term Support) — versão que recebe atualizações por anos; as demais só até a versão seguinte.
- **JEP** (JDK Enhancement Proposal) — documento que especifica cada mudança da plataforma; "JEP 444" é a referência canônica de virtual threads, por exemplo.
- **TCK** (Technology Compatibility Kit) — bateria oficial de testes que certifica que uma distribuição é Java de verdade.
- **OpenJDK** — o projeto open source que é a implementação de referência do Java; todas as distribuições modernas derivam dele.
- **Preview feature** — funcionalidade completa mas sujeita a mudança, ativada com `--enable-preview`; não use em produção.
- **Incubating** — API distribuída em módulo separado para colher feedback; ainda mais instável que preview.
- **Classpath / Module path** — os dois mecanismos de resolução de classes; o primeiro é o tradicional, o segundo veio com o JPMS no Java 9.
- **Early-access (EA)** — builds da versão ainda em desenvolvimento, publicados em [jdk.java.net](https://jdk.java.net/) para teste.
- **CPU** (Critical Patch Update) — o pacote trimestral de correções de segurança da plataforma.

## Referências

Curadoria com o motivo de cada link:

**Documentação e acompanhamento**

- [OpenJDK](https://openjdk.org/) — a fonte primária: JEPs, projetos e cronogramas de release.
- [Java Almanac](https://javaalmanac.io/) — compara qualquer par de versões (APIs, flags, datas); a melhor ferramenta para dimensionar um salto.
- [Inside Java](https://inside.java/) — blog, podcast e newscast do time de Java da Oracle; anúncios técnicos de primeira mão.
- [Foojay.io](https://foojay.io/) — hub da comunidade OpenJDK, com calendário de EOL por distribuição.

**Ferramentas**

- [jdeps](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jdeps.html) e [jdeprscan](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jdeprscan.html) — manuais oficiais das ferramentas de análise da Fase 1.
- [SDKMAN!](https://sdkman.io/) — instala e alterna múltiplos JDKs na máquina de desenvolvimento.
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) — scanner de CVEs nas dependências.

**Distribuições**

- [Eclipse Temurin](https://adoptium.net/) · [Amazon Corretto](https://aws.amazon.com/corretto/) · [Azul Zulu](https://www.azul.com/downloads/) — downloads e calendários de suporte das gratuitas.
- [jdk.java.net](https://jdk.java.net/) — builds oficiais de referência e early-access.

**Diagnóstico e performance**

- [Java Mission Control](https://openjdk.org/projects/jmc/) — abre e compara gravações JFR.
- [GCeasy](https://gceasy.io/) — análise e comparação de logs de GC.
- [async-profiler](https://github.com/async-profiler/async-profiler) — flame graphs de CPU/alocação com baixo overhead.
- [VisualVM](https://visualvm.github.io/) — inspeção rápida de heap e threads em desenvolvimento.
- [Eclipse MAT](https://eclipse.dev/mat/) — análise post-mortem de heap dumps.

---

*Guia revisado em setembro de 2026, com a plataforma no Java 25 LTS / Java 26.*
