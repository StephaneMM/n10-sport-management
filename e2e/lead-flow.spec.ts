import { test, expect } from '@playwright/test';
import { E2E_ENV } from '../playwright.config';

test('a prospect who fills the public form is visible to an admin', async ({ page }) => {
  const stamp = Date.now();
  const email = `prospect-${stamp}@example.com`;
  const lastName = `Tester${stamp}`;

  // 1. Prospect fills and submits the public application form.
  await page.goto('/apply');
  await page.getByLabel('First Name').fill('Alex');
  await page.getByLabel('Last Name').fill(lastName);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Phone').fill('+1 555 0100');
  await page.getByLabel('Country').fill('Brazil');
  await page.getByLabel(/date of birth/i).fill('14/05/2008');
  await page.getByLabel('Nationality').fill('Brazilian');

  await page.getByRole('combobox').filter({ hasText: /select gender/i }).click();
  await page.getByRole('option', { name: 'Male', exact: true }).click();
  await page.getByRole('combobox').filter({ hasText: /select sport/i }).click();
  await page.getByRole('option', { name: 'Soccer', exact: true }).click();

  await page.getByLabel('Positions').fill('Forward');
  await page.getByLabel('Height (cm)').fill('180');
  await page.getByLabel('Weight (kg)').fill('75');

  await page.getByRole('button', { name: /submit application/i }).click();
  await expect(page.getByText(/thank you/i)).toBeVisible();

  // 2. Admin logs in.
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(E2E_ENV.ADMIN_EMAIL);
  await page.getByLabel('Password').fill(E2E_ENV.ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);

  // 3. The submission shows up in the leads table.
  await expect(page.getByRole('cell', { name: lastName })).toBeVisible();

  // 4. Search narrows to exactly this prospect.
  await page.getByLabel('Search name or email').fill(email);
  await expect(page.getByRole('cell', { name: email })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(lastName) })).toHaveCount(1);

  // 5. Open the detail view and save an admin comment.
  await page.getByRole('link', { name: /view details/i }).click();
  await expect(page.getByText(email)).toBeVisible();
  await page.getByPlaceholder(/internal notes/i).fill('Reviewed via e2e');
  await page.getByRole('button', { name: /update comments/i }).click();
  await expect(page.getByText('Comments updated', { exact: true })).toBeVisible();
});
