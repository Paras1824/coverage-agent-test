# AI Coverage Agent — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete AI Coverage Agent on a personal public GitHub repo (Phase 1), using a demo LMS React + TypeScript project as the coverage target, triggered manually via `workflow_dispatch`.

**Architecture:** GitHub Actions workflow that reads the last merged PR's SonarCloud coverage comment, runs Jest to find low-coverage files (<60%), calls Gemini 2.0 Flash to generate RTL tests, commits them to a PR, polls SonarCloud for the new scan result, and emails a report — retrying up to 3 times if coverage stays below 80%.

**Tech Stack:** React 18 + TypeScript 5, Jest 29 + React Testing Library 14, Node.js 24, Gemini 2.0 Flash API (free tier), GitHub Actions, SonarCloud (free for public repos), Gmail SMTP + App Password.

---

## File Structure

```
C:\test-cases-automation\
├── .github/
│   └── workflows/
│       └── auto-test-coverage.yml       ← Main CI workflow (workflow_dispatch only)
├── scripts/
│   ├── package.json                     ← ESM deps (@octokit/rest)
│   ├── get-coverage.js                  ← Fetch last merged PR SonarCloud comment
│   ├── select-files.js                  ← Pick files with lines.pct < 60
│   ├── discover-test-pattern.js         ← Detect __tests__ vs colocated convention
│   ├── write-tests.js                   ← Call Gemini, write + validate test files
│   ├── verify-improvement.js            ← Compare new vs baseline coverage
│   ├── poll-sonar.js                    ← Poll PR comments for SonarCloud result
│   └── send-report.js                   ← Build HTML email body
├── src/
│   └── components/
│       ├── QuizQuestion.tsx             ← Complex quiz component (primary target)
│       ├── CourseCard.tsx               ← Course display card
│       ├── EnrollmentForm.tsx           ← Course enrollment form with validation
│       ├── StudentDashboard.tsx         ← Dashboard with stats
│       ├── ProgressBar.tsx              ← Animated progress indicator (simplest)
│       └── __tests__/
│           └── ProgressBar.test.tsx     ← ONLY initial test (keeps coverage low)
├── sonar-project.properties             ← SonarCloud config (fill in values)
├── package.json                         ← React + Jest + RTL deps
├── jest.config.js                       ← Jest + ts-jest config
├── jest.setup.ts                        ← jest-dom import
├── tsconfig.json                        ← TypeScript config
└── .gitignore
```

---

## Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.js`
- Create: `jest.setup.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git**

```bash
git init
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
coverage/
scripts/node_modules/
scripts/baseline-coverage.json
scripts/test-pattern.json
scripts/email-body.html
*.env
.env*
dist/
.next/
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "coverage-agent-test",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "jest --watchAll=false"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/jest": "^29.5.14",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src", "jest.setup.ts"],
  "exclude": ["node_modules", "coverage", "scripts"]
}
```

- [ ] **Step 5: Create `jest.config.js`**

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageReporters: ['json-summary', 'lcov', 'text'],
};
```

- [ ] **Step 6: Create `jest.setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json jest.config.js jest.setup.ts .gitignore
git commit -m "chore: project skeleton with Jest + RTL + TypeScript"
```

---

## Task 2: LMS React Components

**Files:**
- Create: `src/components/ProgressBar.tsx`
- Create: `src/components/CourseCard.tsx`
- Create: `src/components/EnrollmentForm.tsx`
- Create: `src/components/StudentDashboard.tsx`
- Create: `src/components/QuizQuestion.tsx`

- [ ] **Step 1: Create `src/components/ProgressBar.tsx`**

```tsx
import React from 'react';

interface ProgressBarProps {
  value: number;
  label?: string;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  color = '#4f46e5',
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="progress-container">
      {label && <span className="progress-label">{label}</span>}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        style={{ width: '100%', background: '#e5e7eb', borderRadius: 4, height: 8 }}
      >
        <div
          style={{
            width: `${clamped}%`,
            background: color,
            height: '100%',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span className="progress-value">{clamped}%</span>
    </div>
  );
};

export default ProgressBar;
```

- [ ] **Step 2: Create `src/components/CourseCard.tsx`**

```tsx
import React from 'react';

interface Course {
  id: string;
  title: string;
  instructor: string;
  duration: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  enrolled: number;
  thumbnail?: string;
}

interface CourseCardProps {
  course: Course;
  onEnroll?: (courseId: string) => void;
  isEnrolled?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onEnroll, isEnrolled = false }) => {
  const levelColors: Record<Course['level'], string> = {
    beginner: '#10b981',
    intermediate: '#f59e0b',
    advanced: '#ef4444',
  };

  return (
    <article className="course-card" aria-label={`Course: ${course.title}`}>
      {course.thumbnail ? (
        <img src={course.thumbnail} alt={`${course.title} thumbnail`} className="course-thumbnail" />
      ) : (
        <div className="course-thumbnail-placeholder" aria-hidden="true">
          {course.title.charAt(0)}
        </div>
      )}
      <div className="course-body">
        <h3 className="course-title">{course.title}</h3>
        <p className="course-instructor">by {course.instructor}</p>
        <div className="course-meta">
          <span
            className="course-level"
            style={{ color: levelColors[course.level] }}
            aria-label={`Level: ${course.level}`}
          >
            {course.level}
          </span>
          <span className="course-duration" aria-label={`Duration: ${course.duration} hours`}>
            {course.duration}h
          </span>
          <span className="course-enrolled" aria-label={`${course.enrolled} students enrolled`}>
            {course.enrolled} enrolled
          </span>
        </div>
      </div>
      <button
        onClick={() => onEnroll?.(course.id)}
        disabled={isEnrolled}
        aria-label={isEnrolled ? `Already enrolled in ${course.title}` : `Enroll in ${course.title}`}
        className={`enroll-btn ${isEnrolled ? 'enrolled' : ''}`}
      >
        {isEnrolled ? 'Enrolled' : 'Enroll Now'}
      </button>
    </article>
  );
};

export default CourseCard;
```

