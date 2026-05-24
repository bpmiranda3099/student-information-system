import { emailLayout } from './base.js';

export function renderEnrollmentEmail(
  name: string,
  sectionName: string,
  approved: boolean,
): string {
  return emailLayout(`
    <h1>Enrollment ${approved ? 'Approved' : 'Update'}</h1>
    <p>Hi ${name},</p>
    <p>Your enrollment request for <strong>${sectionName}</strong> has been ${approved ? 'approved' : 'updated'}.</p>
    ${approved ? '<p>You can now view this section in your dashboard.</p>' : '<p>Please contact the registrar for details.</p>'}
  `);
}
