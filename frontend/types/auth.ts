export interface ApiMenu {
  id?: number;
  name?: string;
  label?: string;
  path?: string;
  icon?: string | null;
  order?: number;
}

export interface ApiRole {
  id: number;
  name: string;
  type?: string;
  description?: string | null;
  menus?: Array<{ menu: ApiMenu }>;
}

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
  institutionalId?: string | null;
  role: ApiRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: ApiUser;
}

export interface AuthSession {
  accessToken: string;
  user: ApiUser;
  menus: string[];
  roleLabel: string;
  avatar: string;
}
