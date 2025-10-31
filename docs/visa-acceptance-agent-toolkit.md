# Visa Acceptance Agent Toolkit — Design & Implementation

[![Docs](https://img.shields.io/badge/Docs-Guide-blue.svg)](../README.md)  [Back to repository README](../README.md)


This document explains the design and implementation of the Visa Acceptance Agent Toolkit features found in this repository. It covers:

- The natural-language extractor used to pre-fill pay-by-link/invoice fields
- The unified Assist endpoint (`POST /api/assist`) used by the example web UI for AI flows
- Integration with the Vercel AI SDK and the Model Context Protocol components
- Normalization and enrichment strategies for consistent UI tables and “last 5 rows” layouts

## Overview

The project contains a lightweight "agent" toolkit used to pre-fill and assist pay-by-link creation flows. Key responsibilities:

- Infer amount, currency, memo, link type, and optional min/max ranges from free-text prompts.
- Provide a small Node-friendly extractor module so unit tests and debug runs are easy (no test framework required).
- Demonstrate integration with Vercel AI SDK and the Model Context Protocol (MCP) in the TypeScript example UI.

Top-level files of interest:

- `typescript/examples/web-ui/src/ui/extractor.js` — the plain-JS extractor module (exports `inferFromText` and `wordsToNumber`).
- `typescript/examples/web-ui/src/ui/extractor.test.js` — Node-run test harness for the extractor.
- `typescript/examples/web-ui/src/ui/App.tsx` — example React UI; AI Assistant is powered by `/api/assist` for single-step lists and confirm-to-execute mutations.
- `typescript/examples/web-ui/server/app.ts` — Express server exposing `/api/invoices`, `/api/payment-links`, and `/api/assist`.
- `modelcontextprotocol/` and `src/modelcontextprotocol/` — MCP-related interfaces used by the toolkit and examples.

## Extractor: goals and contract

Contract (inputs/outputs):

- Function: `inferFromText(text, src?)`
  - Inputs:
    - `text` (string): free-text prompt from user or agent.
    - `src` (object, optional): partial existing payload to merge into the result.
  - Output: An object containing zero or more of the keys: `amount`, `currency`, `memo`, `linkType`, `minAmount`, `maxAmount`.
  - Error modes: returns a best-effort object; fields not inferred are simply absent.

- Function: `wordsToNumber(s)` — utility that converts small English number phrases (e.g., "twenty-five", "one hundred and twenty") into numeric values.

Success criteria:
- Correctly extract numeric amounts (including commas and decimal points), word-number phrases, currency words and codes, quoted memos, and ranges expressed as "between X and Y" or "X to Y".

Edge cases considered:
- Filler words like "and" in word-numbers.
- Hyphenated words (e.g., "twenty-five").
- Thousands separators (e.g., "1,000").
- Ranges where one side is words and the other is numeric.
- Avoiding greedy regex captures that swallow trailing memo text.

## Implementation highlights (extractor.js)

- DEBUG flag: a lightweight boolean constant at the top of the file controls conditional debug output when running locally or during tests. This avoids noisy console output in production.

- wordsToNumber(s):
  - Lowercases and trims input.
  - Removes characters not relevant to number words.
  - Handles hyphens and ignores filler words like "and".
  - Maps basic number words (zero..ninety, hundred) to numeric values and combines them properly (e.g., "one hundred and twenty five" => 125).

- extractNumberFromMatch(m):
  - Strips trailing currency words (e.g., "dollars") before attempting conversions.
  - Attempts numeric parsing first (handles commas and decimals).
  - Falls back to `wordsToNumber` for word-number phrases.

- Range parsing:
  - `between X and Y` is handled by slicing the text after the `between` token and splitting on `and`, then choosing sensible left/right candidates (preferring tokens that contain digits but falling back to short word phrases).
  - `X to Y` is handled programmatically by taking nearest tokens to the left and right of the `to` token. A deterministic heuristic picks the last token on the left and the first token on the right; numeric tokens are preferred. This avoids greedy regexes and prevents capturing surrounding words like "for five".

- Amount & currency extraction:
  - Dollar sign patterns (`$12.34`), numbers with trailing currency codes (`12.34 USD`), and word-amount patterns like "for twenty five dollars" are recognized.
  - Currency normalizer maps common words and codes to ISO-like short codes (`USD`, `EUR`, `GBP`, ...).

- Memo extraction:
  - Prefers quoted strings (`"..."` or `'...'`) up to a length limit, otherwise captures short phrases following `for`, `memo`, or `description`.

## How the extractor is used in the Vercel AI SDK / MCP demo flow

The TypeScript example UI (`typescript/examples/web-ui`) demonstrates two complementary paths in an agent-driven flow:

1) Unified Assist endpoint (default in the UI):
  - Client posts `{ prompt, action?, confirm?, overrides? }` to `/api/assist`.
  - For list actions (invoices, pay-links), the server executes immediately and returns normalized results.
  - For mutating actions (create/send/update), the server returns `{ type: "confirmation", fields, missing }`; the UI lets the user edit then resubmits with `confirm: true` to execute.

2) Local extractor pre-fill (optional):
  - The app can still call `inferFromText(prompt)` to produce suggested values deterministically, useful for tests or when LLM access is not available.

