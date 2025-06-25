import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { contactIds } = await req.json()
    
    if (!Array.isArray(contactIds)) {
      return new NextResponse('contactIds must be an array', { status: 400 })
    }

    const { code } = params

    // 暫時使用第一個聯絡人ID，直到資料庫結構更新
    const contactId = contactIds.length > 0 ? contactIds[0] : null

    // 檢查聯絡人是否存在（如果有指定的話）
    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      })
      
      if (!contact) {
        return new NextResponse('聯絡人不存在', { status: 404 })
      }
    }

    // 檢查專案是否已存在
    let project = await prisma.project.findUnique({
      where: { code },
    })

    if (!project) {
      // 從工作記錄中獲取專案資訊
      const workLog = await prisma.workLog.findFirst({
        where: { projectCode: code },
        select: {
          projectCode: true,
          projectName: true,
          category: true,
          userId: true,
        },
      })

      if (!workLog) {
        return new NextResponse('案件不存在', { status: 404 })
      }

      // 建立專案記錄
      project = await prisma.project.create({
        data: {
          code: workLog.projectCode,
          name: workLog.projectName,
          category: workLog.category,
          managerId: workLog.userId,
          contactId,
        },
        include: {
          contact: true,
        },
      })
    } else {
      // 更新現有專案的聯絡人
      project = await prisma.project.update({
        where: { code },
        data: { contactId },
        include: {
          contact: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      project,
    })
  } catch (error) {
    console.error('[PUT /api/projects/[code]/assign-contact]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 