---
title: "AOP no Spring — JDK Dynamic Proxy, CGLIB e aspects customizados"
published: 2026-05-19
updated: 2026-09-16
description: "Como o Spring aplica log, transação e métricas fora da regra de negócio: conceitos de AOP, JDK Dynamic Proxy ou CGLIB (e por que o Boot prefere CGLIB), a self-invocation e aspects próprios."
tags: [Spring, AOP]
category: Java
draft: false
---

Log, transação, cache, segurança e métricas aparecem em quase todo serviço, mas não fazem parte da regra de negócio de nenhum deles. **AOP (Aspect-Oriented Programming, ou programação orientada a aspectos)** é o paradigma que tira esse código repetido das classes de negócio: você descreve **onde** aplicar (o *pointcut*) e **o que** executar (o *advice*) numa classe separada, chamada **aspect**.

No Spring, é AOP que faz `@Transactional`, `@Async` e `@Cacheable` funcionarem. O container troca o bean original por um **proxy**, um objeto intermediário que intercepta as chamadas e roda o código extra antes e depois de delegar ao objeto real. Esse proxy é gerado de um de dois jeitos: **JDK Dynamic Proxy** (implementa as interfaces do bean) ou **CGLIB** (cria uma subclasse do bean).

Neste post: o vocabulário básico, como cada tipo de proxy funciona e quando o Spring usa cada um, por que chamar um método da própria classe ignora o `@Transactional` (a *self-invocation*) e como escrever um **aspect custom**, isto é, um aspect seu, para uma necessidade do seu sistema.

## 1. O problema que AOP resolve

Preocupações que se repetem em muitas classes sem pertencer ao domínio delas se chamam *cross-cutting concerns* (preocupações transversais): log, transação, cache, segurança, métricas, retry, auditoria. Sem AOP, cada método de serviço ganha seu próprio `try/finally`, sua checagem de permissão e seu cronômetro, e a regra de negócio fica escondida no meio desse ruído.

A ideia central do AOP é *modularizar* essas preocupações em unidades separadas (os aspects) e *aplicá-las de forma declarativa* em pontos escolhidos da execução. As classes de negócio ficam limpas, e mudar a política de log ou de métricas passa a exigir alteração em um lugar só.

## 2. Vocabulário fundamental

Os termos não foram inventados pelo Spring: são o vocabulário geral de AOP, o mesmo usado pelo AspectJ, e o Spring os adota como são.

- **Aspect**: módulo que encapsula uma preocupação transversal. No Spring, normalmente uma classe anotada com `@Aspect`. Ex.: `LoggingAspect`, `MetricsAspect`, `RetryAspect`.
- **Join point**: um ponto da execução do programa onde um aspect pode atuar. **No Spring AOP, join point é sempre a execução de um método.** O AspectJ vai além e cobre também acesso a campo, construção de objeto etc.
- **Pointcut**: o predicado que seleciona quais join points interessam, ou seja, a expressão que diz "onde" aplicar. Ex.: `execution(* com.exemplo.servico..*(..))` casa com todos os métodos das classes do pacote `com.exemplo.servico` e subpacotes. O Spring usa a linguagem de pointcut do AspectJ.
- **Advice**: a ação que o aspect executa num join point, o "o que" rodar (antes, depois ou em volta do método).
- **Target (objeto alvo)**: o objeto que recebe os advices. Como o Spring AOP é baseado em proxy, esse objeto fica **sempre atrás de um proxy** em tempo de execução.
- **AOP proxy**: o objeto criado pelo framework para aplicar os advices ao target. No Spring, é um JDK Dynamic Proxy ou um proxy CGLIB.
- **Weaving**: o processo de "costurar" os aspects no código da aplicação. Pode acontecer na compilação (compilador do AspectJ), no carregamento das classes (*load-time weaving*) ou em tempo de execução, que é o caso do Spring AOP.
- **Introduction**: declarar métodos ou campos adicionais num tipo. Com ela, um bean passa a implementar uma interface nova, com a implementação fornecida pelo aspect.

## 3. Tipos de advice

Cada tipo corresponde a uma anotação usada dentro de uma classe `@Aspect`:

