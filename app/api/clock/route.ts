// app/api/clock/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getClientIP } from '@/lib/ip-utils'
import { nowInTaiwan, getTaiwanDayRange } from '@/lib/timezone'

// 檢查 IP 是否在白名單中
async function isIpWhitelisted(ipAddress: string): Promise<boolean> {
  try {
    const whitelistEntry = await prisma.ipWhitelist.findFirst({
      where: {
        ipAddress: ipAddress,
        isEnabled: true
      }
    })
    return !!whitelistEntry
  } catch (error) {
    console.error('Error checking IP whitelist:', error)
    return false // 如果檢查失敗，預設為非白名單
  }
}

// 獲取或創建預設專案
async function getDefaultProject(userId: string) {
  // 先查找是否有預設專案設定
  const defaultProject = await prisma.project.findFirst({
    where: {
      OR: [
        { code: 'DEFAULT' },
        { code: 'WORK' },
        { name: { contains: '一般工作' } },
      ]
    }
  })

  if (defaultProject) {
    return defaultProject
  }

  // 如果沒有預設專案，創建一個
  return await prisma.project.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      code: 'DEFAULT',
      name: '一般工作',
      category: '日常工作',
      description: '打卡自動創建的預設工作專案',
      managerId: userId,
      status: 'ACTIVE',
    }
  })
}

// 處理打卡後自動新增工作記錄
async function handleAutoWorkLog(
  userId: string, 
  type: 'IN' | 'OUT', 
  timestamp: Date
) {
  try {
    if (type === 'IN') {
      // 上班打卡：創建新的工作記錄
      const defaultProject = await getDefaultProject(userId)
      
      // 確保用戶是專案成員
      await prisma.$executeRaw`
        INSERT INTO ProjectToUser (projectId, userId, assignedAt)
        VALUES (${defaultProject.id}, ${userId}, datetime('now'))
        ON CONFLICT(projectId, userId) DO NOTHING
      `

      // 創建打卡工作記錄
      await prisma.workLog.create({
        data: {
          userId,
          startTime: timestamp,
          endTime: null, // 上班打卡時不設定結束時間
          projectCode: '00',
          projectName: '無案件編號',
          category: '其他',
          content: '電腦打卡',
          projectId: defaultProject.id,
          isOvertime: false,
        }
      })
    } else if (type === 'OUT') {
      // 下班打卡：不自動新增工作記錄
      // 下班打卡僅結束現有進行中的工作記錄（在主要邏輯中已處理）
      // 不再自動創建新的工作記錄
    }
  } catch (error) {
    console.error('自動新增工作記錄失敗:', error)
    // 不拋出錯誤，避免影響打卡功能
  }
}

