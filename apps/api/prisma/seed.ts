import bcrypt from 'bcryptjs';
import { createPrismaClient } from '../src/lib/create-prisma-client.js';

const prisma = createPrismaClient();

async function main() {
  console.log('Seeding database...');

  const program = await prisma.program.upsert({
    where: { code: 'BSCS' },
    update: {},
    create: {
      code: 'BSCS',
      name: 'Bachelor of Science in Computer Science',
      description: 'Four-year computer science program',
    },
  });

  const term = await prisma.academicTerm.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'First Semester 2025-2026',
      year: 2025,
      semester: 1,
      status: 'active',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-12-15'),
    },
  });

  const subjects = await Promise.all([
    prisma.subject.upsert({
      where: { code: 'CS101' },
      update: {},
      create: { code: 'CS101', title: 'Introduction to Programming', units: 3 },
    }),
    prisma.subject.upsert({
      where: { code: 'CS201' },
      update: {},
      create: { code: 'CS201', title: 'Data Structures', units: 3 },
    }),
    prisma.subject.upsert({
      where: { code: 'MATH101' },
      update: {},
      create: { code: 'MATH101', title: 'College Algebra', units: 3 },
    }),
  ]);

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sis.edu' },
    update: {},
    create: {
      email: 'admin@sis.edu',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'admin',
      admin: { create: { title: 'Registrar' } },
    },
  });

  const facultyUser = await prisma.user.upsert({
    where: { email: 'faculty@sis.edu' },
    update: {},
    create: {
      email: 'faculty@sis.edu',
      passwordHash,
      firstName: 'Maria',
      lastName: 'Santos',
      role: 'faculty',
      faculty: { create: { employeeId: 'FAC-001', department: 'Computer Science' } },
    },
  });

  const faculty = await prisma.faculty.findUnique({ where: { userId: facultyUser.id } });

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@sis.edu' },
    update: {},
    create: {
      email: 'student@sis.edu',
      passwordHash,
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      role: 'student',
      student: {
        create: {
          studentNumber: '2025-0001',
          programId: program.id,
          yearLevel: 1,
        },
      },
    },
  });

  const student = await prisma.student.findUnique({ where: { userId: studentUser.id } });

  if (faculty && subjects[0]) {
    const section = await prisma.courseSection.upsert({
      where: {
        subjectId_termId_sectionCode: {
          subjectId: subjects[0].id,
          termId: term.id,
          sectionCode: 'A',
        },
      },
      update: {},
      create: {
        subjectId: subjects[0].id,
        termId: term.id,
        facultyId: faculty.id,
        sectionCode: 'A',
        capacity: 40,
        schedule: 'MWF 8:00-9:00 AM',
        room: 'Lab 101',
      },
    });

    const gradeScheme = await prisma.gradeScheme.upsert({
      where: { sectionId: section.id },
      update: {},
      create: {
        sectionId: section.id,
        categoryWeights: [
          { type: 'quiz', weight: 20 },
          { type: 'seatwork', weight: 10 },
          { type: 'activity', weight: 10 },
          { type: 'project', weight: 20 },
          { type: 'exam', weight: 40 },
        ],
        extracurricularMax: 5,
      },
    });

    const components = await Promise.all([
      prisma.gradeComponent.create({
        data: {
          schemeId: gradeScheme.id,
          type: 'quiz',
          name: 'Quiz 1',
          maxScore: 10,
          sequence: 1,
          topicTags: ['variables', 'data types'],
        },
      }),
      prisma.gradeComponent.create({
        data: {
          schemeId: gradeScheme.id,
          type: 'quiz',
          name: 'Quiz 2',
          maxScore: 10,
          sequence: 2,
          topicTags: ['control flow', 'loops'],
        },
      }),
      prisma.gradeComponent.create({
        data: {
          schemeId: gradeScheme.id,
          type: 'exam',
          name: 'Midterm Exam',
          maxScore: 50,
          sequence: 3,
          topicTags: ['variables', 'control flow', 'functions'],
        },
      }),
    ]);

    if (student) {
      await prisma.enrollment.upsert({
        where: { studentId_sectionId: { studentId: student.id, sectionId: section.id } },
        update: {},
        create: { studentId: student.id, sectionId: section.id, status: 'approved' },
      });

      await prisma.gradeEntry.createMany({
        data: [
          { studentId: student.id, componentId: components[0]!.id, score: 6 },
          { studentId: student.id, componentId: components[1]!.id, score: 8 },
          { studentId: student.id, componentId: components[2]!.id, score: 35 },
        ],
        skipDuplicates: true,
      });
    }

    const syllabus = await prisma.syllabus.upsert({
      where: { sectionId: section.id },
      update: {},
      create: {
        sectionId: section.id,
        title: 'CS101 Course Syllabus',
        description: 'Introduction to Programming syllabus for First Semester',
      },
    });

    await prisma.lesson.create({
      data: {
        syllabusId: syllabus.id,
        title: 'Week 1: Variables and Data Types',
        week: 1,
        topics: ['variables', 'data types', 'operators'],
      },
    });
  }

  console.log('Seed complete.');
  console.log('Demo accounts (password: Password123!):');
  console.log(`  Admin:   ${adminUser.email}`);
  console.log(`  Faculty: ${facultyUser.email}`);
  console.log(`  Student: ${studentUser.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
