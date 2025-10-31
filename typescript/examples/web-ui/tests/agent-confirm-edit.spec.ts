import { test, expect } from '@playwright/test';
import path from 'path';

test('Agent confirm -> edit -> submit (create invoice)', async ({ page }) => {
  // Intercept extraction to avoid OpenAI dependency and drive confirm stage with populated fields
  await page.route('**/api/extract-fields', async (route) => {
    const body = {
      extracted: {
        amount: '25.00',
        currency: 'USD',
        email: 'billing@acme.example',
        customerName: 'ACME Corp',
        memo: 'Website redesign',
        dueDate: '2030-01-15'
      },
      missing: [],
      action: 'create-invoice'
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  // Prefer HTTP server (built assets execute). Fallback to file:// if unreachable
  const serverUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
  const indexPath = path.resolve(__dirname, '..', 'index.html');
  const fileUrl = 'file://' + indexPath.replace(/\\/g, '/');
  try {
    await page.goto(serverUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
  } catch {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  }
  // Wait for Agent panel heading to ensure app mounted
  await expect(page.getByText('AI Agent Assistant')).toBeVisible({ timeout: 10000 });
  // Wait for Agent panel input to mount (textarea placeholder)
  await expect(page.getByPlaceholder('e.g., "Create invoice for $100 to Acme"')).toBeVisible();

  // Choose action explicitly to align with our mock response (scope to Agent form)
  const agentForm = page.locator('form').filter({ has: page.getByPlaceholder('e.g., "Create invoice for $100 to Acme"') });
  await agentForm.getByRole('combobox').first().selectOption({ label: 'Create Invoice' });

  // Enter a prompt and submit
  await page.getByPlaceholder('e.g., "Create invoice for $100 to Acme"').fill('Create an invoice for $25 USD to billing@acme.example due in 15 days.');
  await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/extract-fields') && resp.status() === 200),
    agentForm.getByRole('button', { name: 'Submit Request' }).click(),
  ]);

  // We should land on Confirm details without a prompt
  const agentCard = page.getByText('AI Agent Assistant').locator('xpath=ancestor::div[contains(@class, "card")][1]');
  await expect(agentCard.getByText('Confirm details:')).toBeVisible({ timeout: 10000 });

  // Verify canonical fields appear within the Agent card (avoid matching other cards)
  const confirmTable = agentCard.locator('table').first();
  await expect(confirmTable.getByText('Customer Email')).toBeVisible();
  await expect(confirmTable.getByText('Customer Name')).toBeVisible();
  await expect(confirmTable.getByText('Amount')).toBeVisible();
  await expect(confirmTable.getByText('Currency')).toBeVisible();

  // Edit values (scope inside the Agent card)
  await agentCard.getByRole('button', { name: 'Edit' }).click();
  // Target inputs by nearby label text via XPath to avoid ambiguous selectors
  const emailInput = agentCard.locator('xpath=.//div[contains(text(), "Customer Email")]/following::input[1]');
  const amountInput = agentCard.locator('xpath=.//div[contains(text(), "Amount")]/following::input[1]');
  const memoTextarea = agentCard.locator('xpath=.//div[contains(text(), "Memo / Description")]/following::textarea[1]');
  await emailInput.fill('accounts@acme.example');
  await memoTextarea.fill('Updated memo');
  await amountInput.fill('26.50');
  await agentCard.getByRole('button', { name: 'Save' }).click();

  // Inspect the pending payload preview
  const pre = agentCard.locator('pre', { hasText: '{' });
  const preText = await pre.first().innerText();
  const parsed = JSON.parse(preText);
  expect(parsed.email).toBe('accounts@acme.example');
  expect(parsed.memo).toBe('Updated memo');
  expect(parsed.amount).toBe('26.50');

  // Submit and expect success
  await agentCard.getByRole('button', { name: 'Submit' }).click();
  // The result section shows HTTP status and a raw toggle (scope inside Agent card)
  await expect(agentCard.getByText('Result:')).toBeVisible();
  await expect(agentCard.getByText(/HTTP \d+/)).toBeVisible();
});
