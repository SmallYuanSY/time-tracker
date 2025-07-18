import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 獲取特定案件類別
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const projectType = await prisma.projectType.findUnique({
      where: { id: params.id },
      include: {
        projects: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true
          }
        }
      }
    })

    if (!projectType) {
      return new NextResponse('Project type not found', { status: 404 })
    }

    return NextResponse.json(projectType)
  } catch (error) {
    console.error('[GET /api/project-types/[id]]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// 刪除案件類別
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查用戶權限
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'WEB_ADMIN')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // 檢查是否有關聯的專案
    const relatedProjects = await prisma.project.findMany({
      where: { projectTypeId: params.id },
      select: { id: true }
    })

    if (relatedProjects.length > 0) {
      // 如果有關聯的專案，改為停用而非刪除
      const updatedProjectType = await prisma.projectType.update({
        where: { id: params.id },
        data: { isActive: false }
      })

      return NextResponse.json({
        message: '案件類別已停用（因為有關聯的專案）',
        projectType: updatedProjectType
      })
    } else {
      // 如果沒有關聯專案，可以完全刪除
      await prisma.projectType.delete({
        where: { id: params.id }
      })

      return NextResponse.json({
        message: '案件類別已刪除'
      })
    }
  } catch (error) {
    console.error('[DELETE /api/project-types/[id]]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}