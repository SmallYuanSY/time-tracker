// app/api/worklog/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getClientIP } from '@/lib/ip-utils'
import { nowInTaiwan, getTaiwanDayRange, parseTaiwanTime } from '@/lib/timezone'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /api/worklog] 收到的資料:', body)
    }

    const {
      userId,
      startTime,
      endTime,
      projectCode,
      projectName,
      category,
      content,
      isClockMode,
      clockEditReason,
      isOvertime,
    } = body

    if (
      !userId || !startTime ||
      !projectCode || !projectName || !category || !content
    ) {
      const missingFields = []
      if (!userId) missingFields.push('userId')
      if (!startTime) missingFields.push('startTime')
      if (!projectCode) missingFields.push('projectCode')
      if (!projectName) missingFields.push('projectName')
      if (!category) missingFields.push('category')
      if (!content) missingFields.push('content')
      
      if (process.env.NODE_ENV !== 'production') {
        console.error('[POST /api/worklog] 缺少必要欄位:', missingFields)
      }
      return new NextResponse(`缺少必要欄位: ${missingFields.join(', ')}`, { status: 400 })
    }

    // 驗證日期格式（使用台灣時間）
    const startDate = parseTaiwanTime(startTime)
    const endDate = endTime ? parseTaiwanTime(endTime) : null
    
    if (isNaN(startDate.getTime())) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[POST /api/worklog] 無效的開始時間:', startTime)
      }
      return new NextResponse('無效的開始時間格式', { status: 400 })
    }
    
    if (endTime && isNaN(endDate!.getTime())) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[POST /api/worklog] 無效的結束時間:', endTime)
      }
      return new NextResponse('無效的結束時間格式', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 時間衝突檢查
    if (endDate) {
      // 查找與新時間區間有衝突的工作記錄
      const conflictingLogs = await prisma.workLog.findMany({
        where: {
          userId,
          OR: [
            // 現有記錄的開始時間在新記錄時間範圍內
            {
              startTime: {
                gte: startDate,
                lt: endDate,
              },
            },
            // 現有記錄的結束時間在新記錄時間範圍內
            {
              endTime: {
                gt: startDate,
                lte: endDate,
              },
            },
            // 現有記錄完全包含新記錄
            {
              startTime: {
                lte: startDate,
              },
              endTime: {
                gte: endDate,
              },
            },
            // 現有記錄跨越新記錄開始時間（進行中的記錄）
            {
              startTime: {
                lt: endDate,
              },
              endTime: null,
            },
          ],
        },
      })

      // 如果有衝突，返回衝突資訊讓前端確認
      if (conflictingLogs.length > 0) {
        const conflictDetails = conflictingLogs.map(log => {
          let action = ''
          if (!log.endTime) {
            action = `結束時間設為 ${startDate.toTimeString().slice(0, 5)}`
          } else if (log.startTime < startDate && log.endTime > endDate) {
            action = `分割為兩段：${log.startTime.toTimeString().slice(0, 5)}-${startDate.toTimeString().slice(0, 5)} 和 ${endDate.toTimeString().slice(0, 5)}-${log.endTime.toTimeString().slice(0, 5)}`
          } else if (log.startTime < startDate) {
            action = `縮短結束時間至 ${startDate.toTimeString().slice(0, 5)}`
          } else if (log.endTime > endDate) {
            action = `調整開始時間至 ${endDate.toTimeString().slice(0, 5)}`
          } else {
            action = '完全刪除'
          }
          
          return {
            id: log.id,
            projectCode: log.projectCode,
            projectName: log.projectName,
            category: log.category,
            content: log.content,
            startTime: log.startTime.toTimeString().slice(0, 5),
            endTime: log.endTime ? log.endTime.toTimeString().slice(0, 5) : '進行中',
            action
          }
        })

        return NextResponse.json({
          conflicts: conflictDetails,
          message: '檢測到時間衝突，需要確認處理方式'
        }, { status: 409 })
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /api/worklog] 嘗試建立工作記錄...')
      console.log('[POST /api/worklog] startDate:', startDate)
      console.log('[POST /api/worklog] endDate:', endDate)
    }

    // 使用資料庫事務來確保工作記錄和案件記錄都能成功創建
    const result = await prisma.$transaction(async (tx) => {
      // 首先檢查案件是否已存在於 Project 表中
      let project = await tx.project.findUnique({
        where: { code: projectCode },
      })

      // 如果案件不存在，創建新案件記錄
      if (!project) {
        try {
          project = await tx.project.create({
            data: {
              code: projectCode,
              name: projectName,
              category: category || '',
              description: `從工作記錄自動創建 - ${content}`,
              managerId: userId,
              status: 'ACTIVE',
            },
          })
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('[POST /api/worklog] 自動創建案件記錄:', project.code)
          }
        } catch (error) {
          // 如果創建案件失敗（可能是並發創建），重新查詢
          project = await tx.project.findUnique({
            where: { code: projectCode },
          })
          
          if (!project) {
            throw error // 如果仍然找不到，拋出原始錯誤
          }
        }
      }

      // 創建工作記錄，並關聯到 Project
      const workLogResult = await tx.workLog.create({
        data: {
          userId,
          startTime: startDate,
          endTime: endDate as any,
          projectCode,
          projectName,
          category,
          content,
          projectId: project.id, // 關聯到 Project 記錄
          isOvertime: isOvertime || false, // 標記是否為加班記錄
        },
      })

      // 如果是打卡模式，創建打卡記錄
      if (isClockMode) {
        // 創建打卡記錄，使用工作記錄的開始時間
        const clockData: any = {
          userId,
          type: 'IN',
          timestamp: startDate, // 直接使用用戶指定的時間
          ipAddress: getClientIP(req),
          userAgent: req.headers.get('user-agent') || '',
        }

        // 如果有修改原因，標記為已編輯並記錄原始時間
        if (clockEditReason) {
          clockData.isEdited = true
          clockData.editReason = clockEditReason.trim()
          clockData.editedBy = userId
          clockData.editedAt = new Date()
          clockData.editIpAddress = getClientIP(req)
          clockData.originalTimestamp = new Date() // 原始時間設為當前真實時間
        }

        const clockRecord = await tx.clock.create({
          data: clockData,
        })

        if (process.env.NODE_ENV !== 'production') {
          console.log('[POST /api/worklog] 創建打卡記錄，時間:', startDate.toISOString())
        }
      }

      return workLogResult
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /api/worklog] 成功建立工作記錄:', result.id)
    }
    return NextResponse.json(result)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[POST /api/worklog] 錯誤詳情:', error)
    }
    
    // 更具體的錯誤處理
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return new NextResponse('資料重複錯誤', { status: 409 })
      }
      if (error.message.includes('Foreign key constraint')) {
        return new NextResponse('用戶不存在', { status: 400 })
      }
      return new NextResponse(`資料庫錯誤: ${error.message}`, { status: 500 })
    }
    
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const dateStr = searchParams.get('date') // 格式應為 YYYY-MM-DD
    const fromStr = searchParams.get('from') // ISO 字串
    const toStr = searchParams.get('to') // ISO 字串
    const ongoingOnly = searchParams.get('ongoing') === 'true'
    const overtimeOnly = searchParams.get('overtime') === 'true'

    if (!userId) {
      return new NextResponse('缺少 userId', { status: 400 })
    }

    // 建立查詢條件
    const whereConditions: any = {
      userId,
    }

    // 如果不是只查詢進行中記錄，需要時間範圍
    if (!ongoingOnly) {
      let startDate: Date
      let endDate: Date

      // 支援兩種查詢模式：按日期 或 按時間範圍（使用台灣時間）
      if (fromStr && toStr) {
        // 使用 from/to 範圍查詢
        startDate = parseTaiwanTime(fromStr)
        endDate = parseTaiwanTime(toStr)
      } else if (dateStr) {
        // 使用日期查詢（向後兼容）
        const targetDate = parseTaiwanTime(dateStr)
        const { start, end } = getTaiwanDayRange(targetDate)
        startDate = start
        endDate = end
      } else {
        return new NextResponse('缺少 date 或 from/to 參數', { status: 400 })
      }

      // 添加時間範圍條件
      whereConditions.startTime = {
        gte: startDate,
        lt: endDate,
      }
    }

    // 如果只要進行中的記錄（沒有結束時間）
    if (ongoingOnly) {
      whereConditions.endTime = null
    }

    // 如果只要加班記錄
    if (overtimeOnly) {
      whereConditions.isOvertime = true
    }

    const results = await prisma.workLog.findMany({
      where: whereConditions,
      orderBy: {
        startTime: 'desc',
      },
    })

    return NextResponse.json(results)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/worklog]', error)
    }
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}
