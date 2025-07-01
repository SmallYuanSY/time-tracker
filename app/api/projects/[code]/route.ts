import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type RouteParams = {
  params: {
    code: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: {
        code: params.code,
      },
      include: {
        Contact: true,
        manager: true,
        users: true,
      },
    })

    if (!project) {
      return new NextResponse('Project not found', { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 