import { ContactType } from '@prisma/client'

export interface User {
  id: string
  name: string | null
  email: string
}

export interface Contact {
  id: string
  companyName: string
  contactName: string
  phone: string
  address: string
  type: ContactType
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  code: string
  name: string
  description: string | null
  category: string
  status: string
  Contact: Contact | null
  manager: User
  users: User[]
} 