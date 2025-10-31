import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Agent skips prompt when no fields missing after inference', async ({ page }) => {
  // Return no missing fields for list-invoices (path that doesnâ€™t need OpenAI)
  await page.route('**/api/extract-fields', async (route) => {
    const body = { extracted: {}, missing: [], action: 'list-invoices' };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  // Prefer HTTP server (built assets execute). Fallback to file:// if unreachable.
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
  // And the textarea placeholder should be present now
  await expect(page.getByPlaceholder('e.g., "Create invoice for $100 to Acme"')).toBeVisible();

  // Select list invoices action within the Agent form
  const agentForm = page.locator('form').filter({ has: page.getByPlaceholder('e.g., "Create invoice for $100 to Acme"') });
  await agentForm.getByRole('combobox').first().selectOption({ label: 'List Invoices' });

  // Provide any input and submit
  await page.getByPlaceholder('e.g., "Create invoice for $100 to Acme"').fill('show invoices');
  await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/extract-fields') && resp.status() === 200),
    agentForm.getByRole('button', { name: 'Submit Request' }).click(),
  ]);

  // Should go directly to confirmation, not prompt
  await expect(page.getByText('Please provide the following details:')).toHaveCount(0);
  await expect(page.getByText('Confirm details:')).toBeVisible({ timeout: 10000 });
});
