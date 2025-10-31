// Cleanup script to prune older smoke-created links/invoices in SANDBOX
// Usage examples:
//   npm run cleanup                # defaults: --days 1 --dry-run
//   ts-node cleanup.ts --days 2    # dry-run across last 2 days
//   ts-node cleanup.ts --days 2 --apply  # actually cancel invoices

require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const argv = process.argv.slice(2);
  const args: any = { days: 1, apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--days') { args.days = parseInt(argv[++i], 10) || 1; }
    else if (a === '--apply') { args.apply = true; }
    else if (a === '--dry-run') { args.apply = false; }
  }
  return args;
}

function tryParse<T = any>(v: any): T {
  try {
    if (typeof v === 'string') return JSON.parse(v);
    return v as T;
  } catch {
    return v as T;
  }
}

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const { days, apply } = parseArgs();
  const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  if (env !== 'SANDBOX') {
    console.error('Cleanup is restricted to SANDBOX only. Current env:', env);
    process.exit(1);
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const startedAt = new Date();
  const report: any = {
    env,
    startedAt: startedAt.toISOString(),
    days,
    apply,
    invoices: { scanned: 0, candidates: [], canceled: [] },
    paymentLinks: { scanned: 0, candidates: [], updated: [] },
  };

  const toolkitReadAll = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    { actions: { invoices: { read: true }, paymentLinks: { read: true } } } as any
  );

  const toolkitActions = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    { actions: { invoices: { update: true }, paymentLinks: { update: true } } } as any
  );

  const toolsRead: any = toolkitReadAll.getTools();
  const toolsAct: any = toolkitActions.getTools();

  const plList = toolsRead['list_payment_links'];
  const plUpdate = toolsAct['update_payment_link'];
  const invList = toolsRead['list_invoices'];
  const invCancel = toolsAct['cancel_invoice'];

  if (!plList || !invList) {
    console.error('Required list tools missing.');
    process.exit(1);
  }

  // Helper: check if an ID looks like smoke-generated
  const isSmokeId = (id?: string) => !!id && (/^(SMOKE|SMK|DEMO)/i).test(id);

  // PAYMENT LINKS: scan
  console.log(`Scanning payment links (days=${days}, apply=${apply})...`);
  let offset = 0; const limit = 50;
  while (true) {
    const page = tryParse(await plList.execute({ offset, limit }));
    const links = page?.links || [];
    report.paymentLinks.scanned += links.length;
    for (const pl of links) {
      const id = pl?.id as string;
      const created = pl?.createdDate; // e.g., '2025-09-08 02:40:42.307'
      let createdMs = 0;
      if (created) {
        // CreatedDate format contains space; replace with 'T' and append 'Z'
        const iso = created.replace(' ', 'T') + 'Z';
        const d = Date.parse(iso); if (!Number.isNaN(d)) createdMs = d;
      }
      const oldEnough = createdMs > 0 ? createdMs < cutoff : false;
      if (isSmokeId(id) && oldEnough) {
        report.paymentLinks.candidates.push({ id, createdDate: created, status: pl?.status });
        if (apply && plUpdate) {
          try {
            // We don't have a delete; optionally we could set a short expiration if supported.
            // As a safe no-op, we leave payment links unchanged and only report.
            // const updated = tryParse(await plUpdate.execute({ id, clientReferenceCode: process.env.VISA_ACCEPTANCE_MERCHANT_ID }));
            // report.paymentLinks.updated.push({ id, status: updated?.status });
          } catch (e: any) {
            report.paymentLinks.updated.push({ id, error: e?.message || String(e) });
          }
          await delay(200);
        }
      }
    }
    if (!links.length || (page?.links?.length ?? 0) < limit) break;
    offset += limit;
  }

  // INVOICES: scan and cancel
  console.log(`Scanning invoices (days=${days}, apply=${apply})...`);
  offset = 0;
  while (true) {
    const page = tryParse(await invList.execute({ offset, limit }));
    const invoices = page?.invoices || [];
    report.invoices.scanned += invoices.length;
    for (const inv of invoices) {
      const id = inv?.id as string;
      const status = inv?.status as string;
      // DueDate is present; smoke-created have id starting 'SMK' and name 'Smoke Bot'
      const dueDate = inv?.invoiceInformation?.dueDate;
      let dueMs = 0;
      if (dueDate) { const d = Date.parse(dueDate); if (!Number.isNaN(d)) dueMs = d; }
      const oldEnough = dueMs > 0 ? dueMs < cutoff : true; // if no due date, treat as candidate when smoke id
      const smokeLike = isSmokeId(id) || /Smoke/i.test(inv?.customerInformation?.name || '');
      if (smokeLike && oldEnough && status !== 'CANCELLED') {
        report.invoices.candidates.push({ id, status, dueDate });
        if (apply && invCancel) {
          try {
            const cancelled = tryParse(await invCancel.execute({ invoice_id: id }));
            report.invoices.canceled.push({ id, status: cancelled?.status || 'CANCELLED' });
          } catch (e: any) {
            report.invoices.canceled.push({ id, error: e?.message || String(e) });
          }
          await delay(200);
        }
      }
    }
    if (!invoices.length || (page?.invoices?.length ?? 0) < limit) break;
    offset += limit;
  }

  const finishedAt = new Date();
  report.finishedAt = finishedAt.toISOString();
  report.durationMs = finishedAt.getTime() - startedAt.getTime();

  const file = path.join(process.cwd(), 'cleanup-report.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Cleanup report written to ${file}`);
  if (!apply) {
    console.log('Dry-run mode (no changes applied). Use --apply to cancel invoice candidates.');
  }
}

main();
