import { Resend } from 'resend';
import type { CreateEmailOptions } from 'resend';
import { renderWelcomeEmail } from '../emails/welcome.js';
import { renderEnrollmentEmail } from '../emails/enrollment.js';
import { renderGradePostedEmail } from '../emails/grade-posted.js';
import { renderAiLessonEmail } from '../emails/ai-lesson.js';
import { renderHealthAlertEmail } from '../emails/health-alert.js';
import {
  renderAdmissionSubmittedEmail,
  renderAdmissionApprovedEmail,
  renderAdmissionDeniedEmail,
} from '../emails/admission.js';
import type { SendEmailRequest } from '@sis/shared';

let resend: Resend | null = null;

export class ResendServiceError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
    this.name = 'ResendServiceError';
  }
}

export function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) throw new ResendServiceError('RESEND_API_KEY is not configured', 503);
    resend = new Resend(apiKey);
  }
  return resend;
}

function getFromEmail(): string {
  return process.env.EMAIL_FROM ?? 'SIS <onboarding@resend.dev>';
}

function getDevRedirectTo(): string | undefined {
  return process.env.RESEND_DEV_REDIRECT_TO?.trim() || undefined;
}

function isSandboxRestrictionError(message: string): boolean {
  return /only send testing emails to your own email address/i.test(message);
}

function applyDevRedirect(input: SendEmailRequest): SendEmailRequest {
  const redirect = getDevRedirectTo();
  if (!redirect) return input;

  const originalTo = Array.isArray(input.to) ? input.to.join(', ') : input.to;
  if (originalTo === redirect) return input;

  const banner = `<p style="color:#666;font-size:12px"><em>Dev redirect: intended for ${originalTo}</em></p>`;
  return {
    ...input,
    to: redirect,
    subject: `[DEV → ${originalTo}] ${input.subject}`,
    html: `${banner}${input.html}`,
  };
}

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function toEmailPayload(input: SendEmailRequest): CreateEmailOptions {
  return {
    from: input.from ?? getFromEmail(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    cc: input.cc,
    bcc: input.bcc,
    scheduledAt: input.scheduledAt,
  };
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) {
    throw new ResendServiceError(result.error.message, 502);
  }
  if (!result.data) {
    throw new ResendServiceError('Empty response from Resend', 502);
  }
  return result.data;
}

export async function sendEmailMessage(input: SendEmailRequest) {
  if (!isResendConfigured()) {
    console.log(`[Email skipped - no RESEND_API_KEY] To: ${JSON.stringify(input.to)}, Subject: ${input.subject}`);
    return { id: 'dev-skipped', object: 'email' as const };
  }

  const payload = applyDevRedirect(input);
  if (getDevRedirectTo() && payload.to !== input.to) {
    console.log(
      `[Email dev redirect] ${JSON.stringify(input.to)} → ${JSON.stringify(payload.to)} | ${input.subject}`,
    );
  }

  const result = await getResendClient().emails.send(toEmailPayload(payload));
  if (result.error && isSandboxRestrictionError(result.error.message) && !getDevRedirectTo()) {
    throw new ResendServiceError(
      `${result.error.message} Set RESEND_DEV_REDIRECT_TO=bpmiranda3099@gmail.com in apps/api/.env for local testing, or verify a domain at resend.com/domains.`,
      502,
    );
  }
  return unwrap(result);
}

export async function sendBatchEmailMessages(emails: SendEmailRequest[]) {
  if (!isResendConfigured()) {
    console.log(`[Batch email skipped - no RESEND_API_KEY] Count: ${emails.length}`);
    return { data: emails.map((_, index) => ({ id: `dev-skipped-${index}` })) };
  }
  return unwrap(
    await getResendClient().batch.send(emails.map((email) => toEmailPayload(applyDevRedirect(email)))),
  );
}

export async function getEmailMessage(id: string) {
  return unwrap(await getResendClient().emails.get(id));
}

export async function updateEmailMessage(id: string, scheduledAt: string) {
  return unwrap(await getResendClient().emails.update({ id, scheduledAt }));
}

export async function cancelEmailMessage(id: string) {
  return unwrap(await getResendClient().emails.cancel(id));
}

export async function listEmailMessages() {
  return unwrap(await getResendClient().emails.list());
}

export async function listEmailAttachments(emailId: string) {
  return unwrap(await getResendClient().emails.attachments.list({ emailId }));
}

export async function getEmailAttachment(emailId: string, attachmentId: string) {
  return unwrap(
    await getResendClient().emails.attachments.get({
      id: attachmentId,
      emailId,
    }),
  );
}

async function sendTransactionalEmail(to: string, subject: string, html: string): Promise<void> {
  await sendEmailMessage({ to, subject, html });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendTransactionalEmail(to, 'Welcome to Student Information System', renderWelcomeEmail(name));
}

export async function sendEnrollmentStatusEmail(
  to: string,
  name: string,
  sectionName: string,
  approved: boolean,
): Promise<void> {
  await sendTransactionalEmail(
    to,
    approved ? 'Enrollment Approved' : 'Enrollment Update',
    renderEnrollmentEmail(name, sectionName, approved),
  );
}

export async function sendGradePostedEmail(
  to: string,
  name: string,
  sectionName: string,
  score: number,
  letterGrade: string,
): Promise<void> {
  await sendTransactionalEmail(
    to,
    'Grade Posted',
    renderGradePostedEmail(name, sectionName, score, letterGrade),
  );
}

export async function sendAiLessonReadyEmail(
  to: string,
  name: string,
  lessonTitle: string,
): Promise<void> {
  await sendTransactionalEmail(
    to,
    'Your Tailored Lesson is Ready',
    renderAiLessonEmail(name, lessonTitle),
  );
}

export async function sendHealthAlertEmail(
  to: string,
  checks: Record<string, { status: string }>,
): Promise<void> {
  await sendTransactionalEmail(to, 'SIS Health Alert', renderHealthAlertEmail(checks));
}

export async function sendAdmissionSubmittedEmail(to: string, name: string): Promise<void> {
  await sendTransactionalEmail(
    to,
    'Admission Application Submitted',
    renderAdmissionSubmittedEmail(name),
  );
}

export async function sendAdmissionApprovedEmail(to: string, name: string): Promise<void> {
  await sendTransactionalEmail(
    to,
    'Admission Approved',
    renderAdmissionApprovedEmail(name),
  );
}

export async function sendAdmissionDeniedEmail(
  to: string,
  name: string,
  reason: string,
): Promise<void> {
  await sendTransactionalEmail(
    to,
    'Admission Application Update',
    renderAdmissionDeniedEmail(name, reason),
  );
}

export async function checkResendHealth(): Promise<{ status: string }> {
  try {
    if (!isResendConfigured()) return { status: 'not_configured' };
    getResendClient();
    return { status: 'ok' };
  } catch {
    return { status: 'error' };
  }
}
