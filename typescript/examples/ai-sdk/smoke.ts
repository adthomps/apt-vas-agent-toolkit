// End-to-end smoke test for Visa Acceptance toolkit in SANDBOX
// Steps: PL list -> PL create -> INV list -> INV create -> PL get(created) -> INV get(created)

require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';
const fs = require('fs');
const path = require('path');

function tryParse<T = any>(v: any): T {
  try {
    if (typeof v === 'string') return JSON.parse(v);
    return v as T;
  } catch {
    return v as T;
  }
}

async function main() {
  const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const merchantId = process.env.VISA_ACCEPTANCE_MERCHANT_ID || '';

  const configuration = {
    actions: {
      paymentLinks: { create: true, read: true, update: true },
      invoices: { create: true, read: true, update: true },
    },
  } as const;

  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    configuration as any
  );

  const tools = toolkit.getTools() as any;
  const t = {
    pl_list: tools['list_payment_links'],
    pl_create: tools['create_payment_link'],
    pl_get: tools['get_payment_link'],
    inv_list: tools['list_invoices'],
    inv_create: tools['create_invoice'],
    inv_get: tools['get_invoice'],
  };

  if (!t.pl_list || !t.pl_create || !t.pl_get || !t.inv_list || !t.inv_create || !t.inv_get) {
    console.error('Smoke: required tools missing. Check configuration.actions.');
    process.exit(1);
  }

  const startedAt = new Date();
  const summary: any = { env, startedAt: startedAt.toISOString(), steps: [] };

  const step = async (name: string, fn: () => Promise<any>) => {
    const s: any = { name, ok: false };
    const start = Date.now();
    try {
      const res = await fn();
      s.ok = true;
      s.result = res;
    } catch (err: any) {
      s.ok = false;
      s.error = err?.message || String(err);
    } finally {
      s.ms = Date.now() - start;
      summary.steps.push(s);
      console.log(`[${name}]`, s.ok ? 'OK' : 'FAIL', `(${s.ms}ms)`);
    }
  };

  let createdPlId: string | undefined;
  let createdInvId: string | undefined;

  // 1) Payment Links: list
  await step('pl:list', async () => {
    const result = tryParse(await t.pl_list.execute({ offset: 0, limit: 1 }));
    return result;
  });

  // 2) Payment Links: create
  await step('pl:create', async () => {
    const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    const params = {
      linkType: 'PURCHASE',
      purchaseNumber: 'SMOKE' + rand,
      currency: 'USD',
      totalAmount: '5.00',
      requestPhone: false,
      requestShipping: false,
      clientReferenceCode: merchantId || 'smoke',
      lineItems: [ { productName: 'Smoke Test', quantity: '1', unitPrice: '5.00' } ],
    } as any;
    const created = tryParse(await t.pl_create.execute(params));
    createdPlId = created?.id;
    return { id: createdPlId, status: created?.status };
  });

  // 3) Invoices: list
  await step('inv:list', async () => {
    const result = tryParse(await t.inv_list.execute({ offset: 0, limit: 1 }));
    return result;
  });

  // 4) Invoices: create
  await step('inv:create', async () => {
    const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    const params = {
      invoice_number: 'SMK' + rand,
      totalAmount: '5.00',
      currency: 'USD',
      customerName: 'Smoke Bot',
      customerEmail: 'smoke.bot@example.com',
      invoiceInformation: {
        description: 'Smoke invoice',
        dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10),
        sendImmediately: true,
        deliveryMode: 'email',
      }
    } as any;
    const created = tryParse(await t.inv_create.execute(params));
    createdInvId = created?.id || created?.invoiceInformation?.invoiceNumber; // API returns id
    return { id: createdInvId, status: created?.status };
  });

  // 5) Payment Links: get(created)
  await step('pl:get', async () => {
    if (!createdPlId) throw new Error('No payment link id from create');
    const got = tryParse(await t.pl_get.execute({ id: createdPlId }));
    return { id: got?.id, status: got?.status };
  });

  // 6) Invoices: get(created)
  await step('inv:get', async () => {
    if (!createdInvId) throw new Error('No invoice id from create');
    const got = tryParse(await t.inv_get.execute({ id: createdInvId }));
    return { id: got?.id, status: got?.status };
  });

  // Summary
  const ok = summary.steps.every((s: any) => s.ok);
  const finishedAt = new Date();
  summary.finishedAt = finishedAt.toISOString();
  summary.durationMs = finishedAt.getTime() - startedAt.getTime();
  summary.created = { paymentLinkId: createdPlId, invoiceId: createdInvId };

  console.log('\n=== SMOKE SUMMARY ===');
  for (const s of summary.steps) {
    console.log(`- ${s.name}: ${s.ok ? 'OK' : 'FAIL'} (${s.ms}ms)`);
    if (s.result) {
      try {
        console.log('  result:', JSON.stringify(s.result));
      } catch {
        console.log('  result:', s.result);
      }
    }
    if (s.error) console.log('  error:', s.error);
  }
  console.log('Overall:', ok ? 'PASS' : 'FAIL');
  process.exitCode = ok ? 0 : 1;

  // Write aggregate report to JSON file
  try {
    const reportPath = path.join(process.cwd(), 'smoke-report.json');
    // Sanitize step results for JSON (avoid huge blobs or non-serializable values)
    const report = {
      env: summary.env,
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
      durationMs: summary.durationMs,
      created: summary.created,
      steps: summary.steps.map((s: any) => ({
        name: s.name,
        ok: s.ok,
        ms: s.ms,
        // Include compact result view when possible
        result: (() => {
          try {
            if (!s.result) return undefined;
            // If result has id/status, capture those; otherwise stringify compactly
            const id = (s.result && (s.result.id || s.result?.invoiceInformation?.invoiceNumber)) || undefined;
            const status = s.result && s.result.status;
            if (id || status) return { id, status };
            const json = JSON.stringify(s.result);
            return json && json.length > 2000 ? json.slice(0, 2000) + '…' : s.result;
          } catch {
            return undefined;
          }
        })(),
        error: s.error,
      })),
      overall: ok ? 'PASS' : 'FAIL',
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Report written to ${reportPath}`);
  } catch (e: any) {
    console.error('Failed to write smoke-report.json:', e?.message || e);
  }
}

main();
