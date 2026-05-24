export const ROLES = ['student', 'faculty', 'admin', 'enrollee'] as const;
export type Role = (typeof ROLES)[number];

export const ADMISSION_TYPES = ['freshman', 'transferee'] as const;
export type AdmissionType = (typeof ADMISSION_TYPES)[number];

export const ADMISSION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'denied',
  'accepted',
  'closed',
] as const;
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

export const SUBJECT_REQUIREMENT_TYPES = ['required', 'elective'] as const;
export type SubjectRequirementType = (typeof SUBJECT_REQUIREMENT_TYPES)[number];

export const ONBOARDING_STEPS = [
  'mission_vision',
  'core_values',
  'policies',
  'data_privacy',
  'agreement',
] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number];

export const SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const CONDUCT_REPORT_STATUSES = ['open', 'under_review', 'resolved', 'dismissed'] as const;
export type ConductReportStatus = (typeof CONDUCT_REPORT_STATUSES)[number];

export const VIOLATION_TYPES = [
  'academic_dishonesty',
  'misconduct',
  'attendance',
  'other',
] as const;
export type ViolationType = (typeof VIOLATION_TYPES)[number];

export const SUPPORT_CATEGORIES = [
  'account',
  'enrollment',
  'grades',
  'technical',
  'other',
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const TERMS_VERSION = '2025.1';
export const MAX_ADMISSION_RESUBMITS = 3;
export const ADMISSION_RESUBMIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const ENROLLMENT_STATUSES = ['pending', 'approved', 'dropped'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const TERM_STATUSES = ['upcoming', 'active', 'archived'] as const;
export type TermStatus = (typeof TERM_STATUSES)[number];

export const GRADE_COMPONENT_TYPES = [
  'quiz',
  'seatwork',
  'activity',
  'project',
  'exam',
  'extracurricular',
] as const;
export type GradeComponentType = (typeof GRADE_COMPONENT_TYPES)[number];

export const GRADED_COMPONENT_TYPES = [
  'quiz',
  'seatwork',
  'activity',
  'project',
  'exam',
] as const;

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const AI_REQUEST_STATUSES = ['pending', 'completed', 'failed'] as const;
export type AiRequestStatus = (typeof AI_REQUEST_STATUSES)[number];

export const CALENDAR_EVENT_TYPES = [
  'holiday',
  'exam',
  'enrollment',
  'break',
  'event',
  'no_classes',
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const CALENDAR_EVENT_SOURCES = ['manual', 'official_ph'] as const;
export type CalendarEventSource = (typeof CALENDAR_EVENT_SOURCES)[number];

export const ANNOUNCEMENT_CATEGORIES = ['news', 'no_classes', 'disaster', 'holiday'] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export const ANNOUNCEMENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type AnnouncementSeverity = (typeof ANNOUNCEMENT_SEVERITIES)[number];

export const ANNOUNCEMENT_SOURCES = ['manual', 'external'] as const;
export type AnnouncementSource = (typeof ANNOUNCEMENT_SOURCES)[number];

export const EXTERNAL_ALERT_PROVIDERS = [
  'pagasa',
  'usgs',
  'phivolcs',
  'ndrrmc',
  'ph_holidays',
] as const;
export type ExternalAlertProvider = (typeof EXTERNAL_ALERT_PROVIDERS)[number];

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const AVATARS_BUCKET = 'avatars';

export const DEFAULT_LETTER_GRADES = [
  { letter: 'A', minScore: 90 },
  { letter: 'B', minScore: 80 },
  { letter: 'C', minScore: 75 },
  { letter: 'D', minScore: 70 },
  { letter: 'F', minScore: 0 },
] as const;

export const DEFAULT_EXTRACURRICULAR_MAX = 5;

export const COOKIE_NAMES = {
  accessToken: 'sis_access_token',
  refreshToken: 'sis_refresh_token',
} as const;
