import 'dotenv/config';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import academicRoutes from './routes/academic.js';
import enrollmentRoutes from './routes/enrollment.js';
import gradesRoutes from './routes/grades.js';
import attendanceRoutes from './routes/attendance.js';
import facultyRoutes from './routes/faculty.js';
import adminRoutes from './routes/admin.js';
import emailRoutes from './routes/emails.js';
import healthRoutes from './routes/health.js';
import profileRoutes from './routes/profiles.js';
import calendarRoutes from './routes/calendar.js';
import announcementRoutes from './routes/announcements.js';
import admissionsRoutes from './routes/admissions.js';
import onboardingRoutes from './routes/onboarding.js';
import supportRoutes from './routes/support.js';
import conductRoutes from './routes/conduct.js';
import registrationRoutes from './routes/registration.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { ensureStorageBuckets } from './lib/storage.js';

const app: Express = express();
const PORT = process.env.PORT ?? 4000;

// Required behind Render/Vercel proxies for rate limiting and secure cookies
app.set('trust proxy', 1);

const corsOrigins = (
  process.env.CORS_ORIGINS?.split(',') ?? [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://student-information-system-web.vercel.app',
  ]
)
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }),
);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/', academicRoutes);
app.use('/', enrollmentRoutes);
app.use('/', gradesRoutes);
app.use('/', attendanceRoutes);
app.use('/', facultyRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/emails', emailRoutes);
app.use('/', profileRoutes);
app.use('/', calendarRoutes);
app.use('/', announcementRoutes);
app.use('/', admissionsRoutes);
app.use('/onboarding', onboardingRoutes);
app.use('/support', supportRoutes);
app.use('/conduct', conductRoutes);
app.use('/', registrationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  void ensureStorageBuckets();
  app.listen(PORT, () => {
    console.log(`SIS API running on port ${PORT}`);
  });
}

export default app;
