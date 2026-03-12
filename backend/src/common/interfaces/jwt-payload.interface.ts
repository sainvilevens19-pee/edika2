import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: Role;
  schoolId: string | null;
}
