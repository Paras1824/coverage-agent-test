import fs from 'fs';

const prev    = process.env.PREV_COVERAGE   || '0';
const sonar   = process.env.SONAR_COVERAGE  || '0';
const files   = (process.env.LOW_COV_FILES  || '').split(',').filter(Boolean);
const prUrl   = process.env.PR_URL          || '#';
const attempt = process.env.ATTEMPT_NUMBER  || '1';
const status  = process.env.COVERAGE_STATUS || 'PARTIAL';

const isSuccess  = status === 'SUCCESS';
const headerClr  = isSuccess ? '#16a34a' : '#dc2626';
const statusIcon = isSuccess ? '✅' : '⚠️';
const title      = isSuccess
  ? `Coverage Boosted to ${sonar}%`
  : `Coverage Agent: Partial Result (${sonar}%)`;
const message    = isSuccess
  ? 'Coverage has reached the 80% target. Please review the AI-generated tests and merge if they look correct.'
  : 'The agent ran 3 attempts but could not reach 80%. The generated tests may still be useful — review and merge what looks correct.';

const fileRows = files
  .map((f) => `<li style="font-family:monospace;font-size:13px;margin:4px 0;color:#94a3b8">${f}</li>`)
  .join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#0d0d2b;color:#f1f5f9">

  <div style="background:linear-gradient(135deg,#1e1b4b,#13133a);border:1px solid rgba(124,58,237,0.5);border-radius:20px;padding:32px;box-shadow:0 0 40px rgba(124,58,237,0.2)">

    <h2 style="color:${headerClr};margin:0 0 24px;font-size:22px">${statusIcon} ${title}</h2>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px">
      <tr>
        <td style="padding:12px 16px;border:1px solid rgba(124,58,237,0.2);background:rgba(255,255,255,0.03);color:#a78bfa;width:48%">Previous Coverage</td>
        <td style="padding:12px 16px;border:1px solid rgba(124,58,237,0.2);font-weight:700;font-size:16px">${prev}%</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border:1px solid rgba(124,58,237,0.2);background:rgba(255,255,255,0.03);color:#a78bfa">Coverage After AI Tests</td>
        <td style="padding:12px 16px;border:1px solid rgba(124,58,237,0.2);font-weight:700;font-size:16px;color:${headerClr}">${sonar}%</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border:1px solid rgba(124,58,237,0.2);background:rgba(255,255,255,0.03);color:#a78bfa">Files Targeted</td>
        <td style="padding:12px 16px;border:1px solid rgba(124,58,237,0.2)"><ul style="margin:0;padding-left:16px">${fileRows}</ul></td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border:1px solid rgba(124,58,237,0.2);background:rgba(255,255,255,0.03);color:#a78bfa">Attempts Used</td>
        <td style="padding:12px 16px;border:1px solid rgba(124,58,237,0.2)">${attempt} / 3</td>
      </tr>
    </table>

    <p style="color:#94a3b8;line-height:1.6;font-size:14px;margin:0 0 24px">${message}</p>

    <a href="${prUrl}"
       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;padding:14px 28px;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 0 20px rgba(124,58,237,0.4)">
      Review and Merge PR →
    </a>

    <p style="color:#475569;font-size:12px;margin-top:32px;border-top:1px solid rgba(124,58,237,0.2);padding-top:16px">
      Sent by the AI Coverage Agent (GitHub Actions) · ${new Date().toUTCString()}
    </p>
  </div>

</body>
</html>`;

fs.writeFileSync('scripts/email-body.html', html);
console.log('Email body written to scripts/email-body.html');
