import type { OnboardingStepKey } from './constants.js';

export interface OnboardingStepContent {
  key: OnboardingStepKey;
  title: string;
  body: string;
}

export const ONBOARDING_CONTENT: OnboardingStepContent[] = [
  {
    key: 'mission_vision',
    title: 'Mission & Vision',
    body: `Our institution is committed to providing quality education that empowers learners to become responsible citizens and professionals.

**Mission:** To deliver accessible, relevant, and transformative education that develops competent graduates prepared for global challenges.

**Vision:** To be a leading center of excellence in education, research, and community engagement.`,
  },
  {
    key: 'core_values',
    title: 'Core Values',
    body: `As a member of our academic community, you are expected to uphold:

- **Integrity** — honesty in all academic work and personal conduct
- **Excellence** — striving for the highest standards in learning
- **Respect** — treating all members of the community with dignity
- **Service** — contributing positively to society
- **Innovation** — embracing creativity and continuous improvement`,
  },
  {
    key: 'policies',
    title: 'Institutional Policies',
    body: `Please review the following key policies:

1. **Attendance Policy** — Students must meet minimum attendance requirements per subject.
2. **Academic Integrity** — Plagiarism, cheating, and falsification of records are prohibited.
3. **Code of Conduct** — Respectful behavior is required on campus and in online platforms.
4. **Dress Code** — Appropriate attire is required during classes and official events.
5. **ID Policy** — Your student ID must be worn or presented when requested.`,
  },
  {
    key: 'data_privacy',
    title: 'Data Privacy',
    body: `We collect and process your personal information in accordance with the Data Privacy Act of 2012 (RA 10173).

**What we collect:** name, contact details, academic records, and identification documents.

**How we use it:** enrollment, grading, communication, and institutional reporting.

**Your rights:** access, correction, and objection to processing as provided by law.

For privacy concerns, contact the Data Protection Officer through the Help Desk.`,
  },
  {
    key: 'agreement',
    title: 'Student Agreement',
    body: `By completing onboarding, you acknowledge that you have read and understood our mission, vision, core values, institutional policies, and data privacy notice.

You agree to abide by all rules and regulations of the institution for the duration of your enrollment.`,
  },
];
