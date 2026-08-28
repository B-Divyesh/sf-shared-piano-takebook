import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  (page as typeof page & { __consoleErrors?: string[] }).__consoleErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as typeof page & { __consoleErrors?: string[] }).__consoleErrors ?? []).toEqual([]);
});

test('records, annotates, saves and reopens a take with the keyboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByRole('button',{name:'Record'}).click();
  await page.keyboard.down('a'); await page.waitForTimeout(100); await page.keyboard.up('a');
  await page.keyboard.down('d'); await page.waitForTimeout(100); await page.keyboard.up('d');
  await page.getByRole('button',{name:/Stop recording/}).click();
  await page.getByLabel('Take name').fill('Friday duet');
  await page.getByLabel('Teacher note').fill('Keep the second note light.');
  await page.getByRole('button',{name:'Save take'}).click();
  await expect(page.getByText('Friday duet')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Friday duet')).toBeVisible();
  await page.getByRole('button',{name:'Open',exact:true}).click();
  await expect(page.getByLabel('Teacher note')).toHaveValue('Keep the second note light.');
});

test('installed shell works offline after a first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker?.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading',{name:/Keep the take/})).toBeVisible();
  await expect(page.getByText(/Offline · takes available/)).toBeVisible();
});

test('legal pages have semantic essentials', async ({ page }) => {
  for (const path of ['/privacy/','/terms/']) { await page.goto(path); await expect(page.locator('html')).toHaveAttribute('lang','en'); await expect(page.locator('main')).toHaveCount(1); await expect(page.locator('h1')).toHaveCount(1); }
});

test('has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => ['serious','critical'].includes(violation.impact ?? ''))).toEqual([]);
});
