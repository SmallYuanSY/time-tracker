"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Monitor, Smartphone, Globe, Clock } from 'lucide-react'

interface DeviceInfoDisplayProps {
  record: {
    id: string
    type: 'IN' | 'OUT'
    timestamp: string
    ipAddress?: string
    macAddress?: string
    userAgent?: string
    deviceInfo?: string
  }
}

export default function DeviceInfoDisplay({ record }: DeviceInfoDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!record.ipAddress && !record.macAddress && !record.userAgent) {
    return null
  }

  // 解析設備資訊
  let parsedDeviceInfo = null
  try {
    if (record.deviceInfo) {
      parsedDeviceInfo = JSON.parse(record.deviceInfo)
    }
  } catch (e) {
    // 忽略解析錯誤
  }

  // 簡化瀏覽器資訊顯示
  const getBrowserInfo = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return '未知瀏覽器'
  }

  // 判斷設備類型
  const getDeviceType = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return 'mobile'
    if (userAgent.includes('Tablet')) return 'tablet'
    return 'desktop'
  }

  const deviceType = record.userAgent ? getDeviceType(record.userAgent) : 'unknown'
  const browserInfo = record.userAgent ? getBrowserInfo(record.userAgent) : '未知'

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="text-white/60 hover:text-white text-xs p-1 h-auto"
      >
        <Shield className="w-3 h-3 mr-1" />
        {showDetails ? '隱藏' : '查看'}設備資訊
      </Button>
      
      {showDetails && (
        <Card className="mt-2 bg-black/20 border-white/10">
          <CardContent className="p-3 space-y-2">
            {/* IP 地址 */}
            {record.ipAddress && (
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-blue-400" />
                <span className="text-white/70 text-xs">IP:</span>
                <span className="text-white text-xs font-mono">{record.ipAddress}</span>
              </div>
            )}
            
            {/* MAC 地址 */}
            {record.macAddress && (
              <div className="flex items-center gap-2">
                <Monitor className="w-3 h-3 text-green-400" />
                <span className="text-white/70 text-xs">MAC:</span>
                <span className="text-white text-xs font-mono">{record.macAddress}</span>
              </div>
            )}
            
            {/* 設備類型 */}
            <div className="flex items-center gap-2">
              {deviceType === 'mobile' ? (
                <Smartphone className="w-3 h-3 text-purple-400" />
              ) : (
                <Monitor className="w-3 h-3 text-purple-400" />
              )}
              <span className="text-white/70 text-xs">設備:</span>
              <span className="text-white text-xs">
                {deviceType === 'mobile' ? '手機' : deviceType === 'tablet' ? '平板' : '電腦'} - {browserInfo}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 