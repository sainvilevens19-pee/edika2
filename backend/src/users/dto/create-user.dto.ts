import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  Matches,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

// Rôles qu'un DIRECTOR/SUPER_ADMIN peut créer directement
const ADMIN_CREATABLE_ROLES = [
  Role.DIRECTOR,
  Role.CENSOR,
  Role.SECRETARY,
  Role.STUDENT,
] as const;

export class CreateUserByAdminDto {
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mot de passe : 8 car. min, 1 maj, 1 min, 1 chiffre',
  })
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(ADMIN_CREATABLE_ROLES, {
    message: `Rôles autorisés : ${ADMIN_CREATABLE_ROLES.join(', ')}`,
  })
  role!: (typeof ADMIN_CREATABLE_ROLES)[number];

  // Pour STUDENT uniquement
  @IsOptional()
  @IsString()
  dossierNumber?: string;
}

export class LinkChildDto {
  @IsString()
  @IsNotEmpty()
  dossierNumber!: string;

  @IsOptional()
  @IsEnum(['FATHER', 'MOTHER', 'GUARDIAN', 'PARENT'])
  relationship?: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'PARENT';
}

export class AssignTeacherDto {
  @IsUUID()
  teacherId!: string;

  @IsUUID()
  schoolId!: string;

  @IsUUID()
  academicYearId!: string;
}
