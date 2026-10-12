import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../../../tests/fixtures');

test('images → PDF produces a one-page PDF', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Images to PDF/i }).first().click();

  const input = page.locator('input[type="file"]');
  await input.setInputFiles([resolve(FIXTURES, 'sample.png')]);

  // Wait for the image card to appear.
  await expect(page.getByAltText('sample.png')).toBeVisible({ timeout: 15_000 });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Create PDF/i }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('images.pdf');

  const savedPath = await download.path();
  const bytes = readFileSync(savedPath!);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(1);
});

test('PDF → images produces a PNG download', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /PDF to images/i }).first().click();

  const input = page.locator('input[type="file"]');
  await input.setInputFiles([resolve(FIXTURES, 'normal.pdf')]);

  await expect(page.locator('[role="button"][aria-label^="Page "]')).toHaveCount(1, {
    timeout: 20_000,
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export/i }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.png$/);

  const savedPath = await download.path();
  const bytes = readFileSync(savedPath!);
  // PNG magic: 89 50 4E 47 0D 0A 1A 0A
  expect(bytes[0]).toBe(0x89);
  expect(bytes[1]).toBe(0x50);
  expect(bytes[2]).toBe(0x4e);
  expect(bytes[3]).toBe(0x47);
});
