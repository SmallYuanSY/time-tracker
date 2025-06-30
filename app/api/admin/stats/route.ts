import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查用戶權限
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'WEB_ADMIN')) {
      return NextResponse.json({ error: '權限不足，只有管理員可以查看統計數據' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const userId = searchParams.get('userId')

    if (!start || !end) {
      return NextResponse.json({ error: '缺少時間範圍參數' }, { status: 400 })
    }

    const startDate = new Date(start)
    const endDate = new Date(end)

    // 構建查詢條件
    let userFilter = {}
    if (userId && userId !== 'all') {
      userFilter = { userId }
    }

    // 獲取所有員工
    const employees = await prisma.user.findMany({
      where: { 
        role: 'EMPLOYEE',
        ...(userId && userId !== 'all' ? { id: userId } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
      }
    })

    // 為每個員工計算統計數據
    const stats = await Promise.all(
      employees.map(async (employee) => {
        // 獲取工作記錄統計
        const workLogs = await prisma.workLog.findMany({
          where: {
            userId: employee.id,
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            startTime: true,
            endTime: true,
            projectCode: true,
          }
        })

        // 計算工作時數
        const totalWorkHours = workLogs.reduce((total, log) => {
          if (log.endTime) {
            const duration = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1000 * 60 * 60)
            return total + duration
          }
          return total
        }, 0)

        // 計算案件數量
        const uniqueProjects = new Set(workLogs.map(log => log.projectCode))
        const projectCount = uniqueProjects.size

        // 獲取最後活動時間
        const lastWorkLog = await prisma.workLog.findFirst({
          where: { userId: employee.id },
          orderBy: { startTime: 'desc' },
          select: { startTime: true }
        })

        const lastClockRecord = await prisma.clock.findFirst({
          where: { userId: employee.id },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true }
        })

        let lastActiveTime = null
        if (lastWorkLog && lastClockRecord) {
          lastActiveTime = lastWorkLog.startTime > lastClockRecord.timestamp 
            ? lastWorkLog.startTime.toISOString()
            : lastClockRecord.timestamp.toISOString()
        } else if (lastWorkLog) {
          lastActiveTime = lastWorkLog.startTime.toISOString()
        } else if (lastClockRecord) {
          lastActiveTime = lastClockRecord.timestamp.toISOString()
        }

        return {
          userId: employee.id,
          userName: employee.name || '',
          userEmail: employee.email,
          totalWorkLogs: workLogs.length,
          totalWorkHours: Math.round(totalWorkHours * 10) / 10, // 四捨五入到小數點後一位
          projectCount,
          lastActiveTime,
        }
      })
    )

    return NextResponse.json(stats)
  } catch (error) {
    console.error('獲取統計數據失敗:', error)
    return NextResponse.json({ error: '獲取統計數據失敗' }, { status: 500 })
  }
} 