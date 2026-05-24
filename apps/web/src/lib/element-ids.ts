function slugify(value: string): string {
  return value.replace(/^\//, '').replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '-');
}

export function navId(href: string): string {
  return `sis-nav-${slugify(href) || 'root'}`;
}

export function pageId(scope: string, element: string): string {
  return `sis-${scope}-${element}`;
}

export const ids = {
  app: {
    root: 'sis-app-root',
    main: 'sis-app-main',
    toast: 'sis-app-toast',
  },
  home: {
    page: 'sis-home-page',
    header: 'sis-home-header',
    title: 'sis-home-title',
    description: 'sis-home-description',
    signInLink: 'sis-home-sign-in-link',
    getStartedLink: 'sis-home-get-started-link',
  },
  login: {
    page: 'sis-login-page',
    card: 'sis-login-card',
    title: 'sis-login-title',
    form: 'sis-login-form',
    email: 'sis-login-email',
    password: 'sis-login-password',
    submit: 'sis-login-submit',
    demoHint: 'sis-login-demo-hint',
    backLink: 'sis-login-back-link',
  },
  dashboard: {
    redirect: 'sis-dashboard-redirect',
  },
  shell: {
    root: 'sis-shell-root',
    brand: 'sis-shell-brand',
    mobileHeader: 'sis-shell-mobile-header',
    menuToggle: 'sis-shell-menu-toggle',
    sidebar: 'sis-shell-sidebar',
    roleBadge: 'sis-shell-role-badge',
    nav: 'sis-shell-nav',
    userEmail: 'sis-shell-user-email',
    logout: 'sis-shell-logout',
    main: 'sis-shell-main',
    content: 'sis-shell-content',
  },
  roleGuard: {
    loading: 'sis-role-guard-loading',
  },
  student: {
    dashboard: {
      page: 'sis-student-dashboard-page',
      title: 'sis-student-dashboard-title',
      kpiGrid: 'sis-student-dashboard-kpi-grid',
      enrolledSections: 'sis-student-dashboard-enrolled-sections',
      coursesWithGrades: 'sis-student-dashboard-courses-with-grades',
      avgAttendance: 'sis-student-dashboard-avg-attendance',
      enrollmentsTable: 'sis-student-dashboard-enrollments-table',
      recentGrades: 'sis-student-dashboard-recent-grades',
    },
    courses: {
      page: 'sis-student-courses-page',
      title: 'sis-student-courses-title',
      list: 'sis-student-courses-list',
      empty: 'sis-student-courses-empty',
    },
    enrollment: {
      page: 'sis-student-enrollment-page',
      title: 'sis-student-enrollment-title',
      list: 'sis-student-enrollment-list',
      sectionCard: (sectionId: string) => `sis-student-enrollment-section-${sectionId}`,
      enrollButton: (sectionId: string) => `sis-student-enrollment-enroll-${sectionId}`,
      empty: 'sis-student-enrollment-empty',
    },
    grades: {
      page: 'sis-student-grades-page',
      title: 'sis-student-grades-title',
      list: 'sis-student-grades-list',
      empty: 'sis-student-grades-empty',
    },
    attendance: {
      page: 'sis-student-attendance-page',
      title: 'sis-student-attendance-title',
      list: 'sis-student-attendance-list',
      empty: 'sis-student-attendance-empty',
    },
    aiLessons: {
      page: 'sis-student-ai-lessons-page',
      title: 'sis-student-ai-lessons-title',
      list: 'sis-student-ai-lessons-list',
      empty: 'sis-student-ai-lessons-empty',
    },
    profile: {
      page: 'sis-student-profile-page',
      title: 'sis-student-profile-title',
    },
    schedule: {
      page: 'sis-student-schedule-page',
      title: 'sis-student-schedule-title',
      grid: 'sis-student-schedule-grid',
    },
    news: {
      page: 'sis-student-news-page',
      title: 'sis-student-news-title',
    },
  },
  faculty: {
    dashboard: {
      page: 'sis-faculty-dashboard-page',
      title: 'sis-faculty-dashboard-title',
      kpiGrid: 'sis-faculty-dashboard-kpi-grid',
      encodeGradesLink: 'sis-faculty-dashboard-encode-grades-link',
      aiTailorLink: 'sis-faculty-dashboard-ai-tailor-link',
    },
    sections: {
      page: 'sis-faculty-sections-page',
      title: 'sis-faculty-sections-title',
      list: 'sis-faculty-sections-list',
      detail: (sectionId: string) => `sis-faculty-section-detail-${sectionId}`,
    },
    grades: {
      page: 'sis-faculty-grades-page',
      title: 'sis-faculty-grades-title',
      sectionSelect: 'sis-faculty-grades-section-select',
      sheet: 'sis-faculty-grades-sheet',
      table: 'sis-faculty-grades-table',
    },
    attendance: {
      page: 'sis-faculty-attendance-page',
      title: 'sis-faculty-attendance-title',
      sectionSelect: 'sis-faculty-attendance-section-select',
      dateInput: 'sis-faculty-attendance-date',
      createSession: 'sis-faculty-attendance-create-session',
      sessionsList: 'sis-faculty-attendance-sessions-list',
    },
    syllabus: {
      page: 'sis-faculty-syllabus-page',
      title: 'sis-faculty-syllabus-title',
      sectionSelect: 'sis-faculty-syllabus-section-select',
      createSyllabus: 'sis-faculty-syllabus-create',
      lessonTitle: 'sis-faculty-syllabus-lesson-title',
      lessonWeek: 'sis-faculty-syllabus-lesson-week',
      addLesson: 'sis-faculty-syllabus-add-lesson',
      lessonsList: 'sis-faculty-syllabus-lessons-list',
    },
    ai: {
      page: 'sis-faculty-ai-page',
      title: 'sis-faculty-ai-title',
      sectionSelect: 'sis-faculty-ai-section-select',
      lessonSelect: 'sis-faculty-ai-lesson-select',
      studentSelect: 'sis-faculty-ai-student-select',
      tailorButton: 'sis-faculty-ai-tailor-button',
      requestsList: 'sis-faculty-ai-requests-list',
    },
    profile: {
      page: 'sis-faculty-profile-page',
      title: 'sis-faculty-profile-title',
    },
    schedule: {
      page: 'sis-faculty-schedule-page',
      title: 'sis-faculty-schedule-title',
      grid: 'sis-faculty-schedule-grid',
    },
    news: {
      page: 'sis-faculty-news-page',
      title: 'sis-faculty-news-title',
    },
  },
  admin: {
    dashboard: {
      page: 'sis-admin-dashboard-page',
      title: 'sis-admin-dashboard-title',
      kpiGrid: 'sis-admin-dashboard-kpi-grid',
    },
    enrollment: {
      page: 'sis-admin-enrollment-page',
      title: 'sis-admin-enrollment-title',
      table: 'sis-admin-enrollment-table',
      approve: (id: string) => `sis-admin-enrollment-approve-${id}`,
      drop: (id: string) => `sis-admin-enrollment-drop-${id}`,
    },
    subjects: {
      page: 'sis-admin-subjects-page',
      title: 'sis-admin-subjects-title',
      code: 'sis-admin-subjects-code',
      titleInput: 'sis-admin-subjects-title-input',
      units: 'sis-admin-subjects-units',
      create: 'sis-admin-subjects-create',
      table: 'sis-admin-subjects-table',
    },
    reports: {
      page: 'sis-admin-reports-page',
      title: 'sis-admin-reports-title',
      termSelect: 'sis-admin-reports-term-select',
      sectionSelect: 'sis-admin-reports-section-select',
      enrollmentCard: 'sis-admin-reports-enrollment-card',
      gradesCard: 'sis-admin-reports-grades-card',
    },
    maintenance: {
      page: 'sis-admin-maintenance-page',
      title: 'sis-admin-maintenance-title',
      archiveList: 'sis-admin-maintenance-archive-list',
      jobsTable: 'sis-admin-maintenance-jobs-table',
      users: {
        page: 'sis-admin-maintenance-users-page',
      },
      data: {
        page: 'sis-admin-maintenance-data-page',
      },
    },
    academicSetup: {
      page: 'sis-admin-academic-setup-page',
      title: 'sis-admin-academic-setup-title',
      archiveList: 'sis-admin-academic-setup-archive-list',
      jobsTable: 'sis-admin-academic-setup-jobs-table',
    },
    calendar: {
      page: 'sis-admin-calendar-page',
      title: 'sis-admin-calendar-title',
      table: 'sis-admin-calendar-table',
    },
    announcements: {
      page: 'sis-admin-announcements-page',
      title: 'sis-admin-announcements-title',
      inbox: 'sis-admin-announcements-inbox',
    },
    health: {
      page: 'sis-admin-health-page',
      title: 'sis-admin-health-title',
      refresh: 'sis-admin-health-refresh',
      overall: 'sis-admin-health-overall',
      checksGrid: 'sis-admin-health-checks-grid',
    },
    emails: {
      page: 'sis-admin-emails-page',
      title: 'sis-admin-emails-title',
      refresh: 'sis-admin-emails-refresh',
      notConfigured: 'sis-admin-emails-not-configured',
      sendCard: 'sis-admin-emails-send-card',
      to: 'sis-admin-emails-to',
      subject: 'sis-admin-emails-subject',
      html: 'sis-admin-emails-html',
      scheduledAt: 'sis-admin-emails-scheduled-at',
      sendButton: 'sis-admin-emails-send-button',
      batchCard: 'sis-admin-emails-batch-card',
      batchJson: 'sis-admin-emails-batch-json',
      batchButton: 'sis-admin-emails-batch-button',
      listCard: 'sis-admin-emails-list-card',
      empty: 'sis-admin-emails-empty',
      table: 'sis-admin-emails-table',
      viewButton: (id: string) => `sis-admin-emails-view-${id}`,
      detailCard: 'sis-admin-emails-detail-card',
      detailId: 'sis-admin-emails-detail-id',
      cancelButton: 'sis-admin-emails-cancel-button',
      rescheduleAt: 'sis-admin-emails-reschedule-at',
      rescheduleButton: 'sis-admin-emails-reschedule-button',
      attachmentsEmpty: 'sis-admin-emails-attachments-empty',
      attachmentsList: 'sis-admin-emails-attachments-list',
    },
  },
} as const;
