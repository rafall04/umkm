import { Role } from "@/generated/prisma/enums";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: Role;
    villageId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      villageId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    villageId?: string | null;
  }
}
