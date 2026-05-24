import { z } from 'zod';
import {
  ROLES,
  ENROLLMENT_STATUSES,
  TERM_STATUSES,
  GRADE_COMPONENT_TYPES,
  ATTENDANCE_STATUSES,
  AI_REQUEST_STATUSES,
} from './constants.js';

export const roleSchema = z.enum(ROLES);
export const enrollmentStatusSchema = z.enum(ENROLLMENT_STATUSES);
export const termStatusSchema = z.enum(TERM_STATUSES);
export const gradeComponentTypeSchema = z.enum(GRADE_COMPONENT_TYPES);
export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);
export const aiRequestStatusSchema = z.enum(AI_REQUEST_STATUSES);

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: roleSchema,
  studentNumber: z.string().optional(),
  employeeId: z.string().optional(),
  programId: z.string().uuid().optional(),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: roleSchema,
  createdAt: z.string().datetime(),
});

export const authResponseSchema = z.object({
  user: userSchema,
});

export const programSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const createProgramSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
});

export const subjectSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  units: z.number().int().positive(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const createSubjectSchema = z.object({
  code: z.string().min(1).max(20),
  title: z.string().min(1).max(200),
  units: z.number().int().positive(),
  description: z.string().optional(),
});

export const academicTermSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  year: z.number().int(),
  semester: z.number().int().min(1).max(3),
  status: termStatusSchema,
  startDate: z.string(),
  endDate: z.string(),
  createdAt: z.string().datetime(),
});

export const createTermSchema = z.object({
  name: z.string().min(1),
  year: z.number().int(),
  semester: z.number().int().min(1).max(3),
  startDate: z.string(),
  endDate: z.string(),
  status: termStatusSchema.optional(),
});

export const courseSectionSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  facultyId: z.string().uuid(),
  sectionCode: z.string(),
  capacity: z.number().int().positive(),
  enrolledCount: z.number().int().nonnegative(),
  schedule: z.string().nullable(),
  room: z.string().nullable(),
  subject: subjectSchema.optional(),
  term: academicTermSchema.optional(),
  createdAt: z.string().datetime(),
});

export const createSectionSchema = z.object({
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  facultyId: z.string().uuid(),
  sectionCode: z.string().min(1).max(10),
  capacity: z.number().int().positive(),
  schedule: z.string().optional(),
  room: z.string().optional(),
});

export const enrollmentSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  sectionId: z.string().uuid(),
  status: enrollmentStatusSchema,
  enrolledAt: z.string().datetime(),
  section: courseSectionSchema.optional(),
  createdAt: z.string().datetime(),
});

export const createEnrollmentSchema = z.object({
  sectionId: z.string().uuid(),
});

export const updateEnrollmentSchema = z.object({
  status: enrollmentStatusSchema,
});

export const categoryWeightSchema = z.object({
  type: gradeComponentTypeSchema,
  weight: z.number().min(0).max(100),
});

export const gradeSchemeSchema = z.object({
  id: z.string().uuid(),
  sectionId: z.string().uuid(),
  isLocked: z.boolean(),
  extracurricularMax: z.number().min(0).max(100),
  categoryWeights: z.array(categoryWeightSchema),
  createdAt: z.string().datetime(),
});

export const createGradeSchemeSchema = z.object({
  categoryWeights: z
    .array(categoryWeightSchema)
    .refine(
      (weights) => {
        const graded = weights.filter((w) => w.type !== 'extracurricular');
        const sum = graded.reduce((acc, w) => acc + w.weight, 0);
        return Math.abs(sum - 100) < 0.01;
      },
      { message: 'Graded category weights must sum to 100' },
    ),
  extracurricularMax: z.number().min(0).max(100).optional(),
});

export const gradeComponentSchema = z.object({
  id: z.string().uuid(),
  schemeId: z.string().uuid(),
  type: gradeComponentTypeSchema,
  name: z.string(),
  maxScore: z.number().positive(),
  sequence: z.number().int().nonnegative(),
  topicTags: z.array(z.string()),
  createdAt: z.string().datetime(),
});

export const createGradeComponentSchema = z.object({
  type: gradeComponentTypeSchema,
  name: z.string().min(1),
  maxScore: z.number().positive(),
  sequence: z.number().int().nonnegative().optional(),
  topicTags: z.array(z.string()).optional(),
});

export const gradeEntrySchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  componentId: z.string().uuid(),
  score: z.number().min(0),
  recordedAt: z.string().datetime(),
});

export const upsertGradeEntrySchema = z.object({
  studentId: z.string().uuid(),
  componentId: z.string().uuid(),
  score: z.number().min(0),
});