- **`@Before`**: roda **antes** do método alvo. Não consegue impedir a execução, a não ser lançando uma exceção.
- **`@AfterReturning`**: roda **depois**, se o método terminou normalmente. Tem acesso ao valor de retorno.
- **`@AfterThrowing`**: roda quando o método lança exceção. Tem acesso à exceção.
- **`@After`**: roda **sempre** depois, com sucesso ou erro (análogo ao `finally`).
- **`@Around`**: o mais poderoso, envolve a chamada inteira. Recebe um `ProceedingJoinPoint` e decide se chama `proceed()`, que executa o método real. Pode trocar os argumentos, transformar o retorno ou nem chamar o método.

A documentação do Spring recomenda **usar o tipo de advice menos poderoso que resolve o caso**. Se basta agir depois que o método retorna, `@AfterReturning` é mais simples que `@Around`, e não há `proceed()` para esquecer de chamar (esquecer significa que o método real nunca roda).

## 4. Como o Spring implementa: proxy em tempo de execução

O AspectJ completo altera o bytecode das classes (*bytecode weaving*). O **Spring AOP**, ao contrário, **trabalha com proxies criados em tempo de execução**: quando um bean tem advices aplicáveis, o container entrega um proxy no lugar da instância original. O proxy tem o mesmo tipo do bean (implementa as interfaces dele ou estende a classe), intercepta cada chamada, executa os advices e delega para o objeto real.

![Uma chamada externa entra pelo proxy e os advices rodam; dentro do objeto real, this.metodoB() chama o método direto e o advice não roda](/posts/aop-jdk-proxy-cglib/proxy-e-self-invocation.svg)

Consequências desse modelo:

- **Só chamadas que passam pelo proxy são interceptadas.** Acesso a campo e construtor ficam de fora, e método `private` também (não dá para interceptar o que não pode ser sobrescrito nem chamado de fora).
- **O que o proxy intercepta depende do tipo dele.** Com JDK Dynamic Proxy, só métodos públicos declarados em interface. Com CGLIB, métodos `public` e `protected` (e até os de visibilidade de pacote, se necessário). A recomendação oficial, mesmo assim, é que as interações via proxy usem métodos públicos.
- **Self-invocation não passa pelo proxy** (detalhes a seguir).
- O Spring AOP é mais simples e mais limitado que o AspectJ completo; em troca, não exige compilador especial nem agente no carregamento das classes.

### A pegadinha da self-invocation

*Self-invocation* é quando um método de um bean chama outro método do **mesmo** objeto. A chamada externa entrou pelo proxy e chegou ao objeto real. Dali em diante, `this` é o objeto real, não o proxy, e qualquer chamada `this.outroMetodo()` (ou só `outroMetodo()`, que é a mesma coisa) vai direto, sem advice nenhum.

```java title="PedidoService.java"
@Service
public class PedidoService {

    public void importar(List<Pedido> pedidos) {
        for (Pedido p : pedidos) {
            salvar(p);   // o mesmo que this.salvar(p): não passa pelo proxy
        }
    }

    @Transactional
    public void salvar(Pedido p) {
        // chamado por importar(), o @Transactional é ignorado
    }
}
```

É a pegadinha clássica: o `@Transactional` está lá, o código compila, não há erro nem aviso, e a transação simplesmente não é aberta. A documentação do Spring lista três saídas, nesta ordem de preferência:

1. **Evitar a self-invocation**, refatorando. Por exemplo, mover `salvar()` para outro bean, que é chamado por `PedidoService`. É a opção menos invasiva.
2. **Injetar uma referência ao próprio bean** (*self injection*) e chamar o método por ela. A referência injetada é o proxy, então o advice roda. No Spring Boot, referências circulares são proibidas por padrão desde a versão 2.6, e uma autoinjeção comum faz a aplicação falhar na subida com erro de ciclo entre beans. Marcar a dependência com `@Lazy` resolve:

   ```java title="PedidoService.java"
   @Service
   public class PedidoService {

       private final PedidoService self;

       public PedidoService(@Lazy PedidoService self) {
           this.self = self;   // referência ao proxy, não ao objeto real
       }

       public void importar(List<Pedido> pedidos) {
           for (Pedido p : pedidos) {
               self.salvar(p);   // passa pelo proxy: a transação é aberta
           }
       }

       @Transactional
       public void salvar(Pedido p) { /* ... */ }
   }
   ```

