export type RoleName = 'Super Admin' | 'Content Manager' | 'Support Agent' | 'Accountant';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  roles: RoleName[];
}

export interface LoginPayload {
  email: string;
  password: string;
}
