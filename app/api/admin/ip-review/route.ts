import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'

// 檢查管理員權限
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const role = session.user.role as UserRole
  return role === UserRole.ADMIN || role === UserRole.WEB_ADMIN
}

// 獲取需要 IP 檢核的打卡記錄
export async function GET(req: NextRequest) {
  try {
    const hasPermission = await checkAdminPermission()
    if (!hasPermission) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // 獲取需要檢核的打卡記錄
    const clockRecords = await prisma.clock.findMany({
      where: {
        needsIpReview: true,
        ipReviewed: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      skip,
      take: limit
    })

    // 獲取總數
    const total = await prisma.clock.count({
      where: {
        needsIpReview: true,
        ipReviewed: false
      }
    })

    return NextResponse.json({
      records: clockRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching IP review records:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// 標記 IP 檢核記錄為已審核
export async function POST(req: NextRequest) {
  try {
    const hasPermission = await checkAdminPermission()
    if (!hasPermission) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const session = await getServerSession(authOptions)
    const { clockId, reviewNote } = await req.json()

    if (!clockId) {
      return new NextResponse('Clock ID is required', { status: 400 })
    }

    const updatedRecord = await prisma.clock.update({
      where: { id: clockId },
      data: {
        ipReviewed: true,
        ipReviewedBy: (session?.user as any).id,
        ipReviewedAt: new Date(),
        ipReviewNote: reviewNote || null
      }
    })

    return NextResponse.json(updatedRecord)
  } catch (error) {
    console.error('Error updating IP review record:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}