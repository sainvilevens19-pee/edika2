import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  student: {
    findMany: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return map[key];
  }),
};

// ─── Données de test ──────────────────────────────────────────────────────────

const hashedPassword = bcrypt.hashSync('Test@1234', 12);

const mockDirectorUser = {
  id: 'user-director-id',
  email: 'directeur@lycee.sn',
  password: hashedPassword,
  firstName: 'Ibrahima',
  lastName: 'Diallo',
  role: 'DIRECTOR',
  schoolId: 'school-id',
  isActive: true,
  school: { id: 'school-id', name: 'Lycée Test', code: 'LT', logo: null },
  teacherProfile: null,
  parentProfile: null,
};

const mockParentUser = {
  id: 'user-parent-id',
  email: 'parent@gmail.com',
  password: hashedPassword,
  firstName: 'Omar',
  lastName: 'Diop',
  role: 'PARENT',
  schoolId: null,
  isActive: true,
  school: null,
  teacherProfile: null,
  parentProfile: { id: 'parent-id', children: [] },
};

const mockTeacherUser = {
  id: 'user-teacher-id',
  email: 'teacher@gmail.com',
  password: hashedPassword,
  firstName: 'Moussa',
  lastName: 'Traoré',
  role: 'TEACHER',
  schoolId: null,
  isActive: true,
  school: null,
  teacherProfile: { id: 'teacher-id', specialization: 'Maths', assignments: [] },
  parentProfile: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    // Refresh token create always succeeds
    mockPrisma.refreshToken.create.mockResolvedValue({});
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('retourne accessToken + refreshToken + user si identifiants valides', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockDirectorUser);

      const result = await service.login({ email: 'directeur@lycee.sn', password: 'Test@1234' });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).toHaveProperty('email', 'directeur@lycee.sn');
    });

    it('lève UnauthorizedException si user introuvable', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'inconnu@test.sn', password: 'Test@1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si mot de passe incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockDirectorUser);

      await expect(
        service.login({ email: 'directeur@lycee.sn', password: 'MauvaisMotDePasse' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si compte désactivé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockDirectorUser, isActive: false });

      await expect(
        service.login({ email: 'directeur@lycee.sn', password: 'Test@1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('ne retourne jamais le champ password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockDirectorUser);
      const result = await service.login({ email: 'directeur@lycee.sn', password: 'Test@1234' });
      expect(result.user).not.toHaveProperty('password');
    });
  });

  // ─── register (PARENT) ────────────────────────────────────────────────────

  describe('register — PARENT', () => {
    it('crée un compte parent sans enfants liés', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);   // email libre
      mockPrisma.student.findMany.mockResolvedValue([]);
      mockPrisma.user.create.mockResolvedValue(mockParentUser);

      const result = await service.register({
        email: 'parent@gmail.com',
        password: 'Parent@1234',
        firstName: 'Omar',
        lastName: 'Diop',
        role: 'PARENT',
      });

      expect(result.user).toHaveProperty('role', 'PARENT');
      expect(result.accessToken).toBeDefined();
    });

    it('lie les enfants si childrenDossiers fournis et valides', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.student.findMany.mockResolvedValue([
        { id: 'student-1', dossierNumber: 'DOS-2024-001' },
      ]);
      mockPrisma.user.create.mockResolvedValue({
        ...mockParentUser,
        parentProfile: {
          id: 'parent-id',
          children: [
            {
              student: {
                id: 'student-1',
                dossierNumber: 'DOS-2024-001',
                user: { firstName: 'Cheikh', lastName: 'Diop' },
                school: { id: 'school-id', name: 'Lycée Test' },
              },
              relationship: 'PARENT',
            },
          ],
        },
      });

      const result = await service.register({
        email: 'parent@gmail.com',
        password: 'Parent@1234',
        firstName: 'Omar',
        lastName: 'Diop',
        role: 'PARENT',
        childrenDossiers: ['DOS-2024-001'],
      });

      expect(result.user.parentProfile?.children).toHaveLength(1);
    });

    it('lève NotFoundException si un numéro de dossier est invalide', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.student.findMany.mockResolvedValue([]); // aucun trouvé

      await expect(
        service.register({
          email: 'parent@gmail.com',
          password: 'Parent@1234',
          firstName: 'Omar',
          lastName: 'Diop',
          role: 'PARENT',
          childrenDossiers: ['DOS-INEXISTANT'],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si email déjà utilisé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockParentUser); // email pris

      await expect(
        service.register({
          email: 'parent@gmail.com',
          password: 'Parent@1234',
          firstName: 'Omar',
          lastName: 'Diop',
          role: 'PARENT',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── register (TEACHER) ───────────────────────────────────────────────────

  describe('register — TEACHER', () => {
    it('crée un compte professeur sans assignation école', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockTeacherUser);

      const result = await service.register({
        email: 'teacher@gmail.com',
        password: 'Teacher@1234',
        firstName: 'Moussa',
        lastName: 'Traoré',
        role: 'TEACHER',
        specialization: 'Mathématiques',
      });

      expect(result.user).toHaveProperty('role', 'TEACHER');
      // Pas encore assigné
      expect(result.user.teacherProfile?.assignments).toHaveLength(0);
    });
  });

  // ─── refreshToken ─────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('retourne un nouveau accessToken si refresh token valide', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: 'valid-refresh',
        expiresAt: new Date(Date.now() + 86400000), // demain
        user: mockDirectorUser,
      });

      const result = await service.refreshToken('valid-refresh');
      expect(result.accessToken).toBeDefined();
    });

    it('lève UnauthorizedException si refresh token expiré', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: 'expired-refresh',
        expiresAt: new Date(Date.now() - 1000), // passé
        user: mockDirectorUser,
      });

      await expect(service.refreshToken('expired-refresh')).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si refresh token introuvable', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('unknown-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
