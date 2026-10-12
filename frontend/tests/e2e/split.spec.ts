import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../../../tests/fixtures');

test('split into ranges, download a zip with the expected files', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: /Split/i }).first().click();

  const input = page.locator('input[type="file"]');
  await input.setInputFiles([resolve(FIXTURES, 'multi-page.pdf')]);

  // multi-page.pdf has 5 pages.
  await expect(page.locator('[role="button"][aria-label^="Page "]')).toHaveCount(5, {
    timeout: 20_000,
  });

  // Ranges input is labelled "Ranges (comma separated, 1-based)".
  await page.locator('#split-ranges').fill('1-2, 4-5');

  // Live validation should show "2 outputs".
  await expect(page.getByText(/2 outputs/i)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Split and download/i }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('pdfdesk-output.zip');

  const savedPath = await download.path();
  expect(savedPath).toBeTruthy();

  const bytes = new Uint8Array(readFileSync(savedPath!));
  const entries = unzipSync(bytes);
  const names = Object.keys(entries).sort();
  expect(names).toEqual(['multi-page-pages-1-2.pdf', 'multi-page-pages-4-5.pdf']);

  const first = await PDFDocument.load(entries['multi-page-pages-1-2.pdf']!);
  const second = await PDFDocument.load(entries['multi-page-pages-4-5.pdf']!);
  expect(first.getPageCount()).toBe(2);
  expect(second.getPageCount()).toBe(2);
});

test('split every N pages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Split/i }).first().click();

  const input = page.locator('input[type="file"]');
  await input.setInputFiles([resolve(FIXTURES, 'multi-page.pdf')]);

  await expect(page.locator('[role="button"][aria-label^="Page "]')).toHaveCount(5, {
    timeout: 20_000,
  });

  // Switch to "Every N pages" mode.
  await page.getByLabel(/Every N pages/i).check();
  await page.getByLabel(/Chunk size/i).fill('2');

  // 5 pages, chunk size 2 → 3 outputs (2 + 2 + 1).
  await expect(page.getByText(/3 outputs/i)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Split and download/i }).click(),
  ]);

  const savedPath = await download.path();
  const bytes = new Uint8Array(readFileSync(savedPath!));
  const entries = unzipSync(bytes);
  expect(Object.keys(entries).sort()).toEqual([
    'multi-page-pages-1-2.pdf',
    'multi-page-pages-3-4.pdf',
    'multi-page-pages-5.pdf',
  ]);
});
