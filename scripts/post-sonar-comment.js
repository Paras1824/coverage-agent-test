import { Octokit } from '@octokit/rest';

const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'owner/repo').split('/');
const projectKey = `${owner}_${repo}`;
const prNumber = parseInt(process.env.PR_NUMBER || '0', 10);

if (!prNumber) {
  console.log('No PR number — skipping comment.');
  process.exit(0);
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const url = `https://sonarcloud.io/api/measures/component?component=${projectKey}&pullRequest=${prNumber}&metricKeys=coverage,ncloc,bugs,vulnerabilities,code_smells,duplicated_lines_density`;
const headers = process.env.SONAR_TOKEN ? { Authorization: `Bearer ${process.env.SONAR_TOKEN}` } : {};

const res = await fetch(url, { headers });
if (!res.ok) {
  console.error(`SonarCloud API error ${res.status}: ${await res.text()}`);
  process.exit(0);
}

const data = await res.json();
const m = (key) => data.component?.measures?.find((x) => x.metric === key)?.value ?? 'N/A';

const coverage = m('coverage');
const ncloc = m('ncloc');
const bugs = m('bugs');
const vulns = m('vulnerabilities');
const smells = m('code_smells');
const dup = m('duplicated_lines_density');

const coverageNum = coverage !== 'N/A' ? parseFloat(coverage) : null;
const gate = coverageNum !== null && coverageNum >= 70 ? 'PASS ✅' : 'FAIL ❌';

const body = [
  `## SonarCloud Quality Gate Status: ${gate}`,
  '',
  '| Metric | Overall Code |',
  '|--------|-------------|',
  `| 📏 Lines of Code | ${ncloc} |`,
  `| 🐞 Reliability Issues | ${bugs} |`,
  `| 🔒 Security Issues | ${vulns} |`,
  `| 🌀 Code Smells | ${smells} |`,
  `| 📊 Coverage | ${coverage !== 'N/A' ? `${coverage}%` : 'N/A'} |`,
  `| 🔁 Duplicated Lines Density | ${dup !== 'N/A' ? `${dup}%` : 'N/A'} |`,
].join('\n');

await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
console.log(`Posted coverage comment on PR #${prNumber} — coverage: ${coverage}%`);
