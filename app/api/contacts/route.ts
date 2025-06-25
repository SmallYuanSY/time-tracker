import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 取得所有聯絡人
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const contacts = await prisma.contact.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        projects: {
          select: {
            id: true,
            code: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('[GET /api/contacts]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 新增聯絡人
export async function POST(req: NextRequest) {
  try {
    const { companyName, address, phone, contactName, notes } = await req.json()

    if (!companyName || !address || !phone || !contactName) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const contact = await prisma.contact.create({
      data: {
        companyName,
        address,
        phone,
        contactName,
        notes: notes || null,
      },
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('[POST /api/contacts]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 