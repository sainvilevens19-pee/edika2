export type Role =
  | 'SUPER_ADMIN'
  | 'DIRECTOR'
  | 'CENSOR'
  | 'SECRETARY'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT';

export interface School {
  id: string;
  name: string;
  code: string;
  logo?: string;
}

export interface TeacherAssignment {
  id: string;
  school: { id: string; name: string; code: string };
  academicYear: { id: string; label: string; isCurrent: boolean };
  isActive: boolean;
}

export interface ChildLink {
  student: {
    id: string;
    dossierNumber: string;
    user: { firstName: string; lastName: string };
    school: { id: string; name: string };
  };
  relationship: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: Role;
  isActive: boolean;
  school?: School | null;
  teacherProfile?: {
    id: string;
    specialization?: string;
    assignments: TeacherAssignment[];
  } | null;
  parentProfile?: {
    id: string;
    children: ChildLink[];
  } | null;
  studentProfile?: {
    dossierNumber: string;
  } | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface ApiError {
  message: string | string[];
  statusCode: number;
}
