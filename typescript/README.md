# Visa Acceptance Agent Toolkit - TypeScript

Quick links: [Setup](./SETUP.md) · [Implementation](./IMPLEMENTATION.md)

The Visa Acceptance Agent Toolkit enables popular agent frameworks including Vercel's AI SDK to integrate with Visa Acceptance APIs through function calling. It provides tools for invoice management and other Visa Acceptance services, with support for customer information and enhanced invoice parameters through real Cybersource API integration.

## Installation

You don't need this source code unless you want to modify the package. If you just
want to use the package run:

```
npm install @visaacceptance/agent-toolkit
```

### Requirements

- Node 18+

## Usage

The library needs to be configured with your account's credentials which are available in your Visa Acceptance Dashboard. Additionally, `configuration` enables you to specify the types of actions that can be taken using the toolkit.

```typescript
import {VisaAcceptanceAgentToolkit} from '@visaacceptance/agent-toolkit/ai-sdk';

const visaAcceptanceAgentToolkit = new VisaAcceptanceAgentToolkit({
  merchantId: process.env.MERCHANT_ID,
  apiKeyId: process.env.API_KEY_ID,
  secretKey: process.env.SECRET_KEY,
  configuration: {
    actions: {
      invoices: {
        create: true,
        update: true,
        list: true,
        get: true,
      },
    },
  },
});
```

### Tools

The toolkit works with Vercel's AI SDK and can be passed as a list of tools. For example:

```typescript
import {AI} from '@vercel/ai';

const tools = visaAcceptanceAgentToolkit.getTools();

const ai = new AI({
  tools,
});

// Use the tools with Vercel AI SDK
const response = await ai.run({
  messages: [{ role: 'user', content: 'Create an invoice for $100 for customer John Doe' }],
});
```

#### Context

In some cases you will want to provide values that serve as defaults when making requests. Currently, the environment context value enables you to switch between test and production environments.

```typescript
const visaAcceptanceAgentToolkit = new VisaAcceptanceAgentToolkit({
  merchantId: process.env.MERCHANT_ID,
  apiKeyId: process.env.API_KEY_ID,
  secretKey: process.env.SECRET_KEY,
  configuration: {
    context: {
      environment: 'SANDBOX', // or 'PRODUCTION'
    },
  },
});
```

### Invoice Creation Example

Here's an example of creating an invoice with customer information and enhanced parameters:

```typescript
import {VisaAcceptanceAgentToolkit} from '@visaacceptance/agent-toolkit/ai-sdk';
import {openai} from '@ai-sdk/openai';
import {generateText} from 'ai';

const visaAcceptanceAgentToolkit = new VisaAcceptanceAgentToolkit({
  merchantId: process.env.VISA_ACCEPTANCE_MERCHANT_ID,
  apiKeyId: process.env.VISA_ACCEPTANCE_API_KEY_ID,
  secretKey: process.env.VISA_ACCEPTANCE_SECRET_KEY,
  configuration: {
    actions: {
      invoices: {
        create: true,
      },
    },
  },
});

const tools = visaAcceptanceAgentToolkit.getTools();

const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  prompt: `Create an invoice for $199.99 for John Doe (john.doe@example.com)
          with description "Premium Subscription" that should be sent immediately via email`,
});

console.log('Invoice creation result:', result);

```

## Model Context Protocol

