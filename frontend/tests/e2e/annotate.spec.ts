import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../../../tests/fixtures');

test('watermark produces a PDF with the same page count', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Watermark/i }).first().click();

  const input = page.locator('input[type="file"]');
  await input.setInputFiles([resolve(FIXTURES, 'multi-page.pdf')]);

  await expect(page.locator('[role="button"][aria-label^="Page "]')).toHaveCount(5, {
    timeout: 20_000,
  });

  await page.locator('#watermark-text').fill('E2E');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Apply and download/i }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('watermarked.pdf');

  const savedPath = await download.path();
  const bytes = readFileSync(savedPath!);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(5);
});

test('page numbers produce a PDF with the same page count', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Page numbers/i }).first().click();

  const input = page.locator('input[type="file"]');
  await input.setInputFiles([resolve(FIXTURES, 'multi-page.pdf')]);

  await expect(page.locator('[role="button"][aria-label^="Page "]')).toHaveCount(5, {
    timeout: 20_000,
  });

  // Change the format so we exercise a non-default code path.
  await page.getByLabel(/Format/i).selectOption('page-n-of-total');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Apply and download/i }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('numbered.pdf');

  const savedPath = await download.path();
  const bytes = readFileSync(savedPath!);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(5);
});
