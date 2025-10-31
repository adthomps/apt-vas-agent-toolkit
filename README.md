# Visa Acceptance Agent Toolkit

Quick links: [Setup](./typescript/SETUP.md) · [Implementation](./typescript/IMPLEMENTATION.md) · [Changelog](./CHANGELOG.md)

Documentation: [Visa Acceptance Agent Toolkit — design & implementation](./docs/visa-acceptance-agent-toolkit.md)

The Visa Acceptance Agent Toolkit integrates with Vercel's AI SDK and the Model Context Protocol (MCP) for Visa Acceptance APIs. It provides tools to manage invoices, create payment links, and drive these actions from natural‑language (NL) prompts or interactive flows.

## Supported Frameworks

- **Vercel AI SDK** - Full integration with function calling and tool support
- **Model Context Protocol (MCP)** - Complete MCP server implementation
## TypeScript

### Installation

If you simply want to use the toolkit without modifying its source code, install it via:

```sh
npm install @visaacceptance/agent-toolkit
```

#### Requirements

- Node 18+

### Usage

Configure the toolkit with your Visa Acceptance account credentials. These credentials can be set using environment variables (`MERCHANT_ID`, `API_KEY_ID`, `SECRET_KEY`).

```typescript
import { VisaAcceptanceAgentToolkit } from "@visaacceptance/agent-toolkit/ai-sdk";

const toolkit = new VisaAcceptanceAgentToolkit({
  merchantId: process.env.VISA_ACCEPTANCE_MERCHANT_ID,
  apiKeyId: process.env.VISA_ACCEPTANCE_API_KEY_ID,
  secretKey: process.env.VISA_ACCEPTANCE_SECRET_KEY,
  configuration: {
    actions: {
      invoices: {
        create: true,
        update: true,
        list: true,
        get: true,
        send: true,
        cancel: true
      },
      paymentLinks: {
        create: true,
        update: true,
        list: true,
        get: true,
      },
    },
  },
});
```

### Integrating with Vercel's AI SDK

To use this toolkit with Vercel's AI SDK:

```typescript
import { AI } from "@vercel/ai";
import { VisaAcceptanceAgentToolkit } from "@visaacceptance/agent-toolkit/ai-sdk";

const toolkit = new VisaAcceptanceAgentToolkit({
  merchantId: process.env.MERCHANT_ID,
  apiKeyId: process.env.API_KEY_ID,
  secretKey: process.env.SECRET_KEY,
  configuration: {
    actions: {
      invoices: {
        create: true,
      }
    },
  },
});

const ai = new AI({
  tools: toolkit.getTools(),
});

// Sample usage:
const response = await ai.run({
  messages: [{ role: "user", content: "Please create an invoice for $200" }],
});
```

### Context

You can set default behaviors or environments via the `configuration.context` block. For example, enabling test environments:

