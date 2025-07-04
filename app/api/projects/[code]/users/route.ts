import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Props = {
  params: Promise<{
    code: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    // 等待 params
    const { code } = await params

    // 直接通過關聯查詢獲取專案成員
    const project = await prisma.project.findUnique({
      where: { code },
      select: {
        userAssignments: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            assignedAt: true
          }
        }
      }
    })

    if (!project) {
      return new NextResponse('專案不存在', { status: 404 })
    }

    // 轉換資料格式
    const projectUsers = project.userAssignments.map(assignment => ({
      ...assignment.user,
      assignedAt: assignment.assignedAt
    }))

    return NextResponse.json(projectUsers)
  } catch (error) {
    console.error('[GET /api/projects/[code]/users]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 