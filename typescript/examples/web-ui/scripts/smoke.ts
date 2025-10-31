/*
  Visa Acceptance Web UI Smoke Tests (matrix-aware)
  - Targets local dev server by default (http://localhost:5216)
  - Adapts to current demo API shapes while honoring the provided matrix where possible
  Run: npm run smoke
  Env: API_BASE=http://localhost:5216 npm run smoke
*/

/* eslint-disable no-console */

const base = process.env.API_BASE || 'http://localhost:5216';

interface StepResult {
  name: string;
  ok: boolean;
  status?: number;
  details?: string;
  id?: string;
  extra?: Record<string, any>;
  skip?: boolean;
}

function hr() { console.log(''.padEnd(80, '-')); }
function uuid() { return (globalThis.crypto?.randomUUID?.() ?? require('crypto').randomUUID()); }

async function request(method: string, path: string, opts: { headers?: Record<string,string>, body?: any } = {}) {
  const url = path.startsWith('http') ? path : base + path;
  const headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
  const init: RequestInit = { method, headers } as any;
  if (opts.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
  }
  let res: Response;
  let text = '';
  try {
    res = await fetch(url, init);
    text = await res.text();
  } catch (e: any) {
    return { ok: false, status: 0, json: null, text: String(e), headers: {} as any };
  }
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, json, text, headers: res.headers };
}

function pick<T>(...vals: T[]): T | undefined { return vals.find(v => v !== undefined && v !== null && v !== ''); }
function isArray(x:any): x is any[] { return Array.isArray(x); }
function hasArray(body:any): boolean {
  if (!body) return false;
  return isArray(body) || isArray(body?.items) || isArray(body?.data) || isArray(body?.invoices) || isArray(body?.paymentLinks) || isArray(body?.links);
}
function getArray(body:any): any[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  return body.items || body.data || body.invoices || body.paymentLinks || body.links || [];
}
function idFromInvoice(resp:any): string | undefined {
  return pick(resp?.id, resp?.invoice_id, resp?.invoiceInformation?.invoiceNumber);
}
function idFromPayLink(resp:any): string | undefined {
  return pick(resp?.id, resp?.paymentLinkId, resp?.pay_link_id);
}