```typescript
const toolkit = new VisaAcceptanceAgentToolkit({
  merchantId: process.env.MERCHANT_ID,
  apiKeyId: process.env.API_KEY_ID,
  secretKey: process.env.SECRET_KEY,
  configuration: {
    context: {
      environment: "SANDBOX",
    },
  },
});

### Natural language and interactive flows (Examples)

See `typescript/examples/ai-sdk` for ready‑to‑run scripts that turn human text into Visa Acceptance actions against SANDBOX:

- Create via NL
  - `nl:invoice` — “Create an invoice for 450 EUR for ACME Corp, due in 15 days.”
  - `nl:pl` — “Create a payment link for 129.99 USD for ACME Plus.”
  - `nl:pl:get` — “get payment link PL123456”
  - `nl:pl:update` — “update payment link PL123456 set amount to 25.00 for \"New Item\"”
- Interactive assistant
  - `nl:interactive` — Collects missing fields, confirms, retries on error, writes an audit record.
- Read/report (NL)
  - `nl:invoice:list` — “list last 10 invoices”, “list invoices status SENT”
  - `nl:pl:list` — “list last 5 payment links”
- Invoice ops (NL)
  - `nl:invoice:get` — “get invoice NL123456”
  - `nl:invoice:send` — “send invoice NL123456”
  - `nl:invoice:cancel` — “cancel invoice NL123456”
  - `nl:invoice:update` — “update invoice NL123456 due on 2025‑11‑15 "Consulting Q4"”

Features in the examples:
- AI‑first tool calling with robust local fallback
- Helpful error suggestions (e.g., “Use a 3‑letter ISO currency code…”, “Choose a future dueDate…”)
- Date phrases like “in 10 days”, “due next Friday”, “end of month”, “next business day”
- Audit logging (JSONL) for successful creations
- PowerShell quoting tips and protection from `$` expansion

### Web UI demo (Vite + Express)

A simple demo UI is available under `typescript/examples/web-ui`.

Run it locally:

1. Open a terminal in `typescript/examples/web-ui` and install dependencies.
2. Create a `.env` (and optionally `.env.local`) with your Visa Acceptance credentials:
  - `VISA_ACCEPTANCE_MERCHANT_ID`
  - `VISA_ACCEPTANCE_API_KEY_ID`
  - `VISA_ACCEPTANCE_SECRET_KEY`
  - Optional: `VISA_ACCEPTANCE_ENVIRONMENT` (default `SANDBOX`)
3. Start the dev servers with `npm run dev` (this runs Vite and the local Express API together).

By default, the UI calls the API on the same origin. To target a different API base, you can set a global `window.API_BASE = "https://your-api"` before the app mounts (for example in `index.html`).

AI Assistant endpoint (unified):
- The demo server exposes `POST /api/assist`, which handles both extraction and execution:
  - List actions (list invoices/pay-links) execute immediately and return normalized `{ invoices|paymentLinks, total }`.
  - Mutating actions (create/send/update) return a confirmation payload first; send `confirm=true` to execute with edited fields.
  - Payment link lists are enriched with `created` and `paymentLink` when affordable (limit ≤ 5) to keep “Created” and “Actions” reliably populated.

## Tests & smoke runs

This repository includes lightweight smoke and browser tests for the examples to help validate end-to-end flows in SANDBOX and to aid CI verification.

- AI SDK examples (Node/ts-node)
  - Run the direct smoke runner which executes a handful of direct example scripts sequentially:

    ```powershell
    cd typescript\examples\ai-sdk
    npm install
    npm run smoke:direct
    ```

  - A Jest smoke test is provided (`npm run test:smoke`) which runs the smoke runner in a subprocess and asserts it exits without a fatal error. Install dev deps and run it with:

    ```powershell
    cd typescript\examples\ai-sdk
    npm install
    npm run test:smoke
    ```

- Web UI (Playwright)
  - Playwright tests include a docs button smoke and AI list flows (mock mode). To run Playwright tests:

    ```powershell
    cd typescript\examples\web-ui
    npm install
    npx playwright install
    npm run test:playwright
    ```

  - The AI agent list tests start the example server in mock mode and verify single-step list behavior via `/api/assist`.

CI suggestions:
- Add a job that installs deps and runs `npm run test:smoke` (ai-sdk) and `npm run test:playwright` (web-ui). For true end-to-end verification you can provide SANDBOX credentials as repository secrets.

## Deploy the Web UI example to Vercel

You can deploy the example UI under `typescript/examples/web-ui` directly to Vercel using the included `vercel.json`.

- Root Directory: `typescript/examples/web-ui`
- Build Command: `npm run build`
- Output Directory: `dist`
- Serverless API: `api/index.ts` (Express app wrapped via `serverless-http`)
- SPA rewrite: `/(.*) -> /index.html` (handled by `vercel.json`)

Environment variables to configure in the Vercel Project (Settings → Environment Variables):

- `VISA_ACCEPTANCE_MERCHANT_ID`
- `VISA_ACCEPTANCE_API_KEY_ID`
- `VISA_ACCEPTANCE_SECRET_KEY`
- `VISA_ACCEPTANCE_ENVIRONMENT` = `SANDBOX` (or `PRODUCTION` later)
- `OPENAI_API_KEY` (optional; enables AI classification in `/api/assist`)
- `VISA_ACCEPTANCE_API_MOCK` (optional; set to `true` to run in mock mode for demos/tests)

Notes
- The web UI depends on `@visaacceptance/agent-toolkit`. In this monorepo it’s referenced as a local `file:` dependency and includes a `prepare` script that builds the package during install. Vercel will install and build it as part of the deployment.
- The backend Express server auto-detects SANDBOX credentials and will fall back to a mock in‑memory store if `VISA_ACCEPTANCE_API_MOCK=true` or credentials are not present.
- Health endpoint: `/api/health` (useful to verify env var presence and readiness).

Optional Deploy Button (replace <OWNER>/<REPO> with your GitHub org/repo):

[
  ![Deploy with Vercel](https://vercel.com/button)
](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F<OWNER>%2F<REPO>&root-directory=typescript%2Fexamples%2Fweb-ui)

```

