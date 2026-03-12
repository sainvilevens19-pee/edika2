import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // École de démo
  const school = await prisma.school.upsert({
    where: { code: 'LYCEE-DEMO' },
    update: {},
    create: {
      name: 'Lycée Démo Edika',
      code: 'LYCEE-DEMO',
      city: 'Dakar',
      email: 'contact@lycee-demo.sn',
      phone: '+221 33 000 0000',
    },
  });

  // Année scolaire courante
  const academicYear = await prisma.academicYear.upsert({
    where: { schoolId_label: { schoolId: school.id, label: '2024-2025' } },
    update: {},
    create: {
      schoolId: school.id,
      label: '2024-2025',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2025-07-31'),
      isCurrent: true,
    },
  });

  const hash = (pwd: string) => bcrypt.hash(pwd, 12);

  // Directeur
  const directorUser = await prisma.user.upsert({
    where: { email: 'directeur@lycee-demo.sn' },
    update: {},
    create: {
      schoolId: school.id,
      email: 'directeur@lycee-demo.sn',
      password: await hash('Director@2024'),
      firstName: 'Ibrahima',
      lastName: 'Diallo',
      role: Role.DIRECTOR,
    },
  });

  // Censeur
  await prisma.user.upsert({
    where: { email: 'censeur@lycee-demo.sn' },
    update: {},
    create: {
      schoolId: school.id,
      email: 'censeur@lycee-demo.sn',
      password: await hash('Censeur@2024'),
      firstName: 'Fatou',
      lastName: 'Ndiaye',
      role: Role.CENSOR,
    },
  });

  // Secrétaire
  await prisma.user.upsert({
    where: { email: 'secretaire@lycee-demo.sn' },
    update: {},
    create: {
      schoolId: school.id,
      email: 'secretaire@lycee-demo.sn',
      password: await hash('Secretaire@2024'),
      firstName: 'Aminata',
      lastName: 'Sow',
      role: Role.SECRETARY,
    },
  });

  // Professeur
  const teacherUser = await prisma.user.upsert({
    where: { email: 'prof.math@gmail.com' },
    update: {},
    create: {
      email: 'prof.math@gmail.com',
      password: await hash('Teacher@2024'),
      firstName: 'Moussa',
      lastName: 'Traoré',
      role: Role.TEACHER,
    },
  });
  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id, specialization: 'Mathématiques' },
  });
  await prisma.teacherAssignment.upsert({
    where: { teacherId_schoolId_academicYearId: { teacherId: teacher.id, schoolId: school.id, academicYearId: academicYear.id } },
    update: {},
    create: { teacherId: teacher.id, schoolId: school.id, academicYearId: academicYear.id },
  });

  // Élève
  const studentUser = await prisma.user.upsert({
    where: { email: 'eleve.diop@lycee-demo.sn' },
    update: {},
    create: {
      schoolId: school.id,
      email: 'eleve.diop@lycee-demo.sn',
      password: await hash('Student@2024'),
      firstName: 'Cheikh',
      lastName: 'Diop',
      role: Role.STUDENT,
    },
  });
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      schoolId: school.id,
      dossierNumber: 'DOS-2024-001',
      gender: 'MALE',
    },
  });

  // Parent
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent.diop@gmail.com' },
    update: {},
    create: {
      email: 'parent.diop@gmail.com',
      password: await hash('Parent@2024'),
      firstName: 'Omar',
      lastName: 'Diop',
      role: Role.PARENT,
    },
  });
  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: { userId: parentUser.id },
  });
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    update: {},
    create: { parentId: parent.id, studentId: student.id, relationship: 'FATHER' },
  });

  console.log('✅ Seed terminé');
  console.log('─────────────────────────────────────');
  console.log('École       :', school.name, `(code: ${school.code})`);
  console.log('Directeur   : directeur@lycee-demo.sn / Director@2024');
  console.log('Censeur     : censeur@lycee-demo.sn / Censeur@2024');
  console.log('Secrétaire  : secretaire@lycee-demo.sn / Secretaire@2024');
  console.log('Professeur  : prof.math@gmail.com / Teacher@2024');
  console.log('Élève       : eleve.diop@lycee-demo.sn / Student@2024  (dossier: DOS-2024-001)');
  console.log('Parent      : parent.diop@gmail.com / Parent@2024');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