The project includes a small wrapper around the Vercel AI SDK in `typescript/ai-sdk` that demonstrates how to:

- Load model clients.
- Send messages and additional context (like the inferred form fields).
- Parse back responses that might contain editing suggestions for memo or currency.

Note: the example code in `examples/web-ui` is intentionally minimal and focuses on integration patterns rather than production-ready model prompt engineering.

## Unified Assist endpoint (design)

Endpoint: `POST /api/assist`

Request body fields:
- `prompt` (string): user input or NL instruction.
- `action` (optional string): one of `create-invoice`, `list-invoices`, `send-invoice`, `create-pay-link`, `list-pay-links`, `update-invoice`. If omitted, simple classification runs when an LLM key is available; otherwise heuristic fallbacks are used.
- `confirm` (optional boolean): defaults to `false`. For mutating actions, set `true` to execute after reviewing the confirmation payload.
- `overrides` (optional object): edited fields applied when confirming mutations.

Response shapes:
- List actions: `{ type: "result", action, result: { invoices|paymentLinks, total } }`
- Mutations (first pass): `{ type: "confirmation", action, fields, missing }`
- Mutations (after confirm): `{ type: "result", action, result: {...} }`

Normalization and enrichment:
- Invoices: server returns `{ invoices, total }`. Optional `status` filtering supports mappings from human phrases to canonical statuses: `DRAFT`, `CREATED`, `SENT`, `PARTIAL`, `PAID`, `CANCELED`. An optional `minAmount` numeric filter is applied server-side.
- Pay links: server returns `{ paymentLinks, total }`. Status is sanitized to `ACTIVE` or `INACTIVE` only; invoice statuses are ignored. When affordable (limit ≤ 5), the server enriches missing `created` and `paymentLink` values via a detail fetch per item so that UI “Created” and “Actions” columns remain populated.
- “Last 5 rows” UX: tables always render up to 5 rows; if fewer are available, the UI pads with placeholders for consistent layout.

Example: list unpaid invoices over $500 USD

Request

```json
{
  "prompt": "Find all unpaid invoices over $500 USD",
  "action": "list-invoices"
}
```

Response

```json
{
  "type": "result",
  "action": "list-invoices",
  "result": {
    "invoices": [ { "id": "INV-SEED-2", "status": "sent", ... } ],
    "total": 2
  }
}
```

Example: create invoice (confirmation then execute)

1) First call

```json
{
  "prompt": "Create invoice $450 USD to billing@acme.example due in 15 days",
  "action": "create-invoice"
}
```

Response (confirmation)

```json
{
  "type": "confirmation",
  "action": "create-invoice",
  "fields": { "amount": 450, "currency": "USD", "email": "billing@acme.example", "dueDate": "2025-11-12" },
  "missing": []
}
```

2) Confirm

```json
{
  "prompt": "Create invoice $450 USD to billing@acme.example due in 15 days",
  "action": "create-invoice",
  "confirm": true,
  "overrides": { "memo": "Website redesign" }
}
```

Response (result)

```json
{ "type": "result", "action": "create-invoice", "result": { "id": "NL123...", ... } }
```

