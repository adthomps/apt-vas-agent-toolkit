// Natural Language to Payment Link creation using AI tools (with local fallback)
require('dotenv').config();

import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

type ParsedPL = {
  amount?: string; // optional if donation link without fixed amount
  currency: string;
  title?: string; // product name / short description
};

function pad(n: number) { return n.toString().padStart(2, '0'); }
function toISODate(d: Date) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`; }

function parseNL(input: string): ParsedPL {
  const text = input.trim();
  const moneyMatch = text.match(/\$(\d+(?:\.\d{1,2})?)/i) || text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
  const amount = moneyMatch ? moneyMatch[1] : undefined;

  const currMatch = text.match(/\b(USD|EUR|GBP|AUD|CAD|JPY|INR)\b/i);
  const currency = currMatch ? currMatch[1].toUpperCase() : (text.includes('$') ? 'USD' : 'USD');

  // Title/description after 'for <something>'
  const titleMatch = text.match(/\bfor\s+([^,]+?)(?=\.|$|\s+in\b|\s+USD|\s+EUR|,)/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Item';

  return {
    amount: amount ? Number(amount).toFixed(2) : undefined,
    currency,
    title,
  };
}

function randAlphaNum(len=8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i=0;i<len;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

function purchaseNumber() { return ('PL' + randAlphaNum(8)).slice(0, 18); }

async function runWithAI(toolkit: any, userCommand: string) {
  const tools = toolkit.getTools();
  const system = `
You translate natural language commands about payment links into a single tool call.
Rules:
- Always call the create_payment_link tool exactly once.
- linkType should be "PURCHASE" unless clearly a donation.
- purchaseNumber must be alphanumeric and <20 chars. If not provided, make one like PL####.
- Use orderInformation.lineItems with a single item when applicable.
- If an amount is given, set both orderInformation.amountDetails.totalAmount and the line item unitPrice.
- Keep productName short (<=50 chars).
`;

  return await generateText({
    model: openai('gpt-4o'),
    tools: { ...tools },
    maxSteps: 5,
    system,
    prompt: userCommand,
  });
}

async function runLocally(toolkit: any, userCommand: string) {
  const tools = toolkit.getTools();
  const createPL = (tools as any)['create_payment_link'];
  if (!createPL) throw new Error('create_payment_link tool not available');

  const parsed = parseNL(userCommand);
  const amount = parsed.amount; // optional
  const pn = purchaseNumber();

  const params: any = {
    linkType: 'PURCHASE',
    purchaseNumber: pn,
    currency: parsed.currency,
    totalAmount: amount, // can be omitted by API if not provided
    requestPhone: false,
    requestShipping: false,
    clientReferenceCode: undefined,
    lineItems: [
      {
        productName: parsed.title || 'Item',
        productSKU: pn,
        productDescription: parsed.title || 'Item',
        quantity: '1',
        unitPrice: amount || '1.00',
      }
    ]
  };

  const output = await (createPL as any).execute(params);
  return { text: 'Payment link created (local parsing).', toolResults: [{ toolName: 'create_payment_link', result: output }] };
}

async function main() {
  const userCommand = process.argv.slice(2).join(' ') || 'Create a payment link for 129.99 USD for ACME Plus.';
  const configuration = { actions: { paymentLinks: { create: true } } } as const;

  const visaEnvironment = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    visaEnvironment,
    configuration as any
  );

  const hasAIKey = !!process.env.OPENAI_API_KEY;
  console.log(`NL → Payment Link on ${visaEnvironment}. Using ${hasAIKey ? 'AI tools' : 'local parser'}...`);
  try {
    let result = hasAIKey ? await runWithAI(toolkit, userCommand) : await runLocally(toolkit, userCommand);

    const toolResultsRaw: any[] = (result as any).toolResults || (result as any).steps?.flatMap((s: any) => s.toolResults?.map((tr: any) => tr.result) || []) || [];
    const failed = toolResultsRaw.length === 0 || toolResultsRaw.some((r) => typeof r === 'string' && /Failed to create payment link/i.test(r) || (r && typeof r === 'object' && (r as any).error));
    if (failed && hasAIKey) {
      try {
        if (toolResultsRaw.length) {
          console.warn('AI tool call error details:', JSON.stringify(toolResultsRaw, null, 2));
          const hint = toolResultsRaw.find((r: any) => r && typeof r === 'object' && r.suggestion)?.suggestion;
          if (hint) console.warn('Tip:', hint);
        }
      } catch {}
      console.warn('AI tool call did not succeed; retrying with local parsing...');
      result = await runLocally(toolkit, userCommand);
    }

    let printed = false;
    const toolResults: any[] = (result as any).toolResults || (result as any).steps?.flatMap((s: any) => s.toolCalls?.map((c: any) => c.result) || []) || [];
    for (const r of toolResults) {
      if (!r) continue;
      try {
        const obj = typeof r === 'string' ? JSON.parse(r) : r;
        const id = obj?.id || obj?.referenceNumber || obj?._links?.self?.href;
        const status = obj?.status || obj?.state || obj?.processingInformation?.state;
        if (id) { console.log('Created payment link:', { id, status }); printed = true; break; }
      } catch {}
    }
    if (!printed) console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('NL payment link failed:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
