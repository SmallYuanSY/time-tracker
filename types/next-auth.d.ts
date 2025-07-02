import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      employeeId: string
      role: UserRole
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    employeeId: string
    role: UserRole
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    employeeId: string
    role: UserRole
  }
} 