import { test, expect } from '@playwright/test';

test('the landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/N10/i);
});

test('the API is reachable through the web proxy and enforces auth', async ({ request }) => {
  const response = await request.get('/api/leads');
  expect(response.status()).toBe(401);
});
