import { Octokit } from '@octokit/rest';
import fs from 'fs';

function writeEnv(key, value) {
  const line = `${key}=${value}\n`;
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, line);
  console.log(`[ENV] ${line.trim()}`);
}

async function getOverallCoverage(projectKey) {
  const url = `https://sonarcloud.io/api/measures/component?component=${projectKey}&metricKeys=coverage`;
  const headers = process.env.SONAR_TOKEN
    ? { Authorization: `Bearer ${process.env.SONAR_TOKEN}` }
    : {};
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  const measure = data.component?.measures?.find((m) => m.metric === 'coverage');
  return measure?.value ? parseFloat(measure.value) : null;
}

const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'owner/repo').split('/');
const projectKey = `${owner}_${repo}`;
const octokit = new Octokit({ auth: process.env.GH_TOKEN || process.env.GITHUB_TOKEN });

const { data: pulls } = await octokit.rest.pulls.list({
  owner,
  repo,
  state: 'closed',
  sort: 'updated',
  direction: 'desc',
  per_page: 20,
});

const mergedPR = pulls.find((pr) => pr.merged_at !== null);

if (!mergedPR) {
  console.warn('No merged PRs found. Setting PREV_COVERAGE=0');
  writeEnv('PREV_COVERAGE', '0');
  process.exit(0);
}

console.log(`Last merged PR: #${mergedPR.number} — "${mergedPR.title}"`);

const { data: comments } = await octokit.rest.issues.listComments({
  owner,
  repo,
  issue_number: mergedPR.number,
});

// Match both old format ("SonarQube Quality Gate") and new format ("Quality Gate")
const sonarComment = comments.find((c) => c.body?.includes('Quality Gate'));

if (!sonarComment) {
  console.warn(`No SonarCloud comment on PR #${mergedPR.number}. Setting PREV_COVERAGE=0`);
  console.warn('Tip: ensure sonar-pr.yml ran and SonarCloud commented before the PR was merged.');
  writeEnv('PREV_COVERAGE', '0');
  process.exit(0);
}

console.log('SonarCloud comment found on PR. Fetching overall project coverage from API...');
const coverage = await getOverallCoverage(projectKey);

if (coverage === null) {
  console.warn('Could not read coverage from SonarCloud API. Setting PREV_COVERAGE=0');
  writeEnv('PREV_COVERAGE', '0');
  process.exit(0);
}

console.log(`Overall project coverage: ${coverage}%`);
writeEnv('PREV_COVERAGE', String(coverage));