- [ ] **Step 3: Create `src/components/EnrollmentForm.tsx`**

```tsx
import React, { useState } from 'react';

interface CourseOption {
  id: string;
  title: string;
}

interface EnrollmentFormProps {
  courses: CourseOption[];
  onSubmit: (data: { name: string; email: string; courseId: string }) => void;
  loading?: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  courseId?: string;
}

const EnrollmentForm: React.FC<EnrollmentFormProps> = ({ courses, onSubmit, loading = false }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [courseId, setCourseId] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Enter a valid email address';
    }
    if (!courseId) errs.courseId = 'Please select a course';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit({ name, email, courseId });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div role="status" className="enrollment-success">
        <p>Enrollment successful! Check your email at {email}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="enrollment-form" aria-label="Course Enrollment Form" noValidate>
      <div className="form-group">
        <label htmlFor="enroll-name">Full Name</label>
        <input
          id="enroll-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          placeholder="Jane Doe"
        />
        {errors.name && (
          <span id="name-error" role="alert" className="field-error">
            {errors.name}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="enroll-email">Email Address</label>
        <input
          id="enroll-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          placeholder="jane@example.com"
        />
        {errors.email && (
          <span id="email-error" role="alert" className="field-error">
            {errors.email}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="enroll-course">Select Course</label>
        <select
          id="enroll-course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          aria-required="true"
          aria-invalid={!!errors.courseId}
          aria-describedby={errors.courseId ? 'course-error' : undefined}
        >
          <option value="">-- Choose a course --</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        {errors.courseId && (
          <span id="course-error" role="alert" className="field-error">
            {errors.courseId}
          </span>
        )}
      </div>

      <button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? 'Enrolling...' : 'Enroll Now'}
      </button>
    </form>
  );
};

export default EnrollmentForm;
```

- [ ] **Step 4: Create `src/components/StudentDashboard.tsx`**

