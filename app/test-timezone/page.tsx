"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { nowInTaiwan, formatTaiwanTime, getTaiwanDayRange, createTaiwanDate } from '@/lib/timezone'
import { useSession } from 'next-auth/react'

export default function TestTimezonePage() {
  const { data: session } = useSession()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [browserTime, setBrowserTime] = useState<Date | null>(null)

  const [dataCheck, setDataCheck] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null)

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(nowInTaiwan())
      setBrowserTime(new Date())
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const testDayRange = () => {
    const today = nowInTaiwan()
    const { start, end } = getTaiwanDayRange(today)
    console.log('今日範圍:', {
      start: start.toISOString(),
      end: end.toISOString()
    })
  }

  const testCreateDate = () => {
    const testDate = createTaiwanDate(2025, 1, 15, 9, 30, 0)
    console.log('創建的台灣時間:', testDate.toISOString())
    console.log('這在 Prisma Studio 中會顯示為: 2025-01-15 09:30:00')
  }

  const testCurrentTime = async () => {
    const taiwanNow = nowInTaiwan()
    console.log('台灣當前時間 (ISO):', taiwanNow.toISOString())
    console.log('這在 Prisma Studio 中會顯示台灣時間')
    
    // 模擬儲存到資料庫
    try {
      const response = await fetch('/api/test-save-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testTime: taiwanNow.toISOString() })
      })
      const result = await response.json()
      console.log('儲存結果:', result)
    } catch (error) {
      console.log('儲存測試失敗:', error)
    }
  }



  const checkData = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/check-data')
      const result = await response.json()
      setDataCheck(result)
    } catch (error) {
      console.error('檢查資料失敗:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const runMigration = async () => {
    setIsMigrating(true)
    setMigrationStatus(null)
    try {
      const response = await fetch('/api/migrate-timezone', { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        setMigrationStatus(result.message || '遷移成功')
      } else {
        setMigrationStatus('遷移失敗')
      }
    } catch (error) {
      console.error('遷移失敗:', error)
      setMigrationStatus('遷移失敗')
    } finally {
      setIsMigrating(false)
    }
  }

  if (!currentTime || !browserTime) {
    return <div>載入中...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🌏 台灣時區測試</h1>
        
        <div className="grid gap-6">
          {/* 時間比較 */}
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white">⏰ 時間比較</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-500/20 p-4 rounded-lg border border-green-400/30">
                  <h3 className="text-green-300 font-semibold mb-2">台灣時間 (我們的實現)</h3>
                  <p className="text-white text-lg font-mono">
                    {formatTaiwanTime(currentTime, 'yyyy/MM/dd HH:mm:ss (E)')}
                  </p>
                  <p className="text-green-200 text-sm mt-1">
                    ISO: {currentTime.toISOString()}
                  </p>
                </div>
                
                <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-400/30">
                  <h3 className="text-blue-300 font-semibold mb-2">瀏覽器本地時間</h3>
                  <p className="text-white text-lg font-mono">
                    {browserTime.toLocaleString('zh-TW', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      weekday: 'short'
                    })}
                  </p>
                  <p className="text-blue-200 text-sm mt-1">
                    ISO: {browserTime.toISOString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 時區資訊 */}
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white">📍 環境資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                <div>
                  <span className="text-white/60">瀏覽器時區:</span>
                  <p className="font-mono">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                </div>
                <div>
                  <span className="text-white/60">時區偏移:</span>
                  <p className="font-mono">{browserTime.getTimezoneOffset() / -60} 小時</p>
                </div>
                <div>
                  <span className="text-white/60">Node.js TZ:</span>
                  <p className="font-mono">{process.env.TZ || '未設定'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 測試功能 */}
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white">🧪 測試功能</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={testDayRange}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  測試日期範圍 (查看控制台)
                </Button>
                <Button 
                  onClick={testCreateDate}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  測試創建日期 (查看控制台)
                </Button>
                <Button 
                  onClick={testCurrentTime}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  測試當前時間儲存 (查看控制台)
                </Button>
                <Button 
                  onClick={checkData}
                  disabled={isChecking}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {isChecking ? '⏳ 檢查中...' : '🔍 檢查資料庫時間'}
                </Button>
              </div>
              
              {/* 時區遷移 */}
              <div className="space-y-3">
                <div className="border-t border-white/20 pt-4">
                  <h4 className="text-white font-semibold mb-2">🔄 舊資料遷移</h4>
                  <p className="text-white/60 text-sm mb-3">
                    將資料庫中的舊記錄從 UTC 時間轉換為台灣時間
                  </p>
                  
                  {/* 用戶狀態顯示 */}
                  {session?.user ? (
                    <div className="mb-3 p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
                      <p className="text-blue-200 text-sm">
                        👤 目前用戶：{(session.user as any).name || (session.user as any).email}
                      </p>
                      <p className="text-blue-200 text-sm">
                        🏷️ 用戶角色：{(session.user as any).role || 'EMPLOYEE'}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3 p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                      <p className="text-red-200 text-sm">❌ 請先登入</p>
                    </div>
                  )}
                  
                  {/* 遷移功能已移除 */}
                </div>
              </div>
              
              <div className="bg-yellow-500/20 p-4 rounded-lg border border-yellow-400/30">
                <h4 className="text-yellow-300 font-semibold mb-2">💡 說明</h4>
                <ul className="text-yellow-200 text-sm space-y-1">
                  <li>• 台灣時間應該是 UTC+8</li>
                  <li>• 如果兩個時間差 8 小時，表示實現正確</li>
                  <li>• 點擊按鈕可以在瀏覽器控制台查看詳細資訊</li>
                  <li>• 資料庫將直接儲存台灣時間，不再轉換時區</li>
                  <li>• ⚠️ 執行遷移前請務必備份資料庫</li>
                  <li>• 🔐 只有管理員可以執行遷移操作</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 資料檢查結果 */}
          {dataCheck && (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">🔍 資料庫時間檢查結果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 打卡記錄 */}
                {dataCheck.data.clocks.length > 0 && (
                  <div>
                    <h4 className="text-white font-semibold mb-2">最近的打卡記錄</h4>
                    <div className="space-y-2">
                      {dataCheck.data.clocks.map((clock: any) => (
                        <div key={clock.id} className="bg-black/30 p-3 rounded text-sm">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <span className="text-white">👤 {clock.user} ({clock.type})</span>
                            <span className="text-gray-300">原始: {clock.rawTimestamp}</span>
                            <span className="text-green-300">台灣: {clock.taiwanTime}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 工作記錄 */}
                {dataCheck.data.workLogs.length > 0 && (
                  <div>
                    <h4 className="text-white font-semibold mb-2">最近的工作記錄</h4>
                    <div className="space-y-2">
                      {dataCheck.data.workLogs.map((log: any) => (
                        <div key={log.id} className="bg-black/30 p-3 rounded text-sm">
                          <div className="mb-1">
                            <span className="text-white">👤 {log.user} - {log.projectCode}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-300">開始 原始: {log.rawStartTime}</span><br/>
                              <span className="text-green-300">開始 台灣: {log.taiwanStartTime}</span>
                            </div>
                            <div>
                              <span className="text-gray-300">結束 原始: {log.rawEndTime || '進行中'}</span><br/>
                              <span className="text-green-300">結束 台灣: {log.taiwanEndTime}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 