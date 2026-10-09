import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

type Scope = { tenant: string; principal: string; accessRevision: string };
type Request = {
  model: string;
  modelRevision: string;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  schema: string;
  toolsetRevision: string;
  knowledgeRevision: string;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  seed: number | null;
  cacheable: boolean;
};

function nonempty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
export function cacheKey(scope: Scope, req: Request): string {
  if (!scope || ![scope.tenant, scope.principal, scope.accessRevision].every(nonempty)) {
    throw new Error('trusted scope is required');
  }
  if (!req || ![req.model, req.modelRevision, req.system, req.schema,
    req.toolsetRevision, req.knowledgeRevision].every(nonempty)) {
    throw new Error('request revisions and contract are required');
  }
  if (!Array.isArray(req.messages) || req.messages.length === 0 ||
    !req.messages.every(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')) {
    throw new Error('ordered text messages are required');
  }
  if (!Number.isFinite(req.temperature) || req.temperature < 0 || req.temperature > 2 ||
    !Number.isFinite(req.topP) || req.topP <= 0 || req.topP > 1 ||
    !Number.isSafeInteger(req.maxOutputTokens) || req.maxOutputTokens <= 0 ||
    !(req.seed === null || Number.isSafeInteger(req.seed)) || typeof req.cacheable !== 'boolean') {
    throw new Error('invalid decoding or cache policy');
  }
  // Fixed-position tuple: preserve message order; avoid delimiter ambiguity.
  // Schema is exact text, so differently formatted equivalents cause safe misses.
  const tuple = ['llm-result-cache-v1', scope.tenant, scope.principal, scope.accessRevision,
    req.model, req.modelRevision, req.system,
    req.messages.map(m => [m.role, m.content]), req.schema,
    req.toolsetRevision, req.knowledgeRevision, req.temperature, req.topP,
    req.maxOutputTokens, req.seed];
  return createHash('sha256').update(JSON.stringify(tuple)).digest('hex');
}

export function makeCache(ttlMs: number) {
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) throw new Error('invalid TTL');
  const rows = new Map<string, { value: string; expires: number }>();
  return {
    put(scope: Scope, req: Request, value: string, now: number) {
      const key = cacheKey(scope, req);
      if (!req.cacheable) return;
      rows.set(key, { value, expires: now + ttlMs });
    },
    get(scope: Scope, req: Request, now: number): string | undefined {
      const key = cacheKey(scope, req);
      if (!req.cacheable) return undefined;
      const row = rows.get(key);
      if (!row) return undefined;
      if (now >= row.expires) { rows.delete(key); return undefined; }
      return row.value;
    },
  };
}

const scope: Scope = { tenant: 'acme', principal: 'alice', accessRevision: 'acl-7' };
const req: Request = {
  model: 'fixture-model', modelRevision: 'snapshot-1',
  system: 'Use the supplied policy. Return JSON.',
  messages: [{ role: 'user', content: 'What is my refund limit?' }],
  schema: '{"type":"object","required":["limit"]}',
  toolsetRevision: 'read-policy-v1', knowledgeRevision: 'policy-3',
  temperature: 0, topP: 1, maxOutputTokens: 128, seed: null, cacheable: true,
};
const other = { ...scope, tenant: 'beta', principal: 'bob' };
const naive = new Map<string, string>();
const promptKey = (r: Request) => r.messages.at(-1)!.content;
naive.set(promptKey(req), 'ACME_LIMIT=500');
console.log(`prompt-only | beta/bob | ${naive.get(promptKey(req))}`);
assert.equal(naive.get(promptKey(req)), 'ACME_LIMIT=500');
const cache = makeCache(1000);
cache.put(scope, req, 'ACME_LIMIT=500', 0);
let passed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  assert.deepEqual(actual, expected); passed++;
  console.log(`${name} | ${actual === undefined ? 'MISS' : actual}`);
}
check('same-request', cache.get(scope, req, 1), 'ACME_LIMIT=500');
check('different-tenant', cache.get(other, req, 1), undefined);
check('different-principal', cache.get({ ...scope, principal: 'eve' }, req, 1), undefined);
check('access-revoked', cache.get({ ...scope, accessRevision: 'acl-8' }, req, 1), undefined);
check('new-system-prompt', cache.get(scope, { ...req, system: 'Use policy v4. Return JSON.' }, 1), undefined);
check('new-model-snapshot', cache.get(scope, { ...req, modelRevision: 'snapshot-2' }, 1), undefined);
check('new-schema', cache.get(scope, { ...req, schema: '{"type":"object","required":["limit","currency"]}' }, 1), undefined);
check('new-toolset', cache.get(scope, { ...req, toolsetRevision: 'read-policy-v2' }, 1), undefined);
check('new-knowledge', cache.get(scope, { ...req, knowledgeRevision: 'policy-4' }, 1), undefined);
check('new-decoding', cache.get(scope, { ...req, temperature: 0.7 }, 1), undefined);
check('message-order', cacheKey(scope, { ...req, messages: [
  { role: 'user', content: 'a' }, { role: 'assistant', content: 'b' },
] }) === cacheKey(scope, { ...req, messages: [
  { role: 'assistant', content: 'b' }, { role: 'user', content: 'a' },
] }), false);
check('bypass-side-effects', cache.get(scope, { ...req, cacheable: false }, 1), undefined);
check('before-expiry', cache.get(scope, req, 999), 'ACME_LIMIT=500');
check('at-expiry', cache.get(scope, req, 1000), undefined);
assert.throws(() => cacheKey({ ...scope, tenant: '' }, req), /trusted scope/); passed++;
console.log('missing-scope | REFUSE');
assert.throws(() => cacheKey(scope, { ...req, temperature: NaN }), /invalid decoding/); passed++;
console.log('invalid-decoding | REFUSE');
console.log(`checks=${passed} passed`);
