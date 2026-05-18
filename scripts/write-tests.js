import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const pattern = JSON.parse(fs.readFileSync('scripts/test-pattern.json', 'utf8'));
const files = (process.env.LOW_COV_FILES || '').split(',').filter(Boolean);

if (files.length === 0) {
  console.log('No files to process.');
  process.exit(0);
}

function getTestPath(srcPath) {
  const normalised = srcPath.replace(/\\/g, '/');
  const dir = path.dirname(normalised);
  const base = path.basename(normalised, path.extname(normalised));
  const suffix = pattern.suffix;
  if (pattern.convention === 'subfolder') {
    return `${dir}/${pattern.testDir}/${base}${suffix}`;
  }
  if (pattern.convention === 'root') {
    return `${pattern.testDir}/${base}${suffix}`;
  }
  return `${dir}/${base}${suffix}`;
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
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

function stripCodeBlock(text) {
  return text.replace(/^```[a-z]*\n?/m, '').replace(/\n?```$/m, '').trim();
}

function buildPrompt(srcPath, srcContent, existingTest, example, relativeImport) {
  return `You are a React testing expert. Write Jest + React Testing Library tests for the component below.

COMPONENT SOURCE FILE: ${srcPath}
${srcContent}

EXISTING TEST FILE (if any):
${existingTest || 'No existing test file'}

EXAMPLE TEST FROM THIS REPO (follow this exact style, imports, and folder pattern):
${example}

EXACT IMPORT TO USE FOR THIS COMPONENT (use this path verbatim):
import { ComponentName } from '${relativeImport}';
(replace ComponentName with the actual exported name from the component)

RTL RULES YOU MUST FOLLOW:
1. Use getByRole, getByLabelText, getByText — NOT getByTestId or container.querySelector
2. userEvent v14 — ALWAYS set up like this:
   import userEvent from '@testing-library/user-event';
   ...
   const user = userEvent.setup();
   await user.click(element);
   await user.type(input, 'hello');
   Do NOT call userEvent.click() or userEvent.type() directly — that is the old v13 API and will fail.
3. Every describe/it block that uses userEvent must be async.
4. Never write snapshot-only tests. Every test must assert real user-visible behaviour.
5. Use waitFor for async state updates.
6. Components use inline styles only — no CSS class assertions needed.

STANDARD IMPORTS (always include all of these):
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

TASK:
Write comprehensive Jest + RTL tests for this component.
Cover: renders correctly, user interactions, edge cases, error states.
Target: at least 80% line coverage for this file.

OUTPUT FORMAT:
Return ONLY the complete test file content, no explanation, no markdown code blocks.
Start directly with the import statements.`;
}

function buildFixPrompt(errorOutput, prevContent) {
  return `The test file you wrote has Jest errors. Fix them all.

ERROR OUTPUT:
${errorOutput.slice(0, 3000)}

CURRENT TEST FILE:
${prevContent}

Rules:
- Return ONLY the corrected test file content.
- No explanation, no markdown code blocks.
- Start directly with the import statements.`;
}

for (const srcPath of files) {
  console.log(`\nProcessing: ${srcPath}`);
  let srcContent;
  try {
    srcContent = fs.readFileSync(srcPath, 'utf8');
  } catch {
    console.warn(`  Cannot read ${srcPath}, skipping.`);
    continue;
  }

  const testPath = getTestPath(srcPath);
  const relativeImport = path
    .relative(path.dirname(testPath), srcPath)
    .replace(/\\/g, '/')
    .replace(/\.tsx?$/, '');
  const existingTest = fs.existsSync(testPath) ? fs.readFileSync(testPath, 'utf8') : null;

  let testContent = '';
  let passed = false;
  let lastError = '';

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`  Attempt ${attempt}/3`);

    try {
      const prompt =
        attempt === 1
          ? buildPrompt(srcPath, srcContent, existingTest, pattern.exampleContent, relativeImport)
          : buildFixPrompt(lastError, testContent);
      testContent = stripCodeBlock(await callGemini(prompt));
    } catch (err) {
      console.error(`  Gemini call failed: ${err.message}`);
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
      console.warn(`  ❌ Attempt ${attempt} failed:\n${lastError.slice(0, 800)}`);
    }
  }

  if (!passed) {
    console.warn(`  ⚠️ Skipping ${srcPath} — could not produce passing tests after 3 attempts`);
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  }
}

console.log('\nDone writing tests.');
