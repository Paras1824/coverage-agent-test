import fs from 'fs';

function writeEnv(key, value) {
  const line = `${key}=${value}\n`;
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, line);
  console.log(`[ENV] ${line.trim()}`);
}

const summary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));

const targets = [];
for (const [filePath, data] of Object.entries(summary)) {
  if (filePath === 'total') continue;
  const pct = data.lines?.pct ?? 100;
  if (pct < 60) targets.push({ path: filePath, pct });
}

targets.sort((a, b) => a.pct - b.pct);
const top5 = targets.slice(0, 5).map((t) => t.path);

if (top5.length === 0) {
  console.log('No files below 60% threshold.');
  writeEnv('LOW_COV_FILES', 'none');
} else {
  console.log(`Targeting ${top5.length} file(s):`);
  top5.forEach((f) => console.log('  -', f));
  writeEnv('LOW_COV_FILES', top5.join(','));
}
