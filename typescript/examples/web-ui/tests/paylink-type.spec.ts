import { test, expect } from '@playwright/test';
import path from 'path';

test('Pay Links panel shows API-provided linkType in Type badge', async ({ page }) => {
  // Use a local static server during tests. The test runner starts a simple
  // http server at http://localhost:3000 when running locally in CI/dev.
  // Fallback to file:// if the server isn't available.
  // Prefer the HTTP server (so the built assets execute). Keep a file:// fallback.
  const serverUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
  const indexPath = path.resolve(__dirname, '..', 'index.html');
  const fileUrl = 'file://' + indexPath.replace(/\\/g, '/');

  // Inject a page-init fetch stub so the UI's initial fetch to /api/payment-links
  // will return the mocked payload even when the page is loaded from file://
  const mockBody = {
    paymentLinks: [
      {
        id: 'TEST-PL-1',
        amount: '12.34',
        currency: 'USD',
        memo: 'Test product',
        created: '2025-10-27T12:00:00Z',
        linkType: 'PURCHASE',
        paymentLinkUrl: 'https://example.com/pay/TEST-PL-1'
      }
    ],
    total: 1
  };
  await page.addInitScript((body) => {
    // preserve original fetch
    (window as any).__originalFetch = window.fetch;
    window.fetch = (input: any, init?: any) => {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) ? input.url : '';
        if (url && url.includes('/api/payment-links')) {
          return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } } as any));
        }
      } catch (e) { /* swallow */ }
      return (window as any).__originalFetch(input, init);
    };
  }, mockBody);

  // Load from the local HTTP server (built assets). Fall back to file:// if not reachable.
  try {
    await page.goto(serverUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
  } catch (e) {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  }
  // Debug: dump page content to help diagnose why the badge isn't appearing
  // (This output is captured by the Playwright runner logs.)
  // eslint-disable-next-line no-console
  console.log('PAGE CONTENT START:\n', await page.content().then(c => c.slice(0, 8000)), '\nPAGE CONTENT END');

  // Debug helpers: log any status badges and whether the mocked product text exists
  const badges = await page.locator('.status-badge').allTextContents();
  // eslint-disable-next-line no-console
  console.log('FOUND STATUS BADGES:', badges);
  const productCount = await page.locator('text=Test product').count();
  // eslint-disable-next-line no-console
  console.log('FOUND Test product count:', productCount);
  if (productCount > 0) {
    const prodEl = await page.locator('text=Test product').first();
    const rowHtml = await prodEl.evaluate((el: any) => {
      const tr = el.closest('tr') || el.parentElement;
      return tr ? tr.outerHTML.slice(0, 1000) : '';
    });
    // eslint-disable-next-line no-console
    console.log('PRODUCT ROW HTML (snippet):', rowHtml);
  }

  // Wait for the PURCHASE badge specifically inside the app's table (avoid matching unrelated <option> elements)
  await page.locator('table').locator('text=PURCHASE').first().waitFor({ state: 'visible', timeout: 5000 });
  const badgeText = (await page.locator('table').locator('text=PURCHASE').first().innerText()).trim();
  expect(badgeText).toContain('PURCHASE');
});
