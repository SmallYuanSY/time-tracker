/**
 * 工作狀態管理器
 * 使用事件驅動模式，只在狀態真正變化時觸發更新
 */

type WorkStatusEvent = 
  | 'CLOCK_IN' 
  | 'CLOCK_OUT' 
  | 'WORKLOG_START' 
  | 'WORKLOG_END' 
  | 'OVERTIME_START' 
  | 'OVERTIME_END'
  | 'SESSION_CHANGE'
  | 'TIME_PERIOD_CHANGE' // 例如進入加班時段

type WorkStatusListener = () => void | Promise<void>

interface WorkStatus {
  clockedIn: boolean
  hasOngoingWork: boolean
  hasOngoingOvertime: boolean
  isOvertimePeriod: boolean
  lastUpdate: Date
}

class WorkStatusManager {
  private listeners = new Map<WorkStatusEvent, Set<WorkStatusListener>>()
  private currentStatus: WorkStatus = {
    clockedIn: false,
    hasOngoingWork: false,
    hasOngoingOvertime: false,
    isOvertimePeriod: false,
    lastUpdate: new Date()
  }
  
  private timePeriodCheckInterval: NodeJS.Timeout | null = null
  private lastHour = -1

  constructor() {
    // 只保留檢查時段變化的定時器（例如是否進入加班時段）
    this.startTimePeriodCheck()
  }

  /**
   * 訂閱狀態變化事件
   */
  subscribe(event: WorkStatusEvent, listener: WorkStatusListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)

    // 返回取消訂閱函數
    return () => {
      this.listeners.get(event)?.delete(listener)
    }
  }

  /**
   * 觸發事件
   */
  private async emit(event: WorkStatusEvent) {
    const listeners = this.listeners.get(event)
    if (listeners) {
      const promises = Array.from(listeners).map(listener => {
        try {
          return Promise.resolve(listener())
        } catch (error) {
          console.error(`Error in work status listener for ${event}:`, error)
          return Promise.resolve()
        }
      })
      await Promise.all(promises)
    }
  }

  /**
   * 更新工作狀態並觸發相應事件
   */
  async updateStatus(updates: Partial<WorkStatus>) {
    const oldStatus = { ...this.currentStatus }
    this.currentStatus = {
      ...this.currentStatus,
      ...updates,
      lastUpdate: new Date()
    }

    // 檢查狀態變化並觸發對應事件
    if (oldStatus.clockedIn !== this.currentStatus.clockedIn) {
      await this.emit(this.currentStatus.clockedIn ? 'CLOCK_IN' : 'CLOCK_OUT')
    }

    if (oldStatus.hasOngoingWork !== this.currentStatus.hasOngoingWork) {
      await this.emit(this.currentStatus.hasOngoingWork ? 'WORKLOG_START' : 'WORKLOG_END')
    }

    if (oldStatus.hasOngoingOvertime !== this.currentStatus.hasOngoingOvertime) {
      await this.emit(this.currentStatus.hasOngoingOvertime ? 'OVERTIME_START' : 'OVERTIME_END')
    }

    if (oldStatus.isOvertimePeriod !== this.currentStatus.isOvertimePeriod) {
      await this.emit('TIME_PERIOD_CHANGE')
    }
  }

  /**
   * 獲取當前狀態
   */
  getStatus(): WorkStatus {
    return { ...this.currentStatus }
  }

  /**
   * 手動觸發狀態檢查（用於使用者操作後）
   */
  async refreshStatus(userId: string) {
    try {
      // 使用 API 管理器獲取最新狀態
      const { timeTrackerAPI } = await import('./api-manager')
      
      const [clockData, overtimeData] = await Promise.all([
        timeTrackerAPI.getClockStatus(userId, true), // force refresh
        timeTrackerAPI.getWorkLogs({ userId, ongoing: true, overtime: true }, true)
      ])

      const flattenedOvertimeLogs = overtimeData.flatMap((group: any) => group.logs || [])
      const hasOngoingOvertime = flattenedOvertimeLogs.some((log: any) => !log.endTime && log.isOvertime)
      const hasOngoingWork = flattenedOvertimeLogs.some((log: any) => !log.endTime && !log.isOvertime)

      await this.updateStatus({
        clockedIn: clockData.clockedIn,
        hasOngoingWork,
        hasOngoingOvertime,
        isOvertimePeriod: this.checkIsOvertimePeriod()
      })
    } catch (error) {
      console.error('Failed to refresh work status:', error)
    }
  }

  /**
   * 會話變化時觸發
   */
  async onSessionChange(userId: string | null) {
    if (userId) {
      await this.refreshStatus(userId)
    } else {
      // 使用者登出，重置狀態
      await this.updateStatus({
        clockedIn: false,
        hasOngoingWork: false,
        hasOngoingOvertime: false,
        isOvertimePeriod: false
      })
    }
    await this.emit('SESSION_CHANGE')
  }

  /**
   * 檢查是否為加班時段
   */
  private checkIsOvertimePeriod(): boolean {
    const hour = new Date().getHours()
    return hour >= 18 || hour < 6
  }

  /**
   * 啟動時段檢查（輕量級，只檢查小時變化）
   */
  private startTimePeriodCheck() {
    // 每10分鐘檢查一次時段變化（而不是每分鐘）
    this.timePeriodCheckInterval = setInterval(() => {
      const currentHour = new Date().getHours()
      
      // 只在小時變化時檢查
      if (this.lastHour !== currentHour) {
        const wasOvertimePeriod = this.currentStatus.isOvertimePeriod
        const isOvertimePeriod = this.checkIsOvertimePeriod()
        
        if (wasOvertimePeriod !== isOvertimePeriod) {
          this.updateStatus({ isOvertimePeriod })
        }
        
        this.lastHour = currentHour
      }
    }, 10 * 60 * 1000) // 10分鐘檢查一次，而不是每分鐘
  }

  /**
   * 清理資源
   */
  destroy() {
    if (this.timePeriodCheckInterval) {
      clearInterval(this.timePeriodCheckInterval)
      this.timePeriodCheckInterval = null
    }
    this.listeners.clear()
  }
}

