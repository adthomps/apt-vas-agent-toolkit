#!/usr/bin/env node
// smoke-run.js — sequentially run direct-* example scripts for quick verification
// Usage: node smoke-run.js

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const cwd = __dirname;
function run(cmd, args, opts = {}) {
  console.log('\n==== Running:', [cmd, ...args].join(' '));
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: Object.assign({}, process.env, opts.env || {}) });
  if (res.error) {
    console.error('Error running command:', res.error);
    return { code: 1, error: res.error };
  }
  return { code: res.status };
}

(async function main(){
  console.log('Smoke run: direct examples (using .env from examples folder if present)');

  // Ensure at least merchant credentials exist
  if (!process.env.VISA_ACCEPTANCE_MERCHANT_ID || !process.env.VISA_ACCEPTANCE_API_KEY_ID || !process.env.VISA_ACCEPTANCE_SECRET_KEY) {
    console.warn('Missing VISA_ACCEPTANCE_* credentials in environment or .env — smoke will still run but API calls may fail.');
  }

  const steps = [
    { name: 'Create invoice', cmd: 'npx', args: ['ts-node', '--transpile-only', 'direct-invoice-create.ts'] },
    { name: 'List invoices', cmd: 'npx', args: ['ts-node', '--transpile-only', 'direct-invoice-list.ts'] },
    { name: 'Create payment link', cmd: 'npx', args: ['ts-node', '--transpile-only', 'direct-paymentlink-create.ts'] },
    { name: 'List payment links', cmd: 'npx', args: ['ts-node', '--transpile-only', 'direct-list.ts'] },
  ];

  for (const s of steps) {
    console.log(`\n--- ${s.name}`);
    const r = run(s.cmd, s.args);
    if (r.code !== 0) {
      console.warn(`${s.name} exited with code ${r.code}. Continuing smoke run.`);
    }
  }

  // Optional: run get/update steps if caller supplied IDs in env
  if (process.env.SMOKE_INVOICE_ID) {
    console.log('\n--- Get invoice (SMOKE_INVOICE_ID)');
    run('npx', ['ts-node', '--transpile-only', 'direct-invoice-get.ts', process.env.SMOKE_INVOICE_ID]);
  } else {
    console.log('\nSkipping invoice get (set SMOKE_INVOICE_ID to run)');
  }

  if (process.env.SMOKE_PAYMENTLINK_ID) {
    console.log('\n--- Get payment link (SMOKE_PAYMENTLINK_ID)');
    run('npx', ['ts-node', '--transpile-only', 'direct-paymentlink-get.ts', process.env.SMOKE_PAYMENTLINK_ID]);

    console.log('\n--- Update payment link (SMOKE_PAYMENTLINK_ID)');
    run('npx', ['ts-node', '--transpile-only', 'direct-paymentlink-update.ts', process.env.SMOKE_PAYMENTLINK_ID]);
  } else {
    console.log('\nSkipping payment link get/update (set SMOKE_PAYMENTLINK_ID to run)');
  }

  console.log('\nSmoke run complete. Review above output for any errors.');
})();
