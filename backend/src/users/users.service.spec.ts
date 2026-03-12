import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  parent: {
    findUnique: jest.fn(),
  },
  parentStudent: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  teacher: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  teacherAssignment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

// ─── Payloads JWT de test ──────────────────────────────────────────────────

const directorPayload: JwtPayload = {
  sub: 'director-user-id',
  email: 'dir@school.sn',
  role: Role.DIRECTOR,
  schoolId: 'school-a',
};

const parentPayload: JwtPayload = {
  sub: 'parent-user-id',
  email: 'parent@gmail.com',
  role: Role.PARENT,
  schoolId: null,
};

const superAdminPayload: JwtPayload = {
  sub: 'super-id',
  email: 'super@edika.sn',
  role: Role.SUPER_ADMIN,
  schoolId: 'school-a',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ─── findAllBySchool (isolation multi-tenant) ────────────────────────────

  describe('findAllBySchool', () => {
    it('filtre par schoolId du directeur', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAllBySchool(directorPayload, 1, 20);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: 'school-a' } }),
      );
    });

    it('lève ForbiddenException si PARENT tente de lister les users', async () => {
      await expect(service.findAllBySchool(parentPayload, 1, 20)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── findOne (vérification d'appartenance) ────────────────────────────────

  describe('findOne', () => {
    it('retourne le user si même école', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        schoolId: 'school-a',
        password: 'hashed',
        email: 'test@test.sn',
        role: 'STUDENT',
        studentProfile: null,
        teacherProfile: null,
        parentProfile: null,
        school: null,
      });

      const result = await service.findOne('user-1', directorPayload);
      expect(result).not.toHaveProperty('password');
    });

    it('lève ForbiddenException si user appartient à une autre école', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        schoolId: 'school-b', // différente école
        password: 'hashed',
      });

      await expect(service.findOne('user-1', directorPayload)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lève NotFoundException si user inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('unknown', directorPayload)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── linkChild ────────────────────────────────────────────────────────────

  describe('linkChild', () => {
    it('lie un enfant via numéro de dossier valide', async () => {
      mockPrisma.parent.findUnique.mockResolvedValue({ id: 'parent-id' });
      mockPrisma.student.findUnique.mockResolvedValue({ id: 'student-id', dossierNumber: 'DOS-001' });
      mockPrisma.parentStudent.findUnique.mockResolvedValue(null);
      mockPrisma.parentStudent.create.mockResolvedValue({});

      const result = await service.linkChild('parent-user-id', {
        dossierNumber: 'DOS-001',
        relationship: 'FATHER',
      });

      expect(result).toHaveProperty('studentId', 'student-id');
      expect(mockPrisma.parentStudent.create).toHaveBeenCalled();
    });

    it('lève NotFoundException si numéro de dossier inexistant', async () => {
      mockPrisma.parent.findUnique.mockResolvedValue({ id: 'parent-id' });
      mockPrisma.student.findUnique.mockResolvedValue(null);

      await expect(
        service.linkChild('parent-user-id', { dossierNumber: 'DOS-FAUX' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si enfant déjà lié', async () => {
      mockPrisma.parent.findUnique.mockResolvedValue({ id: 'parent-id' });
      mockPrisma.student.findUnique.mockResolvedValue({ id: 'student-id' });
      mockPrisma.parentStudent.findUnique.mockResolvedValue({ parentId: 'parent-id', studentId: 'student-id' });

      await expect(
        service.linkChild('parent-user-id', { dossierNumber: 'DOS-001' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── assignTeacher ────────────────────────────────────────────────────────

  describe('assignTeacher', () => {
    it('assigne un professeur à l\'école du directeur', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({ id: 'teacher-id' });
      mockPrisma.teacherAssignment.findUnique.mockResolvedValue(null);
      mockPrisma.teacherAssignment.create.mockResolvedValue({
        id: 'assign-id',
        teacherId: 'teacher-id',
        schoolId: 'school-a',
        academicYearId: 'year-id',
        school: { name: 'École A' },
        academicYear: { label: '2024-2025' },
      });

      const result = await service.assignTeacher(
        { teacherId: 'teacher-id', schoolId: 'school-a', academicYearId: 'year-id' },
        directorPayload,
      );

      expect(result).toHaveProperty('teacherId', 'teacher-id');
    });

    it('lève ForbiddenException si directeur tente d\'assigner à une autre école', async () => {
      await expect(
        service.assignTeacher(
          { teacherId: 'teacher-id', schoolId: 'school-b', academicYearId: 'year-id' }, // autre école
          directorPayload,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lève ConflictException si professeur déjà assigné', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({ id: 'teacher-id' });
      mockPrisma.teacherAssignment.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.assignTeacher(
          { teacherId: 'teacher-id', schoolId: 'school-a', academicYearId: 'year-id' },
          directorPayload,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── RolesGuard — isolation SUPER_ADMIN ───────────────────────────────────

  describe('SUPER_ADMIN bypass', () => {
    it('SUPER_ADMIN peut lister les users de n\'importe quelle école', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAllBySchool(superAdminPayload, 1, 20);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: 'school-a' } }),
      );
    });
  });
});