// 發送 IP 檢核通知給管理員
async function sendIpReviewNotification(userId: string, ipAddress: string, type: 'IN' | 'OUT', timestamp: Date) {
  try {
    const { Novu } = await import('@novu/api')
    const novu = new Novu({
      secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY,
    })

    // 獲取用戶資訊
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    })

    if (!user) return

    // 獲取所有管理員
    const admins = await prisma.user.findMany({
      where: { 
        role: { in: ['ADMIN', 'WEB_ADMIN'] } 
      },
      select: { id: true }
    })

    const typeText = type === 'IN' ? '上班' : '下班'
    const timeText = timestamp.toLocaleString('zh-TW', { 
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    // 發送通知給所有管理員
    for (const admin of admins) {
      await novu.trigger({
        workflowId: 'projoin-notification',
        to: { subscriberId: `user_${admin.id}` },
        payload: {
          title: '非白名單 IP 打卡提醒',
          body: `${user.name || user.email} 於 ${timeText} 使用非白名單 IP ${ipAddress} 進行${typeText}打卡`,
          message: `用戶：${user.name || user.email}\n時間：${timeText}\n類型：${typeText}打卡\nIP 地址：${ipAddress}\n\n此 IP 地址不在白名單中，請檢核是否為正常打卡。`,
          tags: ['ip-review', 'admin-notification']
        }
      })
    }
  } catch (error) {
    console.error('發送 IP 檢核通知失敗:', error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, type, deviceInfo, editReason } = await req.json()

    if (!userId || !type) {
      return new NextResponse('Missing userId or type', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const ipAddress = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || ''

    // 獲取當前時間
    const now = nowInTaiwan()

    // 檢查 IP 是否在白名單中
    const ipWhitelisted = await isIpWhitelisted(ipAddress)
    const needsIpReview = !ipWhitelisted

    // 如果是下班打卡，需要先結算所有進行中的工作記錄
    if (type === 'OUT') {
      const { start: startOfToday } = getTaiwanDayRange(now)

      // 取得所有未結束且開始時間早於目前時間的工作記錄
      const ongoingWorkLogs = await prisma.workLog.findMany({
        where: {
          userId,
          endTime: null,
          startTime: { lte: now },
        },
      })

      if (ongoingWorkLogs.length > 0) {
        const { Novu } = await import('@novu/api')
        const novu = new Novu({
          secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY,
        })

        let needNotify = false

        for (const log of ongoingWorkLogs) {
          const limit = new Date(log.startTime)
          limit.setDate(limit.getDate() + 1)
          limit.setHours(8, 0, 0, 0)

          const endTime = now > limit ? limit : now

          if (log.startTime < startOfToday && now > limit) {
            needNotify = true
          }

          await prisma.workLog.update({
            where: { id: log.id },
            data: { endTime },
          })
        }

        if (needNotify) {
          try {
            await novu.trigger({
              workflowId: 'projoin-notification',
              to: { subscriberId: `user_${userId}` },
              payload: {
                title: '未打下班卡提醒',
                body: '您昨天忘記下班打卡，系統已自動將時間結算至早上 8 點。',
                message: '您昨天忘記下班打卡，系統已自動將時間結算至早上 8 點。',
              },
            })
          } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('發送未打卡通知失敗:', e)
            }
          }
        }

        if (process.env.NODE_ENV !== 'production') {
          //console.log(`下班打卡：自動結算了 ${ongoingWorkLogs.length} 個進行中的工作記錄`)
        }
      }
    }

    // 執行打卡記錄
    const result = await prisma.clock.create({
      data: {
        userId,
        type, // 必須為 "IN" 或 "OUT"
        ipAddress,
        macAddress: deviceInfo?.macAddress || null,
        userAgent,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        ipWhitelisted,
        needsIpReview,
        // 如果有修改原因，表示這是修改過時間的打卡
        ...(editReason && {
          isEdited: true,
          editReason: editReason.trim(),
          editedBy: userId,
          editedAt: new Date(),
          editIpAddress: ipAddress,
          originalTimestamp: new Date(), // 原始時間就是當前時間，因為是在打卡時修改的
        }),
      },
    })

    // 打卡後自動新增工作記錄
    await handleAutoWorkLog(userId, type, result.timestamp)

    // 如果是非白名單 IP 打卡，發送通知給管理員
    if (needsIpReview) {
      await sendIpReviewNotification(userId, ipAddress, type, result.timestamp)
    }

    return NextResponse.json(result)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[POST /api/clock]', error)
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 獲取今日日期範圍（台灣時間）
    const currentTime = nowInTaiwan()
    const { start: today } = getTaiwanDayRange(currentTime)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 獲取昨日日期範圍（用於跨日判斷）
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // 獲取今日的打卡記錄，按時間排序
    const todayClocks = await prisma.clock.findMany({
      where: {
        userId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    // 獲取昨日的打卡記錄（用於跨日判斷）
    const yesterdayClocks = await prisma.clock.findMany({
      where: {
        userId,
        timestamp: {
          gte: yesterday,
          lt: today,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    // 判斷當前狀態
    let clockedIn = false
    let lastClockIn = null
    let lastClockOut = null

    // 先從今日記錄中找最後的上班和下班（記錄已按時間倒序排列）
    for (const clock of todayClocks) {
      if (clock.type === 'IN' && !lastClockIn) {
        lastClockIn = clock  // 因為是倒序，第一個就是最後一次
      }
      if (clock.type === 'OUT' && !lastClockOut) {
        lastClockOut = clock  // 因為是倒序，第一個就是最後一次
      }
    }

    // 判斷當前時間
    const now = currentTime
    const hour = now.getHours()

    // 判斷當前是否為上班狀態
    if (lastClockIn && lastClockOut) {
      // 今日都有上班和下班記錄，比較時間
      clockedIn = lastClockIn.timestamp > lastClockOut.timestamp
    } else if (lastClockIn && !lastClockOut) {
      // 今日只有上班記錄，沒有下班記錄
      clockedIn = true
    } else if (!lastClockIn && !lastClockOut) {
      // 今日沒有任何打卡記錄
      // 如果現在是早上（0-8點），需要檢查昨天的狀態
      if (hour < 8) {
        // 檢查昨天最後的打卡記錄
        let yesterdayLastClockIn = null
        let yesterdayLastClockOut = null
        
        for (const clock of yesterdayClocks) {
          if (clock.type === 'IN' && !yesterdayLastClockIn) {
            yesterdayLastClockIn = clock
          }
          if (clock.type === 'OUT' && !yesterdayLastClockOut) {
            yesterdayLastClockOut = clock
          }
        }
        
                 // 如果昨天有上班但沒下班，可能還在上班狀態
         if (yesterdayLastClockIn && !yesterdayLastClockOut) {
           clockedIn = true
         } else if (yesterdayLastClockIn && yesterdayLastClockOut) {
           // 昨天都有記錄，比較時間
           clockedIn = new Date(yesterdayLastClockIn.timestamp) > new Date(yesterdayLastClockOut.timestamp)
         } else {
           // 昨天沒有記錄或只有下班記錄
           clockedIn = false
         }
      } else {
        // 白天或晚上，沒有打卡記錄就是下班狀態
        clockedIn = false
      }
    } else {
      // 今日只有下班記錄，沒有上班記錄
      clockedIn = false
    }

    return NextResponse.json({
      clockedIn,
      lastClockIn: lastClockIn?.timestamp || null,
      lastClockOut: lastClockOut?.timestamp || null,
      todayClocks,
      yesterdayClocks, // 提供昨日記錄供前端參考
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/clock]', error)
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
