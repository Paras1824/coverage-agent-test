# AI Coverage Agent — Complete Build Guide

## What You Are Building

An automated GitHub Actions agent that runs every Monday and Thursday at 6 AM IST. It checks the test coverage from the last merged PR. If coverage is below 70%, it uses Google Gemini AI to automatically write Jest + React Testing Library test cases for low-coverage files, raises a Pull Request with those tests, waits for SonarQube to scan, and emails a reviewer when coverage reaches 80%. If coverage does not reach 80%, it retries by adding more tests to the same PR branch (max 3 attempts). If all 3 attempts are exhausted, it sends a partial report email.

---

## Context and Key Decisions Already Made

These decisions were finalised before building. Do not change them unless explicitly told to.

| Decision | Choice | Reason |
|---|---|---|
| AI Provider | Google Gemini 2.0 Flash | Free tier, no credit card needed |
| Trigger | Cron Mon + Thu 6 AM IST | No native PR counter in GitHub Actions |
| Coverage gate (skip) | ≥ 70% | Skip if already healthy |
| Coverage target | 80% | Minimum acceptable after agent runs |
| Retry behaviour | Add tests to same PR branch | Not a new PR each time |
| Max retries | 3 | Hard limit to avoid infinite loops |
| SonarQube access | Read bot PR comment | No SonarQube API token needed |
| SonarQube polling | Wait 10 min first, then every 5 min | Scan typically takes 5–7 min |
| Email | Gmail SMTP via App Password | Free, no third-party email service |
| Test environment | Personal public repo + SonarCloud free tier | Company repo requires approval first |
| Test folder discovery | Claude scans repo for existing *.test.tsx pattern | Folder structure differs per repo |

---

## Tech Stack

- **Repo type**: React + TypeScript + Next.js + Node.js
- **Testing**: Jest + React Testing Library
- **AI**: Google Gemini 2.0 Flash API (free tier)
- **CI/CD**: GitHub Actions (no server, no deployment)
- **Coverage source 1**: SonarQube bot PR comment (company repo) / SonarCloud (test repo)
- **Coverage source 2**: `npm run test -- --coverage --coverageReporters=json-summary`
- **PR creation**: `peter-evans/create-pull-request@v8`
- **Email**: `dawidd6/action-send-mail@v3` via Gmail SMTP
- **Notifications**: Gmail SMTP + GitHub review request

---

## Architecture Overview

```
TRIGGER: GitHub Actions cron (30 0 * * 1,4 = Mon + Thu 6 AM IST)
         + workflow_dispatch (manual button)
                 |
                 v
STEP 1: Fetch last merged PR number (GitHub CLI)
                 |
                 v
STEP 2: Read PR comments → find "SonarQube Quality Gate" bot comment
        → extract Overall Code coverage % using regex
                 |
                 v
STEP 3: Gate check
        ≥ 70%  → exit 0 (skip this run, do nothing)
        < 70%  → continue
                 |
                 v
STEP 4: Run `npm run test -- --coverage --coverageReporters=json-summary --forceExit`
        → produces coverage/coverage-summary.json with per-file %
        → select files where lines.pct < 60 (sorted by lowest first)
                 |
                 v
STEP 5: [LOOP — max 3 attempts]
        Scan repo for existing *.test.tsx to learn the folder + naming pattern
        For each low-coverage file:
          → Read source file
          → Call Gemini API with component + example test + RTL rules
          → Write test file to correct location
          → Run: npx jest <testfile> to validate
          → Fix failures (Gemini retry, max 3 per file)
                 |
                 v
STEP 6: Run `npm run test -- --coverage --coverageReporters=json-summary --forceExit`
        Compare new vs old coverage-summary.json
        If no improvement → exit (no PR)
        If improved → continue
                 |
                 v
STEP 7: Create branch: auto/coverage-{run_id}
        Commit all new/modified test files
        Raise PR (peter-evans/create-pull-request@v8)
        Labels: ai-generated-tests, needs-review
        Reviewer: $REVIEWER_GITHUB_USERNAME
                 |
                 v
STEP 8: Poll SonarQube
        Wait 10 minutes
        Loop every 5 minutes:
          → Read new PR comments
          → Look for bot comment posted AFTER PR was created
          → Extract coverage % from "📊 Coverage | XX.X% | XX.X%"
          → If found: break loop
          Max total wait: 40 minutes, then fail with error
                 |
                 v
STEP 9: Coverage result check
        ≥ 80%                        → go to STEP 10 (success email)
        < 80% AND attempt < 3        → go back to STEP 5 (same branch)
        < 80% AND attempt == 3       → go to STEP 10 (partial email)
                 |
                 v
STEP 10: Send Gmail report (dawidd6/action-send-mail@v3)
         HTML email containing:
           - Previous coverage (from last merged PR)
           - Coverage after AI tests (from SonarQube scan)
           - Files targeted
           - Number of test files written
           - How many attempts it took
           - Link to the PR
           - Status: SUCCESS (≥80%) or PARTIAL (<80% after 3 attempts)
```

---

