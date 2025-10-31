import { test, expect } from '@playwright/test';

const url = process.env.WEB_UI_URL || 'http://127.0.0.1:3000';

async function openApp(page) {
  await page.goto(url);
  await expect(page.locator('text=AI Agent Assistant')).toBeVisible();
}

test.describe('AI Agent list flows (mock)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('Pay Links: last 5 active pay by links created', async ({ page }) => {
    await openApp(page);
    // Enter prompt
    const form = page.locator('form').filter({ has: page.getByPlaceholder('e.g., "Create invoice for $100 to Acme"') });
    await form.getByPlaceholder('e.g., "Create invoice for $100 to Acme"').fill('Find and show the last 5 active pay by links created');
    // Select action explicitly to avoid classification flake
    await form.getByRole('combobox').selectOption('list-pay-links');
    // Submit; lists should return immediately without extra confirmation
    await form.getByRole('button', { name: 'Submit Request' }).click();
    // Wait for result card
    await expect(page.locator('text=AI — Payment Links')).toBeVisible();
    // Verify up to 5 rows are present (we pad to 5, so at least 1)
    const rows = page.locator('table >> tbody >> tr');
    await expect(rows.first()).toBeVisible();
    // Check Created column (2nd col) has a date-like value on first real row
    const firstIdCell = rows.nth(0).locator('td').nth(0);
    const firstCreatedCell = rows.nth(0).locator('td').nth(1);
    await expect(firstIdCell).not.toHaveText('—');
    await expect(firstCreatedCell).not.toHaveText('—');
    // Actions menu (last col) should be present if link exists
    const actionsBtn = rows.nth(0).locator('button[title="Actions"]');
    await expect(actionsBtn).toBeVisible();
  });

  test('Invoices: find all unpaid invoices over $500 USD', async ({ page }) => {
    await openApp(page);
    const form = page.locator('form').filter({ has: page.getByPlaceholder('e.g., "Create invoice for $100 to Acme"') });
    await form.getByPlaceholder('e.g., "Create invoice for $100 to Acme"').fill('Find all unpaid invoices over $500 USD');
    await form.getByRole('combobox').selectOption('list-invoices');
    await form.getByRole('button', { name: 'Submit Request' }).click();
    await expect(page.locator('text=AI — Invoices')).toBeVisible();
    // Verify at least one row and amount >= 500
    const rows = page.locator('table >> tbody >> tr');
    await expect(rows.first()).toBeVisible();
    const amountCell = rows.nth(0).locator('td').nth(1);
    const amountText = await amountCell.textContent();
    // Amount cell like: "650.00 USD" or "650.00  USD"
    const match = amountText?.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
    expect(match).toBeTruthy();
    const amount = match ? parseFloat(match[1]) : 0;
    expect(amount).toBeGreaterThanOrEqual(500);
  });
});
