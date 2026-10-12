#!/usr/bin/env node
/**
 * Walks frontend/node_modules and produces docs/THIRD_PARTY_LICENSES.md.
 * Reads each package.json on disk rather than the lockfile: the on-disk file
 * always carries a license field, and the tree on disk is what was built.
 *
 * Run from the repo root:
 *   node scripts/generate-license-report.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const NODE_MODULES = join(ROOT, 'frontend', 'node_modules');
const OUT = join(ROOT, 'docs', 'THIRD_PARTY_LICENSES.md');

if (!existsSync(NODE_MODULES)) {
  console.error('frontend/node_modules not found. Run `npm ci` in frontend/ first.');
  process.exit(1);
}

function normalizeLicense(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license === 'object' && typeof pkg.license.type === 'string') {
    return pkg.license.type;
  }
  if (Array.isArray(pkg.licenses)) {
    return pkg.licenses.map((l) => (typeof l === 'string' ? l : l?.type ?? 'UNKNOWN')).join(' OR ');
  }
  return 'UNKNOWN';
}

function repoUrl(pkg) {
  const r = pkg.repository;
  if (typeof r === 'string') return r;
  if (r && typeof r.url === 'string') return r.url.replace(/^git\+/, '').replace(/\.git$/, '');
  return '';
}

const packages = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === '.bin' || entry === '.cache') continue;
    const full = join(dir, entry);
    if (entry.startsWith('@')) {
      walk(full);
      continue;
    }
    const pkgJson = join(full, 'package.json');
    if (existsSync(pkgJson) && statSync(pkgJson).isFile()) {
      try {
        const pkg = JSON.parse(readFileSync(pkgJson, 'utf8'));
        packages.push({
          name: pkg.name ?? entry,
          version: pkg.version ?? '(unknown)',
          license: normalizeLicense(pkg),
          repository: repoUrl(pkg),
        });
      } catch {
        // skip unreadable package.json
      }
    }
  }
}

walk(NODE_MODULES);

packages.sort((a, b) => a.name.localeCompare(b.name));

const byLicense = new Map();
for (const pkg of packages) {
  const list = byLicense.get(pkg.license) ?? [];
  list.push(pkg);
  byLicense.set(pkg.license, list);
}

const licensesSorted = [...byLicense.keys()].sort();

let md = '';
md += '# Third-party licenses\n\n';
md += 'This file is generated from the packages that are installed in\n';
md += '`frontend/node_modules` at build time. Regenerate with:\n\n';
md += '    node scripts/generate-license-report.mjs\n\n';
md += `**Total packages:** ${packages.length}\n\n`;
md += '## Summary by license\n\n';
md += '| License | Count |\n';
md += '|---|---|\n';
for (const lic of licensesSorted) {
  md += `| ${lic} | ${byLicense.get(lic).length} |\n`;
}
md += '\n## Full inventory\n\n';

for (const lic of licensesSorted) {
  md += `### ${lic}\n\n`;
  md += '| Package | Version | Repository |\n';
  md += '|---|---|---|\n';
  for (const pkg of byLicense.get(lic)) {
    const repo = pkg.repository ? `[link](${pkg.repository})` : '—';
    md += `| ${pkg.name} | ${pkg.version} | ${repo} |\n`;
  }
  md += '\n';
}

writeFileSync(OUT, md, 'utf8');
console.log(`Wrote ${OUT} with ${packages.length} packages across ${licensesSorted.length} licenses.`);
