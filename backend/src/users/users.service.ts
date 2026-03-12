import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { CreateUserByAdminDto, LinkChildDto, AssignTeacherDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ─── Lister les utilisateurs d'une école ──────────────────────────────────
  // Isolation stricte : on ne retourne que les users du tenant (schoolId)
  async findAllBySchool(
    requester: JwtPayload,
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const schoolId = this.resolveSchoolId(requester);

    const where = {
      schoolId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          studentProfile: { select: { dossierNumber: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Trouver un utilisateur (avec vérification d'appartenance) ────────────
  async findOne(id: string, requester: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true } },
        studentProfile: true,
        teacherProfile: {
          include: { assignments: { include: { school: true, academicYear: true } } },
        },
        parentProfile: {
          include: {
            children: {
              include: {
                student: {
                  include: { user: { select: { firstName: true, lastName: true } }, school: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');
    this.assertSameSchoolOrAdmin(user.schoolId, requester);

    const { password: _pwd, ...safe } = user as typeof user & { password: string };
    return safe;
  }

  // ─── Créer un user dans une école (DIRECTOR/SUPER_ADMIN) ──────────────────
  async createByAdmin(dto: CreateUserByAdminDto, requester: JwtPayload) {
    const schoolId = this.resolveSchoolId(requester);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const data: Parameters<typeof this.prisma.user.create>[0]['data'] = {
      id: uuidv4(),
      schoolId,
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role,
    };

    if (dto.role === Role.STUDENT) {
      const dossier = dto.dossierNumber ?? this.generateDossier();
      const existingDossier = await this.prisma.student.findUnique({
        where: { dossierNumber: dossier },
      });
      if (existingDossier) throw new ConflictException('Numéro de dossier déjà utilisé');

      data.studentProfile = {
        create: { id: uuidv4(), schoolId, dossierNumber: dossier },
      };
    }

    const user = await this.prisma.user.create({ data });
    const { password: _pwd, ...safe } = user as typeof user & { password: string };
    return safe;
  }

  // ─── Mettre à jour un user ────────────────────────────────────────────────
  async update(id: string, dto: UpdateUserDto, requester: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Un user peut mettre à jour son propre profil ; les admins peuvent tout modifier
    if (requester.sub !== id) {
      this.assertSameSchoolOrAdmin(user.schoolId, requester);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    const { password: _pwd, ...safe } = updated as typeof updated & { password: string };
    return safe;
  }

  // ─── Parent : lier un enfant via numéro de dossier ────────────────────────
  async linkChild(parentUserId: string, dto: LinkChildDto) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId: parentUserId },
    });
    if (!parent) throw new NotFoundException('Profil parent introuvable');

    const student = await this.prisma.student.findUnique({
      where: { dossierNumber: dto.dossierNumber },
    });
    if (!student) {
      throw new NotFoundException(
        `Aucun élève trouvé avec le numéro de dossier : ${dto.dossierNumber}`,
      );
    }

    const existing = await this.prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    });
    if (existing) throw new ConflictException('Cet enfant est déjà lié à votre compte');

    await this.prisma.parentStudent.create({
      data: {
        parentId: parent.id,
        studentId: student.id,
        relationship: dto.relationship ?? 'PARENT',
      },
    });

    return { message: 'Enfant lié avec succès', studentId: student.id };
  }

  // ─── Assigner un professeur à une école/année (DIRECTOR/SUPER_ADMIN) ──────
  async assignTeacher(dto: AssignTeacherDto, requester: JwtPayload) {
    const schoolId = this.resolveSchoolId(requester);

    if (requester.role !== Role.SUPER_ADMIN && dto.schoolId !== schoolId) {
      throw new ForbiddenException('Vous ne pouvez assigner des profs qu\'à votre propre école');
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: dto.teacherId },
    });
    if (!teacher) throw new NotFoundException('Profil professeur introuvable');

    const existing = await this.prisma.teacherAssignment.findUnique({
      where: {
        teacherId_schoolId_academicYearId: {
          teacherId: dto.teacherId,
          schoolId: dto.schoolId,
          academicYearId: dto.academicYearId,
        },
      },
    });
    if (existing) throw new ConflictException('Ce professeur est déjà assigné à cette école pour cette année');

    const assignment = await this.prisma.teacherAssignment.create({
      data: {
        id: uuidv4(),
        teacherId: dto.teacherId,
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
      },
      include: { school: true, academicYear: true },
    });

    return assignment;
  }

  // ─── Lister les professeurs non encore assignés (pour directeur) ──────────
  async findUnassignedTeachers(requester: JwtPayload) {
    const schoolId = this.resolveSchoolId(requester);

    const assignedTeacherIds = await this.prisma.teacherAssignment
      .findMany({ where: { schoolId, isActive: true }, select: { teacherId: true } })
      .then((a) => a.map((x) => x.teacherId));

    return this.prisma.teacher.findMany({
      where: { id: { notIn: assignedTeacherIds } },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  // ─── Helpers privés ───────────────────────────────────────────────────────

  private resolveSchoolId(requester: JwtPayload): string {
    if (requester.role === Role.SUPER_ADMIN) return requester.schoolId!;
    if (!requester.schoolId) {
      throw new ForbiddenException('Aucune école associée à votre compte');
    }
    return requester.schoolId;
  }

  private assertSameSchoolOrAdmin(
    resourceSchoolId: string | null,
    requester: JwtPayload,
  ): void {
    if (requester.role === Role.SUPER_ADMIN) return;
    if (resourceSchoolId !== requester.schoolId) {
      throw new ForbiddenException('Accès interdit : ressource hors de votre école');
    }
  }

  private generateDossier(): string {
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `DOS-${year}-${rand}`;
  }
}