## Phase 1: Personal Test Repo Setup (Build and Test Here First)

### Why a personal repo first
The company repo requires approval from a superior before deployment. Build and test the full flow on a personal public repo using SonarCloud (free) instead of the company SonarQube. Once working, adapt for the company repo.

### Step 1.1 — Create the personal test repo

1. Go to github.com → New repository
2. Name: `coverage-agent-test` (or any name)
3. Set to **Public** (required for SonarCloud free tier)
4. Add a README
5. Clone it locally

### Step 1.2 — Add React/TypeScript components for testing

The repo needs some React + TypeScript components with intentionally low test coverage. Create at minimum:

```
src/
  components/
    Button.tsx
    Modal.tsx
    InputField.tsx
    Dropdown.tsx
    UserCard.tsx
  __tests__/
    Button.test.tsx        ← only this one exists initially (low coverage)
```

Keep the components simple but realistic (props, conditional rendering, event handlers). Only create ONE test file initially so the coverage is low enough to trigger the agent.

### Step 1.3 — Set up Jest and React Testing Library

Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest --watchAll=false"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['@testing-library/jest-dom'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ]
};
```

Verify it works: `npm run test -- --coverage` should produce `coverage/coverage-summary.json`.

### Step 1.4 — Set up SonarCloud (free for public repos)

SonarCloud posts the same bot comment format as SonarQube. This lets you test the full parsing and polling logic.

1. Go to **sonarcloud.io** → Sign in with GitHub
2. Click "+" → Analyse new project → Select your `coverage-agent-test` repo
3. Choose "With GitHub Actions" as the analysis method
4. SonarCloud will give you a `SONAR_TOKEN` — copy it
5. Add it as a GitHub secret (see secrets section below)
6. Create `sonar-project.properties` in the repo root:

```properties
sonar.projectKey=YOUR_GITHUB_USERNAME_coverage-agent-test
sonar.organization=YOUR_GITHUB_USERNAME
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.tsx,**/*.test.ts
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username. The `projectKey` and `organization` values come from the SonarCloud UI when you add the project.

7. Add Jest coverage reporters to generate lcov format (SonarCloud needs it):

Update `jest.config.js` coverageReporters:
```javascript
coverageReporters: ['json-summary', 'lcov', 'text']
```

8. Add a SonarCloud scan step to the workflow (see workflow section below).

The SonarCloud bot will post a comment on PRs that looks like:

```
SonarQube Quality Gate Status: PASS ✅
🔗 View Full Report in SonarQube

Metrics:
Metric              | Overall Code | New Code
📊 Coverage         | 45.2%        | 61.0%
```

This is the same format your company's SonarQube uses. The parsing regex handles both.

### Step 1.5 — Get the Gemini API key

1. Go to **aistudio.google.com**
2. Sign in with a personal Google account (not company SSO)
3. Click "Get API key" → "Create API key"
4. Copy the key (starts with `AIza...`)
5. Store it as a GitHub secret `GEMINI_API_KEY`

Free tier limits: 1,500 requests/day, 1M tokens/minute. More than enough for twice-weekly runs.

### Step 1.6 — Set up Gmail App Password

1. Use a **dedicated Gmail account** for the bot (create `coverage.agent.bot@gmail.com` or similar)
2. On that account: Google Account → Security → Enable 2-Step Verification
3. Google Account → Security → App Passwords
4. App name: "Coverage Agent" → Generate
5. Copy the 16-character password (shown once)
6. Store as GitHub secrets `GMAIL_USERNAME` and `GMAIL_APP_PASSWORD`

### Step 1.7 — One-time GitHub repo settings

Go to your repo on GitHub:

1. **Settings → Actions → General**
   - Under "Workflow permissions": select **Read and write permissions**
   - Check **Allow GitHub Actions to create and approve pull requests**
   - Save

2. **Settings → Secrets and variables → Actions → New repository secret**

Add all of these:

| Secret name | Value |
|---|---|
| `GEMINI_API_KEY` | From aistudio.google.com |
| `GMAIL_USERNAME` | e.g. `coverage.agent.bot@gmail.com` |
| `GMAIL_APP_PASSWORD` | The 16-character App Password |
| `REVIEWER_EMAIL` | Email address to send the report to |
| `REVIEWER_GITHUB_USERNAME` | GitHub username to assign as PR reviewer |
| `SONAR_TOKEN` | From SonarCloud (or company SonarQube) |

`GITHUB_TOKEN` is automatically provided by GitHub Actions — you do not add this.

---

## File Structure to Create

```
your-repo/
├── .github/
│   └── workflows/
│       └── auto-test-coverage.yml     ← main workflow
├── scripts/
│   ├── package.json                   ← dependencies for scripts
│   ├── get-coverage.js                ← parse SonarQube bot comment
│   ├── select-files.js                ← pick low-coverage targets
│   ├── discover-test-pattern.js       ← find test folder convention
│   ├── write-tests.js                 ← call Gemini, write test files
│   ├── verify-improvement.js          ← compare before/after coverage
│   ├── poll-sonar.js                  ← wait for SonarQube result
│   └── send-report.js                 ← build email body
├── sonar-project.properties           ← SonarCloud config
└── ... (rest of your project)
```

---

## File 1: `scripts/package.json`

```json
{
  "name": "coverage-agent-scripts",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@octokit/rest": "^21.0.0"
  }
}
```

Run `npm install` inside `scripts/` before using. In the workflow, add a step: `run: cd scripts && npm install`.

---

## File 2: `scripts/get-coverage.js`

**Purpose**: Fetch the last merged PR, find the SonarQube bot comment, extract the Overall Code coverage %.

**Inputs**: `process.env.GITHUB_TOKEN`, `process.env.GITHUB_REPOSITORY` (e.g. `owner/repo`)

**Output**: Writes `PREV_COVERAGE=93.8` to `$GITHUB_ENV`

**Logic**:
```
1. Split GITHUB_REPOSITORY into owner + repo
2. Use Octokit to call: GET /repos/{owner}/{repo}/pulls?state=closed&sort=updated&direction=desc
3. Filter: pull.merged_at !== null
4. Take the first result — that is the last merged PR
5. Get its PR number
6. Call: GET /repos/{owner}/{repo}/issues/{pr_number}/comments
7. Find the comment where body includes "SonarQube Quality Gate"
8. Apply regex: /Coverage\s*\|\s*([\d.]+)%/
   This matches the line: "📊 Coverage | 93.8% | 96.3%"
   Capture group 1 = Overall Code coverage (first %)
9. Write to GITHUB_ENV: `PREV_COVERAGE=93.8`
10. If no bot comment found: write PREV_COVERAGE=0 and log a warning
```

**Important**: The regex captures the FIRST percentage on the Coverage row, which is Overall Code. New Code is the second %. We always use Overall Code.

---

## File 3: `scripts/select-files.js`

**Purpose**: Read `coverage/coverage-summary.json`, identify files below the threshold, output them.

**Inputs**: `coverage/coverage-summary.json` (produced by `npm run test -- --coverage`)

**Output**: Writes `LOW_COV_FILES=src/Button.tsx,src/Modal.tsx` to `$GITHUB_ENV`

**Logic**:
```
1. Read and parse coverage/coverage-summary.json
2. Skip the "total" key
3. For each file path:
   a. Get lines.pct value
   b. If lines.pct < 60: add to targets array
4. Sort targets by lines.pct ascending (lowest first = most critical first)
5. Take top 5 files maximum (to keep API costs bounded)
6. Convert to comma-separated string
7. Write LOW_COV_FILES to $GITHUB_ENV
8. If no files below threshold: write LOW_COV_FILES=none
   The workflow should exit early when LOW_COV_FILES=none
```

**Coverage threshold for file selection**: 60% (files above 60% don't need new tests)
**Max files per run**: 5 (prevents runaway API costs on large codebases)

---

## File 4: `scripts/discover-test-pattern.js`

**Purpose**: Scan the repo to learn where test files live and what they're named.

**Inputs**: Repo filesystem (current directory)

**Output**: Writes a JSON object to `scripts/test-pattern.json`:
```json
{
  "convention": "colocated",
  "testDir": "__tests__",
  "suffix": ".test.tsx",
  "example": "src/components/__tests__/Button.test.tsx",
  "exampleContent": "...full content of the example test file..."
}
```

**Logic**:
```
1. Walk the directory tree using Node's fs.readdirSync recursively
2. Find all files matching *.test.tsx or *.test.ts
3. Exclude node_modules, .git, coverage directories
4. Analyse the paths to determine the pattern:
   a. If most test files live next to the source: "colocated" convention
      e.g. src/Button.tsx + src/Button.test.tsx
   b. If most test files live in a __tests__ subfolder: "subfolder" convention
      e.g. src/components/__tests__/Button.test.tsx
   c. If most test files live in a root tests/ folder: "root" convention
      e.g. tests/Button.test.tsx
5. Pick one representative example test file (the largest one with real content)
6. Read its full content — this becomes the style example for Gemini
7. Write the pattern JSON to scripts/test-pattern.json
```

---

## File 5: `scripts/write-tests.js`

**Purpose**: For each low-coverage file, call Gemini API to generate tests, save them, run them, retry on failure.

**Inputs**:
- `process.env.GEMINI_API_KEY`
- `process.env.LOW_COV_FILES` (comma-separated paths)
- `scripts/test-pattern.json` (from discover-test-pattern.js)

**Output**: Test files written to disk in correct locations. Exits with code 1 if tests could not be made to pass after 3 retries.

**Logic**:
```
1. Read LOW_COV_FILES, split by comma
2. Read scripts/test-pattern.json for convention + example content
3. For each source file path:
   a. Read the full source file content
   b. Determine where the test file should go based on convention:
      - colocated: same dir, same name + .test.tsx
      - subfolder: add __tests__ folder, same name + .test.tsx
      - root: tests/ folder, same name + .test.tsx
   c. Check if a test file already exists — if yes, read it too
   d. Build prompt (see Gemini Prompt Template below)
   e. Call Gemini API (see API call details below)
   f. Extract the test code from the response
   g. Write to the test file location
   h. Run: child_process.execSync('npx jest ' + testFilePath + ' --no-coverage')
   i. If jest passes: mark file as done, continue to next file
   j. If jest fails: read the error output, build a fix prompt, call Gemini again
      Retry max 3 times per file
   k. If still failing after 3 retries: skip this file, log a warning
4. After all files processed: exit 0
```

**Gemini API call**:
```javascript
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const response = await fetch(
  `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192
      }
    })
  }
);
const data = await response.json();
const text = data.candidates[0].content.parts[0].text;
```

**Gemini Prompt Template** (build this string in code):
```
You are a React testing expert. Write Jest + React Testing Library tests for the component below.

COMPONENT SOURCE FILE: {filePath}
{sourceFileContent}

EXISTING TEST FILE (if any):
{existingTestContent or "No existing test file"}

EXAMPLE TEST FROM THIS REPO (follow this exact style, imports, and folder pattern):
{exampleContent}

RTL RULES YOU MUST FOLLOW:
1. Use getByRole, getByLabelText, getByText — NOT getByTestId or container.querySelector
2. Use userEvent (from @testing-library/user-event) for clicks and typing — NOT fireEvent
3. Never write snapshot-only tests. Every test must assert real user-visible behaviour.
4. Use waitFor for async operations.
5. Mock external dependencies (fetch, API calls) with jest.fn()

TASK:
Write comprehensive Jest + RTL tests for this component.
Cover: renders correctly, user interactions, edge cases, error states.
Target: at least 80% line coverage for this file.

OUTPUT FORMAT:
Return ONLY the complete test file content, no explanation, no markdown code blocks.
Start directly with the import statements.
```

**Gemini fix/retry prompt** (when tests fail):
```
The test file you wrote has errors. Here is the Jest error output:

{errorOutput}

The original test file was:
{previousTestContent}

Fix the errors and return the corrected complete test file.
Return ONLY the test file content, no explanation, no markdown code blocks.
```

---

## File 6: `scripts/verify-improvement.js`

**Purpose**: Compare the new coverage numbers against the old ones. Exit with error if no improvement (prevents opening a useless PR).

**Inputs**:
- `coverage/coverage-summary.json` (newly generated)
- `scripts/baseline-coverage.json` (saved before test writing, see workflow)

**Output**: Writes `NEW_COVERAGE=67.4` to `$GITHUB_ENV`. Exits with code 1 if overall coverage did not improve by at least 1%.

**Logic**:
```
1. Read coverage/coverage-summary.json → new total lines.pct
2. Read scripts/baseline-coverage.json → old total lines.pct
3. If new <= old: console.error('No improvement'); process.exit(1)
4. Write NEW_COVERAGE=XX.X to $GITHUB_ENV
5. Log the improvement for the workflow to see
```

The baseline is saved in the workflow before the test-writing step:
```yaml
- name: Save baseline coverage
  run: cp coverage/coverage-summary.json scripts/baseline-coverage.json
```

---

## File 7: `scripts/poll-sonar.js`

**Purpose**: After the PR is raised, wait for SonarQube to post its scan result as a PR comment. Extract the new coverage %.

**Inputs**:
- `process.env.GITHUB_TOKEN`
- `process.env.GITHUB_REPOSITORY`
- `process.env.PR_NUMBER` (from the create-pull-request step output)
- `process.env.PR_CREATED_AT` (timestamp of when the PR was created, ISO 8601)

**Output**: Writes `SONAR_COVERAGE=78.2` to `$GITHUB_ENV`. Exits with code 1 if timeout reached (40 minutes).

**Logic**:
```
1. Wait 10 minutes (sleep 600000ms)
2. Start polling loop (max 6 more attempts × 5 min = 30 min = 40 min total):
   a. Call GET /repos/{owner}/{repo}/issues/{pr_number}/comments
   b. Filter: comment.created_at > PR_CREATED_AT
   c. Find: comment.body includes "SonarQube Quality Gate"
   d. If found:
      - Apply regex: /Coverage\s*\|\s*([\d.]+)%/
      - Extract first % = Overall Code coverage
      - Write SONAR_COVERAGE=XX.X to $GITHUB_ENV
      - Exit 0
   e. If not found:
      - Log "SonarQube result not yet available, waiting 5 min..."
      - Wait 5 minutes
      - Continue loop
3. After all attempts exhausted:
   console.error('SonarQube result not found after 40 minutes');
   process.exit(1)
```

**Critical detail**: Filter by `comment.created_at > PR_CREATED_AT` to avoid reading the OLD merged PR's SonarQube comment. The timestamp comparison prevents false positives from previous scans.

---

## File 8: `scripts/send-report.js`

**Purpose**: Build and send the HTML email report via Gmail SMTP.

This script is NOT called directly — it just builds the HTML body and writes it to a file. The actual email sending is done by the `dawidd6/action-send-mail@v3` action in the workflow.

**Inputs**:
- `process.env.PREV_COVERAGE`
- `process.env.NEW_COVERAGE`
- `process.env.SONAR_COVERAGE`
- `process.env.LOW_COV_FILES`
- `process.env.PR_URL`
- `process.env.ATTEMPT_NUMBER`
- `process.env.COVERAGE_STATUS` (SUCCESS or PARTIAL)

**Output**: Writes `scripts/email-body.html` to disk.

**Email HTML template**:
```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

<h2 style="color: {#2ecc71 if SUCCESS else #e74c3c}">
  {✅ Coverage Boosted to SONAR_COVERAGE% if SUCCESS}
  {⚠️ Coverage Agent: Partial Result (SONAR_COVERAGE%) if PARTIAL}
</h2>

<table style="width:100%; border-collapse:collapse; margin: 20px 0">
  <tr>
    <td style="padding:10px; border:1px solid #ddd; background:#f9f9f9">Previous Coverage</td>
    <td style="padding:10px; border:1px solid #ddd">{PREV_COVERAGE}%</td>
  </tr>
  <tr>
    <td style="padding:10px; border:1px solid #ddd; background:#f9f9f9">Coverage After AI Tests</td>
    <td style="padding:10px; border:1px solid #ddd">{SONAR_COVERAGE}%</td>
  </tr>
  <tr>
    <td style="padding:10px; border:1px solid #ddd; background:#f9f9f9">Files Targeted</td>
    <td style="padding:10px; border:1px solid #ddd">{LOW_COV_FILES (newline separated)}</td>
  </tr>
  <tr>
    <td style="padding:10px; border:1px solid #ddd; background:#f9f9f9">Attempts Used</td>
    <td style="padding:10px; border:1px solid #ddd">{ATTEMPT_NUMBER} / 3</td>
  </tr>
</table>

<p>
  {if SUCCESS: "Coverage has reached the 80% target. Please review the AI-generated tests and merge if they look correct."}
  {if PARTIAL: "The agent ran 3 attempts but coverage did not reach 80%. Please review what was generated — it may still be useful, or the remaining files may need manual tests."}
</p>

<p>
  <a href="{PR_URL}" style="background:#3498db; color:white; padding:12px 24px; text-decoration:none; border-radius:4px">
    Review and Merge PR →
  </a>
</p>

<p style="color:#999; font-size:12px; margin-top:30px">
  This email was sent by the AI Coverage Agent (GitHub Actions).
  Run triggered: {new Date().toISOString()}
</p>

</body>
</html>
```

---

## File 9: `.github/workflows/auto-test-coverage.yml`

This is the main workflow file. Write it exactly as follows.

```yaml
name: AI Coverage Agent

on:
  schedule:
    - cron: '30 0 * * 1,4'  # Mon + Thu 6 AM IST (= 00:30 UTC)
  workflow_dispatch:          # Manual trigger button in GitHub Actions tab

jobs:
  coverage-agent:
    runs-on: ubuntu-latest
    timeout-minutes: 90      # Safety: max 90 min total run time

    permissions:
      contents: write
      pull-requests: write
      issues: read

    env:
      ATTEMPT: 0
      MAX_ATTEMPTS: 3
      TARGET_COVERAGE: 80
      FILE_THRESHOLD: 60
      GATE_THRESHOLD: 70

    steps:

      # ── Setup ────────────────────────────────────────────────

      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0      # Full history needed for branch operations

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install project dependencies
        run: npm ci

      - name: Install script dependencies
        run: cd scripts && npm install

      # ── Step 1+2: Fetch last merged PR coverage ───────────────

      - name: Fetch last merged PR coverage
        id: prev_coverage
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
        run: node scripts/get-coverage.js
        # Writes PREV_COVERAGE to $GITHUB_ENV

      # ── Step 3: Coverage gate check ──────────────────────────

      - name: Check coverage gate
        run: |
          node -e "
            const c = parseFloat(process.env.PREV_COVERAGE || '0');
            if (c >= ${{ env.GATE_THRESHOLD }}) {
              console.log('Coverage ' + c + '% is >= ${{ env.GATE_THRESHOLD }}%. Skipping run.');
              process.exit(0);
            }
            console.log('Coverage ' + c + '% is below ${{ env.GATE_THRESHOLD }}%. Starting agent.');
          "
        env:
          PREV_COVERAGE: ${{ env.PREV_COVERAGE }}

      # ── Step 4: Run tests to get baseline per-file coverage ───

      - name: Run tests (baseline coverage)
        run: |
          npm run test -- \
            --coverage \
            --coverageReporters=json-summary \
            --coverageReporters=lcov \
            --forceExit

      - name: Save baseline coverage
        run: cp coverage/coverage-summary.json scripts/baseline-coverage.json

      - name: Select low-coverage files
        run: node scripts/select-files.js
        # Writes LOW_COV_FILES to $GITHUB_ENV

      - name: Exit if no low-coverage files
        run: |
          if [ "${{ env.LOW_COV_FILES }}" == "none" ]; then
            echo "No files below ${{ env.FILE_THRESHOLD }}% threshold. Nothing to do."
            exit 0
          fi
          echo "Targeting: ${{ env.LOW_COV_FILES }}"

      # ── Step 5: Discover test pattern ────────────────────────

      - name: Discover test folder convention
        run: node scripts/discover-test-pattern.js
        # Writes scripts/test-pattern.json

      # ── RETRY LOOP (Attempt 1) ────────────────────────────────

      - name: Write tests - Attempt 1
        id: write_attempt_1
        run: node scripts/write-tests.js
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LOW_COV_FILES: ${{ env.LOW_COV_FILES }}
        continue-on-error: true

      - name: Run tests (verify improvement - Attempt 1)
        id: verify_attempt_1
        run: |
          npm run test -- \
            --coverage \
            --coverageReporters=json-summary \
            --coverageReporters=lcov \
            --forceExit
          node scripts/verify-improvement.js
        # Writes NEW_COVERAGE to $GITHUB_ENV
        continue-on-error: true

      # ── Step 6+7: Create PR ───────────────────────────────────

      - name: Commit test files
        run: |
          git config user.name "Coverage Agent Bot"
          git config user.email "coverage-agent@users.noreply.github.com"
          git add "**/*.test.tsx" "**/*.test.ts"
          git diff --staged --quiet || git commit -m "test: AI-generated tests to boost coverage (was ${{ env.PREV_COVERAGE }}%)"

      - name: Create Pull Request
        id: cpr
        uses: peter-evans/create-pull-request@v8
        with:
          branch: auto/coverage-${{ github.run_id }}
          title: "test: AI-generated tests (prev coverage: ${{ env.PREV_COVERAGE }}%)"
          body: |
            ## AI Coverage Agent Report

            **Previous coverage:** ${{ env.PREV_COVERAGE }}%
            **Local coverage after tests:** ${{ env.NEW_COVERAGE }}%
            **Files targeted:** ${{ env.LOW_COV_FILES }}

            ---
            ⚠️ These tests were generated by AI. Please review every assertion carefully before merging.
            Do not merge if any test appears to only test implementation details rather than user behaviour.
          labels: ai-generated-tests,needs-review
          reviewers: ${{ secrets.REVIEWER_GITHUB_USERNAME }}
          delete-branch: true

      - name: Save PR info
        run: |
          echo "PR_NUMBER=${{ steps.cpr.outputs.pull-request-number }}" >> $GITHUB_ENV
          echo "PR_URL=${{ steps.cpr.outputs.pull-request-url }}" >> $GITHUB_ENV
          echo "PR_CREATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> $GITHUB_ENV

      # ── SonarCloud scan step (needed for SonarCloud on test repo) ──
      # Remove this block when deploying to company repo
      # (company already has SonarQube running on PRs)

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      # ── Step 8: Poll SonarQube for result ────────────────────

      - name: Poll SonarQube scan result - Attempt 1
        id: sonar_result_1
        run: node scripts/poll-sonar.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          PR_NUMBER: ${{ env.PR_NUMBER }}
          PR_CREATED_AT: ${{ env.PR_CREATED_AT }}
        # Writes SONAR_COVERAGE to $GITHUB_ENV
        continue-on-error: true

      # ── Step 9: Coverage result check ────────────────────────

      - name: Check if target reached after attempt 1
        id: check_1
        run: |
          node -e "
            const cov = parseFloat(process.env.SONAR_COVERAGE || '0');
            const target = ${{ env.TARGET_COVERAGE }};
            if (cov >= target) {
              console.log('TARGET_REACHED=true');
              require('fs').appendFileSync(process.env.GITHUB_ENV, 'TARGET_REACHED=true\n');
              require('fs').appendFileSync(process.env.GITHUB_ENV, 'FINAL_COVERAGE=' + cov + '\n');
              require('fs').appendFileSync(process.env.GITHUB_ENV, 'ATTEMPT_NUMBER=1\n');
              require('fs').appendFileSync(process.env.GITHUB_ENV, 'COVERAGE_STATUS=SUCCESS\n');
            } else {
              console.log('Coverage ' + cov + '% still below ' + target + '%. Will retry.');
              require('fs').appendFileSync(process.env.GITHUB_ENV, 'TARGET_REACHED=false\n');
            }
          "
        env:
          SONAR_COVERAGE: ${{ env.SONAR_COVERAGE }}

      # ── RETRY LOOP (Attempt 2) ────────────────────────────────

      - name: Write more tests - Attempt 2
        if: env.TARGET_REACHED == 'false'
        run: |
          git checkout auto/coverage-${{ github.run_id }}
          node scripts/write-tests.js
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LOW_COV_FILES: ${{ env.LOW_COV_FILES }}
        continue-on-error: true

      - name: Commit and push - Attempt 2
        if: env.TARGET_REACHED == 'false'
        run: |
          git add "**/*.test.tsx" "**/*.test.ts"
          git diff --staged --quiet || git commit -m "test: additional AI tests - attempt 2"
          git push origin auto/coverage-${{ github.run_id }}

      - name: Poll SonarQube - Attempt 2
        if: env.TARGET_REACHED == 'false'
        run: node scripts/poll-sonar.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          PR_NUMBER: ${{ env.PR_NUMBER }}
          PR_CREATED_AT: ${{ env.PR_CREATED_AT }}
        continue-on-error: true

      - name: Check if target reached after attempt 2
        if: env.TARGET_REACHED == 'false'
        run: |
          node -e "
            const cov = parseFloat(process.env.SONAR_COVERAGE || '0');
            const target = ${{ env.TARGET_COVERAGE }};
            if (cov >= target) {
              require('fs').appendFileSync(process.env.GITHUB_ENV, 'TARGET_REACHED=true\nFINAL_COVERAGE=' + cov + '\nATTEMPT_NUMBER=2\nCOVERAGE_STATUS=SUCCESS\n');
            }
          "
        env:
          SONAR_COVERAGE: ${{ env.SONAR_COVERAGE }}

      # ── RETRY LOOP (Attempt 3 / Final) ───────────────────────

      - name: Write more tests - Attempt 3 (final)
        if: env.TARGET_REACHED == 'false'
        run: |
          git checkout auto/coverage-${{ github.run_id }}
          node scripts/write-tests.js
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LOW_COV_FILES: ${{ env.LOW_COV_FILES }}
        continue-on-error: true

      - name: Commit and push - Attempt 3
        if: env.TARGET_REACHED == 'false'
        run: |
          git add "**/*.test.tsx" "**/*.test.ts"
          git diff --staged --quiet || git commit -m "test: additional AI tests - attempt 3 (final)"
          git push origin auto/coverage-${{ github.run_id }}

      - name: Poll SonarQube - Attempt 3
        if: env.TARGET_REACHED == 'false'
        run: node scripts/poll-sonar.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          PR_NUMBER: ${{ env.PR_NUMBER }}
          PR_CREATED_AT: ${{ env.PR_CREATED_AT }}
        continue-on-error: true

      - name: Set final status after attempt 3
        if: env.TARGET_REACHED == 'false'
        run: |
          node -e "
            const cov = parseFloat(process.env.SONAR_COVERAGE || '0');
            const target = ${{ env.TARGET_COVERAGE }};
            const status = cov >= target ? 'SUCCESS' : 'PARTIAL';
            require('fs').appendFileSync(process.env.GITHUB_ENV,
              'TARGET_REACHED=true\nFINAL_COVERAGE=' + cov + '\nATTEMPT_NUMBER=3\nCOVERAGE_STATUS=' + status + '\n'
            );
          "
        env:
          SONAR_COVERAGE: ${{ env.SONAR_COVERAGE }}

      # ── Step 10: Send Gmail report ────────────────────────────

      - name: Build email body
        run: node scripts/send-report.js
        env:
          PREV_COVERAGE: ${{ env.PREV_COVERAGE }}
          NEW_COVERAGE: ${{ env.NEW_COVERAGE }}
          SONAR_COVERAGE: ${{ env.FINAL_COVERAGE }}
          LOW_COV_FILES: ${{ env.LOW_COV_FILES }}
          PR_URL: ${{ env.PR_URL }}
          ATTEMPT_NUMBER: ${{ env.ATTEMPT_NUMBER }}
          COVERAGE_STATUS: ${{ env.COVERAGE_STATUS }}

      - name: Send email report
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          server_port: 465
          secure: true
          username: ${{ secrets.GMAIL_USERNAME }}
          password: ${{ secrets.GMAIL_APP_PASSWORD }}
          subject: >
            ${{ env.COVERAGE_STATUS == 'SUCCESS' && '✅' || '⚠️' }}
            Coverage ${{ env.FINAL_COVERAGE }}% — PR ready for review
          html_body: file://scripts/email-body.html
          to: ${{ secrets.REVIEWER_EMAIL }}
          from: Coverage Agent <${{ secrets.GMAIL_USERNAME }}>
```

---

## File 10: `sonar-project.properties`

For the personal test repo only. Remove or replace when deploying to the company repo.

```properties
sonar.projectKey=REPLACE_WITH_YOUR_USERNAME_coverage-agent-test
sonar.organization=REPLACE_WITH_YOUR_USERNAME
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.tsx,**/*.test.ts,**/*.spec.tsx,**/*.spec.ts
sonar.exclusions=**/node_modules/**,**/coverage/**,**/*.d.ts
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

