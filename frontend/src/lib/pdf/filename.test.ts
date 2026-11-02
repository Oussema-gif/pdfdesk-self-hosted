import { describe, expect, it } from 'vitest';
import { mergedFileName, pagesRangeFileName, sanitizeBaseName, zipFileName } from './filename';

describe('sanitizeBaseName', () => {
  it('strips extension and unsafe characters', () => {
    expect(sanitizeBaseName('my report!.pdf')).toBe('my-report');
  });
  it('collapses runs of separators', () => {
    expect(sanitizeBaseName('a   !b.pdf')).toBe('a-b');
  });
  it('strips leading and trailing dots and hyphens', () => {
    expect(sanitizeBaseName('..draft..pdf')).toBe('draft');
    expect(sanitizeBaseName('--hello--.pdf')).toBe('hello');
  });
  it('falls back to "document" when nothing usable remains', () => {
    expect(sanitizeBaseName('....pdf')).toBe('document');
    expect(sanitizeBaseName('!!!.pdf')).toBe('document');
  });
  it('truncates to 80 characters', () => {
    const long = 'a'.repeat(200) + '.pdf';
    expect(sanitizeBaseName(long).length).toBe(80);
  });
});

describe('output filenames', () => {
  it('merged', () => {
    expect(mergedFileName()).toBe('merged.pdf');
  });
  it('ranged', () => {
    expect(pagesRangeFileName('Report.pdf', '1-5')).toBe('Report-pages-1-5.pdf');
    expect(pagesRangeFileName('Q4 report!.pdf', '3')).toBe('Q4-report-pages-3.pdf');
  });
  it('zip', () => {
    expect(zipFileName()).toBe('pdfdesk-output.zip');
  });
}); 