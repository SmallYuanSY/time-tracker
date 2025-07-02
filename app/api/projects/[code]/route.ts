import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type RouteParams = {
  params: Promise<{
    code: string
  }>
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { params } = context
    if (!(await params)?.code) {
      return new NextResponse('Project code is required', { status: 400 })
    }

    const code = (await params).code

    // 先從 Project 表中查找
    let project = await prisma.project.findUnique({
      where: {
        code,
      },
      include: {
        Contact: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
    })

    if (!project) {
      // 如果在 Project 表中找不到，從 WorkLog 表中查找
      const workLog = await prisma.workLog.findFirst({
        where: { projectCode: code },
        orderBy: { startTime: 'desc' },
      })

      if (workLog) {
        // 從工作記錄創建一個新的 Project 記錄
        project = await prisma.project.create({
          data: {
            code: workLog.projectCode,
            name: workLog.projectName,
            category: workLog.category,
            managerId: workLog.userId,
            status: 'ACTIVE',
            description: '從工作記錄自動創建',
          },
          include: {
            Contact: true,
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
        })
      } else {
        return new NextResponse('Project not found', { status: 404 })
      }
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 