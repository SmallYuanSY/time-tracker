"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Clock } from 'lucide-react'

interface WorkTimeSettings {
  normalWorkStart: string
  normalWorkEnd: string
  lunchBreakStart: string
  lunchBreakEnd: string
  overtimeStart: string
  minimumOvertimeUnit: number
}

export default function WorkTimeSettings() {
  const [settings, setSettings] = useState<WorkTimeSettings>({
    normalWorkStart: '09:00',
    normalWorkEnd: '18:00',
    lunchBreakStart: '12:30',
    lunchBreakEnd: '13:30',
    overtimeStart: '18:00',
    minimumOvertimeUnit: 30
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // 載入設定
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/work-time-settings')
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error('載入工作時間設定失敗:', error)
        toast({
          title: '錯誤',
          description: '載入工作時間設定失敗',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  // 儲存設定
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      const response = await fetch('/api/admin/work-time-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast({
          title: '成功',
          description: '工作時間設定已更新'
        })
      } else {
        throw new Error('儲存失敗')
      }
    } catch (error) {
      console.error('儲存工作時間設定失敗:', error)
      toast({
        title: '錯誤',
        description: '儲存工作時間設定失敗',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 處理輸入變更
  const handleChange = (field: keyof WorkTimeSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({
      ...prev,
      [field]: field === 'minimumOvertimeUnit' ? parseInt(e.target.value) : e.target.value
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          工作時間設定
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-white/60">正常上班時間</label>
              <Input
                type="time"
                value={settings.normalWorkStart}
                onChange={handleChange('normalWorkStart')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-white/60">正常下班時間</label>
              <Input
                type="time"
                value={settings.normalWorkEnd}
                onChange={handleChange('normalWorkEnd')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-white/60">午休開始時間</label>
              <Input
                type="time"
                value={settings.lunchBreakStart}
                onChange={handleChange('lunchBreakStart')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-white/60">午休結束時間</label>
              <Input
                type="time"
                value={settings.lunchBreakEnd}
                onChange={handleChange('lunchBreakEnd')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-white/60">加班開始時間</label>
              <Input
                type="time"
                value={settings.overtimeStart}
                onChange={handleChange('overtimeStart')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-white/60">最小加班計算單位（分鐘）</label>
              <Input
                type="number"
                min="1"
                max="60"
                value={settings.minimumOvertimeUnit}
                onChange={handleChange('minimumOvertimeUnit')}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              儲存設定
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 