async function run() {
  console.log(`API base: ${base}`);
  hr();
  const steps: StepResult[] = [];

  // A) Pre-flight health/auth
  // Health
  const h = await request('GET', '/api/health');
  const healthOk = h.ok && (h.json?.ok === true || h.json?.status === 'ok');
  steps.push({ name: 'A1: health', ok: !!healthOk, status: h.status, details: healthOk ? undefined : `Unexpected body: ${h.text}` });
  if (!healthOk) { report(steps); process.exitCode = 1; return; }

  // Auth checks - sandbox likely has no auth; mark SKIP if open
  const noAuth = await request('GET', '/api/invoices?limit=1&offset=0');
  if (noAuth.status === 401 || noAuth.status === 403) {
    steps.push({ name: 'A2: auth required', ok: true, status: noAuth.status });
    // simulate with header
    const withAuth = await request('GET', '/api/invoices?limit=1&offset=0', { headers: { Authorization: 'Bearer test-token' } });
    const listOk = withAuth.ok && hasArray(withAuth.json);
    steps.push({ name: 'A3: role/scope basic', ok: !!listOk, status: withAuth.status, details: listOk ? undefined : `Body: ${withAuth.text}` });
    if (!listOk) { report(steps); process.exitCode = 1; return; }
  } else {
    steps.push({ name: 'A2: auth required', ok: true, skip: true, status: noAuth.status, details: 'Auth not enforced in sandbox' });
    const listOk = noAuth.ok && hasArray(noAuth.json);
    steps.push({ name: 'A3: role/scope basic', ok: !!listOk, status: noAuth.status, details: listOk ? undefined : `Body: ${noAuth.text}` });
    if (!listOk) { report(steps); process.exitCode = 1; return; }
  }

  // B) Idempotency & CRUD
  // List invoices baseline
  const list1 = await request('GET', '/api/invoices?limit=5&offset=0');
  const reqId = list1.headers.get('X-Request-Id') || list1.headers.get('x-request-id');
  steps.push({ name: 'B1: list invoices', ok: list1.ok && hasArray(list1.json), status: list1.status, details: reqId ? `X-Request-Id=${reqId}` : 'no request id header' });

  // Create invoice (adapted to demo API)
  const key1 = uuid();
  const invBody = {
    amount: '5.00',
    currency: 'USD',
    email: 'smoke+cust@demo.test',
    customerName: 'Smoke Test',
    memo: 'Smoke Item',
    dueDays: 30
  };
  const inv1 = await request('POST', '/api/invoices', { headers: { 'Idempotency-Key': key1 }, body: invBody });
  const inv1Id = idFromInvoice(inv1.json);
  steps.push({ name: 'B2: create invoice', ok: !!(inv1.ok && inv1Id), status: inv1.status, id: inv1Id, details: inv1.ok ? undefined : inv1.text });

  // Replay idempotency
  const inv1Replay = await request('POST', '/api/invoices', { headers: { 'Idempotency-Key': key1 }, body: invBody });
  const invReplayId = idFromInvoice(inv1Replay.json);
  const sameId = inv1Id && invReplayId && (inv1Id === invReplayId);
  steps.push({ name: 'B3: idempotent replay(invoice)', ok: sameId || false, status: inv1Replay.status, details: sameId ? undefined : 'Server may not support Idempotency-Key', id: invReplayId, extra: { expected: inv1Id } });

  // Update invoice (demo endpoint uses POST /update)
  if (inv1Id) {
    const upd = await request('POST', `/api/invoices/${encodeURIComponent(inv1Id)}/update`, { body: { description: 'smoke: true' } });
    steps.push({ name: 'B4: update invoice', ok: upd.ok, status: upd.status, details: upd.ok ? undefined : upd.text });
  } else {
    steps.push({ name: 'B4: update invoice', ok: true, skip: true, details: 'no invoice id' });
  }

  // Invoice appears in list (best-effort)
  const list2 = await request('GET', '/api/invoices?limit=10&offset=0');
  const foundInv = inv1Id ? getArray(list2.json).some((x:any) => idFromInvoice(x) === inv1Id) : false;
  steps.push({ name: 'B5: invoice in list', ok: !!foundInv || !inv1Id, status: list2.status, details: inv1Id ? (foundInv ? undefined : 'id not found (ok if pagination/sorting differs)') : 'skipped' });

  // Pay-by-Links
  const plList = await request('GET', '/api/payment-links?limit=5&offset=0');
  steps.push({ name: 'B6: list pay-links', ok: plList.ok && hasArray(plList.json), status: plList.status, details: plList.ok ? undefined : plList.text });

  const key2 = uuid();
  const pblBody = { amount: '5.00', currency: 'USD', memo: 'Smoke PBL', metadata: { smoke: 'true' } };
  const plCreate = await request('POST', '/api/payment-links', { headers: { 'Idempotency-Key': key2 }, body: pblBody });
  const payLinkId = idFromPayLink(plCreate.json);
  steps.push({ name: 'B7: create pay-link', ok: !!(plCreate.ok && payLinkId), status: plCreate.status, id: payLinkId, details: plCreate.ok ? undefined : plCreate.text });

  const plReplay = await request('POST', '/api/payment-links', { headers: { 'Idempotency-Key': key2 }, body: pblBody });
  const payLinkId2 = idFromPayLink(plReplay.json);
  const samePl = payLinkId && payLinkId2 && (payLinkId === payLinkId2);
  steps.push({ name: 'B8: idempotent replay(pay-link)', ok: samePl || false, status: plReplay.status, details: samePl ? undefined : 'Server may not support Idempotency-Key', id: payLinkId2, extra: { expected: payLinkId } });

  // Update pay-link (demo may not support)
  if (payLinkId) {
    const updPl = await request('POST', `/api/payment-links/${encodeURIComponent(payLinkId)}/update`, { body: { status: 'inactive' } });
    steps.push({ name: 'B9: update pay-link', ok: updPl.ok, status: updPl.status, details: updPl.ok ? undefined : updPl.text });
  } else {
    steps.push({ name: 'B9: update pay-link', ok: true, skip: true, details: 'no pay_link_id' });
  }

  // C) Validation & Errors
  const invBad = await request('POST', '/api/invoices', { body: { amount: '', currency: 'USD', email: '' } });
  const invBadOk = invBad.status === 400 || invBad.status === 422;
  steps.push({ name: 'C1: invoice validation error', ok: !!invBadOk, status: invBad.status, details: invBadOk ? undefined : 'Expected 400/422', extra: { body: invBad.text } });

  const plBad = await request('POST', '/api/payment-links', { body: { amount: '-1', currency: 'USD', memo: 'bad' } });
  const plBadOk = plBad.status === 400 || plBad.status === 422;
  steps.push({ name: 'C2: pay-link validation error', ok: !!plBadOk, status: plBad.status, details: plBadOk ? undefined : 'Expected 400/422', extra: { body: plBad.text } });

  // D) Agent (best-effort). Try dry-run signals; fall back to generic call
  // D0) AI tools listing
  const toolsList = await request('GET', '/api/ai/tools');
  const toolsArr: string[] = Array.isArray(toolsList.json?.tools) ? toolsList.json.tools : [];
  const hasCore = toolsArr.some(k => /create_invoice|list_invoices|update_invoice|create_payment_link|list_payment_links/.test(k));
  steps.push({ name: 'D0: list AI tools', ok: toolsList.ok && hasCore, status: toolsList.status, details: toolsList.ok ? `tools=${toolsArr.slice(0,8).join(',')}` : toolsList.text });

  const agentHeaders: Record<string,string> = { 'X-Agent-Smoke': 'true' };
  const agentList = await request('POST', '/api/ai', { headers: agentHeaders, body: { prompt: 'List my last 3 invoices', mode: 'tool-call-log' } });
  const looksList = agentList.ok && (hasArray(agentList.json) || hasArray(agentList.json?.invoices));
  steps.push({ name: 'D1: agent list invoices', ok: !!looksList, status: agentList.status, details: looksList ? undefined : 'Response did not look like a list', extra: { sample: agentList.text?.slice(0, 200) } });

  // Ensure the smoke prompt contains minimum required fields: amount, currency, recipient email, and due date
  const agentCreate = await request('POST', '/api/ai', { headers: agentHeaders, body: { prompt: 'Create an invoice for $5.00 USD to smoke+cust@demo.test for Smoke Test, due in 7 days', mode: 'tool-call-log' } });
  const looksInv = agentCreate.ok && !!idFromInvoice(agentCreate.json);
  steps.push({ name: 'D2: agent create invoice', ok: !!looksInv, status: agentCreate.status, details: looksInv ? undefined : 'Could not detect invoice id', extra: { sample: agentCreate.text?.slice(0, 200) } });

  // Use created ids if available for further AI actions
  const aiInvId = idFromInvoice(agentCreate.json) || inv1Id;
  if (aiInvId) {
    const agentUpdate = await request('POST', '/api/ai', { headers: agentHeaders, body: { prompt: `Update invoice ${aiInvId} description "smoke:true" amount $6.00`, mode: 'tool-call-log' } });
    steps.push({ name: 'D3: agent update invoice', ok: agentUpdate.ok, status: agentUpdate.status, details: agentUpdate.ok ? undefined : agentUpdate.text });
  } else {
    steps.push({ name: 'D3: agent update invoice', ok: true, skip: true, details: 'no invoice id available' });
  }

  const agentCreatePL = await request('POST', '/api/ai', { headers: agentHeaders, body: { prompt: 'Make a pay link for $5.00 USD called Smoke PBL', mode: 'tool-call-log' } });
  const looksPL = agentCreatePL.ok && !!idFromPayLink(agentCreatePL.json);
  steps.push({ name: 'D4: agent create pay-link', ok: !!looksPL, status: agentCreatePL.status, details: looksPL ? undefined : 'Could not detect pay_link_id', extra: { sample: agentCreatePL.text?.slice(0, 200) } });

  const agentListPL = await request('POST', '/api/ai', { headers: agentHeaders, body: { prompt: 'List my last 3 pay links', mode: 'tool-call-log' } });
  const looksPLList = agentListPL.ok && (hasArray(agentListPL.json) || hasArray(agentListPL.json?.paymentLinks));
  steps.push({ name: 'D5: agent list pay-links', ok: !!looksPLList, status: agentListPL.status, details: looksPLList ? undefined : 'Response did not look like a list' });

  const aiPLId = idFromPayLink(agentCreatePL.json) || payLinkId;
  if (aiPLId) {
    const agentUpdatePL = await request('POST', '/api/ai', { headers: agentHeaders, body: { prompt: `Deactivate pay link ${aiPLId}`, mode: 'tool-call-log' } });
    steps.push({ name: 'D6: agent update pay-link', ok: agentUpdatePL.ok, status: agentUpdatePL.status, details: agentUpdatePL.ok ? undefined : agentUpdatePL.text });
  } else {
    steps.push({ name: 'D6: agent update pay-link', ok: true, skip: true, details: 'no pay_link_id available' });
  }

  // E) Concurrency & rate limit (best-effort)
  const key3 = uuid();
  const p1 = request('POST', '/api/invoices', { headers: { 'Idempotency-Key': key3 }, body: invBody });
  const p2 = request('POST', '/api/invoices', { headers: { 'Idempotency-Key': key3 }, body: invBody });
  const [c1, c2] = await Promise.all([p1, p2]);
  const c1Id = idFromInvoice(c1.json); const c2Id = idFromInvoice(c2.json);
  const concOk = !!(c1Id && c2Id && c1Id === c2Id);
  steps.push({ name: 'E1: idempotent concurrency', ok: concOk, status: Math.max(c1.status||0, c2.status||0), details: concOk ? undefined : 'Idempotency under concurrency not enforced', extra: { c1Id, c2Id } });

  // Rate-limit header presence (best-effort)
  const burst = await Promise.all(new Array(5).fill(0).map(() => request('GET', '/api/invoices?limit=1&offset=0')));
  const anyHeaders = burst.some(b => !!(b.headers.get('X-RateLimit-Remaining') || b.headers.get('x-ratelimit-remaining')));
  steps.push({ name: 'E2: rate limit headers', ok: anyHeaders, status: burst[0]?.status, details: anyHeaders ? undefined : 'No rate-limit headers observed (ok in sandbox)' });

  report(steps);
  const hardFail = steps.some(s => !s.ok && !s.skip && s.name.startsWith('A')); // pre-flight must pass
  process.exitCode = hardFail ? 1 : 0;
}

function report(steps: StepResult[]) {
  hr();
  let pass = 0, fail = 0, skip = 0;
  for (const s of steps) {
    const tag = s.skip ? 'SKIP' : (s.ok ? 'PASS' : 'FAIL');
    if (s.skip) skip++; else if (s.ok) pass++; else fail++;
    const extra = s.id ? ` id=${s.id}` : '';
    console.log(`[${tag}] ${s.name} -> HTTP ${s.status ?? '-'}${extra}${s.details ? ` | ${s.details}` : ''}`);
  }
  hr();
  console.log(`Summary: PASS=${pass} FAIL=${fail} SKIP=${skip}`);
}

run().catch(e => { console.error('Smoke runner error:', e); process.exitCode = 1; });
