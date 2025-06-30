// 台灣時區處理工具庫 - 使用真實時間
import { format } from 'date-fns'

// 獲取當前真實時間
export function nowInTaiwan(): Date {
  return new Date()
}

// 直接返回原始時間（不再做時區轉換）
export function toTaiwanTime(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date
}

// 創建日期（使用真實時間）
export function createTaiwanDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  return new Date(year, month - 1, day, hour, minute, second)
}

// 解析時間字符串（不做時區轉換）
export function parseTaiwanTime(timeString: string): Date {
  return new Date(timeString)
}

// 格式化為資料庫儲存格式
export function formatForDatabase(date: Date): string {
  return date.toISOString()
}

// 格式化顯示時間
export function formatTaiwanTime(date: Date | string, formatStr: string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return format(targetDate, formatStr)
}

// 獲取今天開始和結束時間
export function getTaiwanDayRange(date: Date = nowInTaiwan()): { start: Date, end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

// 設定環境變數（保持現有行為）
export function initializeTaiwanTimezone() {
  // 設定 Node.js 環境的時區
  process.env.TZ = 'Asia/Taipei'
} 