## API calls & example usage

The example UI wires a demo server API to create and query payment links. Look in `typescript/examples/web-ui/server/` for the server entry and `api/` for the client integration.

Typical flow for a pay-by-link creation (high-level):

1. Client creates a payload (optionally using `inferFromText`) with keys: `amount`, `currency`, `memo`, `linkType`, `minAmount`, `maxAmount`.
2. Client posts to the example API endpoint which validates and stores the link.
3. The server returns a link object with an `id` and public link URL.

When building real integrations, replace the example server endpoints with your payment provider's API. The extractor is provider-agnostic — it only produces structured metadata consumed by your business logic. If you prefer server-led AI orchestration, adopt the `/api/assist` pattern in your backend for a consistent single-endpoint flow.

## Developer instructions — run & test (PowerShell)

Run the extractor tests (Node):

```powershell
# from repository root
node typescript/examples/web-ui/src/ui/extractor.test.js
```

Run the TypeScript example UI build (example):

```powershell
# build the web-ui example (run from the repo root)
npm run build --prefix typescript\examples\web-ui
```

Run TypeScript checks (no emit):

```powershell
npx tsc --noEmit -p typescript/examples/web-ui/tsconfig.json
```

Enable debug logs for extractor (local edit):

- Open `typescript/examples/web-ui/src/ui/extractor.js` and set `const DEBUG = true;` at the top to enable conditional debug output used in tests and temporary debug scripts.

## Maintenance & testing notes

- The extractor is intentionally small to keep it easy to test with Node; it uses plain JS to be runnable without the TypeScript build.
- If you add more complex number phrasing support (e.g., "two thousand three hundred and five"), add unit tests in `typescript/examples/web-ui/src/ui/extractor.test.js` first and expand `wordsToNumber` accordingly.
- The `to`/`between` parsing heuristics are intentionally conservative: prefer numeric tokens first and fall back to short word phrases to avoid false positives in long sentences.

## Suggested next steps

- Add more unit tests for ordinal or large-number phrases (e.g., "two thousand three hundred").
- Add a small CI job that runs the Node test harness to prevent regressions.
- Extract token-selection heuristics into small helper functions and unit-test them directly for easier tuning.

---

If you'd like, I can also add a short Markdown snippet to the example UI README and/or create an entry in the top-level `README.md` linking to this document. I can also add the suggested CI step (GitHub Actions) if you want me to scaffold it.

## Hosting on Vercel (example UI)

The example web UI under `typescript/examples/web-ui` is pre-configured to run on Vercel:

- `vercel.json` sets the build command (`npm run build`), output directory (`dist`), and rewrites so that `/api/(.*)` routes to a serverless function (`/api/index.ts`) and other routes serve `index.html`.
- The Express app is wrapped with `serverless-http` at `api/index.ts`.
- Environment variables to provide in Vercel: `VISA_ACCEPTANCE_MERCHANT_ID`, `VISA_ACCEPTANCE_API_KEY_ID`, `VISA_ACCEPTANCE_SECRET_KEY`, `VISA_ACCEPTANCE_ENVIRONMENT` (e.g., `SANDBOX`), optional `OPENAI_API_KEY`, and optional `VISA_ACCEPTANCE_API_MOCK` for demo mode.

Monorepo note: The web UI depends on `@visaacceptance/agent-toolkit` via a local `file:` dependency. The package includes a `prepare` script that builds during install, which Vercel runs automatically.

## Example API payloads (demo server)

Below are a few realistic example request and response payloads used by the demo server in `typescript/examples/web-ui`. These illustrate how the extractor output maps to the server API payloads for creating payment links and invoices.

Payment link - create (client -> server)

Request JSON (POST /api/payment-links)

```json
{
  "amount": "25",
  "currency": "USD",
  "memo": "T-shirt",
  "linkType": "PURCHASE",
  "minAmount": null,
  "maxAmount": null,
  "metadata": { "sku": "TSHIRT-001" }
}
```

Server response (201 Created)

