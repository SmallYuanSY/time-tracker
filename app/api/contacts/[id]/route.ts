import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 更新聯絡人
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { companyName, address, phone, contactName, notes } = await req.json()
    const { id } = params

    if (!companyName || !address || !phone || !contactName) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const contact = await prisma.contact.update({
      where: { id },
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
    console.error('[PUT /api/contacts/[id]]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 刪除聯絡人
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查是否有專案正在使用此聯絡人
    const projectsWithContact = await prisma.project.count({
      where: { contactId: id }
    })

    if (projectsWithContact > 0) {
      return new NextResponse('此聯絡人正被專案使用，無法刪除', { status: 400 })
    }

    await prisma.contact.delete({
      where: { id },
    })

    return new NextResponse('刪除成功', { status: 200 })
  } catch (error) {
    console.error('[DELETE /api/contacts/[id]]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 