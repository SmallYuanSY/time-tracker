// 台灣時區處理工具庫 - 直接以台灣時間儲存
import { format } from 'date-fns'

// 台灣時區偏移（UTC+8）
const TAIWAN_OFFSET = 8 * 60 // 8小時，以分鐘計算

// 獲取當前時間（標準 UTC 儲存）
export function nowInTaiwan(): Date {
  return new Date()
}

// 將 UTC 時間轉換為台灣時間顯示
export function toTaiwanTime(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  return new Date(inputDate.getTime() + (TAIWAN_OFFSET * 60000))
}

// 創建台灣時間的日期（轉換為 UTC 儲存）
export function createTaiwanDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  // 創建台灣時間，然後轉換為 UTC 儲存
  const taiwanTime = new Date(year, month - 1, day, hour, minute, second)
  return new Date(taiwanTime.getTime() - (TAIWAN_OFFSET * 60000))
}

// 將台灣時間字符串轉換為 UTC Date 物件
export function parseTaiwanTime(timeString: string): Date {
  const inputDate = new Date(timeString)
  // 假設輸入是台灣時間，轉換為 UTC 儲存
  return new Date(inputDate.getTime() - (TAIWAN_OFFSET * 60000))
}

// 將時間格式化為台灣時間字符串（用於儲存）
export function formatForDatabase(date: Date): string {
  // 直接使用台灣時間格式，不轉換時區
  return date.toISOString().replace('Z', '+08:00')
}

// 格式化顯示時間
export function formatTaiwanTime(date: Date | string, formatStr: string): string {
  const taiwanDate = typeof date === 'string' ? new Date(date) : date
  return format(taiwanDate, formatStr)
}

// 獲取今天開始和結束的台灣時間
export function getTaiwanDayRange(date: Date = nowInTaiwan()): { start: Date, end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

// 設定環境變數以使用台灣時區
export function initializeTaiwanTimezone() {
  // 設定 Node.js 環境的時區
  process.env.TZ = 'Asia/Taipei'
} 