## Model Context Protocol

The [Model Context Protocol (MCP)](https://modelcontextprotocol.com/) is also supported. You can run a Visa Acceptance MCP server with:

```bash
npx -y @visaacceptance/mcp --tools=all --merchant-id=YOUR_MERCHANT_ID --api-key-id=YOUR_API_KEY_ID --secret-key=YOUR_SECRET_KEY
```

### MCP roadmap and parity

The MCP server today exposes the same core tools (create/update/list/get/send/cancel for invoices and create/update/list/get for payment links). NL wrappers and interactive flows demonstrated in the AI SDK examples are on the roadmap for MCP as structured prompts/templates and agent flows. The goal is parity of capabilities across both integrations.

## Supported API Methods

The toolkit currently provides the following Visa Acceptance operations:

- **Invoices**
  - Create an invoice - Create a new invoice with customer information and enhanced parameters
  - Update an invoice - Update existing invoice details including customer and invoice information
  - List invoices - Retrieve paginated list of invoices with filtering options
  - Get invoice - Retrieve detailed information for a specific invoice
  - Send invoice - Send invoice to customer via email
  - Cancel invoice - Cancel an existing invoice

- **Payment Links**
  - Create a payment link - Create a new payment link with optional shipping information
  - Update a payment link - Update existing payment link details
  - List payment links - Retrieve paginated list of payment links
  - Get payment link - Retrieve details of a specific payment link


## DISCLAIMER
AI-generated content may be inaccurate or incomplete. Users are fully responsible for verifying any information before relying on it, especially for financial decisions. Visa Acceptance is not liable for any usage, decisions, or damages resulting from AI outputs or this toolkit.

### Agent Toolkit Disclaimer
The Agent Toolkit is a SDK provided as a developer tool to facilitate integration of select Visa APIs with large language models (LLMs) or AI services used or accessed by Agent Toolkit licensees. No LLMs or AI services are provided or delivered by Visa through the Agent Toolkit. Licensees of the Agent Toolkit are solely responsible for selecting, procuring, licensing or otherwise obtaining access to, configuring, and maintaining their own LLMs, AI services, and data sources.

### MCP Server Disclaimer
This  Model Context Protocol (MCP) server is  provided in conjunction with the Agent Toolkit SDK to facilitate integration of select Visa APIs with large language models (LLMs) or AI services used or accessed by Agent Toolkit licensees. No LLMs or AI services are provided or delivered by Visa through the MCP server or Agent Toolkit. Licensees of the Agent Toolkit are solely responsible for selecting, procuring, licensing or otherwise obtaining access to, configuring, and maintaining their own LLMs, AI services, and data sources.


## License

MIT
