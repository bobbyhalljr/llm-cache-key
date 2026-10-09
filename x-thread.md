1. Your LLM cache key is missing half the request.

Same prompt. Different user. Wrong answer.

I built a tiny TypeScript fixture: prompt-only leaks the invented policy; a versioned key misses. 16 checks, no API key.

[Attach cover.png]

2. Key the scope and the actual request: tenant, principal, access revision, model snapshot, system text, ordered messages, schema, knowledge, tools, and decoding settings.

TTL does not revoke access. A fresh access revision changes the key before expiry.

3. This is a local Map with synthetic data. No model call, production auth test, or latency claim. Hashing does not authorize a read.

Read: DEV_URL
Run: https://github.com/bobbyhalljr/llm-cache-key

I'm building Roster, AI employees that do real work.
