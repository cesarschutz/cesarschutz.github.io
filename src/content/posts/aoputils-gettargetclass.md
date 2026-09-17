---
title: "AopUtils.getTargetClass() — desembrulhando os proxies do Spring"
published: 2026-05-19
updated: 2026-09-16
description: "Com o bean envolto em proxy, `bean.getClass()` devolve a classe do proxy e a leitura de anotações falha. Como `AopUtils.getTargetClass()` recupera a classe real e quando usar `ultimateTargetClass()`."
tags: [Spring, AOP]
category: Java
draft: false
---

No Spring, anotações como `@Transactional`, `@Async`, `@Cacheable` e `@PreAuthorize` só funcionam porque o container troca o bean original por um **proxy**: um objeto gerado em tempo de execução que intercepta as chamadas, executa a lógica extra e repassa a chamada ao objeto real (o modelo completo está no post [AOP no Spring — JDK Dynamic Proxy, CGLIB e aspects custom](/posts/aop-jdk-proxy-cglib/)). O efeito colateral é que `bean.getClass()` deixa de retornar a sua classe e passa a retornar a classe do proxy.

Neste post você vai ver por que isso quebra reflection, logs e mapas indexados por classe, como **`AopUtils.getTargetClass(bean)`** recupera a classe real e quando é preciso recorrer a `AopProxyUtils.ultimateTargetClass()`.

## O que o AOP faz pelo seu código, na prática

Sem AOP, as preocupações transversais (transação, segurança, métricas, que não fazem parte da regra de negócio) se espalham pelo método. Em um esboço simplificado:

```java title="Sem AOP"
public Pedido criar(Pedido p) {
    long inicio = System.currentTimeMillis();
    tx.begin();
    try {
        if (!user.hasRole("ADMIN")) throw new AccessDenied();
        log.info("criando pedido {}", p);
        var salvo = repo.save(p);
        tx.commit();
        return salvo;
    } catch (Exception e) {
        tx.rollback();
        throw e;
    } finally {
        metrics.record("criar", System.currentTimeMillis() - inicio);
    }
}
```

Com AOP, o método volta a falar só de negócio:

```java title="Com AOP"
@Transactional
@PreAuthorize("hasRole('ADMIN')")
@Timed("criar") // Micrometer; exige o TimedAspect registrado
public Pedido criar(Pedido p) {
    log.info("criando pedido {}", p);
    return repo.save(p);
}
```

Cada anotação é atendida por um interceptor (o *advice*) que o container aplica ao bean. É exatamente por isso que o objeto injetado **não é** uma instância da sua classe: é o proxy que executa esses interceptores antes de chamar o seu código.

## O problema: `bean.getClass()` devolve a classe do proxy

O Spring gera o proxy de duas formas:

- **JDK Dynamic Proxy**: uma classe criada pela JVM que implementa as interfaces do bean. É o padrão do Spring Framework quando o bean implementa ao menos uma interface.
- **CGLIB**: uma subclasse da sua classe gerada em tempo de execução. É usada quando o bean não implementa interfaces e é o padrão no Spring Boot (`spring.aop.proxy-target-class=true`).

Por isso `getClass()` devolve algo assim:

```txt
br.com.exemplo.MeuServico$$SpringCGLIB$$0   // CGLIB: subclasse de MeuServico
jdk.proxy2.$Proxy42                         // JDK: pacote e número variam
```

Desde o Spring Framework 6.0, o nome das classes CGLIB usa o marcador `$$SpringCGLIB$$` seguido de um contador (antes era um hash). No proxy JDK, a especificação só reserva o prefixo `$Proxy`; o nome do pacote não é especificado.

Isso quebra qualquer código que dependa da identidade da classe real:

