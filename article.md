# Your LLM Cache Key Is Missing Half the Request. Build a Versioned Cache in TypeScript.

The fastest model call is the one you skip. That is also a good way to skip the boundary that made the answer safe.

Alice asks, “What is my refund limit?” Bob asks the same thing. Your cache sees identical text and returns Alice's answer to Bob.

No exception. No failed request. A cache hit.

I built a small TypeScript fixture that makes that mistake visible, then keys the result by the request and the trusted scope. It runs locally, needs no API key, and checks 16 cases. The refund values are invented. The failure is deliberately constructed.

![Prompt-only lookup returns Acme's invented policy to Beta; the versioned key misses.](https://raw.githubusercontent.com/bobbyhalljr/llm-cache-key/main/images/cross-tenant.png)

## The prompt is only one input

A result depends on more than the last user message. Change the system prompt, model snapshot, output schema, retrieved knowledge, or decoding settings and the same text can mean a different request.

Identity matters too. A cache that crosses users can turn reuse into disclosure. [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html#section-3.5) puts explicit restrictions on shared HTTP caching of authorized responses. This build is an application-level LLM cache, not an implementation of that RFC. The design lesson I take from it is simple: reuse needs a scope, not just a string.

The fixture builds a fixed-position tuple containing:

- A key-format version, tenant, principal, and access revision.
- Model name and snapshot revision, full system text, and ordered text messages.
- Exact schema text, toolset revision, and knowledge revision.
- Temperature, top-p, maximum output tokens, and seed.

The application must supply the scope from authenticated server state. A tenant name produced by the model is not trusted scope. A principal in a request body is not proof of identity.

![The fixed-position JSON tuple includes trusted scope, request contract, and dependencies before hashing.](https://raw.githubusercontent.com/bobbyhalljr/llm-cache-key/main/images/key-contract.png)

## Run the build

The public source is [bobbyhalljr/llm-cache-key](https://github.com/bobbyhalljr/llm-cache-key). It includes the source, all 16 checks, images, and the exact output.

Use Node.js 22.18.0 or newer. Tested here on **Node.js 22.20.0, October 9, 2026**. There are no npm dependencies to install.

```bash
git clone https://github.com/bobbyhalljr/llm-cache-key.git
cd llm-cache-key
npm test
```

Or run the single file:

```bash
node --experimental-strip-types cache.ts
```

Node's built-in loader strips the erasable TypeScript syntax in this file. It does not type-check it. [Node's versioned documentation](https://nodejs.org/download/release/v22.20.0/docs/api/typescript.html#type-stripping) explains that boundary.

Here is the key construction after the input checks. The full file in the repo includes those checks and the cache implementation.

```ts
const tuple = ['llm-result-cache-v1', scope.tenant, scope.principal, scope.accessRevision,
  req.model, req.modelRevision, req.system,
  req.messages.map(m => [m.role, m.content]), req.schema,
  req.toolsetRevision, req.knowledgeRevision, req.temperature, req.topP,
  req.maxOutputTokens, req.seed];
return createHash('sha256').update(JSON.stringify(tuple)).digest('hex');
```

A fixed tuple avoids a delimiter problem. If you join fields with `:`, the values `a:b` plus `c` and `a` plus `b:c` can produce the same joined text. JSON keeps the boundaries.

This does not canonicalize arbitrary objects. Message order is preserved. The schema is an exact string. Reformatting an equivalent schema produces a conservative miss. That is an acceptable tradeoff for this teaching build.

[Node's `createHash`](https://nodejs.org/download/release/v22.20.0/docs/api/crypto.html#cryptocreatehashalgorithm-options) supplies the SHA-256 digest. The hash compresses the key. It does not encrypt the answer, authenticate a user, or make omitted inputs appear.

## Exact output

The `npm test` script runs the same local demo and assertions:

```text
prompt-only | beta/bob | ACME_LIMIT=500
same-request | ACME_LIMIT=500
different-tenant | MISS
different-principal | MISS
access-revoked | MISS
new-system-prompt | MISS
new-model-snapshot | MISS
new-schema | MISS
new-toolset | MISS
new-knowledge | MISS
new-decoding | MISS
message-order | false
bypass-side-effects | MISS
before-expiry | ACME_LIMIT=500
at-expiry | MISS
missing-scope | REFUSE
invalid-decoding | REFUSE
checks=16 passed
```

The first line is the broken design. The last user message alone is the key, so Bob gets Alice's `ACME_LIMIT=500` value. That demonstration has its own assertion but is not counted among the 16 guarded checks.

The guarded cache returns the same value for an identical request. Changing tenant, principal, or access revision misses. Changing prompt, snapshot, schema, toolset, knowledge, or temperature misses too. The message-order check prints `false` because reversing the messages produces a different key.

Missing scope and `NaN` decoding settings throw before a lookup. Type annotations alone would not reject those values at runtime.

## TTL does not revoke access

The cache writes at time zero with a 1,000 ms TTL. It hits at 999 ms and misses at exactly 1,000 ms. These are injected fixture times, not latency measurements.

A permission change cannot wait for that timer. At 1 ms, switching from `acl-7` to `acl-8` already misses because the access revision is part of the key.

![The cache hits at 999 ms, expires at 1,000 ms, and misses immediately when the access revision changes.](https://raw.githubusercontent.com/bobbyhalljr/llm-cache-key/main/images/ttl-revocation.png)

That only works if the application supplies a fresh revision on every read. Reusing a stale revision would reuse the old key. In production, authorize the read independently, then compute the key from the effective access state and data versions. Old entries can remain in storage until cleanup; a changed key prevents their reuse by this path, not their retention.

## A cache hit is a policy decision

The fixture exposes `cacheable`. When it is false, neither read nor write reuses a result. Use an explicit allowlist for operations whose result may be reused. Do not treat a cached tool success as permission to skip a write, payment, notification, or other side effect.

Caching a stochastic answer also changes product behavior. Even with the same settings, the next model call may have produced a different answer. Decide whether freezing the first answer is acceptable for this job.

## The honest boundary

This is a local `Map` with synthetic requests and fake policy values. It makes no model call, measures no cost or speed, and proves no production security property. There is no Redis integration, authentication service, concurrent writer, distributed invalidation, encryption, size limit, eviction policy, or live revocation test.

The supported request is deliberately narrow: text messages and a fixed set of controls. Add images, tool arguments, retrieval filters, locale, a new sampling control, or another output-affecting field and the key contract must change. Unknown extra fields are not modeled by this fixture. A provider alias that silently changes snapshots also needs a revision you control; a label you never update is not invalidation.

Treat prompt and answer storage as sensitive data. A SHA-256 key does not anonymize a predictable prompt or protect the cached value. The code also trusts the clock passed by its caller. A production cache needs a reliable time source and bounded retention.

The useful review question is: **what can change the authorized answer without changing this key?**

I’m building Roster, AI employees that do real work. Faster work still needs the right identity, the right contract, and permission to reuse the result.

## Primary references

- [RFC 9111, shared caching of authorized responses](https://www.rfc-editor.org/rfc/rfc9111.html#section-3.5), June 2022. Used as a design analogy, not a claim of LLM-cache compliance.
- [Node.js 22.20.0 TypeScript loader](https://nodejs.org/download/release/v22.20.0/docs/api/typescript.html), including the absence of type checking.
- [Node.js 22.20.0 `crypto.createHash`](https://nodejs.org/download/release/v22.20.0/docs/api/crypto.html#cryptocreatehashalgorithm-options).
