import { Octokit } from '@octokit/rest';
import fs from 'fs';

function writeEnv(key, value) {
  const line = `${key}=${value}\n`;
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, line);
  console.log(`[ENV] ${line.trim()}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'owner/repo').split('/');
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const prNumber = parseInt(process.env.PR_NUMBER || '0', 10);
const prCreatedAt = new Date(process.env.PR_CREATED_AT || new Date().toISOString());

console.log(`Polling SonarCloud for PR #${prNumber} (created at ${prCreatedAt.toISOString()})`);
console.log('Waiting 10 minutes for SonarCloud scan to start...');
await sleep(600_000);

const MAX_POLLS = 6; // 10 min wait + 6 × 5 min = 40 min total
for (let poll = 1; poll <= MAX_POLLS; poll++) {
  console.log(`Poll ${poll}/${MAX_POLLS}...`);

  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });

  const sonarComment = comments.find((c) => {
    if (!c.body || !c.body.includes('SonarQube Quality Gate')) return false;
    return new Date(c.created_at) > prCreatedAt;
  });

  if (sonarComment) {
    const match = sonarComment.body.match(/Coverage\s*\|\s*([\d.]+)%/);
    if (match) {
      writeEnv('SONAR_COVERAGE', match[1]);
      process.exit(0);
    }
  }

  if (poll < MAX_POLLS) {
    console.log('SonarCloud result not yet posted. Waiting 5 minutes...');
    await sleep(300_000);
  }
}

console.error('SonarCloud result not found after 40 minutes.');
process.exit(1);
