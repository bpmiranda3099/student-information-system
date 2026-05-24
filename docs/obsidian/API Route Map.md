# API Route Map

## Auth
- `POST /auth/login`, `/register`, `/refresh`, `/logout`
- `GET /auth/me`, `/auth/users` (admin)

## Academic
- `GET/POST /programs`, `/subjects`, `/terms`, `/sections`

## Enrollment
- `GET/POST /enrollments`
- `PATCH /enrollments/:id` (admin)

## Grades
- `GET/POST /sections/:id/grade-scheme`
- `POST /sections/:id/grade-components`
- `GET/POST /sections/:id/grades`
- `GET /students/me/grades`

## Attendance
- `GET/POST /sections/:id/attendance/sessions`
- `GET/POST /attendance/sessions/:id/records`
- `GET /students/me/attendance`

## Faculty
- `GET/POST /sections/:id/syllabus`
- `POST /syllabus/:id/lessons`
- `POST /lessons/:id/upload`
- `POST /ai/tailor-lesson`
- `GET /ai/requests`

## Admin
- `GET /admin/reports/enrollment`, `/grades/:sectionId`, `/attendance/:sectionId`
- `GET /admin/analytics/overview`
- `POST /admin/maintenance/archive-term/:id`
- `POST /admin/emails/send`, `/batch`
- `GET /admin/emails`, `/admin/emails/:id`
- `PATCH /admin/emails/:id` (reschedule)
- `POST /admin/emails/:id/cancel`
- `GET /admin/emails/:id/attachments`, `/admin/emails/:id/attachments/:attachmentId`

## Health
- `GET /health`
