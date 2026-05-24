export const ROLES = ['student', 'faculty', 'admin'] as const;
export type Role = (typeof ROLES)[number];

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
