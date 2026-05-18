import fs from 'fs';
import path from 'path';

const EXCLUDE = ['node_modules', '.git', 'coverage', 'scripts'];

function walk(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDE.includes(entry.name)) continue;
    const full = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results.push(...walk(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.ts')) {
      results.push(full);
    }
  }
  return results;
}

const testFiles = walk('.');

if (testFiles.length === 0) {
  const fallback = {
    convention: 'subfolder',
    testDir: '__tests__',
    suffix: '.test.tsx',
    example: '',
    exampleContent: '',
  };
  fs.writeFileSync('scripts/test-pattern.json', JSON.stringify(fallback, null, 2));
  console.log('No test files found. Using subfolder default.');
  process.exit(0);
}

let colocated = 0, subfolder = 0, rootTests = 0;
for (const f of testFiles) {
  if (f.includes('/__tests__/')) subfolder++;
  else if (/^\.\/tests\/|^tests\//.test(f)) rootTests++;
  else colocated++;
}

let convention = 'colocated';
if (subfolder >= colocated && subfolder >= rootTests) convention = 'subfolder';
else if (rootTests > colocated) convention = 'root';

let exampleFile = testFiles[0];
let maxSize = 0;
for (const f of testFiles) {
  try {
    const size = fs.statSync(f).size;
    if (size > maxSize) { maxSize = size; exampleFile = f; }
  } catch { /* skip unreadable */ }
}

const exampleContent = fs.readFileSync(exampleFile, 'utf8');
const suffix = exampleFile.endsWith('.test.tsx') ? '.test.tsx' : '.test.ts';

const pattern = {
  convention,
  testDir: convention === 'subfolder' ? '__tests__' : convention === 'root' ? 'tests' : '',
  suffix,
  example: exampleFile,
  exampleContent,
};

fs.writeFileSync('scripts/test-pattern.json', JSON.stringify(pattern, null, 2));
console.log(`Convention: ${convention} | Example: ${exampleFile}`);
