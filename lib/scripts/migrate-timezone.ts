// 時區遷移腳本 - 將 UTC 時間轉換為台灣時間
import { PrismaClient } from '@prisma/client'
import { toTaiwanTime } from '../timezone'

const prisma = new PrismaClient()

interface MigrationStats {
  clocks: number
  workLogs: number
  overtimes: number
  leaveRequests: number
  scheduledWorks: number
}

async function migrateClockRecords(): Promise<number> {
  console.log('🕐 開始遷移打卡記錄...')
  
  const clocks = await prisma.clock.findMany()
  let updated = 0
  
  // 批次處理，每次處理 10 筆，避免超時
  const batchSize = 10
  for (let i = 0; i < clocks.length; i += batchSize) {
    const batch = clocks.slice(i, i + batchSize)
    
    // 序列處理每筆記錄，避免並發導致的資料庫鎖定
    for (const clock of batch) {
      try {
        // 將 UTC 時間轉換為台灣時間
        const taiwanTime = toTaiwanTime(clock.timestamp)
        const originalTimestamp = clock.originalTimestamp ? toTaiwanTime(clock.originalTimestamp) : null
        const editedAt = clock.editedAt ? toTaiwanTime(clock.editedAt) : null
        
        await prisma.clock.update({
          where: { id: clock.id },
          data: {
            timestamp: taiwanTime,
            originalTimestamp,
            editedAt,
          }
        })
        updated++
      } catch (error) {
        console.error(`   ❌ 處理打卡記錄 ${clock.id} 失敗:`, error)
      }
    }
    
    console.log(`   已處理 ${updated}/${clocks.length} 筆打卡記錄`)
    
    // 每批次之間稍作暫停，避免資料庫負載過重
    if (i + batchSize < clocks.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  console.log(`✅ 打卡記錄遷移完成: ${updated} 筆`)
  return updated
}

async function migrateWorkLogs(): Promise<number> {
  console.log('📝 開始遷移工作記錄...')
  
  const workLogs = await prisma.workLog.findMany()
  let updated = 0
  
  // 批次處理，每次處理 50 筆
  const batchSize = 50
  for (let i = 0; i < workLogs.length; i += batchSize) {
    const batch = workLogs.slice(i, i + batchSize)
    
    await Promise.all(batch.map(async (log) => {
      const startTime = toTaiwanTime(log.startTime)
      const endTime = log.endTime ? toTaiwanTime(log.endTime) : null
      const originalStartTime = log.originalStartTime ? toTaiwanTime(log.originalStartTime) : null
      const originalEndTime = log.originalEndTime ? toTaiwanTime(log.originalEndTime) : null
      const editedAt = log.editedAt ? toTaiwanTime(log.editedAt) : null
      
      await prisma.workLog.update({
        where: { id: log.id },
        data: {
          startTime,
          endTime,
          originalStartTime,
          originalEndTime,
          editedAt,
        }
      })
    }))
    
    updated += batch.length
    console.log(`   已處理 ${updated}/${workLogs.length} 筆工作記錄`)
  }
  
  console.log(`✅ 工作記錄遷移完成: ${updated} 筆`)
  return updated
}

async function migrateOvertimeRecords(): Promise<number> {
  console.log('⏰ 開始遷移加班記錄...')
  
  const overtimes = await prisma.overtime.findMany()
  let updated = 0
  
  for (const overtime of overtimes) {
    const startTime = toTaiwanTime(overtime.startTime)
    const endTime = overtime.endTime ? toTaiwanTime(overtime.endTime) : null
    const createdAt = toTaiwanTime(overtime.createdAt)
    const updatedAt = toTaiwanTime(overtime.updatedAt)
    
    await prisma.overtime.update({
      where: { id: overtime.id },
      data: {
        startTime,
        endTime,
        createdAt,
        updatedAt,
      }
    })
    updated++
  }
  
  console.log(`✅ 加班記錄遷移完成: ${updated} 筆`)
  return updated
}

async function migrateLeaveRequests(): Promise<number> {
  console.log('🏖️ 開始遷移請假記錄...')
  
  const leaves = await prisma.leaveRequest.findMany()
  let updated = 0
  
  for (const leave of leaves) {
    const startDate = toTaiwanTime(leave.startDate)
    const endDate = toTaiwanTime(leave.endDate)
    const createdAt = toTaiwanTime(leave.createdAt)
    const updatedAt = toTaiwanTime(leave.updatedAt)
    
    await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        startDate,
        endDate,
        createdAt,
        updatedAt,
      }
    })
    updated++
  }
  
  console.log(`✅ 請假記錄遷移完成: ${updated} 筆`)
  return updated
}

async function migrateScheduledWorks(): Promise<number> {
  console.log('📅 開始遷移預定工作...')
  
  const works = await prisma.scheduledWork.findMany()
  let updated = 0
  
  for (const work of works) {
    const scheduledStartDate = toTaiwanTime(work.scheduledStartDate)
    const scheduledEndDate = toTaiwanTime(work.scheduledEndDate)
    const createdAt = toTaiwanTime(work.createdAt)
    const updatedAt = toTaiwanTime(work.updatedAt)
    
    await prisma.scheduledWork.update({
      where: { id: work.id },
      data: {
        scheduledStartDate,
        scheduledEndDate,
        createdAt,
        updatedAt,
      }
    })
    updated++
  }
  
  console.log(`✅ 預定工作遷移完成: ${updated} 筆`)
  return updated
}

export async function runTimezoneMigration(): Promise<MigrationStats> {
  console.log('🌏 開始台灣時區遷移...')
  console.log('⚠️  注意：這個操作會永久修改資料庫中的時間資料')
  console.log('📋 建議在執行前先備份資料庫')
  console.log('')
  
  const stats: MigrationStats = {
    clocks: 0,
    workLogs: 0,
    overtimes: 0,
    leaveRequests: 0,
    scheduledWorks: 0,
  }
  
  try {
    // 不使用事務，逐步執行遷移以避免超時
    console.log('🔄 開始分步遷移...')
    
    stats.clocks = await migrateClockRecords()
    stats.workLogs = await migrateWorkLogs()
    stats.overtimes = await migrateOvertimeRecords()
    stats.leaveRequests = await migrateLeaveRequests()
    stats.scheduledWorks = await migrateScheduledWorks()
    
    console.log('')
    console.log('🎉 時區遷移完成！')
    console.log('📊 遷移統計:')
    console.log(`   - 打卡記錄: ${stats.clocks} 筆`)
    console.log(`   - 工作記錄: ${stats.workLogs} 筆`)
    console.log(`   - 加班記錄: ${stats.overtimes} 筆`)
    console.log(`   - 請假記錄: ${stats.leaveRequests} 筆`)
    console.log(`   - 預定工作: ${stats.scheduledWorks} 筆`)
    console.log(`   - 總計: ${Object.values(stats).reduce((a, b) => a + b, 0)} 筆`)
    
  } catch (error) {
    console.error('❌ 遷移失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
  
  return stats
}

// 如果直接執行這個檔案
if (require.main === module) {
  runTimezoneMigration()
    .then(() => {
      console.log('✨ 遷移腳本執行完畢')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 遷移腳本執行失敗:', error)
      process.exit(1)
    })
} 