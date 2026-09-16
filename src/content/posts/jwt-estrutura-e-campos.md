---
title: "JWT — a estrutura e o significado de cada campo"
published: 2026-04-12
description: "header.payload.signature, campo a campo: os headers JOSE (alg, kid, crit…), as claims registradas (iss, sub, aud, exp…), os algoritmos de assinatura — e o detalhe de segurança que muita gente esquece: o payload não é criptografado."
tags: [Segurança, JWT, Autenticação]
category: Segurança
cover: /covers/jwt-estrutura.svg
draft: false
---

Um **JWT (JSON Web Token)** é definido pela **RFC 7519** e é composto por três partes separadas por ponto: `header.payload.signature`. Cada parte é um JSON codificado em Base64URL. As specs relacionadas são a **RFC 7515 (JWS)**, a **RFC 7516 (JWE)** e a **RFC 7517 (JWK)**.

![As três partes do JWT: header, payload e signature, separadas por ponto](/posts/jwt-estrutura-e-campos/tres-partes-do-jwt.svg)

## Header (JOSE Header)

Metadados sobre o token e como ele foi assinado (RFC 7515):

- **`alg`** — *Algorithm*. Algoritmo de assinatura (ex.: `RS256`, `HS256`, `ES256`). **Obrigatório**.
- **`typ`** — *Type*. Tipo do token, normalmente `JWT`. Opcional, mas recomendado.
- **`cty`** — *Content Type*. Usado quando o payload é outro JWT aninhado (nested JWT).
- **`kid`** — *Key ID*. Identificador da chave usada para assinar. Permite ao validador escolher a chave correta dentro de um JWKS quando há rotação de chaves (RFC 7515 §4.1.4).
- **`jku`** — *JWK Set URL*. URL onde está publicado o conjunto de chaves públicas (JWKS).
- **`jwk`** — *JSON Web Key*. A própria chave pública embutida no header (raro; cuidado com segurança).
- **`x5u`** / **`x5c`** / **`x5t`** / **`x5t#S256`** — referências e thumbprints de certificados X.509.
- **`crit`** — *Critical*. Lista de headers que o validador é obrigado a entender — senão deve rejeitar o token.

## Payload (Claims)

O conteúdo do token. Os campos são chamados de **claims** e se dividem em três categorias.

**Registered Claims (RFC 7519 §4.1) — padronizadas:**

- **`iss`** — *Issuer*. Quem emitiu o token (ex.: `https://auth.minhaempresa.com`).
- **`sub`** — *Subject*. A quem o token se refere — normalmente o ID do usuário.
- **`aud`** — *Audience*. Para quem o token se destina. O validador deve rejeitar se não estiver na lista.
- **`exp`** — *Expiration Time*. Timestamp Unix de expiração. Após esse instante, o token é inválido.
- **`nbf`** — *Not Before*. Timestamp Unix antes do qual o token não deve ser aceito.
- **`iat`** — *Issued At*. Timestamp Unix de emissão.
- **`jti`** — *JWT ID*. Identificador único do token. Útil para revogação e prevenção de replay.

**Public Claims:** definidas em registros públicos (IANA JWT Claims Registry) ou padronizadas por specs como o **OpenID Connect** (`name`, `email`, `email_verified`, `preferred_username`, `picture`…) e o **OAuth 2.0** (`scope`, `client_id`, `token_use`).

**Private Claims:** customizadas, combinadas entre as partes que trocam o token. Ex.: `roles`, `tenant_id`, `permissions`. Não há padronização — boa prática é usar namespaces (ex.: `https://minhaempresa.com/roles`) para evitar colisão.

## Signature

Calculada sobre `base64url(header) + "." + base64url(payload)` usando o algoritmo declarado em `alg`. Garante que o token **não foi adulterado** e que foi emitido por quem detém a chave privada (ou o segredo, no HMAC).

- **HS256/384/512** — HMAC com chave simétrica (segredo compartilhado).
- **RS256/384/512** — RSA com par de chaves assimétricas.
- **ES256/384/512** — ECDSA com curvas elípticas.
- **PS256/384/512** — RSA-PSS, variante mais moderna do RSA.

## Duas observações de segurança

**O payload não é criptografado** — apenas codificado em Base64URL. Qualquer pessoa com o token lê o conteúdo. JWT garante **integridade e autenticidade**, não confidencialidade. Para confidencialidade, use **JWE (RFC 7516)**, que criptografa o payload.

**Valide o `alg` do lado do servidor.** O ataque clássico contra validadores ingênuos é enviar um token com `alg: none` (ou trocar RS256 por HS256 usando a chave pública como segredo). O validador deve aceitar **apenas a lista de algoritmos esperada**, nunca o que o próprio token declarar.

## Fontes

- IETF — [RFC 7519: JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- IETF — [RFC 7515: JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515)
- IETF — [RFC 7516: JSON Web Encryption (JWE)](https://datatracker.ietf.org/doc/html/rfc7516)
- IETF — [RFC 7517: JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517)
- [jwt.io](https://jwt.io/) — debugger interativo de tokens