---

## Critical Values Reference

These are exact values used across all scripts and the workflow. Use them verbatim.

| Item | Exact Value |
|---|---|
| Cron expression (6 AM IST) | `30 0 * * 1,4` |
| Bot comment marker | `"SonarQube Quality Gate"` |
| Coverage regex | `/Coverage\s*\|\s*([\d.]+)%/` |
| Coverage gate threshold (skip) | `70` |
| File selection threshold | `60` |
| Coverage target (success) | `80` |
| Max files per run | `5` |
| Max retries | `3` |
| SonarQube first wait | `10 minutes (600000ms)` |
| SonarQube retry interval | `5 minutes (300000ms)` |
| SonarQube max total wait | `40 minutes` |
| Gemini model | `gemini-2.0-flash` |
| Gemini API base URL | `https://generativelanguage.googleapis.com/v1beta/models/` |
| Gemini temperature | `0.2` |
| Gemini max tokens | `8192` |
| Branch name pattern | `auto/coverage-{github.run_id}` |
| PR label | `ai-generated-tests,needs-review` |

---

## Testing the Flow — Checklist

Run through these in order. Use `workflow_dispatch` (manual trigger) for all tests, not the cron.

### Test 1: Coverage gate works
1. Make sure your test repo has > 70% coverage
2. Run workflow manually
3. Expected: workflow logs "Coverage XX% is >= 70%. Skipping run." and exits cleanly