```json
{
  "id": "pl_01Hxxxxxx",
  "url": "https://demo.pay/links/pl_01Hxxxxxx",
  "amount": "25",
  "currency": "USD",
  "memo": "T-shirt",
  "linkType": "PURCHASE",
  "createdAt": "2025-10-27T12:34:56.789Z",
  "status": "ACTIVE"
}
```

Payment link - tiered/donation range (client -> server)

Request JSON (POST /api/payment-links)

```json
{
  "minAmount": "5",
  "maxAmount": "50",
  "currency": "USD",
  "memo": "Tiered Donation",
  "linkType": "DONATION"
}
```

Server response (201 Created)

```json
{
  "id": "pl_01Hyyyyyy",
  "url": "https://demo.pay/links/pl_01Hyyyyyy",
  "minAmount": "5",
  "maxAmount": "50",
  "currency": "USD",
  "memo": "Tiered Donation",
  "linkType": "DONATION",
  "createdAt": "2025-10-27T12:40:00.000Z",
  "status": "ACTIVE"
}
```

Invoice - create (client -> server)

Request JSON (POST /api/invoices)

```json
{
  "customer": {
    "name": "Acme Corp",
    "email": "billing@acme.example"
  },
  "items": [
    { "description": "Consulting (10 hours)", "quantity": 10, "unitPrice": "150.00", "currency": "USD" }
  ],
  "memo": "Consulting Q4",
  "dueDate": "2025-11-15"
}
```

Server response (201 Created)

```json
{
  "id": "inv_01Hzzzzzz",
  "invoiceNumber": "NL-2025-0001",
  "total": "1500.00",
  "currency": "USD",
  "status": "DRAFT",
  "memo": "Consulting Q4",
  "customer": { "name": "Acme Corp", "email": "billing@acme.example" },
  "createdAt": "2025-10-27T12:50:00.000Z"
}
```

How the extractor output maps to the API payloads

- `amount` -> typically becomes the payment `amount` on a payment-link payload (if min/max are not set).
- `minAmount`/`maxAmount` -> used for tiered or donation links where the customer can choose an amount within the range.
- `currency` -> maps to the `currency` field (ISO-like 3-letter codes are preferred).
- `memo` -> maps to either `memo` or `description` fields depending on the endpoint.

Quick curl and PowerShell examples

curl (JSON POST):

```bash
curl -X POST "http://localhost:5173/api/payment-links" \
  -H "Content-Type: application/json" \
  -d '{"minAmount":"5","maxAmount":"50","currency":"USD","memo":"Tiered Donation","linkType":"DONATION"}'
```

PowerShell (Invoke-WebRequest):

```powershell
$body = @{ minAmount = '5'; maxAmount = '50'; currency = 'USD'; memo = 'Tiered Donation'; linkType = 'DONATION' } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:5173/api/payment-links" -Method POST -Body $body -ContentType "application/json"
```

Notes

- The example demo server included with the repo is intentionally minimal: when integrating with a real payment provider, adapt the payload fields to match the provider API.
- The extractor only produces suggested fields — server-side validation should always run and enforce required fields and amounts.

## Using the Visa Acceptance Agent Toolkit with the Vercel AI SDK

The example code in this repository demonstrates two complementary integration patterns between the Visa Acceptance Agent Toolkit and the Vercel AI SDK:

- Pre-fill: Use the local extractor (`inferFromText`) to convert a user's free-text prompt into structured fields, then present those fields in the UI and optionally send them as structured context to an LLM for validation or suggestion.
- Tool-driven agent: Register the toolkit's action tools with the Vercel AI SDK so the model can call the toolkit's tools directly (tool calling). The model can request an action (e.g., create invoice or payment link); the toolkit executes and returns structured results which the LLM can include in the conversation.

Both approaches are implemented in the TypeScript examples. Below are concrete usage examples and notes about expected behavior.

### 1) Pre-fill flow (extractor + optional LLM validation)

This is a lightweight approach where the frontend uses `inferFromText` to produce a suggested payload, shows it to the user for confirmation, and (optionally) sends the structured payload to an LLM for suggestion or validation before hitting the API.

TypeScript example (frontend):

