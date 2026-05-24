import { emailLayout } from './base.js';

export function renderWelcomeEmail(name: string): string {
  return emailLayout(`
    <h1>Welcome, ${name}</h1>
    <p>Your account has been created on the Student Information System.</p>
    <p>You can now log in to view enrollment, grades, attendance, and more.</p>
  `);
}
