import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

type RouteParams = {
  params: Promise<{
    code: string
  }>
}

const projectInclude = {
  Contact: true,
  manager: {
    select: {
      id: true,
      name: true,
      email: true,
    }
  },
  userAssignments: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  }
} as const

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: typeof projectInclude
}>

type UserInfo = {
  id: string
  name: string | null
  email: string
}

interface ProjectResponse extends Omit<ProjectWithRelations, 'userAssignments'> {
  users: UserInfo[]
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
      include: projectInclude,
    }) as ProjectWithRelations | null

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
          include: projectInclude,
        }) as ProjectWithRelations
      } else {
        return new NextResponse('Project not found', { status: 404 })
      }
    }

    // 轉換回應格式
    const { userAssignments, ...projectData } = project
    const users: UserInfo[] = (userAssignments as any[]).map(assignment => ({
      id: assignment.user.id,
      name: assignment.user.name,
      email: assignment.user.email,
    }))
    const response: ProjectResponse = {
      ...projectData,
      users,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching project:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const body = await request.json()
    const { managerId } = body

    // 驗證管理者是否存在
    const manager = await prisma.user.findUnique({
      where: { id: managerId }
    })

    if (!manager) {
      return NextResponse.json(
        { error: '找不到指定的管理者' },
        { status: 404 }
      )
    }

    const { code } = await params

    // 更新專案管理者
    const updatedProject = await prisma.project.update({
      where: { code },
      data: { managerId },
      include: projectInclude
    }) as ProjectWithRelations

    // 轉換回應格式
    const { userAssignments, ...projectData } = updatedProject
    const users: UserInfo[] = (userAssignments as any[]).map(assignment => ({
      id: assignment.user.id,
      name: assignment.user.name,
      email: assignment.user.email,
    }))

    const response: ProjectResponse = {
      ...projectData,
      users,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: '更新專案失敗' },
      { status: 500 }
    )
  }
} 