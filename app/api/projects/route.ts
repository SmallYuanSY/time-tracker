import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 獲取專案列表
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const projects = await prisma.project.findMany({
      include: {
        Contact: true,
      },
      orderBy: {
        code: 'asc',
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('[GET /api/projects]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 創建新案件
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { code, name, category, description } = await req.json()

    if (!code || !name) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    // 檢查案件是否已存在
    const existingProject = await prisma.project.findUnique({
      where: { code },
    })

    if (existingProject) {
      return new NextResponse('案件代號已存在', { status: 400 })
    }

    // 創建新專案
    const newProject = await prisma.project.create({
      data: {
        code,
        name,
        category: category || '',
        description: description || '',
        managerId: session.user.id,
        status: 'ACTIVE',
      },
      include: {
        Contact: true,
      },
    })

    return NextResponse.json(newProject)
  } catch (error) {
    console.error('[POST /api/projects]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 