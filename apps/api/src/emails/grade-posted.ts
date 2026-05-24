import { emailLayout } from './base.js';

export function renderGradePostedEmail(
  name: string,
  sectionName: string,
  score: number,
  letterGrade: string,
): string {
  return emailLayout(`
    <h1>Grade Posted</h1>
    <p>Hi ${name},</p>
    <p>A grade has been posted for <strong>${sectionName}</strong>.</p>
    <p class="score">${score.toFixed(1)} <span class="badge">${letterGrade}</span></p>
    <p>Log in to view the full breakdown.</p>
  `);
}
