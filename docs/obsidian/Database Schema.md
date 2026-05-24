# Database Schema

See `apps/api/prisma/schema.prisma` for source of truth.

## Core Entities

- **users** → students, faculty, admins (1:1 profiles)
- **programs** → students enrolled in program
- **subjects** → course catalog with units
- **academic_terms** → semester/year
- **course_sections** → subject + term + faculty
- **enrollments** → student ↔ section

## Grades

- **grade_schemes** → per-section weights (JSON)
- **grade_components** → individual quizzes/exams/etc
- **grade_entries** → student scores

## Faculty Content

- **syllabi** → per section
- **lessons** → weekly with topic tags
- **lesson_files** → PDF storage paths
- **ai_lesson_requests** → Gemini tailored output

## Admin

- **audit_logs**, **maintenance_jobs**
