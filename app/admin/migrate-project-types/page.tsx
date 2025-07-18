'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import { Database, Play, Eye, Check, AlertTriangle, Info } from 'lucide-react'

interface MigrationStats {
  totalProjects: number
  projectsWithCategory: number
  projectsWithProjectType: number
  projectsNeedingMigration: number
  totalProjectTypes: number
}

interface UniqueCategory {
  category: string
  count: number
}

interface MigrationStatus {
  stats: MigrationStats
  uniqueCategories: UniqueCategory[]
  migrationNeeded: boolean
  migrationComplete: boolean
}

interface MigrationResult {
  dryRun: boolean
  summary: {
    totalProjectsToMigrate: number
    uniqueCategories: number
    projectTypesCreated: number
    projectsUpdated: number
  }
  categoriesFound: string[]
  categoryMapping: Record<string, string>
  migrationDetails: any[]
  verificationResults?: any[]
}

export default function MigrateProjectTypesPage() {
  const { data: session } = useSession()
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 載入遷移狀態
  const loadMigrationStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/migrate-project-types')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  // 執行遷移
  const executeMigration = async (dryRun = false) => {
    try {
      setLoading(true)
      setError(null)
      setMigrationResult(null)
      
      const response = await fetch('/api/admin/migrate-project-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      const result = await response.json()
      setMigrationResult(result)
      
      // 如果是實際執行，重新載入狀態
      if (!dryRun) {
        await loadMigrationStatus()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '執行失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      loadMigrationStatus()
    }
  }, [session])

  // 權限檢查
  if (!session?.user || !((session.user as any).role === 'ADMIN' || (session.user as any).role === 'WEB_ADMIN')) {
    return (
      <div className="p-6">
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">權限不足</span>
          </div>
          <p className="text-red-600 mt-2">只有管理員和網頁管理員可以執行資料遷移</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">ProjectType 資料遷移</h1>
      </div>

      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="font-medium">關於此遷移</span>
        </div>
        <p>此工具將現有專案的 <code className="bg-blue-100 px-1 rounded">category</code> 欄位轉換為新的 <code className="bg-blue-100 px-1 rounded">ProjectType</code> 系統。</p>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">錯誤</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </Card>
      )}

      {/* 遷移狀態 */}
      {status && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">遷移狀態</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{status.stats.totalProjects}</div>
              <div className="text-sm text-gray-600">總專案數</div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{status.stats.projectsWithCategory}</div>
              <div className="text-sm text-gray-600">有舊分類的專案</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{status.stats.projectsWithProjectType}</div>
              <div className="text-sm text-gray-600">已有 ProjectType 的專案</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{status.stats.projectsNeedingMigration}</div>
              <div className="text-sm text-gray-600">需要遷移的專案</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{status.stats.totalProjectTypes}</div>
              <div className="text-sm text-gray-600">現有 ProjectType 數</div>
            </div>
          </div>

          {/* 遷移狀態指示器 */}
          <div className="flex items-center gap-2 mb-4">
            {status.migrationComplete ? (
              <>
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">遷移已完成</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-600 font-medium">需要執行遷移</span>
              </>
            )}
          </div>

          {/* 現有分類列表 */}
          {status.uniqueCategories.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">現有的專案分類</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {status.uniqueCategories.map((cat, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded flex justify-between items-center">
                    <span className="font-medium">{cat.category}</span>
                    <span className="text-sm text-gray-500">{cat.count} 個專案</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 操作按鈕 */}
      {status && status.migrationNeeded && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">執行遷移</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={() => executeMigration(true)}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {loading ? '預覽中...' : '預覽遷移 (Dry Run)'}
              </Button>
              
              <Button
                onClick={() => executeMigration(false)}
                disabled={loading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <Play className="h-4 w-4" />
                {loading ? '執行中...' : '執行遷移'}
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>• <strong>預覽遷移</strong>：只會顯示將要執行的操作，不會修改資料</p>
              <p>• <strong>執行遷移</strong>：實際執行資料遷移，此操作不可逆</p>
            </div>
          </div>
        </Card>
      )}

      {/* 遷移結果 */}
      {migrationResult && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            遷移結果 {migrationResult.dryRun && <span className="text-orange-600">(預覽模式)</span>}
          </h2>
          
          {/* 摘要 */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium mb-2">摘要</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">需要遷移的專案</div>
                <div className="text-gray-600">{migrationResult.summary.totalProjectsToMigrate}</div>
              </div>
              <div>
                <div className="font-medium">獨特分類數</div>
                <div className="text-gray-600">{migrationResult.summary.uniqueCategories}</div>
              </div>
              <div>
                <div className="font-medium">建立的 ProjectType</div>
                <div className="text-gray-600">{migrationResult.summary.projectTypesCreated}</div>
              </div>
              <div>
                <div className="font-medium">更新的專案</div>
                <div className="text-gray-600">{migrationResult.summary.projectsUpdated}</div>
              </div>
            </div>
          </div>

          {/* 分類對應 */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">分類對應</h3>
            <div className="space-y-2">
              {Object.entries(migrationResult.categoryMapping).map(([oldCategory, newTypeId]) => (
                <div key={oldCategory} className="bg-blue-50 p-2 rounded text-sm">
                  <span className="font-medium">{oldCategory}</span> → <span className="text-blue-600">ProjectType ID: {newTypeId}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 驗證結果 */}
          {migrationResult.verificationResults && (
            <div>
              <h3 className="font-medium mb-2">驗證結果</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {migrationResult.verificationResults.map((result, index) => (
                  <div key={index} className="bg-green-50 p-3 rounded text-sm">
                    <div className="font-medium">{result.projectCode} - {result.projectName}</div>
                    <div className="text-gray-600">
                      {result.oldCategory} → {result.newProjectType ? result.newProjectType.name : '未設定'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}