import type { AppRole } from "@/lib/auth/roles";

export type UserContext = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  isActive: boolean;
};

export type ManagedUser = UserContext & {
  createdAt: string;
  updatedAt: string;
};