3. **`AopContext.currentProxy()`**, que devolve o proxy atual. A documentação desaconselha fortemente: acopla a classe ao Spring AOP e exige configurar o proxy para ser exposto (`@EnableAspectJAutoProxy(exposeProxy = true)`).

Com weaving do AspectJ (em compilação ou no carregamento das classes) o problema não existe, porque o advice fica dentro do próprio bytecode da classe, e não num proxy.

## 5. JDK Dynamic Proxy: proxy baseado em interface

Faz parte do Java desde a versão 1.3 (`java.lang.reflect.Proxy` + `InvocationHandler`). Gera, em tempo de execução, uma classe que **implementa as interfaces** informadas. Toda chamada a um método do proxy é redirecionada para o método `invoke(Object proxy, Method method, Object[] args)` do handler, que decide o que fazer.

Exemplo em Java puro (sem Spring) de um proxy que loga antes e depois de cada chamada:

```java title="ProxyPuro.java"
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

public class ProxyPuro {
    public static void main(String[] args) {
        Servico alvo = new ServicoImpl();
        Servico proxy = (Servico) Proxy.newProxyInstance(
                Servico.class.getClassLoader(),
                new Class<?>[] { Servico.class },
                new LogHandler(alvo));

        proxy.executar("x");
        // ANTES de executar
        // executando: x
        // DEPOIS de executar
    }
}

interface Servico {
    void executar(String dado);
}

class ServicoImpl implements Servico {
    public void executar(String dado) {
        System.out.println("executando: " + dado);
    }
}

class LogHandler implements InvocationHandler {
    private final Object alvo;

    LogHandler(Object alvo) { this.alvo = alvo; }

    @Override
    public Object invoke(Object proxy, Method metodo, Object[] args) throws Throwable {
        System.out.println("ANTES de " + metodo.getName());
        try {
            return metodo.invoke(alvo, args);   // delega para o objeto real
        } catch (InvocationTargetException e) {
            throw e.getCause();                 // repassa a exceção original do alvo
        } finally {
            System.out.println("DEPOIS de " + metodo.getName());
        }
    }
}
```

O arquivo roda direto com `java ProxyPuro.java`. O `catch` de `InvocationTargetException` importa: a reflection embrulha qualquer exceção lançada pelo alvo, e sem desembrulhar quem chama o proxy receberia uma exceção diferente da original.

Características práticas:

- **Exige que o alvo implemente pelo menos uma interface**, e só os métodos declarados nas interfaces passam pelo proxy.
- O proxy **é do tipo da interface, nunca da classe concreta**. No Spring, isso significa que injetar o bean pela classe concreta falha na subida da aplicação: se `PedidoServiceImpl` implementa `PedidoService`, o proxy é um `PedidoService`, mas não um `PedidoServiceImpl`.
- Não precisa de biblioteca externa: é parte do JDK.
- **No Spring Framework, continua sendo o padrão** quando o bean implementa alguma interface.

## 6. CGLIB: proxy via subclasse

CGLIB (*Code Generation Library*) gera bytecode: cria em tempo de execução uma **subclasse** da classe alvo e sobrescreve os métodos para inserir os advices. O Spring traz o CGLIB reempacotado dentro do `spring-core`, sem dependência separada.

- **Não precisa de interface**: funciona com qualquer classe concreta.
- **Não intercepta métodos `final`** (não dá para sobrescrever) e **não gera proxy de classes `final`** (não dá para estender). Métodos `private` também ficam de fora.
- O construtor do alvo **não é chamado duas vezes**: o Spring cria a instância do proxy via Objenesis, uma biblioteca que instancia objetos sem executar construtor.
- Pode esbarrar no sistema de módulos do Java: com a aplicação no *module path*, por exemplo, não dá para gerar proxy CGLIB de uma classe do pacote `java.lang`.

