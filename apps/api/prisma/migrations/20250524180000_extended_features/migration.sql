-- User profile fields
ALTER TABLE "users" ADD COLUMN "photo_path" TEXT;
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Enums
CREATE TYPE "CalendarEventType" AS ENUM ('holiday', 'exam', 'enrollment', 'break', 'event', 'no_classes');
CREATE TYPE "CalendarEventSource" AS ENUM ('manual', 'official_ph');
CREATE TYPE "AnnouncementCategory" AS ENUM ('news', 'no_classes', 'disaster', 'holiday');
CREATE TYPE "AnnouncementSeverity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "AnnouncementSource" AS ENUM ('manual', 'external');
CREATE TYPE "ExternalAlertProvider" AS ENUM ('pagasa', 'usgs', 'phivolcs', 'ndrrmc', 'ph_holidays');

-- Academic calendar
CREATE TABLE "academic_calendar_events" (
    "id" TEXT NOT NULL,
    "term_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "source" "CalendarEventSource" NOT NULL DEFAULT 'manual',
    "external_id" TEXT,
    "all_day" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "academic_calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academic_calendar_events_source_external_id_key" ON "academic_calendar_events"("source", "external_id");

ALTER TABLE "academic_calendar_events" ADD CONSTRAINT "academic_calendar_events_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Section meetings
CREATE TABLE "section_meetings" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "room" TEXT,
    CONSTRAINT "section_meetings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "section_meetings" ADD CONSTRAINT "section_meetings_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- External alerts
CREATE TABLE "external_alerts" (
    "id" TEXT NOT NULL,
    "provider" "ExternalAlertProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL,
    "severity" "AnnouncementSeverity" NOT NULL DEFAULT 'medium',
    "issued_at" TIMESTAMP(3) NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "dedupe_hash" TEXT NOT NULL,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "external_alerts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_alerts_provider_external_id_key" ON "external_alerts"("provider", "external_id");

-- Announcements
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL,
    "severity" "AnnouncementSeverity" NOT NULL DEFAULT 'medium',
    "published_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "source" "AnnouncementSource" NOT NULL DEFAULT 'manual',
    "external_alert_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "announcements_external_alert_id_key" ON "announcements"("external_alert_id");

ALTER TABLE "announcements" ADD CONSTRAINT "announcements_external_alert_id_fkey" FOREIGN KEY ("external_alert_id") REFERENCES "external_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Alert fetch logs
CREATE TABLE "alert_fetch_logs" (
    "id" TEXT NOT NULL,
    "provider" "ExternalAlertProvider" NOT NULL,
    "status" TEXT NOT NULL,
    "fetched_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alert_fetch_logs_pkey" PRIMARY KEY ("id")
);
