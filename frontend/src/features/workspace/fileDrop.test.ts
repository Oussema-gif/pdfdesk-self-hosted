import { describe, expect, it } from 'vitest';
import { filterAcceptedFiles, filesFromDataTransfer } from './fileDrop';

function makeFile(name: string, type = ''): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

describe('filterAcceptedFiles', () => {
  it('accepts .pdf files regardless of MIME', () => {
    expect(filterAcceptedFiles([makeFile('a.pdf', '')]).accepted.length).toBe(1);
    expect(filterAcceptedFiles([makeFile('a.PDF', 'application/pdf')]).accepted.length).toBe(1);
  });

  it('accepts application/pdf regardless of extension', () => {
    const r = filterAcceptedFiles([makeFile('weird', 'application/pdf')]);
    expect(r.accepted.length).toBe(1);
  });

  it('rejects non-PDF files', () => {
    const r = filterAcceptedFiles([makeFile('photo.jpg', 'image/jpeg'), makeFile('notes.txt')]);
    expect(r.accepted.length).toBe(0);
    expect(r.rejected.map((f) => f.name)).toEqual(['photo.jpg', 'notes.txt']);
  });

  it('partitions a mixed batch', () => {
    const r = filterAcceptedFiles([
      makeFile('a.pdf'),
      makeFile('b.png', 'image/png'),
      makeFile('c.PDF'),
    ]);
    expect(r.accepted.map((f) => f.name)).toEqual(['a.pdf', 'c.PDF']);
    expect(r.rejected.map((f) => f.name)).toEqual(['b.png']);
  });

  it('returns empty partitions for an empty input', () => {
    expect(filterAcceptedFiles([])).toEqual({ accepted: [], rejected: [] });
  });
});

describe('filesFromDataTransfer', () => {
  function dtWith(items: Array<{ kind: string; file: File | null }>, files: File[]): DataTransfer {
    const dt = {
      items: items.map((i) => ({ kind: i.kind, getAsFile: () => i.file })),
      files,
    } as unknown as DataTransfer;
    return dt;
  }

  it('uses items when present', () => {
    const a = makeFile('a.pdf');
    const dt = dtWith([{ kind: 'file', file: a }], []);
    expect(filesFromDataTransfer(dt).map((f) => f.name)).toEqual(['a.pdf']);
  });

  it('ignores non-file items', () => {
    const a = makeFile('a.pdf');
    const dt = dtWith(
      [
        { kind: 'string', file: null },
        { kind: 'file', file: a },
      ],
      [],
    );
    expect(filesFromDataTransfer(dt).map((f) => f.name)).toEqual(['a.pdf']);
  });

  it('falls back to files when items is empty', () => {
    const a = makeFile('a.pdf');
    const dt = dtWith([], [a]);
    expect(filesFromDataTransfer(dt).map((f) => f.name)).toEqual(['a.pdf']);
  });
});