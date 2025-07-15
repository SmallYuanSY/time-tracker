/**
 * API 請求管理器
 * 解決重複請求、快取管理、請求去重等問題
 */

interface CacheItem<T = any> {
  data: T
  timestamp: number
  expires: number
}

interface RequestOptions {
  ttl?: number // 快取存活時間（毫秒）
  force?: boolean // 強制重新請求
  dedupe?: boolean // 是否去重（預設 true）
}

class APIManager {
  private cache = new Map<string, CacheItem>()
  private pendingRequests = new Map<string, Promise<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5分鐘預設快取時間

  /**
   * 發送 API 請求，支援快取和去重
   */
  async request<T = any>(
    url: string, 
    options: RequestInit & RequestOptions = {}
  ): Promise<T> {
    const { ttl = this.defaultTTL, force = false, dedupe = true, ...fetchOptions } = options
    const cacheKey = this.getCacheKey(url, fetchOptions)

    // 檢查快取
    if (!force) {
      const cached = this.getFromCache<T>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 檢查是否有相同的請求正在進行
    if (dedupe && this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)
    }

    // 發送請求
    const requestPromise = this.executeRequest<T>(url, fetchOptions)
    
    if (dedupe) {
      this.pendingRequests.set(cacheKey, requestPromise)
    }

    try {
      const result = await requestPromise
      
      // 快取結果
      this.setCache(cacheKey, result, ttl)
      
      return result
    } catch (error) {
      // 請求失敗時不快取
      throw error
    } finally {
      // 清除待處理請求
      if (dedupe) {
        this.pendingRequests.delete(cacheKey)
      }
    }
  }

  /**
   * 執行實際的 HTTP 請求
   */
  private async executeRequest<T>(url: string, options: RequestInit): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 生成快取鍵
   */
  private getCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }

  /**
   * 從快取中獲取資料
   */
  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    // 檢查是否過期
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * 設定快取
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl,
    })
  }

  /**
   * 清除快取
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    // 根據模式清除快取
    const regex = new RegExp(pattern)
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 清除過期快取
   */
  cleanExpiredCache(): void {
    const now = Date.now()
    for (const [key, item] of this.cache) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 獲取快取統計
   */
  getCacheStats(): { size: number; expired: number } {
    const now = Date.now()
    let expired = 0
    
    for (const [, item] of this.cache) {
      if (now > item.expires) {
        expired++
      }
    }

    return {
      size: this.cache.size,
      expired,
    }
  }

  /**
   * 批量請求
   */
  async batchRequest<T = any>(
    requests: Array<{ url: string; options?: RequestInit & RequestOptions }>
  ): Promise<T[]> {
    return Promise.all(
      requests.map(({ url, options }) => this.request<T>(url, options))
    )
  }
}

// 專門的 API 方法
export class TimeTrackerAPI {
  private apiManager = new APIManager()

  /**
   * 獲取打卡狀態
   */
  async getClockStatus(userId: string, force = false): Promise<any> {
    return this.apiManager.request(`/api/clock?userId=${userId}`, {
      ttl: 30 * 1000, // 30秒快取
      force,
    })
  }

  /**
   * 獲取工作記錄
   */
  async getWorkLogs(params: {
    userId?: string
    date?: string
    projectCode?: string
    ongoing?: boolean
    overtime?: boolean
  }, force = false): Promise<any> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    return this.apiManager.request(`/api/worklog?${searchParams.toString()}`, {
      ttl: 2 * 60 * 1000, // 2分鐘快取
      force,
    })
  }

  /**
   * 獲取假日資訊
   */
  async getHolidayInfo(date: string, force = false): Promise<any> {
    return this.apiManager.request(`/api/holidays/${date}`, {
      ttl: 24 * 60 * 60 * 1000, // 24小時快取
      force,
    })
  }

  /**
   * 獲取工作時間設定
   */
  async getWorkTimeSettings(force = false): Promise<any> {
    return this.apiManager.request('/api/work-time-settings', {
      ttl: 10 * 60 * 1000, // 10分鐘快取
      force,
    })
  }

  /**
   * 獲取專案列表
   */
  async getProjects(params: { includeContacts?: boolean; search?: string; sort?: string } = {}, force = false): Promise<any> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    return this.apiManager.request(`/api/projects?${searchParams.toString()}`, {
      ttl: 5 * 60 * 1000, // 5分鐘快取
      force,
    })
  }

  /**
   * 清除特定類型的快取
   */
  clearCache(type?: 'clock' | 'worklog' | 'holiday' | 'settings' | 'projects'): void {
    if (!type) {
      this.apiManager.clearCache()
      return
    }

    const patterns = {
      clock: '/api/clock',
      worklog: '/api/worklog',
      holiday: '/api/holidays',
      settings: '/api/work-time-settings',
      projects: '/api/projects',
    }

    this.apiManager.clearCache(patterns[type])
  }

  /**
   * 獲取 API 統計
   */
  getStats() {
    return this.apiManager.getCacheStats()
  }
}

// 單例實例
export const timeTrackerAPI = new TimeTrackerAPI()

// 定期清理過期快取
if (typeof window !== 'undefined') {
  setInterval(() => {
    (timeTrackerAPI as any).apiManager.cleanExpiredCache()
  }, 5 * 60 * 1000) // 每5分鐘清理一次
} 