### Test 2: Coverage parsing works
1. Find a merged PR that has a SonarQube bot comment
2. Run `node scripts/get-coverage.js` locally (set env vars manually)
3. Expected: prints "PREV_COVERAGE=XX.X"

### Test 3: File selection works
1. Run `npm run test -- --coverage --coverageReporters=json-summary --forceExit`
2. Run `node scripts/select-files.js` locally
3. Expected: prints `LOW_COV_FILES=src/...`

### Test 4: Gemini writes tests
1. Run `node scripts/write-tests.js` manually with a single file
2. Expected: test file created, `npx jest` on it passes

### Test 5: Full workflow end-to-end
1. Set coverage below 70% in your test repo (delete some test files)
2. Merge a PR (so there is a "last merged PR" to read)
3. Run workflow manually
4. Expected after ~20 minutes: a PR is raised, SonarQube scans it, email arrives

---

## Deploying to Company Repo

When you have approval from your superior, make these changes:

### Change 1: Remove SonarCloud scan step
Delete the "SonarCloud Scan" step from the workflow. The company's existing SonarQube integration already runs on every PR automatically.

### Change 2: Remove sonar-project.properties
Not needed — the company repo already has SonarQube configured.

### Change 3: Update REVIEWER_GITHUB_USERNAME
Change to your superior's or team lead's GitHub username.

