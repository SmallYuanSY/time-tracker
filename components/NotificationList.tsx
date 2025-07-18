"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { Bell, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Novu } from "@novu/api"

interface Notification {
  id: string
  subject: string
  body: string
  seen: boolean
  read: boolean
  createdAt: string
  cta?: {
    type: string
    data: {
      url?: string
    }
  }
  payload?: any
}

interface NotificationListProps {
  onNotificationRead?: () => void
}

export default function NotificationList({ onNotificationRead }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { data: session } = useSession()

  const subscriberId = session?.user ? `user_${(session.user as any).id}` : null

  useEffect(() => {
    if (!subscriberId) return

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/novu-proxy?action=notifications&subscriberId=${subscriberId}&limit=20`)
        
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.data || [])
        }
      } catch (error) {
        console.error('獲取通知列表失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [subscriberId])

  const markAsRead = async (notificationId: string) => {
    try {
      const url = `/api/novu-proxy?action=markAsRead&subscriberId=${subscriberId}&notificationId=${notificationId}`;
      console.log('=== 客戶端發送 markAsRead 請求 ===');
      console.log('URL:', url);
      console.log('subscriberId:', subscriberId);
      console.log('notificationId:', notificationId);
      
      // 標記為已讀
      const response = await fetch(url);
      
      console.log('API 回應狀態:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API 回應數據:', result);
        
        // 本地更新狀態
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, seen: true, read: true }
              : notif
          )
        )
        onNotificationRead?.()
      } else {
        const errorText = await response.text();
        console.error('標記通知為已讀失敗:');
        console.error('  - 狀態:', response.status);
        console.error('  - 錯誤內容:', errorText);
      }
    } catch (error) {
      console.error('標記通知為已讀失敗:', error)
    }
  }

  const markAsSeen = async (notificationId: string) => {
    try {
      // 標記為已看見
      const response = await fetch(`/api/novu-proxy?action=markAsSeen&subscriberId=${subscriberId}&notificationId=${notificationId}`)
      
      if (response.ok) {
        // 本地更新狀態
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, seen: true }
              : notif
          )
        )
        onNotificationRead?.()
      } else {
        console.error('標記通知為已看見失敗:', response.status)
      }
    } catch (error) {
      console.error('標記通知為已看見失敗:', error)
    }
  }

  const getNotificationIcon = (notification: Notification) => {
    if (notification.read) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    if (notification.seen) {
      return <Clock className="w-4 h-4 text-yellow-500" />
    }
    return <Bell className="w-4 h-4 text-blue-500" />
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return '剛剛'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} 小時前`
    } else {
      return format(date, 'MM/dd HH:mm', { locale: zhTW })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div>
        <span className="ml-2 text-gray-600">載入中...</span>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <Bell className="w-12 h-12 text-gray-300 mb-2" />
        <p>暫無通知</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border transition-colors cursor-pointer ${
              !notification.seen 
                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getNotificationIcon(notification)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium truncate ${
                    !notification.seen ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {notification.subject || '系統通知'}
                  </h4>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatTime(notification.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {notification.body || notification.payload?.message || '無內容'}
                </p>
                {!notification.seen && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}