- **Leitura de anotações via reflection.** A subclasse CGLIB só enxerga as anotações de classe marcadas com `@Inherited` (como `@Transactional`). Anotações sem `@Inherited`, como uma anotação sua, não aparecem, e as anotações de método também não, porque o proxy sobrescreve os métodos sem copiá-las. O proxy JDK não enxerga nenhuma anotação da classe alvo.
- **Logging** com `getClass().getSimpleName()`: o log mostra `MeuServico$$SpringCGLIB$$0` ou `$Proxy42` no lugar de `MeuServico`.
- **Mapas do tipo `Map<Class<?>, Handler>`**: `handlers.get(bean.getClass())` não encontra a entrada registrada com `MeuServico.class`.
- **Código de infraestrutura que descobre metadados pela classe**, como um `BeanPostProcessor` próprio ou um registro de listeners: sofre dos mesmos problemas.

![bean.getClass() devolve a classe do proxy MeuServico$$SpringCGLIB$$0; AopUtils.getTargetClass(bean) atravessa o proxy e devolve MeuServico](/posts/aoputils-gettargetclass/getclass-vs-gettargetclass.svg)

O diagrama resume a diferença: o proxy envolve o objeto real; `getClass()` para na camada de fora, e `getTargetClass()` atravessa essa camada e devolve a classe que você escreveu.

## O utilitário: `AopUtils.getTargetClass(Object)`

Fica no pacote `org.springframework.aop.support`:

```java
public static Class<?> getTargetClass(Object candidate)
```

Segundo o Javadoc, o método determina a classe alvo de um bean que pode ser um proxy AOP: devolve a classe alvo quando é proxy e a própria classe do objeto nos demais casos, **nunca `null`**.

Como ele chega lá (código do Spring Framework 7.0.9):

1. Se o objeto implementa `TargetClassAware`, pergunta a ele qual é a classe alvo. Todo proxy Spring AOP implementa essa interface por meio de `Advised`, a menos que tenha sido criado com a opção `opaque`.
2. Se não obteve resposta, usa a superclasse quando o objeto é um proxy CGLIB e `getClass()` nos demais casos.

Na prática:

- Se o bean **não** é proxy, retorna `bean.getClass()`.
- Se é proxy **CGLIB** ou **JDK**, retorna a classe do objeto real que o proxy envolve.
- Se é um **proxy de proxy**, desce **apenas um nível** e retorna a classe do proxy interno (por exemplo, `MeuServico$$SpringCGLIB$$0`). Para chegar ao fundo, use `AopProxyUtils.ultimateTargetClass()`, descrito mais abaixo.
- **Nunca retorna `null`**, garantia da API.

## Exemplo prático

Como `MeuServico` não implementa interface, o Spring cria um proxy CGLIB por causa do `@Transactional`. A anotação `@Auditavel` foi criada sem `@Inherited` para mostrar a diferença:

```java title="Auditavel, MeuServico e Inspetor (um arquivo por tipo)"
import org.springframework.aop.support.AopUtils;
import org.springframework.transaction.annotation.Transactional;
// demais imports omitidos

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface Auditavel {} // sem @Inherited

@Service
@Auditavel
public class MeuServico {
    @Transactional
    public void processar() { /* ... */ }
}

@Component
public class Inspetor {
    public void inspecionar(Object bean) throws NoSuchMethodException {
        System.out.println(bean.getClass().getName());
        // br.com.exemplo.MeuServico$$SpringCGLIB$$0

        Class<?> alvo = AopUtils.getTargetClass(bean);
        System.out.println(alvo.getName());
        // br.com.exemplo.MeuServico

        // Anotação de classe sem @Inherited
        bean.getClass().isAnnotationPresent(Auditavel.class); // false
        alvo.isAnnotationPresent(Auditavel.class);            // true

        // Anotação de método
        bean.getClass().getMethod("processar")
                .isAnnotationPresent(Transactional.class);    // false
        alvo.getMethod("processar")
                .isAnnotationPresent(Transactional.class);    // true
    }
}
```

Use a classe alvo só para ler metadados. Para **chamar** métodos, continue usando o próprio bean: é o proxy que aplica a transação, o cache e a segurança.

## Métodos relacionados

O próprio `AopUtils` tem três métodos para descobrir que tipo de objeto você recebeu. Todos verificam também se o objeto implementa `SpringProxy`, ou seja, respondem `true` só para proxies criados pelo Spring AOP:

