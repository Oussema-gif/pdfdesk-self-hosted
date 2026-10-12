import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../tests/fixtures');

await mkdir(OUT, { recursive: true });
console.log(`Generating fixtures into ${OUT}`);

async function write(name, bytes) {
  await writeFile(join(OUT, name), bytes);
  console.log(`  wrote ${name} (${bytes.length} bytes)`);
}

async function makeNormal() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText('PDFDesk fixture - normal', { x: 72, y: 760, size: 20, font });
  return await doc.save();
}

async function makeMultiPage() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 5; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Page ${i + 1}`, { x: 72, y: 760, size: 32, font });
  }
  return await doc.save();
}

async function makeRotated() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const rotations = [0, 90, 180];
  for (let i = 0; i < 3; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Rotated ${i + 1} (${rotations[i]}deg)`, { x: 72, y: 760, size: 20, font });
    if (rotations[i] !== 0) page.setRotation(degrees(rotations[i]));
  }
  return await doc.save();
}

async function makeLarge() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 100; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Page ${i + 1}`, { x: 72, y: 760, size: 12, font });
  }
  return await doc.save();
}

// Minimal PNG encoder (no external deps). Produces a solid-colour RGBA image.
function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function makePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const row = Buffer.alloc(1 + width * 4);
  for (let x = 0; x < width; x++) {
    row[1 + x * 4 + 0] = rgba[0];
    row[1 + x * 4 + 1] = rgba[1];
    row[1 + x * 4 + 2] = rgba[2];
    row[1 + x * 4 + 3] = rgba[3];
  }
  const raw = Buffer.concat(Array(height).fill(row));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Minimal 1x1 black JPEG. Known-good blob.
const BLACK_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
);

async function makeEncrypted() {
  try {
    await execFileAsync('qpdf', ['--version']);
  } catch {
    console.warn('  qpdf not found - skipping encrypted.pdf (install with: sudo dnf install -y qpdf)');
    return;
  }
  await execFileAsync('qpdf', [
    '--encrypt',
    'user',
    'owner',
    '256',
    '--',
    join(OUT, 'normal.pdf'),
    join(OUT, 'encrypted.pdf'),
  ]);
  console.log('  wrote encrypted.pdf (user password: "user")');
}

// Corrupted PDF: starts with %PDF- so magic bytes pass, but the body is junk.
function makeCorrupted() {
  const header = Buffer.from('%PDF-1.7\n', 'ascii');
  const junk = Buffer.alloc(2048, 0xab);
  return Buffer.concat([header, junk]);
}

async function makeWithImage() {
  const doc = await PDFDocument.create();
  const png = makePng(64, 64, [220, 60, 60, 255]);
  const img = await doc.embedPng(png);
  const page = doc.addPage([595, 842]);
  page.drawImage(img, { x: 100, y: 600, width: 200, height: 200 });
  return await doc.save();
}

async function main() {
  await write('normal.pdf', await makeNormal());
  await write('multi-page.pdf', await makeMultiPage());
  await write('rotated.pdf', await makeRotated());
  await write('large.pdf', await makeLarge());
  await write('corrupted.pdf', makeCorrupted());
  await write('with-images.pdf', await makeWithImage());
  await write('sample.png', makePng(128, 128, [79, 70, 229, 255]));
  await write('sample.jpg', BLACK_JPEG);
  await makeEncrypted();
  console.log('Done.');
}

await main();