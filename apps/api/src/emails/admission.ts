export function renderAdmissionSubmittedEmail(name: string): string {
  return `<p>Hello ${name},</p><p>Your admission application has been submitted and is under review. You will receive an email once a decision is made.</p>`;
}

export function renderAdmissionApprovedEmail(name: string): string {
  return `<p>Hello ${name},</p><p>Congratulations! Your admission application has been approved. Please sign in to complete student onboarding.</p>`;
}

export function renderAdmissionDeniedEmail(name: string, reason: string): string {
  return `<p>Hello ${name},</p><p>Your admission application was not approved at this time.</p><p><strong>Reason:</strong> ${reason}</p><p>You may revise and resubmit your application if resubmissions remain available.</p>`;
}
