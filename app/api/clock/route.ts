// app/api/clock/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, type } = await req.json()

    if (!userId || !type) {
      return new NextResponse('Missing userId or type', { status: 400 })
    }

    const result = await prisma.clock.create({
      data: {
        userId,
        type, // 必須為 "IN" 或 "OUT"
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/clock]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
