# Coverage Agent Test

A demo LMS platform used to test the AI Coverage Agent — a GitHub Actions workflow that automatically writes Jest tests for low-coverage files using Google Gemini, creates PRs, and sends email reports.

## Components

- `QuizQuestion` — multi/single choice quiz with feedback
- `CourseCard` — course display with enroll button
- `EnrollmentForm` — form with validation
- `StudentDashboard` — student stats and progress overview
- `ProgressBar` — animated progress indicator

## Running tests

```bash
npm install
npm test
```

## How the agent works

1. Reads coverage from the last merged PR (via SonarCloud)
2. If below 70%, selects files under 60% coverage
3. Calls Gemini 2.0 Flash to write Jest + RTL tests
4. Opens a PR with the generated tests
5. Polls SonarCloud for post-scan coverage
6. Sends an email report to the reviewer
