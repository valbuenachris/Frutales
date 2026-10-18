export type UserRole = 'admin' | 'usuario';

/** Usuario autenticado (GET /api/auth/me). */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
}

export interface UserUpdateInput {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  active: boolean;
}