```tsx
import React from 'react';
import ProgressBar from './ProgressBar';

interface EnrolledCourse {
  id: string;
  title: string;
  progress: number;
  instructor: string;
}

interface StudentDashboardProps {
  studentName: string;
  enrolledCourses: EnrolledCourse[];
  completedCourses: number;
  totalHoursSpent: number;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  studentName,
  enrolledCourses,
  completedCourses,
  totalHoursSpent,
}) => {
  const overallProgress =
    enrolledCourses.length === 0
      ? 0
      : Math.round(enrolledCourses.reduce((sum, c) => sum + c.progress, 0) / enrolledCourses.length);

  return (
    <main className="dashboard" aria-label={`${studentName}'s Dashboard`}>
      <header className="dashboard-header">
        <h1>Welcome back, {studentName}</h1>
      </header>

      <section className="stats-grid" aria-label="Learning statistics">
        <div className="stat-card" role="region" aria-label="Enrolled courses">
          <span className="stat-value">{enrolledCourses.length}</span>
          <span className="stat-label">Enrolled</span>
        </div>
        <div className="stat-card" role="region" aria-label="Completed courses">
          <span className="stat-value">{completedCourses}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card" role="region" aria-label="Hours spent learning">
          <span className="stat-value">{totalHoursSpent}h</span>
          <span className="stat-label">Hours Learned</span>
        </div>
        <div className="stat-card" role="region" aria-label="Overall progress">
          <span className="stat-value">{overallProgress}%</span>
          <span className="stat-label">Avg Progress</span>
        </div>
      </section>

      <section className="course-list" aria-label="Your courses">
        <h2>My Courses</h2>
        {enrolledCourses.length === 0 ? (
          <p className="empty-state">You haven't enrolled in any courses yet.</p>
        ) : (
          <ul>
            {enrolledCourses.map((course) => (
              <li key={course.id} className="course-item">
                <div className="course-info">
                  <strong>{course.title}</strong>
                  <span className="course-instructor-name">{course.instructor}</span>
                </div>
                <ProgressBar value={course.progress} label={`${course.title} progress`} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default StudentDashboard;
```

- [ ] **Step 5: Create `src/components/QuizQuestion.tsx`**

```tsx
import React, { useState } from 'react';

export type QuestionType = 'single' | 'multiple';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionProps {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  options: QuizOption[];
  onAnswer: (questionId: string, selectedIds: string[], isCorrect: boolean) => void;
  showFeedback?: boolean;
  disabled?: boolean;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  questionId,
  questionText,
  questionType,
  options,
  onAnswer,
  showFeedback = false,
  disabled = false,
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const handleOptionToggle = (optionId: string) => {
    if (submitted || disabled) return;

    if (questionType === 'single') {
      setSelected([optionId]);
    } else {
      setSelected((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    }
  };

  const handleSubmit = () => {
    if (selected.length === 0 || submitted) return;

    const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id);
    const isCorrect =
      correctIds.length === selected.length &&
      correctIds.every((id) => selected.includes(id));

    setSubmitted(true);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    onAnswer(questionId, selected, isCorrect);
  };

  const handleReset = () => {
    setSelected([]);
    setSubmitted(false);
    setFeedback(null);
  };

  const isSelected = (optionId: string) => selected.includes(optionId);

  return (
    <section className="quiz-question" aria-labelledby={`question-${questionId}`}>
      <h3 id={`question-${questionId}`} className="question-text">
        {questionText}
      </h3>

      <p className="question-hint" aria-live="polite">
        {questionType === 'single' ? 'Select one answer' : 'Select all that apply'}
      </p>

      <ul role={questionType === 'single' ? 'radiogroup' : 'group'} aria-labelledby={`question-${questionId}`}>
        {options.map((option) => {
          const inputType = questionType === 'single' ? 'radio' : 'checkbox';
          const inputId = `option-${questionId}-${option.id}`;
          const showCorrect = showFeedback && submitted && option.isCorrect;
          const showWrong = showFeedback && submitted && isSelected(option.id) && !option.isCorrect;

          return (
            <li key={option.id} className={`option ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}>
              <input
                type={inputType}
                id={inputId}
                name={questionType === 'single' ? `question-${questionId}` : undefined}
                checked={isSelected(option.id)}
                onChange={() => handleOptionToggle(option.id)}
                disabled={submitted || disabled}
                aria-describedby={showCorrect ? `feedback-${option.id}` : undefined}
              />
              <label htmlFor={inputId}>{option.text}</label>
              {showFeedback && submitted && (
                <span
                  id={`feedback-${option.id}`}
                  className={`option-feedback ${option.isCorrect ? 'correct-label' : 'wrong-label'}`}
                  aria-hidden="true"
                >
                  {option.isCorrect ? '✓' : isSelected(option.id) ? '✗' : ''}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0 || disabled}
          className="submit-answer-btn"
          aria-label="Submit answer"
        >
          Submit Answer
        </button>
      ) : (
        <div className="post-submit" aria-live="assertive">
          {showFeedback && feedback && (
            <p
              className={`feedback-message ${feedback}`}
              role="status"
            >
              {feedback === 'correct' ? '✅ Correct!' : '❌ Incorrect. Try again after review.'}
            </p>
          )}
          <button onClick={handleReset} className="retry-btn" aria-label="Try this question again">
            Try Again
          </button>
        </div>
      )}
    </section>
  );
};

export default QuizQuestion;
```

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: add LMS demo components (QuizQuestion, CourseCard, EnrollmentForm, StudentDashboard, ProgressBar)"
```

---

## Task 3: Initial Test File + Verify Low Coverage

**Files:**
- Create: `src/components/__tests__/ProgressBar.test.tsx`

- [ ] **Step 1: Create `src/components/__tests__/ProgressBar.test.tsx`**

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressBar from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct aria attributes', () => {
    render(<ProgressBar value={42} label="Course progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Course progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays the percentage value', () => {
    render(<ProgressBar value={75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests with coverage**

```bash
npm run test -- --coverage --coverageReporters=json-summary --forceExit
```

Expected: 2 tests pass. Coverage will be very low (< 30%) because only `ProgressBar.tsx` is tested among 5 components. You should see `coverage/coverage-summary.json` created.

- [ ] **Step 3: Verify coverage-summary.json exists**

```bash
node -e "const s=require('./coverage/coverage-summary.json'); console.log('Total lines:', s.total.lines.pct + '%')"
```

Expected: prints something like `Total lines: 18%` (low, which is what we want).

- [ ] **Step 4: Commit**

```bash
git add src/components/__tests__/ProgressBar.test.tsx
git commit -m "test: add initial ProgressBar test (intentionally low coverage to trigger agent)"
```

---

## Task 4: scripts/package.json + get-coverage.js

**Purpose:** Fetch the last merged PR, find the SonarCloud bot comment, extract the Overall Code coverage %.

**Files:**
- Create: `scripts/package.json`
- Create: `scripts/get-coverage.js`

- [ ] **Step 1: Create `scripts/package.json`**

```json
{
  "name": "coverage-agent-scripts",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@octokit/rest": "^21.0.2"
  }
}
```

- [ ] **Step 2: Install script dependencies**

```bash
cd scripts && npm install && cd ..
```

- [ ] **Step 3: Create `scripts/get-coverage.js`**

```javascript
import { Octokit } from '@octokit/rest';
import fs from 'fs';

function writeEnv(key, value) {
  const line = `${key}=${value}\n`;
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, line);
  }
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

console.log(`Last merged PR: #${mergedPR.number} — ${mergedPR.title}`);

const { data: comments } = await octokit.rest.issues.listComments({
  owner,
  repo,
  issue_number: mergedPR.number,
});

const sonarComment = comments.find(
  (c) => c.body && c.body.includes('SonarQube Quality Gate')
);

if (!sonarComment) {
  console.warn(`No SonarQube comment on PR #${mergedPR.number}. Setting PREV_COVERAGE=0`);
  writeEnv('PREV_COVERAGE', '0');
  process.exit(0);
}

const match = sonarComment.body.match(/Coverage\s*\|\s*([\d.]+)%/);
if (!match) {
  console.warn('Could not parse coverage from SonarQube comment. Setting PREV_COVERAGE=0');
  writeEnv('PREV_COVERAGE', '0');
  process.exit(0);
}

writeEnv('PREV_COVERAGE', match[1]);
```

- [ ] **Step 4: Local test (set env vars first)**

```bash
# Replace YOUR_GITHUB_TOKEN and YOUR_GITHUB_USERNAME/REPO_NAME
GITHUB_REPOSITORY=YOUR_GITHUB_USERNAME/coverage-agent-test \
GH_TOKEN=YOUR_GITHUB_TOKEN \
node scripts/get-coverage.js
```

Expected: prints `[ENV] PREV_COVERAGE=0` (no merged PRs yet, or no SonarCloud comment — that's fine for now).

- [ ] **Step 5: Commit**

```bash
git add scripts/
git commit -m "feat: add scripts/package.json and get-coverage.js"
```

---

## Task 5: scripts/select-files.js

**Purpose:** Read `coverage/coverage-summary.json`, return up to 5 files with `lines.pct < 60`, sorted lowest first.

**Files:**
- Create: `scripts/select-files.js`

- [ ] **Step 1: Create `scripts/select-files.js`**

```javascript
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
  top5.forEach((f) => console.log(' -', f));
  writeEnv('LOW_COV_FILES', top5.join(','));
}
```

- [ ] **Step 2: Local test (requires coverage run first)**

```bash
npm run test -- --coverage --coverageReporters=json-summary --forceExit
node scripts/select-files.js
```

Expected: prints the 4 untested component files (QuizQuestion, CourseCard, EnrollmentForm, StudentDashboard) since their coverage is 0%.

- [ ] **Step 3: Commit**

```bash
git add scripts/select-files.js
git commit -m "feat: add scripts/select-files.js"
```

---

## Task 6: scripts/discover-test-pattern.js

**Purpose:** Scan the repo to detect the test convention (colocated / `__tests__` subfolder / root `tests/`), then write `scripts/test-pattern.json`.

**Files:**
- Create: `scripts/discover-test-pattern.js`

- [ ] **Step 1: Create `scripts/discover-test-pattern.js`**

```javascript
import fs from 'fs';
import path from 'path';

const EXCLUDE = ['node_modules', '.git', 'coverage', 'scripts'];

function walk(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (EXCLUDE.some((e) => full.replace(/\\/g, '/').includes('/' + e + '/'))) continue;
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.ts')) {
      results.push(full.replace(/\\/g, '/'));
    }
  }
  return results;
}

const testFiles = walk('.');

if (testFiles.length === 0) {
  const fallback = {
    convention: 'subfolder',
    testDir: '__tests__',
    suffix: '.test.tsx',
    example: '',
    exampleContent: '',
  };
  fs.writeFileSync('scripts/test-pattern.json', JSON.stringify(fallback, null, 2));
  console.log('No test files found. Using subfolder default.');
  process.exit(0);
}

let colocated = 0, subfolder = 0, rootTests = 0;
for (const f of testFiles) {
  if (f.includes('/__tests__/')) subfolder++;
  else if (f.startsWith('./tests/') || /^tests\//.test(f)) rootTests++;
  else colocated++;
}

let convention = 'colocated';
if (subfolder >= colocated && subfolder >= rootTests) convention = 'subfolder';
else if (rootTests > colocated) convention = 'root';

let exampleFile = testFiles[0];
let maxSize = 0;
for (const f of testFiles) {
  const size = fs.statSync(f).size;
  if (size > maxSize) { maxSize = size; exampleFile = f; }
}

const exampleContent = fs.readFileSync(exampleFile, 'utf8');
const suffix = exampleFile.endsWith('.test.tsx') ? '.test.tsx' : '.test.ts';

const pattern = {
  convention,
  testDir: convention === 'subfolder' ? '__tests__' : convention === 'root' ? 'tests' : '',
  suffix,
  example: exampleFile,
  exampleContent,
};

fs.writeFileSync('scripts/test-pattern.json', JSON.stringify(pattern, null, 2));
console.log(`Convention: ${convention} | Example: ${exampleFile}`);
```

- [ ] **Step 2: Local test**

```bash
node scripts/discover-test-pattern.js
```

Expected: prints `Convention: subfolder | Example: ./src/components/__tests__/ProgressBar.test.tsx`, and creates `scripts/test-pattern.json`.

- [ ] **Step 3: Verify output**

```bash
node -e "const p=JSON.parse(require('fs').readFileSync('scripts/test-pattern.json','utf8')); console.log(p.convention, p.testDir, p.suffix)"
```

Expected: `subfolder __tests__ .test.tsx`

- [ ] **Step 4: Commit**

```bash
git add scripts/discover-test-pattern.js
git commit -m "feat: add scripts/discover-test-pattern.js"
```

---

## Task 7: scripts/write-tests.js

**Purpose:** For each low-coverage file, call Gemini 2.0 Flash to generate RTL tests, write them to the correct location, run `jest` to validate, retry up to 3 times on failure.

**Files:**
- Create: `scripts/write-tests.js`

- [ ] **Step 1: Create `scripts/write-tests.js`**

```javascript
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const pattern = JSON.parse(fs.readFileSync('scripts/test-pattern.json', 'utf8'));
const files = (process.env.LOW_COV_FILES || '').split(',').filter(Boolean);

if (files.length === 0) {
  console.log('No files to process.');
  process.exit(0);
}

function getTestPath(srcPath) {
  const dir = path.dirname(srcPath);
  const base = path.basename(srcPath, path.extname(srcPath));
  const suffix = pattern.suffix;
  if (pattern.convention === 'subfolder') {
    return path.join(dir, pattern.testDir, base + suffix).replace(/\\/g, '/');
  }
  if (pattern.convention === 'root') {
    return path.join(pattern.testDir, base + suffix).replace(/\\/g, '/');
  }
  return path.join(dir, base + suffix).replace(/\\/g, '/');
}

async function callGemini(prompt) {
  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

function stripCodeBlock(text) {
  return text.replace(/^```[a-z]*\n?/m, '').replace(/\n?```$/m, '').trim();
}

function buildPrompt(srcPath, srcContent, existingTest, example) {
  return `You are a React testing expert. Write Jest + React Testing Library tests for the component below.

COMPONENT SOURCE FILE: ${srcPath}
${srcContent}

EXISTING TEST FILE (if any):
${existingTest || 'No existing test file'}

EXAMPLE TEST FROM THIS REPO (follow this exact style, imports, and folder pattern):
${example}

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
Start directly with the import statements.`;
}

function buildFixPrompt(errorOutput, prevContent) {
  return `The test file you wrote has errors. Here is the Jest error output:

${errorOutput.slice(0, 3000)}

The current test file is:
${prevContent}

Fix ALL errors and return the corrected complete test file.
Return ONLY the test file content, no explanation, no markdown code blocks.
Start directly with the import statements.`;
}

for (const srcPath of files) {
  console.log(`\nProcessing: ${srcPath}`);
  const srcContent = fs.readFileSync(srcPath, 'utf8');
  const testPath = getTestPath(srcPath);
  const existingTest = fs.existsSync(testPath) ? fs.readFileSync(testPath, 'utf8') : null;

  let testContent = '';
  let passed = false;
  let lastError = '';

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`  Attempt ${attempt}/3`);

    try {
      const prompt =
        attempt === 1
          ? buildPrompt(srcPath, srcContent, existingTest, pattern.exampleContent)
          : buildFixPrompt(lastError, testContent);

      testContent = stripCodeBlock(await callGemini(prompt));
    } catch (err) {
      console.error(`  Gemini API call failed: ${err.message}`);
      break;
    }

    fs.mkdirSync(path.dirname(testPath), { recursive: true });
    fs.writeFileSync(testPath, testContent);

    try {
      execSync(`npx jest "${testPath}" --no-coverage --passWithNoTests`, {
        stdio: 'pipe',
        encoding: 'utf8',
      });
      console.log(`  ✅ Tests pass`);
      passed = true;
      break;
    } catch (err) {
      lastError = (err.stdout || '') + '\n' + (err.stderr || '');
      console.warn(`  ❌ Attempt ${attempt} failed`);
    }
  }

  if (!passed) {
    console.warn(`  ⚠️ Skipping ${srcPath} — could not produce passing tests after 3 attempts`);
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  }
}

console.log('\nDone.');
```

- [ ] **Step 2: Local test (requires GEMINI_API_KEY)**

First, get your Gemini API key from [aistudio.google.com](https://aistudio.google.com) → Get API Key. Then:

```bash
npm run test -- --coverage --coverageReporters=json-summary --forceExit
node scripts/discover-test-pattern.js

GEMINI_API_KEY=YOUR_KEY_HERE \
LOW_COV_FILES=src/components/QuizQuestion.tsx \
node scripts/write-tests.js
```

Expected: `src/components/__tests__/QuizQuestion.test.tsx` is created and `npx jest` passes on it.

- [ ] **Step 3: Commit**

```bash
git add scripts/write-tests.js
git commit -m "feat: add scripts/write-tests.js with Gemini 2.0 Flash integration"
```

---

## Task 8: scripts/verify-improvement.js

**Purpose:** Compare new `coverage-summary.json` against `baseline-coverage.json`. Exit 1 if overall `lines.pct` did not improve by at least 1%.

**Files:**
- Create: `scripts/verify-improvement.js`

- [ ] **Step 1: Create `scripts/verify-improvement.js`**

```javascript
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

console.log(`Improvement: +${(newPct - oldPct).toFixed(1)}pp`);
writeEnv('NEW_COVERAGE', newPct.toString());
```

- [ ] **Step 2: Local test**

```bash
# Baseline = current coverage (before agent runs)
cp coverage/coverage-summary.json scripts/baseline-coverage.json

# Simulate "after" by running again (same result, should fail with "no improvement")
npm run test -- --coverage --coverageReporters=json-summary --forceExit
node scripts/verify-improvement.js
```

Expected: `No improvement in line coverage. Skipping PR creation.` with exit code 1 — correct behaviour when no new tests were added.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-improvement.js
git commit -m "feat: add scripts/verify-improvement.js"
```

---

## Task 9: scripts/poll-sonar.js

**Purpose:** After the PR is created, wait 10 min then poll every 5 min for the SonarCloud bot comment. Extract coverage %. Timeout after 40 min total.

**Files:**
- Create: `scripts/poll-sonar.js`

- [ ] **Step 1: Create `scripts/poll-sonar.js`**

```javascript
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
    console.log('Not yet. Waiting 5 minutes...');
    await sleep(300_000);
  }
}

console.error('SonarCloud result not found after 40 minutes. Failing.');
process.exit(1);
```

**Note:** This script can only be fully tested inside a live GitHub Actions run after a real PR is created with SonarCloud configured. No useful local test possible — it will time out or error on missing env vars. That's expected.

- [ ] **Step 2: Commit**

```bash
git add scripts/poll-sonar.js
git commit -m "feat: add scripts/poll-sonar.js"
```

---

## Task 10: scripts/send-report.js

**Purpose:** Build the HTML email body and write it to `scripts/email-body.html`. The workflow passes this file to `dawidd6/action-send-mail`.

**Files:**
- Create: `scripts/send-report.js`

- [ ] **Step 1: Create `scripts/send-report.js`**

```javascript
import fs from 'fs';

const prev     = process.env.PREV_COVERAGE    || '0';
const sonar    = process.env.SONAR_COVERAGE   || '0';
const files    = (process.env.LOW_COV_FILES   || '').split(',').filter(Boolean);
const prUrl    = process.env.PR_URL           || '#';
const attempt  = process.env.ATTEMPT_NUMBER   || '1';
const status   = process.env.COVERAGE_STATUS  || 'PARTIAL';

const isSuccess  = status === 'SUCCESS';
const headerClr  = isSuccess ? '#16a34a' : '#dc2626';
const title      = isSuccess
  ? `Coverage Boosted to ${sonar}%`
  : `Coverage Agent: Partial Result (${sonar}%)`;
const statusIcon = isSuccess ? '✅' : '⚠️';
const message    = isSuccess
  ? 'Coverage has reached the 80% target. Please review the AI-generated tests and merge if they look correct.'
  : 'The agent ran 3 attempts but could not reach 80%. Review what was generated — it may still be useful, or the remaining files need manual tests.';

const fileRows = files
  .map((f) => `<li style="font-family:monospace;font-size:13px;margin:4px 0">${f}</li>`)
  .join('');

const html = `<!DOCTYPE html>
<html lang="en">
<body style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#1f2937">

  <h2 style="color:${headerClr};margin-top:0">${statusIcon} ${title}</h2>

  <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
    <tr>
      <td style="padding:10px 14px;border:1px solid #e5e7eb;background:#f9fafb;width:50%">Previous Coverage</td>
      <td style="padding:10px 14px;border:1px solid #e5e7eb"><strong>${prev}%</strong></td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e5e7eb;background:#f9fafb">Coverage After AI Tests</td>
      <td style="padding:10px 14px;border:1px solid #e5e7eb"><strong>${sonar}%</strong></td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e5e7eb;background:#f9fafb">Files Targeted</td>
      <td style="padding:10px 14px;border:1px solid #e5e7eb"><ul style="margin:0;padding-left:16px">${fileRows}</ul></td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e5e7eb;background:#f9fafb">Attempts Used</td>
      <td style="padding:10px 14px;border:1px solid #e5e7eb">${attempt} / 3</td>
    </tr>
  </table>

  <p style="color:#374151;line-height:1.6">${message}</p>

  <p>
    <a href="${prUrl}"
       style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600">
      Review and Merge PR →
    </a>
  </p>

  <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px">
    Sent by the AI Coverage Agent (GitHub Actions) · ${new Date().toUTCString()}
  </p>

</body>
</html>`;

fs.writeFileSync('scripts/email-body.html', html);
console.log('Email body written to scripts/email-body.html');
```

- [ ] **Step 2: Local test**

```bash
PREV_COVERAGE=18.2 \
SONAR_COVERAGE=84.5 \
LOW_COV_FILES=src/components/QuizQuestion.tsx,src/components/CourseCard.tsx \
PR_URL=https://github.com/YOU/coverage-agent-test/pull/1 \
ATTEMPT_NUMBER=1 \
COVERAGE_STATUS=SUCCESS \
node scripts/send-report.js
```

Expected: `scripts/email-body.html` is created. Open it in a browser to verify the layout.

- [ ] **Step 3: Commit**

```bash
git add scripts/send-report.js
git commit -m "feat: add scripts/send-report.js"
```

---

## Task 11: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/auto-test-coverage.yml`

- [ ] **Step 1: Create `.github/workflows/auto-test-coverage.yml`**

```yaml
name: AI Coverage Agent

on:
  # schedule:
  #   - cron: '30 0 * * 1,4'   # Mon + Thu 6 AM IST — uncomment when ready
  workflow_dispatch:              # Manual trigger via Actions tab

jobs:
  coverage-agent:
    runs-on: ubuntu-latest
    timeout-minutes: 90

    permissions:
      contents: write
      pull-requests: write
      issues: read

    env:
      TARGET_COVERAGE: 80
      FILE_THRESHOLD: 60
      GATE_THRESHOLD: 70

    steps:

      # ── Setup ────────────────────────────────────────────────────

      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install project dependencies
        run: npm ci

      - name: Install script dependencies
        run: cd scripts && npm install

      # ── Step 1+2: Fetch last merged PR coverage ──────────────────

      - name: Fetch last merged PR coverage
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
        run: node scripts/get-coverage.js
        # Writes PREV_COVERAGE to $GITHUB_ENV

      # ── Step 3: Coverage gate check ──────────────────────────────

      - name: Check coverage gate
        run: |
          node -e "
            const c = parseFloat(process.env.PREV_COVERAGE || '0');
            if (c >= ${{ env.GATE_THRESHOLD }}) {
              console.log('Coverage ' + c + '% >= ${{ env.GATE_THRESHOLD }}%. Skipping run.');
              process.exit(0);
            }
            console.log('Coverage ' + c + '% is below ${{ env.GATE_THRESHOLD }}%. Continuing.');
          "
        env:
          PREV_COVERAGE: ${{ env.PREV_COVERAGE }}

      # ── Step 4: Run tests to get baseline per-file coverage ──────

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

      # ── Step 5: Discover test folder convention ──────────────────

      - name: Discover test folder convention
        run: node scripts/discover-test-pattern.js

      # ── Attempt 1 ────────────────────────────────────────────────

      - name: Write tests — Attempt 1
        run: node scripts/write-tests.js
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LOW_COV_FILES: ${{ env.LOW_COV_FILES }}
        continue-on-error: true

      - name: Run tests + verify improvement — Attempt 1
        run: |
          npm run test -- \
            --coverage \
            --coverageReporters=json-summary \
            --coverageReporters=lcov \
            --forceExit
          node scripts/verify-improvement.js
        continue-on-error: true

      # ── Create PR ────────────────────────────────────────────────

      - name: Commit test files
        run: |
          git config user.name "Coverage Agent Bot"
          git config user.email "coverage-agent@users.noreply.github.com"
          git add "**/*.test.tsx" "**/*.test.ts"
          git diff --staged --quiet || \
            git commit -m "test: AI-generated tests to boost coverage (was ${{ env.PREV_COVERAGE }}%)"

      - name: Create Pull Request
        id: cpr
        uses: peter-evans/create-pull-request@v7
        with:
          branch: auto/coverage-${{ github.run_id }}
          title: "test: AI-generated tests (prev coverage: ${{ env.PREV_COVERAGE }}%)"
          body: |
            ## AI Coverage Agent Report

            **Previous coverage:** ${{ env.PREV_COVERAGE }}%
            **Local coverage after tests:** ${{ env.NEW_COVERAGE }}%
            **Files targeted:** ${{ env.LOW_COV_FILES }}

            ---
            ⚠️ These tests were generated by AI. Review every assertion carefully before merging.
          labels: ai-generated-tests,needs-review
          reviewers: ${{ secrets.REVIEWER_GITHUB_USERNAME }}
          delete-branch: true

      - name: Save PR info
        run: |
          echo "PR_NUMBER=${{ steps.cpr.outputs.pull-request-number }}" >> $GITHUB_ENV
          echo "PR_URL=${{ steps.cpr.outputs.pull-request-url }}" >> $GITHUB_ENV
          echo "PR_CREATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> $GITHUB_ENV

      # ── SonarCloud scan (remove this block when deploying to company repo) ──

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@v3
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      # ── Poll SonarCloud — Attempt 1 ──────────────────────────────

      - name: Poll SonarCloud — Attempt 1
        run: node scripts/poll-sonar.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          PR_NUMBER: ${{ env.PR_NUMBER }}
          PR_CREATED_AT: ${{ env.PR_CREATED_AT }}
        continue-on-error: true

      - name: Check if target reached — Attempt 1
        run: |
          node -e "
            const cov = parseFloat(process.env.SONAR_COVERAGE || '0');
            const env = require('fs');
            if (cov >= ${{ env.TARGET_COVERAGE }}) {
              env.appendFileSync(process.env.GITHUB_ENV,
                'TARGET_REACHED=true\nFINAL_COVERAGE=' + cov + '\nATTEMPT_NUMBER=1\nCOVERAGE_STATUS=SUCCESS\n');
            } else {
              env.appendFileSync(process.env.GITHUB_ENV, 'TARGET_REACHED=false\n');
              console.log('Coverage ' + cov + '% still below target. Will retry.');
            }
          "
        env:
          SONAR_COVERAGE: ${{ env.SONAR_COVERAGE }}

      # ── Attempt 2 ────────────────────────────────────────────────

      - name: Write more tests — Attempt 2
        if: env.TARGET_REACHED == 'false'
        run: |
          git checkout auto/coverage-${{ github.run_id }}
          node scripts/write-tests.js
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LOW_COV_FILES: ${{ env.LOW_COV_FILES }}
        continue-on-error: true

      - name: Commit and push — Attempt 2
        if: env.TARGET_REACHED == 'false'
        run: |
          git add "**/*.test.tsx" "**/*.test.ts"
          git diff --staged --quiet || git commit -m "test: additional AI tests — attempt 2"
          git push origin auto/coverage-${{ github.run_id }}

      - name: Poll SonarCloud — Attempt 2
        if: env.TARGET_REACHED == 'false'
        run: node scripts/poll-sonar.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          PR_NUMBER: ${{ env.PR_NUMBER }}
          PR_CREATED_AT: ${{ env.PR_CREATED_AT }}
        continue-on-error: true

      - name: Check if target reached — Attempt 2
        if: env.TARGET_REACHED == 'false'
        run: |
          node -e "
            const cov = parseFloat(process.env.SONAR_COVERAGE || '0');
            if (cov >= ${{ env.TARGET_COVERAGE }}) {
              require('fs').appendFileSync(process.env.GITHUB_ENV,
                'TARGET_REACHED=true\nFINAL_COVERAGE=' + cov + '\nATTEMPT_NUMBER=2\nCOVERAGE_STATUS=SUCCESS\n');
            }
          "
        env:
          SONAR_COVERAGE: ${{ env.SONAR_COVERAGE }}

      # ── Attempt 3 (final) ────────────────────────────────────────

      - name: Write more tests — Attempt 3 (final)
        if: env.TARGET_REACHED == 'false'
        run: |
          git checkout auto/coverage-${{ github.run_id }}
          node scripts/write-tests.js
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LOW_COV_FILES: ${{ env.LOW_COV_FILES }}
        continue-on-error: true

      - name: Commit and push — Attempt 3
        if: env.TARGET_REACHED == 'false'
        run: |
          git add "**/*.test.tsx" "**/*.test.ts"
          git diff --staged --quiet || git commit -m "test: additional AI tests — attempt 3 (final)"
          git push origin auto/coverage-${{ github.run_id }}

      - name: Poll SonarCloud — Attempt 3
        if: env.TARGET_REACHED == 'false'
        run: node scripts/poll-sonar.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          PR_NUMBER: ${{ env.PR_NUMBER }}
          PR_CREATED_AT: ${{ env.PR_CREATED_AT }}
        continue-on-error: true

      - name: Set final status after Attempt 3
        if: env.TARGET_REACHED == 'false'
        run: |
          node -e "
            const cov = parseFloat(process.env.SONAR_COVERAGE || '0');
            const status = cov >= ${{ env.TARGET_COVERAGE }} ? 'SUCCESS' : 'PARTIAL';
            require('fs').appendFileSync(process.env.GITHUB_ENV,
              'TARGET_REACHED=true\nFINAL_COVERAGE=' + cov + '\nATTEMPT_NUMBER=3\nCOVERAGE_STATUS=' + status + '\n');
          "
        env:
          SONAR_COVERAGE: ${{ env.SONAR_COVERAGE }}

      # ── Send email report ─────────────────────────────────────────

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

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions workflow (workflow_dispatch trigger)"
```

---

## Task 12: sonar-project.properties

**Files:**
- Create: `sonar-project.properties`

- [ ] **Step 1: Create `sonar-project.properties`**

```properties
# Fill in YOUR_GITHUB_USERNAME after connecting to sonarcloud.io
sonar.projectKey=YOUR_GITHUB_USERNAME_coverage-agent-test
sonar.organization=YOUR_GITHUB_USERNAME

sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.tsx,**/*.test.ts,**/*.spec.tsx,**/*.spec.ts
sonar.exclusions=**/node_modules/**,**/coverage/**,**/*.d.ts

sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

- [ ] **Step 2: Commit**

```bash
git add sonar-project.properties
git commit -m "chore: add sonar-project.properties (fill in GitHub username)"
```

---

## Task 13: Push to GitHub + Set Up Secrets

- [ ] **Step 1: Create GitHub repo**

Go to github.com → New repository → name: `coverage-agent-test` → Public → no README → Create.

- [ ] **Step 2: Push**

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/coverage-agent-test.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Enable Actions PR permissions**

GitHub repo → Settings → Actions → General:
- Workflow permissions: **Read and write permissions**
- Check **Allow GitHub Actions to create and approve pull requests**
- Save

- [ ] **Step 4: Add GitHub Secrets**

GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `GEMINI_API_KEY` | From [aistudio.google.com](https://aistudio.google.com) → Get API key |
| `GMAIL_USERNAME` | Your bot Gmail address |
| `GMAIL_APP_PASSWORD` | 16-char App Password from Google Account → Security → App Passwords |
| `REVIEWER_EMAIL` | Email to send the report to |
| `REVIEWER_GITHUB_USERNAME` | GitHub username to assign as PR reviewer |
| `SONAR_TOKEN` | From sonarcloud.io after connecting the repo |

- [ ] **Step 5: Connect SonarCloud**

1. Go to [sonarcloud.io](https://sonarcloud.io) → sign in with GitHub
2. `+` → Analyse new project → select `coverage-agent-test`
3. Choose **With GitHub Actions**
4. Copy the `SONAR_TOKEN` value and add it as a secret (see step 4)
5. Note down the `projectKey` and `organization` values
6. Update `sonar-project.properties` with those values, commit and push

- [ ] **Step 6: Update sonar-project.properties + commit**

```bash
# Edit sonar-project.properties: replace YOUR_GITHUB_USERNAME with real values
git add sonar-project.properties
git commit -m "chore: fill in SonarCloud projectKey and organization"
git push
```

- [ ] **Step 7: Trigger the workflow manually**

GitHub repo → Actions tab → "AI Coverage Agent" → Run workflow → Run workflow.

Watch the logs. Expected end-to-end runtime: ~25–40 minutes (10 min SonarCloud wait + scan time).

---

## Self-Review: Spec Coverage Check

| Spec requirement | Task covering it |
|---|---|
| React components with low coverage | Task 2 + 3 |
| Jest + RTL baseline run | Task 3 |
| `get-coverage.js` — last merged PR SonarCloud comment | Task 4 |
| `select-files.js` — files < 60%, max 5 | Task 5 |
| `discover-test-pattern.js` — convention detection | Task 6 |
| `write-tests.js` — Gemini 2.0 Flash, RTL rules, 3 retries | Task 7 |
| `verify-improvement.js` — exit 1 on no improvement | Task 8 |
| `poll-sonar.js` — 10 min wait, 5 min polls, 40 min max | Task 9 |
| `send-report.js` — HTML email body | Task 10 |
| `auto-test-coverage.yml` — full 3-attempt retry loop | Task 11 |
| `sonar-project.properties` — SonarCloud config | Task 12 |
| `workflow_dispatch` only (cron commented) | Task 11 ✅ |
| Node.js 24 in CI | Task 11 ✅ |
| Placeholder secrets (user fills manually) | Tasks 12–13 ✅ |
