export function serializeCalendarEvent(e: {
  id: string;
  termId: string | null;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  type: string;
  source: string;
  externalId: string | null;
  allDay: boolean;
  createdAt: Date;
}) {
  return {
    id: e.id,
    termId: e.termId,
    title: e.title,
    description: e.description,
    startDate: e.startDate.toISOString().split('T')[0],
    endDate: e.endDate.toISOString().split('T')[0],
    type: e.type,
    source: e.source,
    externalId: e.externalId,
    allDay: e.allDay,
    createdAt: e.createdAt.toISOString(),
  };
}

export function serializeSectionMeeting(m: {
  id: string;
  sectionId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
}) {
  return {
    id: m.id,
    sectionId: m.sectionId,
    dayOfWeek: m.dayOfWeek,
    startTime: m.startTime,
    endTime: m.endTime,
    room: m.room,
  };
}

export function serializeAnnouncement(a: {
  id: string;
  title: string;
  body: string;
  category: string;
  severity: string;
  publishedAt: Date;
  expiresAt: Date | null;
  source: string;
  externalAlertId: string | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    category: a.category,
    severity: a.severity,
    publishedAt: a.publishedAt.toISOString(),
    expiresAt: a.expiresAt?.toISOString() ?? null,
    source: a.source,
    externalAlertId: a.externalAlertId,
    createdAt: a.createdAt.toISOString(),
  };
}

export function serializeExternalAlert(a: {
  id: string;
  provider: string;
  externalId: string;
  title: string;
  summary: string;
  category: string;
  severity: string;
  issuedAt: Date;
  dismissed: boolean;
  createdAt: Date;
}) {
  return {
    id: a.id,
    provider: a.provider,
    externalId: a.externalId,
    title: a.title,
    summary: a.summary,
    category: a.category,
    severity: a.severity,
    issuedAt: a.issuedAt.toISOString(),
    dismissed: a.dismissed,
    createdAt: a.createdAt.toISOString(),
  };
}
