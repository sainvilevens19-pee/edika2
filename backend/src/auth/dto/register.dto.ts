import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

// Rôles autorisés à s'auto-inscrire
const SELF_REGISTER_ROLES = [Role.PARENT, Role.TEACHER] as const;
export type SelfRegisterRole = typeof SELF_REGISTER_ROLES[number];

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
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

  @IsEnum(SELF_REGISTER_ROLES, {
    message: `Seuls les rôles PARENT et TEACHER peuvent s'auto-inscrire`,
  })
  role!: SelfRegisterRole;

  // Professeur uniquement
  @IsOptional()
  @IsString()
  specialization?: string;

  // Parent uniquement — numéros de dossier des enfants à lier immédiatement
  @IsOptional()
  @IsString({ each: true })
  childrenDossiers?: string[];
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
