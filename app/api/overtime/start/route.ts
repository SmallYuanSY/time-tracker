import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, reason } = await req.json()

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 })
    }

  const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const result = await prisma.overtime.create({
      data: {
        userId,
        startTime: new Date(),
        reason: reason || '加班',
        status: 'PENDING',
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/overtime/start]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