### Change 4: Add new secrets to company repo
Add all the same secrets (`GEMINI_API_KEY`, `GMAIL_USERNAME`, `GMAIL_APP_PASSWORD`, `REVIEWER_EMAIL`, `REVIEWER_GITHUB_USERNAME`) to the company repo's Settings → Secrets → Actions.

### Change 5: Enable GitHub Actions PR permissions
Settings → Actions → General → Read and write permissions → Allow GitHub Actions to create and approve pull requests.

### Change 6: Swap AI provider when approved
If the company approves AWS Bedrock access, swap the Gemini API call in `write-tests.js` for the AWS Bedrock SDK:
```javascript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
const client = new BedrockRuntimeClient({ region: 'us-east-1' });
// model: 'anthropic.claude-sonnet-4-20250514-v1:0'
```
The prompt stays identical. Only the API call changes.

---

## Known Constraints and Limitations

1. **AI-generated tests are drafts** — they may pass Jest but test implementation details instead of real behaviour. A human MUST review every generated test before merging.

2. **Coverage inflation** — a test that just renders a component adds line coverage without proving correctness. Check that tests have real assertions (not just `expect(component).toBeInTheDocument()`).

3. **Test folder pattern detection** — if the repo has mixed conventions (some colocated, some in __tests__), `discover-test-pattern.js` will pick the majority pattern. Files may be created in the wrong location for the minority. This is acceptable — the reviewer can move them.

