import { Octokit } from '@octokit/rest';
import fs from 'fs';

function writeEnv(key, value) {
  const line = `${key}=${value}\n`;
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, line);
  console.log(`[ENV] ${line.trim()}`);
}

const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'owner/repo').split('/');
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

// Look for the custom coverage comment posted by post-sonar-comment.js
const sonarComment = comments.find((c) => c.body?.includes('📊 Coverage'));

if (!sonarComment) {
  console.warn(`No SonarCloud coverage comment on PR #${mergedPR.number}. Setting PREV_COVERAGE=0`);
  writeEnv('PREV_COVERAGE', '0');
  process.exit(0);
}

// Parse coverage directly from the comment: | 📊 Coverage | 41.83% |
const match = sonarComment.body.match(/📊 Coverage \| *([\d.]+)%/);
if (!match) {
  console.warn('Could not parse coverage from comment. Setting PREV_COVERAGE=0');
  writeEnv('PREV_COVERAGE', '0');
  process.exit(0);
}

const coverage = parseFloat(match[1]);
console.log(`Overall project coverage from PR comment: ${coverage}%`);
writeEnv('PREV_COVERAGE', String(coverage));
