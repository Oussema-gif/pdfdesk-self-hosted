/**
 * A PDF file begins with the bytes 25 50 44 46 2D ("%PDF-"). We check the
 * first 5 bytes and ignore anything after. Some PDFs have junk before the
 * header; v1 does not attempt to rescue those, and the error message is
 * clear enough that a user can identify the file.
 */
export function hasPdfMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}