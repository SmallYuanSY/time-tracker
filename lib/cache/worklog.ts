import { WorkLogCache, WorkLogCacheManager } from '../types/worklog'

const CACHE_KEY = 'worklog_cache'

export class LocalWorkLogCacheManager implements WorkLogCacheManager {
  getCache(): WorkLogCache | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null
      
      const cache = JSON.parse(cached) as WorkLogCache
      return cache
    } catch (error) {
      console.error('讀取工作紀錄快取失敗:', error)
      return null
    }
  }

  setCache(cache: WorkLogCache): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.error('儲存工作紀錄快取失敗:', error)
    }
  }

  clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch (error) {
      console.error('清除工作紀錄快取失敗:', error)
    }
  }

  needsUpdate(latestLogTime: string): boolean {
    const cache = this.getCache()
    if (!cache) return true

    // 如果快取中沒有紀錄，需要更新
    if (!cache.logs.length) return true

    // 比較最新的工作紀錄時間
    const cachedLatestTime = Math.max(
      ...cache.logs.map(log => Math.max(
        new Date(log.updatedAt).getTime(),
        new Date(log.createdAt).getTime()
      ))
    )
    const newLatestTime = new Date(latestLogTime).getTime()

    return newLatestTime > cachedLatestTime
  }
}

// 建立單例實例
export const workLogCacheManager = new LocalWorkLogCacheManager() 