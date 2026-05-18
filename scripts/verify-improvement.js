import fs from 'fs';

function writeEnv(key, value) {
  const line = `${key}=${value}\n`;
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, line);
  console.log(`[ENV] ${line.trim()}`);
}

const newSummary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
const oldSummary = JSON.parse(fs.readFileSync('scripts/baseline-coverage.json', 'utf8'));

const newPct = newSummary.total?.lines?.pct ?? 0;
const oldPct = oldSummary.total?.lines?.pct ?? 0;

console.log(`Baseline coverage : ${oldPct}%`);
console.log(`New coverage      : ${newPct}%`);

if (newPct <= oldPct) {
  console.error('No improvement in line coverage. Skipping PR creation.');
  process.exit(1);
}

console.log(`Improvement: +${(newPct - oldPct).toFixed(2)}pp`);
writeEnv('NEW_COVERAGE', newPct.toString());
