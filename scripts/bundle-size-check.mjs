#!/usr/bin/env node
// Bundle size regression gate.
//
// Reads vertex-platform/dist/assets/*.js and fails if any chunk exceeds
// the threshold declared for its family. Runs in CI right after the
// build step so a careless dependency import shows up as a failing
// check rather than a silent 200 KB gzip blob shipped to every user.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const DIST = join(process.cwd(), 'dist', 'assets');

// Family -> gzipped KB ceiling. Anything above this fails the check.
// Loose enough to accept normal work; tight enough to catch regressions.
const LIMITS = [
  { family: 'index',              maxKB: 25  }, // landing + login entry
  { family: 'react',              maxKB: 55  },
  { family: 'router',             maxKB: 12  },
  { family: 'i18n',               maxKB: 25  },
  { family: 'supabase',           maxKB: 65  },
  { family: 'charts',             maxKB: 125 }, // recharts + d3
  { family: 'pdf',                maxKB: 140 }, // jspdf + autotable
  { family: 'html2canvas.esm',    maxKB: 55  }, // jspdf transitive
  { family: 'purify.es',          maxKB: 12  }, // jspdf transitive
  { family: 'index.es',           maxKB: 55  }, // jspdf transitive (fflate re-export)
  { family: 'Dashboard',          maxKB: 10  },
  { family: 'Upload',             maxKB: 10  },
  { family: 'SubmissionDetail',   maxKB: 12  },
  { family: 'ProjectDetail',      maxKB: 6   },
  { family: 'KpiTracker',         maxKB: 10  },
  { family: 'Obligations',        maxKB: 6   },
  { family: 'InsuranceRenewals',  maxKB: 6   },
  { family: 'Analytics',          maxKB: 4   }, // page shell (cards only)
  { family: 'AnalyticsCharts',    maxKB: 6   }, // chart panel (lazy)
  { family: 'Reports',            maxKB: 8   },
];

function gzipKB(path) {
  return Math.round((gzipSync(readFileSync(path)).byteLength / 1024) * 10) / 10;
}

function familyOf(name) {
  // Match `<family>-hash.js`. The trailing `-` prevents `index.es-hash.js`
  // (a jsPDF transitive) from being classified as the `index` entry chunk.
  for (const { family } of LIMITS) {
    if (name.startsWith(`${family}-`)) return family;
  }
  return null;
}

const files = readdirSync(DIST).filter((f) => f.endsWith('.js') && !f.endsWith('.map'));
const failures = [];
const seen = new Set();

console.log('Bundle size gate:\n');
for (const file of files.sort()) {
  const gz = gzipKB(join(DIST, file));
  const family = familyOf(file);
  if (!family) {
    console.log(`  ?  ${file.padEnd(50)} ${gz.toString().padStart(6)} KB gz   (no limit set)`);
    continue;
  }
  seen.add(family);
  const limit = LIMITS.find((l) => l.family === family).maxKB;
  const marker = gz > limit ? 'X' : 'ok';
  console.log(`  ${marker}  ${file.padEnd(50)} ${gz.toString().padStart(6)} KB gz   (limit ${limit})`);
  if (gz > limit) failures.push({ file, gz, limit });
}

console.log('');
for (const { family, maxKB } of LIMITS) {
  if (!seen.has(family)) console.log(`  --  ${family.padEnd(50)}         no chunk matched   (limit ${maxKB})`);
}

if (failures.length > 0) {
  console.log('\nBundle size gate FAILED:');
  for (const { file, gz, limit } of failures) {
    console.log(`  ${file} is ${gz} KB gz (limit ${limit} KB)`);
  }
  console.log('\nRaise the limit in scripts/bundle-size-check.mjs only if the growth is justified.');
  process.exit(1);
}

console.log('Bundle size gate OK.');
