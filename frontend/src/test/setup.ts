import '@testing-library/jest-dom/vitest';

// jsdom does not implement Blob.prototype.arrayBuffer() or text() in any
// currently-released version. Vitest's jsdom environment inherits those
// gaps, which breaks any code that reads a File via arrayBuffer(). FileReader
// is supported by jsdom, so we implement the missing methods on top of it.
const blobProto = Blob.prototype as unknown as Record<string, unknown>;

if (typeof blobProto['arrayBuffer'] !== 'function') {
  Object.defineProperty(Blob.prototype, 'arrayBuffer', {
    configurable: true,
    writable: true,
    value: function blobArrayBuffer(this: Blob): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (result instanceof ArrayBuffer) resolve(result);
          else reject(new Error('FileReader did not produce an ArrayBuffer'));
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsArrayBuffer(this);
      });
    },
  });
}

if (typeof blobProto['text'] !== 'function') {
  Object.defineProperty(Blob.prototype, 'text', {
    configurable: true,
    writable: true,
    value: function blobText(this: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') resolve(result);
          else reject(new Error('FileReader did not produce a string'));
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsText(this);
      });
    },
  });
}
