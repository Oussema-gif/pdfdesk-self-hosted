import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../../../tests/fixtures');

test('merge two PDFs and download a PDF with the expected page count', async ({ page }) => {
  await page.goto('/');

  // Navigate into the merge tool via the tool picker.
  await page.getByRole('link', { name: /Merge/i }).first().click();

  // The hero drop zone has a hidden <input type="file">.
  const input = page.locator('input[type="file"]');
  await expect(input).toHaveCount(1);

  await input.setInputFiles([
    resolve(FIXTURES, 'normal.pdf'),
    resolve(FIXTURES, 'multi-page.pdf'),
  ]);

  // 1 page + 5 pages = 6 page cards. Match only the card buttons, not the grid.
  const cards = page.locator('[role="button"][aria-label^="Page "]');
  await expect(cards).toHaveCount(6, { timeout: 20_000 });

  // Trigger the download and wait for the browser to hand us the file.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Merge and download/i }).click(),
  ]);

  const savedPath = await download.path();
  expect(savedPath).toBeTruthy();

  const bytes = readFileSync(savedPath!);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(6);
});