- `isAopProxy(Object)`: `true` se o objeto é um proxy Spring AOP, JDK ou CGLIB.
- `isCglibProxy(Object)`: `true` se é um proxy CGLIB.
- `isJdkDynamicProxy(Object)`: `true` se é um JDK Dynamic Proxy.

Em outras classes utilitárias:

- **`AopProxyUtils.ultimateTargetClass(Object)`** (pacote `org.springframework.aop.framework`): desce por **qualquer número de proxies aninhados** até a classe final. Só atravessa um nível quando consegue fazer isso sem efeitos colaterais, isto é, quando o alvo é um singleton guardado em um `SingletonTargetSource` (o `TargetSource` é o componente que entrega ao proxy o objeto real). Com outros `TargetSource`s (lazy, pool, protótipo, hot swap), para naquele nível e devolve a classe informada por ele. Também nunca retorna `null`.
- **`ClassUtils.getUserClass(Object)`** (pacote `org.springframework.util`): devolve a classe original quando a classe do objeto é uma subclasse gerada pelo CGLIB (nome com `$$`). Não reconhece proxy JDK, que continua como `$Proxy42`. Tem também a versão `getUserClass(Class<?>)`, útil quando você só tem a classe em mãos.

O diagrama abaixo mostra a diferença em um proxy JDK que envolve um proxy CGLIB:

![getTargetClass desce um nível e para no proxy interno MeuServico$$SpringCGLIB$$0; ultimateTargetClass desce até MeuServico](/posts/aoputils-gettargetclass/proxy-aninhado.svg)

Resumo do comportamento, conferido no Spring Framework 7.0.9:

| Método | Proxy CGLIB | Proxy JDK | Proxy de proxy |
| --- | --- | --- | --- |
| `AopUtils.getTargetClass` | classe real | classe real | classe do proxy interno |
| `AopProxyUtils.ultimateTargetClass` | classe real | classe real | classe real (alvos singleton) |
| `ClassUtils.getUserClass` | classe real | classe do proxy (`$Proxy…`) | depende do tipo de cada proxy (não use) |

## Regra prática

Sempre que for inspecionar um bean Spring por reflection (ler anotações, comparar tipos, registrar em mapa por classe, logar um nome legível), use `AopUtils.getTargetClass(bean)` em vez de `bean.getClass()`. Se o bean puder estar envolvido por mais de um proxy, prefira `AopProxyUtils.ultimateTargetClass(bean)`. Não custa nada e evita bugs que só aparecem meses depois, quando alguém adiciona um `@Transactional` ao serviço e o proxy passa a existir.

## Fontes

- Spring Framework Reference — [Proxying Mechanisms](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)
- Spring Framework Reference — [AOP Proxies](https://docs.spring.io/spring-framework/reference/core/aop/introduction-proxies.html)
- Javadoc — [AopUtils](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/aop/support/AopUtils.html)
- Javadoc — [AopProxyUtils](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/aop/framework/AopProxyUtils.html)
- Javadoc — [ClassUtils](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/util/ClassUtils.html)
- Javadoc — [TargetClassAware](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/aop/TargetClassAware.html)
- Javadoc — [Transactional](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/annotation/Transactional.html) (declarada com `@Inherited`)
- Código-fonte do Spring Framework 7.0.9 — [AopUtils.java](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-aop/src/main/java/org/springframework/aop/support/AopUtils.java), [AopProxyUtils.java](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-aop/src/main/java/org/springframework/aop/framework/AopProxyUtils.java) e [SpringNamingPolicy.java](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-core/src/main/java/org/springframework/cglib/core/SpringNamingPolicy.java)
- Spring Boot — [Common Application Properties](https://docs.spring.io/spring-boot/appendix/application-properties/index.html) (`spring.aop.proxy-target-class`)
- Java SE 21 API — [java.lang.reflect.Proxy](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/Proxy.html) e [java.lang.annotation.Inherited](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/annotation/Inherited.html)
- Micrometer — [Timers](https://docs.micrometer.io/micrometer/reference/concepts/timers.html) (`@Timed` e `TimedAspect`)
