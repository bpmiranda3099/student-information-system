import { emailLayout } from './base.js';

export function renderHealthAlertEmail(checks: Record<string, { status: string }>): string {
  const rows = Object.entries(checks)
    .map(
      ([name, check]) =>
        `<tr><td style="padding:8px 0;font-size:14px;">${name}</td><td style="padding:8px 0;"><span class="badge">${check.status}</span></td></tr>`,
    )
    .join('');

  return emailLayout(`
    <h1>System Health Alert</h1>
    <p>One or more system checks reported a degraded status.</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p>Please review the admin health dashboard.</p>
  `);
}
