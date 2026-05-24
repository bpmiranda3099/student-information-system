import type { User } from './prisma.js';

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeProgram(p: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
}) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
  };
}

export function serializeSubject(s: {
  id: string;
  code: string;
  title: string;
  units: number;
  description: string | null;
  createdAt: Date;
}) {
  return {
    id: s.id,
    code: s.code,
    title: s.title,
    units: s.units,
    description: s.description,
    createdAt: s.createdAt.toISOString(),
  };
}

export function serializeTerm(t: {
  id: string;
  name: string;
  year: number;
  semester: number;
  status: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}) {
  return {
    id: t.id,
    name: t.name,
    year: t.year,
    semester: t.semester,
    status: t.status,
    startDate: t.startDate.toISOString().split('T')[0],
    endDate: t.endDate.toISOString().split('T')[0],
    createdAt: t.createdAt.toISOString(),
  };
}

export function serializeSection(
  s: {
    id: string;
    subjectId: string;
    termId: string;
    facultyId: string;
    sectionCode: string;
    capacity: number;
    schedule: string | null;
    room: string | null;
    createdAt: Date;
    subject?: {
      id: string;
      code: string;
      title: string;
      units: number;
      description: string | null;
      createdAt: Date;
    };
    term?: {
      id: string;
      name: string;
      year: number;
      semester: number;
      status: string;
      startDate: Date;
      endDate: Date;
      createdAt: Date;
    };
    _count?: { enrollments: number };
  },
) {
  return {
    id: s.id,
    subjectId: s.subjectId,
    termId: s.termId,
    facultyId: s.facultyId,
    sectionCode: s.sectionCode,
    capacity: s.capacity,
    enrolledCount: s._count?.enrollments ?? 0,
    schedule: s.schedule,
    room: s.room,
    subject: s.subject ? serializeSubject(s.subject) : undefined,
    term: s.term ? serializeTerm(s.term) : undefined,
    createdAt: s.createdAt.toISOString(),
  };
}
