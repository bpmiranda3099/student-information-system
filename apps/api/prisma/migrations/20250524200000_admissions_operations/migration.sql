-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'enrollee';

-- CreateEnum
CREATE TYPE "AdmissionType" AS ENUM ('freshman', 'transferee');
CREATE TYPE "AdmissionStatus" AS ENUM ('draft', 'submitted', 'under_review', 'denied', 'accepted', 'closed');
CREATE TYPE "SubjectRequirementType" AS ENUM ('required', 'elective');
CREATE TYPE "SupportTicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE "ConductReportStatus" AS ENUM ('open', 'under_review', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "enrollees" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_id" TEXT,
    "year_level" INTEGER NOT NULL DEFAULT 1,
    "admission_type" "AdmissionType" NOT NULL DEFAULT 'freshman',
    "address" TEXT,
    "birth_date" DATE,
    "guardian_name" TEXT,
    "guardian_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admission_applications" (
    "id" TEXT NOT NULL,
    "enrollee_id" TEXT NOT NULL,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'draft',
    "terms_version" TEXT,
    "terms_accepted_at" TIMESTAMP(3),
    "resubmit_count" INTEGER NOT NULL DEFAULT 0,
    "denial_reason" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "program_curriculum" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "year_level" INTEGER NOT NULL,
    "requirement_type" "SubjectRequirementType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_curriculum_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_steps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "schedule_drafts" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "section_ids" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "reopened_once" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conduct_reports" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "violation_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ConductReportStatus" NOT NULL DEFAULT 'open',
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conduct_reports_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN "section_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "enrollees_user_id_key" ON "enrollees"("user_id");
CREATE UNIQUE INDEX "admission_applications_enrollee_id_key" ON "admission_applications"("enrollee_id");
CREATE UNIQUE INDEX "program_curriculum_program_id_subject_id_year_level_key" ON "program_curriculum"("program_id", "subject_id", "year_level");
CREATE UNIQUE INDEX "onboarding_steps_user_id_step_key_key" ON "onboarding_steps"("user_id", "step_key");
CREATE UNIQUE INDEX "schedule_drafts_student_id_term_id_key" ON "schedule_drafts"("student_id", "term_id");

-- AddForeignKey
ALTER TABLE "enrollees" ADD CONSTRAINT "enrollees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollees" ADD CONSTRAINT "enrollees_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_enrollee_id_fkey" FOREIGN KEY ("enrollee_id") REFERENCES "enrollees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "program_curriculum" ADD CONSTRAINT "program_curriculum_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_curriculum" ADD CONSTRAINT "program_curriculum_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_drafts" ADD CONSTRAINT "schedule_drafts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conduct_reports" ADD CONSTRAINT "conduct_reports_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conduct_reports" ADD CONSTRAINT "conduct_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "course_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
