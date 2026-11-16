import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('Vercel serves the app shell for every direct browser route', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  const paths = Array.from(app.matchAll(/path="(\/[^"]+)"/g), (match) => match[1]);
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  expect(config.cleanUrls).toBe(true);
  expect(config.rewrites).toEqual(paths.map((source) => ({ source, destination: '/' })));
});
