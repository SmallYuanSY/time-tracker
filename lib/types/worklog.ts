export interface WorkLog {
  id: string
  userId: string
  projectCode: string
  projectName: string
  content: string
  category: string
  startTime: string
  endTime: string | null
  isOvertime: boolean
  user?: {
    id: string
    name: string | null
    email: string
    role: string
  }
}

export interface WorkLogCache {
  lastUpdated: string // ISO 字串
  logs: WorkLog[]
}

export interface WorkLogCacheManager {
  getCache(): WorkLogCache | null
  setCache(cache: WorkLogCache): void
  clearCache(): void
  needsUpdate(latestLogTime: string): boolean
} 