// 專門用於打卡相關的輔助函數
export class PunchEventEmitter {
  private static instance: WorkStatusManager | null = null

  static getInstance(): WorkStatusManager {
    if (!this.instance) {
      this.instance = new WorkStatusManager()
    }
    return this.instance
  }

  // 打卡事件
  static async emitClockIn(userId: string) {
    const manager = this.getInstance()
    await manager.updateStatus({ clockedIn: true })
    await manager.refreshStatus(userId) // 獲取最新的工作狀態
  }

  static async emitClockOut(userId: string) {
    const manager = this.getInstance()
    await manager.updateStatus({ clockedIn: false })
    await manager.refreshStatus(userId)
  }

  // 工作記錄事件
  static async emitWorkLogStart(userId: string) {
    const manager = this.getInstance()
    await manager.updateStatus({ hasOngoingWork: true })
    await manager.refreshStatus(userId)
  }

  static async emitWorkLogEnd(userId: string) {
    const manager = this.getInstance()
    await manager.refreshStatus(userId) // 重新檢查是否還有其他進行中的工作
  }

  // 加班事件
  static async emitOvertimeStart(userId: string) {
    const manager = this.getInstance()
    await manager.updateStatus({ hasOngoingOvertime: true })
    await manager.refreshStatus(userId)
  }

  static async emitOvertimeEnd(userId: string) {
    const manager = this.getInstance()
    await manager.refreshStatus(userId)
  }

  // 會話變化
  static async emitSessionChange(userId: string | null) {
    const manager = this.getInstance()
    await manager.onSessionChange(userId)
  }
}

export default WorkStatusManager
export { WorkStatusManager } 