### Quando o Spring usa cada um

- **Spring Framework puro:** se o bean implementa pelo menos uma interface, usa JDK Dynamic Proxy; se não implementa nenhuma, usa CGLIB. Para forçar CGLIB, use `proxyTargetClass = true` em `@EnableAspectJAutoProxy`, `@EnableTransactionManagement` e anotações parecidas. Essas configurações são unificadas: se uma delas força CGLIB, vale para todas.
- **Spring Boot:** desde a **versão 2.0**, usa **CGLIB por padrão**, mesmo quando o bean implementa interface, e isso vale também para `@Transactional` e os demais recursos baseados em proxy. A propriedade é `spring.aop.proxy-target-class`, com padrão `true`. Com o AspectJ no classpath, o Spring Boot também já habilita os aspects sozinho, sem precisar de `@EnableAspectJAutoProxy`.
- **Por bean (Spring Framework 7.0+):** a anotação `@Proxyable` num `@Bean` ou `@Component` escolhe o tipo de proxy daquele bean (`@Proxyable(INTERFACES)` ou `@Proxyable(TARGET_CLASS)`), sobrepondo o padrão global.

Na prática, a diferença aparece em dois casos, os mesmos que a documentação do Spring cita como motivo para forçar CGLIB: quando é preciso aplicar advice num método que não está declarado em interface nenhuma e quando o bean precisa ser usado pelo tipo da classe concreta. Com proxy de subclasse, os dois funcionam; com JDK Dynamic Proxy, o advice fica de fora no primeiro e a injeção falha no segundo.

## 7. Comparativo rápido

| | JDK Dynamic Proxy | CGLIB |
| --- | --- | --- |
| **Como funciona** | Classe gerada que implementa as interfaces | Subclasse gerada da classe alvo |
| **Exige interface?** | Sim | Não |
| **Métodos interceptados** | Públicos declarados em interface | `public` e `protected` (e de pacote, se necessário); nunca `final` ou `private` |
| **Classe `final`** | Funciona (o proxy não estende a classe) | Não funciona (não dá para estender) |
| **Injetar/converter para** | Só a interface | Classe concreta ou interface |
| **Origem** | JDK (`java.lang.reflect.Proxy`) | Biblioteca reempacotada no `spring-core` |
| **Padrão no Spring Framework** | Quando o bean implementa interface | Quando o bean não implementa interface |
| **Padrão no Spring Boot 2.0+** | Só com `spring.aop.proxy-target-class=false` | Sim, com ou sem interface |

## 8. Escrevendo um aspect custom

Quando você usa `@Transactional`, `@Async` ou `@Cacheable`, está usando recursos **prontos** do Spring, construídos sobre essa mesma infraestrutura de proxy. Um **aspect custom** é um aspect que você mesmo escreve para uma preocupação transversal do seu sistema.

Exemplo: medir o tempo de execução de todo método público dos serviços.

```java title="TimingAspect.java"
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class TimingAspect {

    // Pointcut: todos os métodos públicos das classes anotadas
    // com @Service no pacote com.exemplo e subpacotes
    @Pointcut("execution(public * com.exemplo..*(..)) " +
              "&& within(@org.springframework.stereotype.Service *)")
    public void servicos() {}

    @Around("servicos()")
    public Object medir(ProceedingJoinPoint pjp) throws Throwable {
        long inicio = System.nanoTime();
        try {
            return pjp.proceed();  // chama o método real
        } finally {
            long ms = (System.nanoTime() - inicio) / 1_000_000;
            String nome = pjp.getSignature().toShortString();
            System.out.println(nome + " levou " + ms + "ms");
        }
    }
}
```

Pontos a notar:

- `@Aspect` sozinho não registra o bean; o `@Component` é o que faz o component scan encontrar a classe.
- `execution(public * com.exemplo..*(..))` casa com qualquer método público, de qualquer retorno e com quaisquer argumentos, em `com.exemplo` e subpacotes. `within(@...Service *)` restringe às classes anotadas com `@Service`.
- Aqui `@Around` é justificado: é preciso marcar o tempo antes e calcular depois, na mesma execução. Por isso o método retorna `Object` e devolve o resultado de `proceed()`.

