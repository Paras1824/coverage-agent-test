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

async function getPRCoverage(projectKey, prNumber) {
  // Use ?pullRequest= to get full-repo coverage as it would be once this PR is merged,
  // not just "Coverage on New Code" which is 0% for test-only PRs.
  const url = `https://sonarcloud.io/api/measures/component?component=${projectKey}&pullRequest=${prNumber}&metricKeys=coverage`;
  const headers = process.env.SONAR_TOKEN
    ? { Authorization: `Bearer ${process.env.SONAR_TOKEN}` }
    : {};
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error(`SonarCloud API ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = await res.json();
  const measure = data.component?.measures?.find((m) => m.metric === 'coverage');
  return measure?.value != null ? parseFloat(measure.value) : null;
}

const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'owner/repo').split('/');
const projectKey = `${owner}_${repo}`;
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const prNumber = parseInt(process.env.PR_NUMBER || '0', 10);
const prCreatedAt = new Date(process.env.PR_CREATED_AT || new Date().toISOString());

console.log(`Polling SonarCloud for PR #${prNumber} (created at ${prCreatedAt.toISOString()})`);
console.log(`Project key: ${projectKey}`);
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

  // Match both old format ("SonarQube Quality Gate") and new format ("Quality Gate")
  const sonarComment = comments.find(
    (c) => c.body?.includes('Quality Gate') && new Date(c.created_at) > prCreatedAt,
  );

  if (sonarComment) {
    console.log(`SonarCloud comment found. Fetching full-repo coverage for PR #${prNumber}...`);
    const coverage = await getPRCoverage(projectKey, prNumber);
    if (coverage !== null) {
      console.log(`Full-repo coverage (PR #${prNumber}): ${coverage}%`);
      writeEnv('SONAR_COVERAGE', String(coverage));
      process.exit(0);
    }
    console.warn('Coverage metric not in API response. Defaulting to 0.');
    writeEnv('SONAR_COVERAGE', '0');
    process.exit(0);
  }

  if (poll < MAX_POLLS) {
    console.log('No SonarCloud comment yet. Waiting 5 minutes...');
    await sleep(300_000);
  }
}

console.error('SonarCloud comment not found after 40 minutes.');
process.exit(1);
