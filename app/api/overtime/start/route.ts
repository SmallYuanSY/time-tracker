import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 })
    }

    const session = await getServerSession()
    if (!session?.user?.id || session.user.id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const result = await prisma.workLog.create({
      data: {
        userId,
        startTime: new Date(),
        projectCode: 'OT',
        projectName: 'Overtime',
        category: 'overtime',
        content: '加班',
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/overtime/start]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
