---
title: "JWT — a estrutura e o significado de cada campo"
published: 2026-04-12
updated: 2026-09-16
description: "As três partes de um JWT, campo a campo: headers JOSE (`alg`, `kid`…), claims registradas (`iss`, `sub`, `exp`…), algoritmos de assinatura e cuidados de validação. O payload não é criptografado."
tags: [JWT, Criptografia]
category: Segurança
draft: false
---

Todo mundo já colou um JWT no [jwt.io](https://jwt.io/) para ver o que tem dentro, mas nem sempre fica claro o que cada campo significa, quais são obrigatórios e quais precisam ser validados. Este post percorre o token parte a parte, com base nas especificações, e termina com os cuidados de segurança que mais causam problema na prática.

Um **JWT (JSON Web Token)** é definido pela **RFC 7519**: um conjunto de afirmações (as *claims*) em JSON, protegido por assinatura ou por criptografia. As peças vêm de uma família de especificações chamada **JOSE** (*JSON Object Signing and Encryption*):

- **RFC 7515 (JWS)**: a assinatura;
- **RFC 7516 (JWE)**: a criptografia;
- **RFC 7517 (JWK)**: o formato das chaves;
- **RFC 7518 (JWA)**: os algoritmos.

A forma mais comum, e a que este post detalha, é o JWT **assinado** (um JWS) na serialização compacta: três partes separadas por ponto, `header.payload.signature`. O header e o payload são JSON; a assinatura é uma sequência de bytes. As três partes são codificadas em **Base64URL**, a variante do Base64 que troca `+` e `/` por `-` e `_` e dispensa o `=` final, para o token poder trafegar em URLs e headers HTTP sem escape. Um JWT criptografado (JWE) tem outro formato, com cinco partes.

![As três partes do JWT: header, payload e signature, separadas por ponto e codificadas em Base64URL](/posts/jwt-estrutura-e-campos/tres-partes-do-jwt.svg)

## Um token de exemplo

Este token foi assinado com ES256 (quebras de linha só para caber na tela; o token real é uma linha só):

```text
eyJhbGciOiJFUzI1NiIsImtpZCI6ImNoYXZlLTIwMjYtMDkiLCJ0eXAiOiJKV1QifQ
.eyJpc3MiOiJodHRwczovL2F1dGgubWluaGFlbXByZXNhLmNvbSIsInN1YiI6InVzdWFyaW8tNDgyMSIsImF1ZCI6ImFwaS1wZWRpZG9zIiwiaWF0IjoxNzg5NTYzNjAwLCJleHAiOjE3ODk1NjQ1MDAsImp0aSI6IjlmMWMyZTdhLTViM2QtNGM4ZS1hMWYwLTZkMmI3ZTRjOWExMyJ9
.w0ZR2vAkxfA7kkGqkBIIlstjqVUvbxQhm-Ahkr9AZAQ-IKnEO9do35PFNcsbOaFQyRDdC9rqqQptWgPM25Ga0Q
```

Decodificando as duas primeiras partes (basta Base64URL, sem chave nenhuma; o JSON abaixo foi formatado para leitura):

```json title="header"
{ "alg": "ES256", "kid": "chave-2026-09", "typ": "JWT" }
```

```json title="payload"
{
  "iss": "https://auth.minhaempresa.com",
  "sub": "usuario-4821",
  "aud": "api-pedidos",
  "iat": 1789563600,
  "exp": 1789564500,
  "jti": "9f1c2e7a-5b3d-4c8e-a1f0-6d2b7e4c9a13"
}
```

A terceira parte são os 64 bytes da assinatura ECDSA, também em Base64URL. Lendo o exemplo: o servidor de autenticação `auth.minhaempresa.com` emitiu, em 16/09/2026 às 13:00 UTC, um token sobre o usuário `usuario-4821`, destinado à `api-pedidos` e válido por 15 minutos. As próximas seções explicam cada um desses campos.

## Header (JOSE Header)

O header descreve o token e diz como ele foi protegido. Os parâmetros abaixo são definidos na RFC 7515, §4.1:

- **`alg`** (*Algorithm*): algoritmo usado na assinatura (ex.: `RS256`, `HS256`, `ES256`). É o único **obrigatório**.
- **`typ`** (*Type*): tipo do objeto. Opcional; quando presente, a RFC 7519 recomenda o valor `JWT`. Para tipos novos de JWT, a RFC 8725 recomenda tipagem explícita, como `at+jwt` para access tokens OAuth (RFC 9068), o que evita que um tipo de token seja aceito no lugar de outro.
- **`cty`** (*Content Type*): tipo do conteúdo. No JWT só é usado quando o payload é outro JWT (*nested JWT*, por exemplo um token assinado e depois criptografado); nesse caso o valor deve ser `JWT`. Fora disso, a RFC 7519 não recomenda usá-lo.
- **`kid`** (*Key ID*): identificador da chave que assinou o token. Quem valida usa o `kid` para escolher a chave certa dentro de um **JWKS** (*JWK Set*, o documento JSON em que o emissor publica suas chaves públicas), o que permite trocar de chave sem quebrar os tokens em circulação.
- **`jku`** (*JWK Set URL*): URL do JWKS que contém a chave de assinatura. Deve ser buscada via TLS.
- **`jwk`** (*JSON Web Key*): a própria chave pública, embutida no header. Uso raro; nunca aceite uma chave só porque veio dentro do token (ver [cuidados de segurança](#cuidados-de-segurança)).
- **`x5u`**, **`x5c`**, **`x5t`** e **`x5t#S256`**: o equivalente para certificados X.509. São, respectivamente, a URL do certificado, a cadeia de certificados embutida e os *thumbprints* (hash SHA-1 e SHA-256) do certificado.
- **`crit`** (*Critical*): lista de parâmetros de **extensão** presentes no header que o validador é obrigado a entender. Se não entender algum deles, deve rejeitar o token. A lista não pode ficar vazia nem repetir os parâmetros padrão acima.

## Payload (Claims)

O payload é o conteúdo do token: um objeto JSON cujos campos se chamam **claims**, ou seja, afirmações sobre alguém ou alguma coisa (em geral, o usuário). A RFC 7519 divide os nomes de claims em três categorias.

**Registered claims (RFC 7519, §4.1).** Nomes padronizados e registrados na IANA. Nenhum é obrigatório pela RFC; cada aplicação define quais exige.

- **`iss`** (*Issuer*): quem emitiu o token (ex.: `https://auth.minhaempresa.com`).
- **`sub`** (*Subject*): de quem o token fala, normalmente o ID do usuário. Precisa ser único no contexto do emissor ou globalmente.
- **`aud`** (*Audience*): para quem o token se destina. Pode ser uma string ou uma lista. Se a claim estiver presente e quem processa o token não se identificar com nenhum dos valores, o token **deve** ser rejeitado.
- **`exp`** (*Expiration Time*): instante de expiração. **A partir** desse instante o token não pode mais ser aceito.
- **`nbf`** (*Not Before*): instante antes do qual o token não pode ser aceito.
- **`iat`** (*Issued At*): instante de emissão; serve para calcular a idade do token.
- **`jti`** (*JWT ID*): identificador único do token. A RFC cita o uso contra *replay* (reaproveitamento do mesmo token); na prática também serve de chave para uma lista de tokens revogados.

As datas (`exp`, `nbf`, `iat`) são do tipo *NumericDate*: segundos desde 1970-01-01T00:00:00Z, o mesmo que um timestamp Unix. Na validação de `exp` e `nbf`, a RFC permite uma pequena tolerância, "normalmente não mais que alguns minutos", para compensar diferença de relógio entre máquinas.

**Public claims (RFC 7519, §4.2).** Nomes criados fora da RFC, mas sem risco de colisão: ou registrados no [registro de claims JWT da IANA](https://www.iana.org/assignments/jwt/jwt.xhtml), ou formados a partir de um espaço de nomes que você controla, como uma URL do seu domínio (`https://minhaempresa.com/roles`). O registro da IANA inclui, por exemplo, as claims de usuário do **OpenID Connect** (`name`, `email`, `email_verified`, `preferred_username`, `picture`…) e `scope` e `client_id`, registradas pela RFC 8693 (OAuth 2.0 Token Exchange).

**Private claims (RFC 7519, §4.3).** Nomes combinados livremente entre quem emite e quem consome o token, como `tenant_id` ou `plano`. Não estão registrados e por isso podem colidir com nomes de outros sistemas; a RFC pede cautela no uso. Se o token circula entre várias organizações, prefira nomes com namespace (que passam a ser public claims). Cuidado também com nomes que parecem livres mas já estão registrados: `roles` e `groups`, por exemplo, constam no registro da IANA.

Nem todo nome frequente em tokens é padrão. O `token_use`, por exemplo, é uma claim do Amazon Cognito (valor `id` no ID token e `access` no access token), não da especificação nem do registro da IANA.

## Signature

A assinatura é calculada sobre o texto `base64url(header) + "." + base64url(payload)`, com o algoritmo declarado em `alg`. Ela garante que header e payload **não foram alterados** e que o token foi produzido por quem tem a chave de assinatura. Os algoritmos definidos pela RFC 7518 (JWA) são:

| `alg` | Algoritmo | Tipo de chave |
|---|---|---|
| `HS256` / `HS384` / `HS512` | HMAC com SHA-2 | Segredo compartilhado (simétrica) |
| `RS256` / `RS384` / `RS512` | RSA com RSASSA-PKCS1-v1_5 e SHA-2 | Par de chaves RSA (assimétrica) |
| `PS256` / `PS384` / `PS512` | RSA com RSASSA-PSS e SHA-2 (esquema de padding mais novo que o PKCS1-v1_5) | Par de chaves RSA (assimétrica) |
| `ES256` / `ES384` / `ES512` | ECDSA com as curvas P-256, P-384 e **P-521** (não P-512) | Par de chaves de curva elíptica (assimétrica) |
| `none` | Nenhuma assinatura (*Unsecured JWS*) | — |

A diferença prática entre os grupos está em quem consegue gerar tokens. Com **HMAC**, o mesmo segredo assina e valida: todo serviço que valida também poderia emitir tokens. Com **RSA** ou **ECDSA**, só o emissor tem a chave privada; os serviços validam com a chave pública, que pode ser publicada num JWKS. Por isso, quando o token é consumido por vários serviços, os algoritmos assimétricos costumam ser a escolha. Das opções, a RFC 7518 exige das implementações apenas `HS256` e recomenda `RS256` e `ES256`.

## Cuidados de segurança

**O payload não é criptografado.** Ele só está codificado em Base64URL, como o exemplo acima mostrou: qualquer pessoa com o token lê o conteúdo. Um JWS garante **integridade e autenticidade**, não sigilo. Não coloque no payload nada que não possa ser lido por quem intercepta ou recebe o token. Se precisar de sigilo, use **JWE (RFC 7516)**, que criptografa o conteúdo.

**Fixe os algoritmos aceitos no servidor.** Dois ataques clássicos exploram validadores que confiam no `alg` do próprio token (RFC 8725, §2.1):

- trocar o `alg` por `none` e remover a assinatura; bibliotecas vulneráveis "validavam" o token sem verificar nada;
- trocar `RS256` por `HS256`; a biblioteca passa a verificar um HMAC usando a **chave pública** RSA como segredo, e a chave pública é conhecida de todos.

A defesa é configurar no validador a lista de algoritmos aceitos e rejeitar qualquer outro, independentemente do que o token declara. A RFC 8725 (§3.1) também pede que cada chave seja usada com um único algoritmo, e a RFC 7518 proíbe aceitar `none` por padrão.

**Assinatura válida não basta: valide as claims.** Um token autêntico pode ter expirado ou ter sido emitido para outro serviço. Depois de verificar a assinatura, confira:

- `exp` e `nbf`, com uma tolerância pequena de relógio;
- `iss`: o emissor é o esperado, e a chave que assinou pertence a ele (RFC 8725, §3.8);
- `aud`: o token é destinado a este serviço. Se o mesmo emissor gera tokens para mais de uma aplicação, a RFC 8725 (§3.9) exige que o token traga `aud` e que o validador rejeite tokens sem `aud` ou com uma audiência que não seja a dele. Sem essa checagem, um serviço que recebe o token pode reaproveitá-lo para chamar outro (*substitution attack*).

**Não confie cegamente nos campos do header.** O `kid` é usado para buscar a chave; se ele for parar numa consulta SQL ou LDAP, trate-o como entrada não confiável. Seguir sem critério a URL de `jku` ou `x5u` permite ataques de SSRF (*server-side request forgery*), em que o atacante faz o servidor buscar uma URL escolhida por ele. Obtenha as chaves de uma fonte configurada por você, como o `jwks_uri` do emissor, ou restrinja as URLs a uma lista permitida (RFC 8725, §3.10). O mesmo vale para `jwk` e `x5c`: uma chave embutida no token só serve se você verificar que ela pertence a um emissor confiável.

**Com HMAC, use um segredo forte.** Uma senha fácil de memorizar não serve como chave de `HS256`: quem obtém um token pode testar senhas offline até achar a certa (RFC 8725, §2.2 e §3.5). A RFC 7518 exige uma chave de pelo menos o tamanho da saída do hash, ou seja, 256 bits para `HS256`.

## Fontes

- IETF — [RFC 7519: JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- IETF — [RFC 7515: JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515)
- IETF — [RFC 7516: JSON Web Encryption (JWE)](https://datatracker.ietf.org/doc/html/rfc7516)
- IETF — [RFC 7517: JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517)
- IETF — [RFC 7518: JSON Web Algorithms (JWA)](https://datatracker.ietf.org/doc/html/rfc7518)
- IETF — [RFC 8725: JSON Web Token Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- IETF — [RFC 8693: OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693) (registro de `scope` e `client_id`)
- IETF — [RFC 9068: JWT Profile for OAuth 2.0 Access Tokens](https://datatracker.ietf.org/doc/html/rfc9068) (`typ` `at+jwt`)
- IANA — [JSON Web Token Claims registry](https://www.iana.org/assignments/jwt/jwt.xhtml)
- OpenID Foundation — [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) (claims padrão de usuário)
- AWS — [Understanding the access token (Amazon Cognito)](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html) (`token_use`)
- [jwt.io](https://jwt.io/) — decodificador interativo de tokens