The Visa Acceptance Agent Toolkit also supports the [Model Context Protocol (MCP)](https://modelcontextprotocol.com/). See `/examples/modelcontextprotocol` for an example. The same configuration options are available, and the server can be run with all supported transports.

```typescript
import {VisaAcceptanceAgentToolkit} from '@visaacceptance/agent-toolkit/modelcontextprotocol';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new VisaAcceptanceAgentToolkit({
  merchantId: process.env.MERCHANT_ID,
  apiKeyId: process.env.API_KEY_ID,
  secretKey: process.env.SECRET_KEY,
  configuration: {
    actions: {
      invoices: {
        create: true,
        update: true,
        list: true,
        get: true,
      },
    },
  },
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Visa Acceptance MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
```

## Configuration

Configuration is loaded from environment variables with fallbacks to default values:

- `VISA_ACCEPTANCE_MERCHANT_ID` - Your Visa Acceptance merchant ID
- `VISA_ACCEPTANCE_API_KEY_ID` - Your Visa Acceptance API key ID
- `VISA_ACCEPTANCE_SECRET_KEY` - Your Visa Acceptance secret key
- `VISA_ACCEPTANCE_ENVIRONMENT` - SANDBOX and PRODUCTION are available environments

## Examples (AI SDK) — Natural language and interactive flows

Change directory to `typescript/examples/ai-sdk`, copy `.env.template` to `.env`, fill SANDBOX creds, and verify with `npm run check`.

Common scripts:

- Create (NL)
  - `npm run nl:invoice -- "Create an invoice for 450 EUR for ACME Corp, due in 15 days."`
  - `npm run nl:pl -- "Create a payment link for 129.99 USD for ACME Plus."`

- Interactive creator
  - `npm run nl:interactive -- "Create an invoice for 250 EUR for Bob, email bob@example.com due in 10 days"`
  - Prompts for missing fields, confirms a summary, retries on error, and writes `audit-log.jsonl`.

- List/report (NL)
  - `npm run nl:invoice:list -- "list last 10 invoices"`
  - `npm run nl:pl:list -- "list last 5 payment links"`
  - Output shown as a compact table (ID, STATUS, AMOUNT, DUE for invoices; ID, STATUS, AMOUNT for links)

- Invoice ops (NL)
  - `npm run nl:invoice:get -- "get invoice NL123456"`
  - `npm run nl:invoice:send -- "send invoice NL123456"`
  - `npm run nl:invoice:cancel -- "cancel invoice NL123456"`
  - `npm run nl:invoice:update -- "update invoice NL123456 due on 2025-11-15 \"Consulting Q4\""`
    - You can add amount/currency if needed: `amount $240.00 USD`

### Web UI example

Prefer a simple browser UI? See `examples/web-ui` for a minimal React + Express app that can:

- Create invoices and pay-by-links via forms
- List recent invoices and pay links
- Try an AI Assistant that uses a unified `/api/assist` endpoint:
  - List actions (invoices, pay links) return immediately (single step)
  - Mutating actions (create/send/update) require a confirmation step; the server returns fields to review/edit before executing with `confirm=true`

Quick start:

```powershell
cd typescript\\examples\\web-ui
npm install
Copy-Item .env.template .env
notepad .env
npm run dev
```

### PowerShell quoting tips

- In Windows PowerShell, `$` can be expanded. Prefer quoting your prompts:
  - `"Create an invoice for 100 USD …"` or single quotes `'...'` to avoid `$` expansion issues

### Error suggestions and date phrases

- The examples surface short, reason‑specific hints for common validation errors:
  - Invalid currency → “Use a 3‑letter ISO currency code like USD or EUR (uppercase).”
  - Past due date → “Choose a future dueDate in YYYY‑MM‑DD (e.g., in 10 days).”
  - Missing amount → “Set a positive amount like 100.00 (two decimals).”
- Supported due date phrases: “in N days/weeks”, “due on YYYY‑MM‑DD”, “due next Friday”, “end of month”, “next business day”.

### Audit logging

- `nl:interactive` writes a JSON Lines audit file in the working directory:
  - `audit-log.jsonl` — one line per successful creation with timestamp, type, summary, id, and params

## Troubleshooting

- Env check: run `npm run check` in `examples/ai-sdk` to confirm SANDBOX and keys.
- AI tool failures fall back to deterministic local parsing; errors print a “Try:” hint when possible.
- If `nl:invoice:update` errors with missing amount/currency, include them in your text or ensure the invoice contains them.
