import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─── LOGIN ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        school: { select: { id: true, name: true, code: true, logo: true } },
        teacherProfile: {
          include: {
            assignments: {
              where: { isActive: true },
              include: { school: { select: { id: true, name: true, code: true } }, academicYear: true },
            },
          },
        },
        parentProfile: {
          include: {
            children: {
              include: {
                student: {
                  include: {
                    user: { select: { firstName: true, lastName: true } },
                    school: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role as Role,
      schoolId: user.schoolId,
    });

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  // ─── REGISTER (Parent ou Professeur uniquement) ───────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    if (dto.role === Role.PARENT) {
      return this.registerParent(dto, hashedPassword);
    } else {
      return this.registerTeacher(dto, hashedPassword);
    }
  }

  private async registerParent(dto: RegisterDto, hashedPassword: string) {
    // Vérifier les numéros de dossier avant de créer le compte
    const students =
      dto.childrenDossiers && dto.childrenDossiers.length > 0
        ? await this.prisma.student.findMany({
            where: { dossierNumber: { in: dto.childrenDossiers } },
            include: {
              user: { select: { firstName: true, lastName: true } },
              school: { select: { name: true } },
            },
          })
        : [];

    if (
      dto.childrenDossiers &&
      dto.childrenDossiers.length > 0 &&
      students.length !== dto.childrenDossiers.length
    ) {
      const found = students.map((s) => s.dossierNumber);
      const missing = dto.childrenDossiers.filter((d) => !found.includes(d));
      throw new NotFoundException(
        `Numéro(s) de dossier introuvable(s) : ${missing.join(', ')}`,
      );
    }

    const user = await this.prisma.user.create({
      data: {
        id: uuidv4(),
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.PARENT,
        parentProfile: {
          create: {
            id: uuidv4(),
            children: {
              create: students.map((s) => ({
                studentId: s.id,
                relationship: 'PARENT' as const,
              })),
            },
          },
        },
      },
      include: {
        parentProfile: {
          include: {
            children: {
              include: {
                student: {
                  include: {
                    user: { select: { firstName: true, lastName: true } },
                    school: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: Role.PARENT,
      schoolId: null,
    });

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  private async registerTeacher(dto: RegisterDto, hashedPassword: string) {
    const user = await this.prisma.user.create({
      data: {
        id: uuidv4(),
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.TEACHER,
        teacherProfile: {
          create: {
            id: uuidv4(),
            specialization: dto.specialization,
          },
        },
      },
      include: {
        teacherProfile: { include: { assignments: true } },
      },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: Role.TEACHER,
      schoolId: null,
    });

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────────────────────

  async refreshToken(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    if (!stored.user.isActive) {
      throw new ForbiddenException('Compte désactivé');
    }

    const accessToken = this.signAccessToken({
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.role as Role,
      schoolId: stored.user.schoolId,
    });

    return { accessToken };
  }

  // ─── LOGOUT ───────────────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  // ─── ME ───────────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: { select: { id: true, name: true, code: true, logo: true } },
        teacherProfile: {
          include: {
            assignments: {
              where: { isActive: true },
              include: {
                school: { select: { id: true, name: true, code: true } },
                academicYear: true,
              },
            },
          },
        },
        parentProfile: {
          include: {
            children: {
              include: {
                student: {
                  include: {
                    user: { select: { firstName: true, lastName: true } },
                    school: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return this.sanitizeUser(user);
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private async generateTokens(payload: JwtPayload) {
    const accessToken = this.signAccessToken(payload);
    const refreshTokenValue = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        userId: payload.sub,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  private signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '15m',
    });
  }

  // Retire le mot de passe avant de renvoyer l'utilisateur
  private sanitizeUser(user: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = user as { password: string; [key: string]: unknown };
    return safe;
  }
}
