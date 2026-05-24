import { emailLayout } from './base.js';

export function renderAiLessonEmail(name: string, lessonTitle: string): string {
  return emailLayout(`
    <h1>Tailored Lesson Ready</h1>
    <p>Hi ${name},</p>
    <p>Your faculty has generated a personalized study guide for <strong>${lessonTitle}</strong>, focused on areas where you need improvement.</p>
    <p>Log in to your dashboard to view the tailored lesson.</p>
  `);
}
