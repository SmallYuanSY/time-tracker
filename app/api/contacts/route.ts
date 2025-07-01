import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Contact, ContactType } from '@prisma/client'

// 定義聯絡人介面
interface ContactData {
  id: string
  companyName: string
  address: string
  phone: string
  contactName: string
  type: ContactType
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  Project?: {
    id: string
    code: string
    name: string
  }[]
}

// 取得所有聯絡人
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const contacts = await prisma.contact.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        Project: {
          select: {
            id: true,
            code: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: contacts
    })
  } catch (error) {
    console.error('[GET /api/contacts]', error)
    return NextResponse.json(
      { error: '取得聯絡人失敗' },
      { status: 500 }
    )
  }
}

// 新增聯絡人
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { companyName, address, phone, contactName, type, notes } = await req.json()

    if (!companyName || !address || !phone || !contactName) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const contact = await prisma.contact.create({
      data: {
        companyName,
        address,
        phone,
        contactName,
        notes: notes || undefined
      }
    })

    return NextResponse.json({
      success: true,
      data: contact
    })

  } catch (error) {
    console.error('[POST /api/contacts]', error)
    return NextResponse.json(
      { error: '新增聯絡人失敗' },
      { status: 500 }
    )
  }
} 