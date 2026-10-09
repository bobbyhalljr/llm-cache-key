1. Your LLM cache key is missing half the request.

Same prompt. Different user. Wrong answer.

I built a tiny TypeScript fixture: prompt-only leaks the invented policy; a versioned key misses. 16 checks, no API key.

2. Key trusted identity and the actual request: access revision, model snapshot, system text, ordered messages, schema, knowledge, tools, and decoding settings.

TTL does not revoke access. A fresh access revision changes the key before expiry.

3. This is a local Map with synthetic data. No model call, production auth test, or latency claim. Hashing does not authorize a read.

Read: https://dev.to/bobbyhalljr/your-llm-cache-key-is-missing-half-the-request-build-a-versioned-cache-in-typescript-15dc
Run: https://github.com/bobbyhalljr/llm-cache-key

I'm building Roster, AI employees that do real work.