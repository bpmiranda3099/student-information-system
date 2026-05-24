import { prisma } from './prisma.js';
import { getSignedUrl } from './storage.js';
import { AVATARS_BUCKET } from '@sis/shared';
import type { User } from './prisma.js';

type UserWithRelations = User & {
  student?: {
    studentNumber: string;
    yearLevel: number;
    program: { code: string; name: string };
  } | null;
  faculty?: { employeeId: string; department: string | null } | null;
};

export async function buildProfile(user: UserWithRelations) {
  let photoUrl: string | null = null;
  if (user.photoPath) {
    try {
      photoUrl = await getSignedUrl(AVATARS_BUCKET, user.photoPath);
    } catch {
      photoUrl = null;
    }
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    photoPath: user.photoPath,
    photoUrl,
    bio: user.bio,
    phone: user.phone,
    studentNumber: user.student?.studentNumber,
    employeeId: user.faculty?.employeeId,
    programCode: user.student?.program.code,
    programName: user.student?.program.name,
    yearLevel: user.student?.yearLevel,
    department: user.faculty?.department ?? null,
  };
}

export async function loadProfileUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: { include: { program: true } },
      faculty: true,
    },
  });
}

export async function canViewProfile(viewerId: string, viewerRole: string, targetUserId: string) {
  if (viewerId === targetUserId || viewerRole === 'admin') return true;
  if (viewerRole !== 'faculty') return false;

  const faculty = await prisma.faculty.findUnique({ where: { userId: viewerId } });
  if (!faculty) return false;

  const targetStudent = await prisma.student.findUnique({ where: { userId: targetUserId } });
  if (!targetStudent) return false;

  const shared = await prisma.enrollment.findFirst({
    where: {
      studentId: targetStudent.id,
      status: 'approved',
      section: { facultyId: faculty.id },
    },
  });
  return !!shared;
}
