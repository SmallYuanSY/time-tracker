import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 })
    }

  const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const ongoing = await prisma.workLog.findFirst({
      where: {
        userId,
        endTime: null,
        projectCode: 'OT',
      },
      orderBy: { startTime: 'desc' },
    })

    if (!ongoing) {
      return new NextResponse('No ongoing overtime', { status: 400 })
    }

    const result = await prisma.workLog.update({
      where: { id: ongoing.id },
      data: { endTime: new Date() },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/overtime/end]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