export const computedGradeSchema = z.object({
  studentId: z.string().uuid(),
  sectionId: z.string().uuid(),
  categoryAverages: z.record(z.string(), z.number()),
  weightedSubtotal: z.number(),
  extracurricularBonus: z.number(),
  finalScore: z.number(),
  letterGrade: z.string(),
});

export const attendanceSessionSchema = z.object({
  id: z.string().uuid(),
  sectionId: z.string().uuid(),
  date: z.string(),
  topic: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const createAttendanceSessionSchema = z.object({
  date: z.string(),
  topic: z.string().optional(),
});

export const attendanceRecordSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: attendanceStatusSchema,
  notes: z.string().nullable(),
});

export const upsertAttendanceRecordSchema = z.object({
  studentId: z.string().uuid(),
  status: attendanceStatusSchema,
  notes: z.string().optional(),
});

export const bulkAttendanceSchema = z.object({
  records: z.array(upsertAttendanceRecordSchema),
});

export const syllabusSchema = z.object({
  id: z.string().uuid(),
  sectionId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  filePath: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const createSyllabusSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const lessonSchema = z.object({
  id: z.string().uuid(),
  syllabusId: z.string().uuid(),
  title: z.string(),
  week: z.number().int().positive(),
  topics: z.array(z.string()),
  createdAt: z.string().datetime(),
});

export const createLessonSchema = z.object({
  title: z.string().min(1),
  week: z.number().int().positive(),
  topics: z.array(z.string()).optional(),
});

export const lessonFileSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  fileName: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int().positive(),
  createdAt: z.string().datetime(),
});

export const tailorLessonRequestSchema = z.object({
  lessonId: z.string().uuid(),
  studentId: z.string().uuid(),
  notifyStudent: z.boolean().optional(),
});

export const aiLessonRequestSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  weakTopics: z.array(z.string()),
  prompt: z.string(),
  response: z.string().nullable(),
  status: aiRequestStatusSchema,
  createdAt: z.string().datetime(),
});

export const healthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  checks: z.object({
    database: z.object({ status: z.string(), latencyMs: z.number().optional() }),
    storage: z.object({ status: z.string() }),
    gemini: z.object({ status: z.string() }),
    resend: z.object({ status: z.string() }),
  }),
  version: z.string(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const apiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});

export const enrollmentReportSchema = z.object({
  termId: z.string().uuid(),
  totalEnrollments: z.number(),
  byStatus: z.record(z.string(), z.number()),
  byProgram: z.array(z.object({ programCode: z.string(), count: z.number() })),
});

export const gradeReportSchema = z.object({
  sectionId: z.string().uuid(),
  averageScore: z.number(),
  distribution: z.array(z.object({ letter: z.string(), count: z.number() })),
  studentGrades: z.array(computedGradeSchema),
});

export const attendanceReportSchema = z.object({
  sectionId: z.string().uuid(),
  averageAttendanceRate: z.number(),
  chronicAbsentees: z.array(
    z.object({
      studentId: z.string().uuid(),
      studentName: z.string(),
      absentCount: z.number(),
      attendanceRate: z.number(),
    }),
  ),
});

export const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1),
  html: z.string().min(1),
  from: z.string().optional(),
  text: z.string().optional(),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const sendBatchEmailSchema = z.object({
  emails: z.array(sendEmailSchema).min(1).max(100),
});

export const updateEmailSchema = z.object({
  scheduledAt: z.string().datetime(),
});

export type SendEmailRequest = z.infer<typeof sendEmailSchema>;
export type SendBatchEmailRequest = z.infer<typeof sendBatchEmailSchema>;
export type UpdateEmailRequest = z.infer<typeof updateEmailSchema>;

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type User = z.infer<typeof userSchema>;
export type Program = z.infer<typeof programSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type AcademicTerm = z.infer<typeof academicTermSchema>;
export type CourseSection = z.infer<typeof courseSectionSchema>;
export type Enrollment = z.infer<typeof enrollmentSchema>;
export type GradeScheme = z.infer<typeof gradeSchemeSchema>;
export type GradeComponent = z.infer<typeof gradeComponentSchema>;
export type GradeEntry = z.infer<typeof gradeEntrySchema>;
export type ComputedGrade = z.infer<typeof computedGradeSchema>;
export type AttendanceSession = z.infer<typeof attendanceSessionSchema>;
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type Syllabus = z.infer<typeof syllabusSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type LessonFile = z.infer<typeof lessonFileSchema>;
export type AiLessonRequest = z.infer<typeof aiLessonRequestSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;
