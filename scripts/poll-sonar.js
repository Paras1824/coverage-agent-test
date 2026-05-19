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

const MAX_POLLS = 6;
for (let poll = 1; poll <= MAX_POLLS; poll++) {
  console.log(`Poll ${poll}/${MAX_POLLS}...`);

  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });

  // Look for the custom coverage comment posted by post-sonar-comment.js
  const sonarComment = comments.find(
    (c) => c.body?.includes('📊 Coverage') && new Date(c.created_at) > prCreatedAt,
  );

  if (sonarComment) {
    // Parse coverage directly from: | 📊 Coverage | 41.83% |
    const match = sonarComment.body.match(/📊 Coverage \| *([\d.]+)%/);
    if (match) {
      const coverage = parseFloat(match[1]);
      console.log(`Full-repo coverage (PR #${prNumber}): ${coverage}%`);
      writeEnv('SONAR_COVERAGE', String(coverage));
      process.exit(0);
    }
    console.warn('Coverage not found in comment body. Defaulting to 0.');
    writeEnv('SONAR_COVERAGE', '0');
    process.exit(0);
  }

  if (poll < MAX_POLLS) {
    console.log('No SonarCloud coverage comment yet. Waiting 5 minutes...');
    await sleep(300_000);
  }
}

console.error('SonarCloud coverage comment not found after 40 minutes.');
process.exit(1);
