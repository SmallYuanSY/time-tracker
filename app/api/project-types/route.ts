import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defaultProjectTypes } from '@/lib/data/projectTypes'

// 獲取所有案件類別
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const projectTypes = await prisma.projectType.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      projectTypes,
      count: projectTypes.length
    })
  } catch (error) {
    console.error('[GET /api/project-types]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// 新增案件類別
export async function POST(req: NextRequest) {
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

    const { typeId, name, description, color, icon, sortOrder } = await req.json()

    if (!typeId || !name) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // 檢查 typeId 是否已存在
    const existingType = await prisma.projectType.findUnique({
      where: { typeId }
    })

    if (existingType) {
      return NextResponse.json({ error: '案件類別 ID 已存在' }, { status: 400 })
    }

    const newProjectType = await prisma.projectType.create({
      data: {
        typeId,
        name,
        description: description || '',
        color: color || '#3B82F6',
        icon: icon || '📁',
        sortOrder: sortOrder || 0
      }
    })

    return NextResponse.json(newProjectType)
  } catch (error) {
    console.error('[POST /api/project-types]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// 更新案件類別
export async function PUT(req: NextRequest) {
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

    const { id, name, description, color, icon, sortOrder, isActive } = await req.json()

    if (!id || !name) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const updatedProjectType = await prisma.projectType.update({
      where: { id },
      data: {
        name,
        description: description || '',
        color: color || '#3B82F6',
        icon: icon || '📁',
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true
      }
    })

    return NextResponse.json(updatedProjectType)
  } catch (error) {
    console.error('[PUT /api/project-types]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}