4. **SonarQube polling on new push** — when retrying (push to same branch), the `poll-sonar.js` script must look for a bot comment created AFTER the new push timestamp, not just after the PR creation time. On retries, update `PR_CREATED_AT` in env to the timestamp of the latest push before polling.

5. **Gemini free tier data** — on the free tier, code sent to Gemini may be used to improve Google's models. This is acceptable for a personal test repo with generic components. For the company repo, use the paid tier or AWS Bedrock.

6. **GitHub Actions GITHUB_TOKEN** — the default `GITHUB_TOKEN` cannot trigger other workflows (like SonarQube CI) on PRs created by a bot. If SonarQube is triggered by a GitHub Actions workflow (not a GitHub App), you may need a Personal Access Token (PAT) stored as `PAT_TOKEN` and passed to `peter-evans/create-pull-request` via the `token:` input. Check if the company SonarQube integration is a GitHub App (works with default token) or a workflow (needs PAT).

7. **90% target is aspirational** — real-world AI test generation reliably achieves 70–80% coverage on presentational components. Complex components with hooks, context, and async behaviour may need manual tests for the last 10–15 percentage points. Set expectations accordingly.

---

## Phased Rollout Plan

| Phase | Timeline | Goal |
|---|---|---|
| Phase 1 | Week 1 | Manual trigger works end-to-end on personal repo (SonarCloud) |
| Phase 2 | Week 2–3 | Cron runs automatically, retry loop works, email arrives correctly |
| Phase 3 | Week 3–4 | Present working demo to superior, request company repo approval |
| Phase 4 | Month 2 | Deploy to company repo, monitor first 4 automated runs |
| Phase 5 | Month 2–3 | Scale to additional repos using reusable workflow pattern |

---

*End of build guide.*