Com isso, todo `@Service` do pacote passa a ter medição de tempo sem alterar uma linha das classes de negócio. É esse o ganho concreto do AOP. E vale a pegadinha da seção 4: um serviço que chama o próprio método via `this` não terá essa chamada interna medida.

Dependência necessária no Spring Boot 4:

```xml title="pom.xml"
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aspectj</artifactId>
</dependency>
```

Até o Spring Boot 3.x, o nome do starter era `spring-boot-starter-aop`; no 4.0 ele foi renomeado para `spring-boot-starter-aspectj`. O starter traz o `aspectjweaver`, a biblioteca do AspectJ que fornece as anotações (`@Aspect`, `@Around`…) e interpreta as expressões de pointcut. O weaving continua sendo do Spring AOP, em tempo de execução via proxy: nem o compilador nem o weaver do AspectJ entram em ação. O guia de migração sugere revisar se o starter é mesmo necessário: ele só faz falta se a aplicação (ou alguma biblioteca, como o `@Timed` do Micrometer) usa as anotações do pacote `org.aspectj.lang.annotation`.

## 9. Cuidados práticos

- **Self-invocation não passa pelo proxy.** Se `metodoA()` chama `this.metodoB()` na mesma classe, o advice de `metodoB()` não roda. Prefira separar em outro bean; como alternativa, injete o próprio bean com `@Lazy` e chame por ele (seção 4).
- **Métodos `private` e `final` nunca recebem advice**, e com JDK Dynamic Proxy só os métodos de interface. Deixe as chamadas que precisam de advice em métodos públicos.
- **`bean.getClass()` retorna a classe do proxy**, não a real (ex.: `PedidoService$$SpringCGLIB$$0`). Para reflection e leitura de anotações, use `AopUtils.getTargetClass(bean)`, assunto do post [AopUtils.getTargetClass(): desembrulhando os proxies do Spring](/posts/aoputils-gettargetclass/).
- **Forçar JDK Dynamic Proxy no Spring Boot:** `spring.aop.proxy-target-class=false`. Em geral não compensa: qualquer injeção pela classe concreta passa a falhar na subida.
- **Desempenho:** cada chamada interceptada percorre a cadeia de advices antes de chegar ao método real. Em caminhos muito quentes, meça antes de concluir se o custo importa.

## Fontes

- Spring Framework Reference — [AOP Concepts](https://docs.spring.io/spring-framework/reference/core/aop/introduction-defn.html)
- Spring Framework Reference — [AOP Proxies](https://docs.spring.io/spring-framework/reference/core/aop/introduction-proxies.html)
- Spring Framework Reference — [Proxying Mechanisms](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html) (JDK x CGLIB, `proxyTargetClass`, `@Proxyable`, self-invocation)
- Spring Framework Reference — [@AspectJ support](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj.html)
- Spring Framework Reference — [Declaring a Pointcut](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/pointcuts.html) (métodos interceptados por tipo de proxy)
- Spring Framework Reference — [Declaring Advice](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html)
- Spring Framework Reference — [Using @Autowired: Self Injection](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html)
- Spring Boot Reference — [Aspect-Oriented Programming](https://docs.spring.io/spring-boot/reference/features/aop.html)
- Spring Boot Reference — [Common Application Properties](https://docs.spring.io/spring-boot/appendix/application-properties/index.html) (`spring.aop.proxy-target-class`)
- Spring Boot Wiki — [Spring Boot 2.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.0-Migration-Guide) (CGLIB como padrão)
- Spring Boot Wiki — [Spring Boot 2.6 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.6-Release-Notes) (referências circulares proibidas por padrão)
- Spring Boot Wiki — [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide) (renomeação para `spring-boot-starter-aspectj`)
- Java SE 25 API — [java.lang.reflect.Proxy](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/reflect/Proxy.html)
- Baeldung — [Dynamic Proxies in Java](https://www.baeldung.com/java-dynamic-proxies)
- Baeldung — [Introduction to Pointcut Expressions in Spring](https://www.baeldung.com/spring-aop-pointcut-tutorial)
