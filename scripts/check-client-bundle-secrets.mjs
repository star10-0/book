import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const staticRoot = path.join(repoRoot, '.next', 'static');

if (!existsSync(staticRoot)) {
  console.error('Missing .next/static. Run `npm run build` before bundle secret scan.');
  process.exit(1);
}

const SECRET_ENV_KEYS = [
  'AUTH_SECRET',
  'KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_TOKEN',
  'SHAM_CASH_API_KEY',
  'SYRIATEL_CASH_API_KEY',
  'BOOK_STORAGE_S3_SECRET_ACCESS_KEY',
  'SHAM_CASH_WEBHOOK_SECRET',
  'METRICS_TOKEN',
];

const candidateValues = SECRET_ENV_KEYS
  .map((key) => process.env[key]?.trim())
  .filter((value) => typeof value === 'string' && value.length >= 8);

const matchers = [
  ...SECRET_ENV_KEYS,
  ...candidateValues,
];

function collectFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectFiles(full));
      continue;
    }

    if (/\.(js|txt|map)$/i.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = collectFiles(staticRoot);
const hits = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const matcher of matchers) {
    if (content.includes(matcher)) {
      hits.push({ file: path.relative(repoRoot, file), matcher });
    }
  }
}

if (hits.length > 0) {
  console.error('Potential secret leak indicator(s) found in client bundle:');
  for (const hit of hits) {
    console.error(`- ${hit.file}: ${hit.matcher}`);
  }
  process.exit(1);
}

console.log('Client bundle secret scan passed: no known secret keys/values detected in .next/static.');
