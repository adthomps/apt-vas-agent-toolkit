# Visa Acceptance Agent Toolkit (TypeScript) — Implementation Notes

This document explains the architecture and design decisions for the TypeScript toolkit and the AI SDK examples, including NL parsing, AI‑first tool calling with fallback, validation, and error suggestion handling.

## Architecture at a glance

- Package entrypoints:
  - `src/ai-sdk/` — Vercel AI SDK integration (tool wrappers and toolkit)
  - `src/modelcontextprotocol/` — MCP server integration
  - `src/shared/` — Tool definitions (invoices, payment links), configuration, utils

- Tools surface methods with:
  - `method` (string), `name`, `description`, `parameters` (zod schema), `actions`, and an async `execute` function
  - See `src/shared/tools.ts` for tool registry

- Examples:
  - `examples/ai-sdk/` — Natural language scripts and an interactive CLI

## Key modules

- Invoices
  - `src/shared/invoices/createInvoice.ts`
    - Strong zod validation (invoice_number alphanumeric <20, positive totalAmount, 3‑letter currency, dueDate not in the past)
    - Returns structured errors with status/response
  - `updateInvoice.ts`, `getInvoice.ts`, `listInvoices.ts`, `sendInvoice.ts`, `cancelInvoice.ts`
    - `listInvoices` returns a wrapper with `invoices` array; masking applied via utils

- Payment links
  - `src/shared/paymentLinks/createPaymentLink.ts`, `updatePaymentLink.ts`, `getPaymentLink.ts`, `listPaymentLinks.ts`
    - Explicit request object construction to match Cybersource client models

- Utilities
  - `src/shared/utils/util.ts`: masking helpers and developerId injection
  - `src/shared/utils/errorHints.ts`: infers short, reason‑specific suggestions from API error payloads/status codes; merged into errors via `withSuggestion`

## AI‑first with reliable fallback

- NL scripts (`nl-invoice.ts`, `nl-paymentlink.ts`) use AI tool calling when `OPENAI_API_KEY` is available; otherwise they parse locally.
- When AI tool calls fail or produce invalid params, examples fall back to a deterministic local parser and print the AI error details plus a short “Tip:” where available.

## Interactive assistant

- `examples/ai-sdk/interactive-nl.ts` guides the user to fill missing fields, confirms a summary, retries on error, and writes `audit-log.jsonl` on success.
- Uses `generateObject` (optional) to extract fields, with strict validation and friendly messaging.

## Natural language parsing

- Robust regex parsing for:
  - amounts (`$123.45` or bare numbers), currency codes, emails (“email”/“to”), customer names (guarded), and due date phrases
  - supported phrases: “in N days/weeks”, “due on YYYY‑MM‑DD”, “due next Friday”, “end of month”, “next business day”

## Error suggestions

- Common error classes:
  - Currency invalid → “Use a 3‑letter ISO currency code like USD or EUR (uppercase).”
  - Amount ≤ 0 → “Set a positive amount like 100.00 (two decimals).”
  - Due date past/format → “Choose a future dueDate in YYYY‑MM‑DD …” or “Provide dueDate in YYYY‑MM‑DD format …”
  - Invoice/purchase number shape → “Use up to 20 alphanumeric characters …”
  - Email format → “Use a valid email like name@example.com.”
- Exposed to examples via the error object’s `suggestion` field and included in printed output.

## Listing and reporting

- NL list scripts:
  - `nl-invoice-list.ts`: parses “last N”, “page P”, and “status X”; prints a compact table (ID, STATUS, AMOUNT, DUE)
  - `nl-paymentlink-list.ts`: same pattern, table (ID, STATUS, AMOUNT)

## Windows PowerShell considerations

- `$` expands in PowerShell; examples recommend quoting prompts that include currency

## MCP parity roadmap

- MCP server exposes core tools for invoices (create/update/list/get/send/cancel) and payment links (create/update/list/get)
- Plan to port NL/interactive patterns as MCP prompts/templates to achieve parity in user experience

## Testing and smoke

- `examples/ai-sdk/smoke.ts` exercises listing and simple create/get flows
- Direct runners exist for most operations to isolate API interactions during debugging

## Known limitations & next steps

- AI tool calls may produce invalid parameters; the examples mitigate via fallbacks and suggestions
- List table: API client shapes can vary; scripts normalize results defensively
- Optional: add few‑shot examples or extract‑then‑call pattern to further improve AI tool reliability