```ts
import { inferFromText } from './src/ui/extractor';

async function handlePrompt(prompt: string) {
  // 1. Local pre-fill
  const suggested = inferFromText(prompt, {});

  // 2. Show in UI to user (omitted) and optionally send to an LLM for validation/smart defaults
  // Example: send the suggested payload as context to an LLM conversation
  const aiContext = `Suggested payment link: ${JSON.stringify(suggested)}`;
  // Pass aiContext to model via your AI client (see below) to ask for edits or confirmation

  return suggested;
}
```

When to use this: quick UX where deterministic, auditable parsing is preferred and you want to confirm values before creating a payment link.

### 2) Tool-driven agent flow (Vercel AI SDK + toolkit tools)

Register the toolkit's tools with the Vercel AI SDK so the model can call them directly. The toolkit exposes action tools (create/list/get/update/send/cancel) that encapsulate business logic and API calls.

TypeScript server example (registering tools):

```ts
import { AI } from '@vercel/ai';
import { VisaAcceptanceAgentToolkit } from '@visaacceptance/agent-toolkit/ai-sdk';

const toolkit = new VisaAcceptanceAgentToolkit({
  merchantId: process.env.VISA_ACCEPTANCE_MERCHANT_ID!,
  apiKeyId: process.env.VISA_ACCEPTANCE_API_KEY_ID!,
  secretKey: process.env.VISA_ACCEPTANCE_SECRET_KEY!,
  configuration: {
    actions: { invoices: { create: true }, paymentLinks: { create: true } }
  }
});

const ai = new AI({
  // Model and tool registration. `getTools()` returns tool definitions the AI SDK understands.
  tools: toolkit.getTools(),
});

// Example: have the agent create a payment link via tool calling
const response = await ai.run({
  messages: [
    { role: 'user', content: 'Create a donation link for five to fifty dollars for "Local Shelter"' }
  ]
});

// The SDK will route tool calls to the toolkit; the toolkit executes the action and returns a structured tool result.
console.log('Agent run response:', response);
```

Notes on tool-driven flows:

- The toolkit's tools are authoritative: they perform server-side validation and call your payment provider or example demo server.
- Tool responses are structured (JSON-like) and include IDs and status fields. The LLM can include the returned data in its reply.
- You should log and audit tool calls. The examples include simple JSONL audit logs for successful creations.

### Combining both approaches

For a robust interactive experience you can combine pre-fill with tool-driven agents:

1. Use `inferFromText` to produce a suggested payload quickly on the client side.
2. Send the suggested payload to the model along with a prompt like "Validate or improve these fields and call the payment link tool if ready." The model may either ask for more information, suggest edits, or call the toolkit's `createPaymentLink` tool directly.

Example prompt to the model:

```
Here is a suggested payment link payload: {suggestedPayload}
If payload is valid, call the payment link creation tool with this payload. Otherwise ask follow-up questions.
```

### Typical tool output shape

Tool outputs commonly include an `id`, `url`, canonicalized amounts (strings), `currency`, and `status` fields. Example:

```json
{
  "id": "pl_01Hxxxxxx",
  "url": "https://demo.pay/links/pl_01Hxxxxxx",
  "amount": "25",
  "currency": "USD",
  "status": "ACTIVE"
}
```

### Security and validation

- Never treat LLM outputs as authoritative; always run server-side validation and checks before calling external payment providers.
- The toolkit expects API keys and secrets to live in environment variables on the server (do not expose them to the browser).
- Audit tool calls for traceability.

### Example end-to-end interaction (summary)

1. User types: "Create a donation link for five to fifty dollars for 'Local Shelter'".
2. Client runs `inferFromText` → returns `{ minAmount: '5', maxAmount: '50', currency: 'USD', memo: 'Local Shelter', linkType: 'DONATION' }`.
3. Client sends a message + suggested payload to the AI agent. The agent either asks clarifying questions or calls the toolkit's `createPaymentLink` tool.
4. Toolkit executes the creation using your configured merchant credentials and returns a link object.
5. The UI displays the created link to the user and the server writes an audit record.

---

If you'd like, I can add a short runnable server example that wires the `VisaAcceptanceAgentToolkit` into a small Express endpoint and demonstrates the ai.run tool registration and a test conversation flow. Let me know if you want that scaffolded and I'll add it to the `examples/` directory.

