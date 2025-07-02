"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSession, signOut } from "next-auth/react"
import PageTransition from "./PageTransition"
import { motion } from "framer-motion"
import {
  CircleUser,
  FileClock,
  LayoutDashboard,
  LogOut,
  Settings,
  Briefcase,
  Users,
  Layers,
  BookOpen,
  Calendar,
} from "lucide-react"
import { useEffect, useState } from 'react'
import { notificationService } from '@/lib/notification'

const sidebarItems = [
  { name: "總覽", icon: <LayoutDashboard className="w-4 h-4 mr-2" />, href: "/" },
  { name: "工作日誌", icon: <BookOpen className="w-4 h-4 mr-2" />, href: "/journal" },
  { name: "案件管理", icon: <Briefcase className="w-4 h-4 mr-2" />, href: "/projects" },
  { name: "聯絡人", icon: <Users className="w-4 h-4 mr-2" />, href: "/contacts" },
  { name: "請假", icon: <FileClock className="w-4 h-4 mr-2" />, href: "/leave" },
  { name: "設定", icon: <Settings className="w-4 h-4 mr-2" />, href: "/settings" },
]

const adminItems = [
  { name: "管理員控制台", icon: <LayoutDashboard className="w-4 h-4 mr-2" />, href: "/admin", role: "ADMIN" },
  { name: "用戶管理", icon: <Users className="w-4 h-4 mr-2" />, href: "/users", role: "WEB_ADMIN" },
  { name: "分類管理", icon: <Layers className="w-4 h-4 mr-2" />, href: "/categories", role: "ADMIN" },
  { name: "假日管理", icon: <Calendar className="w-4 h-4 mr-2" />, href: "/admin/holidays", role: "ADMIN" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [userRole, setUserRole] = React.useState<string | null>(null)
  const [hasNotified, setHasNotified] = useState(false)
  const [hasCheckedClockIn, setHasCheckedClockIn] = useState(false)

  // 獲取用戶角色
  React.useEffect(() => {
    if (session?.user?.email) {
      const fetchUserRole = async () => {
        try {
          const response = await fetch('/api/users')
          if (response.ok) {
            const users = await response.json()
            const currentUser = users.find((user: any) => user.email === session.user?.email)
            setUserRole(currentUser?.role || null)
          }
        } catch (error) {
          console.error('獲取用戶角色失敗:', error)
        }
      }
      fetchUserRole()
    }
  }, [session?.user?.email])

  // 檢查今日打卡狀態
  useEffect(() => {
    if (!session?.user || hasCheckedClockIn) return

    const checkClockInStatus = async () => {
      try {
        // 獲取今天的打卡記錄
        const today = new Date().toISOString().split('T')[0]
        const response = await fetch(`/api/clock/history?date=${today}`)
        const data = await response.json()

        // 檢查是否有今天的上班打卡記錄
        const hasClockIn = data.some((record: any) => 
          record.type === 'IN' && 
          new Date(record.timestamp).toISOString().split('T')[0] === today
        )

        // 如果沒有打卡記錄，且現在是工作時間（週一到週五 9:00-17:30）
        const now = new Date()
        const isWorkday = now.getDay() >= 1 && now.getDay() <= 5
        const isWorktime = now.getHours() >= 9 && (now.getHours() < 17 || (now.getHours() === 17 && now.getMinutes() <= 30))

        if (!hasClockIn && isWorkday && isWorktime) {
          await notificationService.sendPushNotification(
            '上班打卡提醒',
            {
              body: '您今天還沒有打卡，請記得打卡！',
              tag: 'clock-in-reminder',
              data: {
                url: '/clock' // 點擊通知時跳轉到打卡頁面
              }
            }
          )
        }

        setHasCheckedClockIn(true)
      } catch (error) {
        console.error('檢查打卡狀態失敗:', error)
      }
    }

    // 檢查打卡狀態
    checkClockInStatus()

    // 如果是工作時間，每 30 分鐘檢查一次
    const interval = setInterval(() => {
      const now = new Date()
      const isWorkday = now.getDay() >= 1 && now.getDay() <= 5
      const isWorktime = now.getHours() >= 9 && (now.getHours() < 17 || (now.getHours() === 17 && now.getMinutes() <= 30))

      if (isWorkday && isWorktime) {
        setHasCheckedClockIn(false) // 重置檢查狀態
        checkClockInStatus()
      }
    }, 30 * 60 * 1000) // 30 分鐘

    return () => clearInterval(interval)
  }, [session, hasCheckedClockIn])

  // 監控工作時長
  useEffect(() => {
    if (!session?.user) return

    const checkWorkTime = async () => {
      try {
        const response = await fetch('/api/work-time-stats')
        const data = await response.json()

        if (data.success && !hasNotified) {
          const todayStats = data.data.dailyStats.find((day: any) => 
            day.date === new Date().toISOString().split('T')[0]
          )

          if (todayStats && todayStats.totalWorkHours >= 8) {
            await notificationService.sendPushNotification(
              '工作時間提醒',
              {
                body: '您今天的工作時間已達到 8 小時（已扣除午休時間）',
                tag: 'work-time-notification'
              }
            )
            setHasNotified(true)
          }
        }
      } catch (error) {
        console.error('檢查工作時間失敗:', error)
      }
    }

    // 每 5 分鐘檢查一次
    const interval = setInterval(checkWorkTime, 5 * 60 * 1000)
    checkWorkTime() // 初始檢查

    return () => clearInterval(interval)
  }, [session, hasNotified])

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    })
  }

  const handleNavigation = (href: string) => {
    if (href !== "#" && pathname !== href) {
      // 如果當前頁面和目標頁面不同，才進行導航
      router.push(href)
    }
  }

  return (
    <div className="flex h-screen w-full bg-muted/40">
      {/* 固定側邊欄 - 只在桌面版顯示 */}
      <div className="hidden border-r bg-background md:block w-64 h-screen fixed z-40">
        <div className="flex h-full flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4">
            <span className="text-lg font-semibold">工作日誌</span>
          </div>
          <ScrollArea className="flex-1 px-2 py-4">
            <nav className="grid gap-1">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <motion.div
                    key={item.name}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Button 
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start transition-all duration-200",
                        isActive && "bg-accent text-accent-foreground shadow-md"
                      )}
                      onClick={() => handleNavigation(item.href)}
                    >
                      <motion.div
                        animate={isActive ? { rotate: [0, 5, 0] } : {}}
                        transition={{ duration: 0.3 }}
                        className="flex items-center"
                      >
                        {item.icon}
                      </motion.div>
                      {item.name}
                    </Button>
                  </motion.div>
                )
              })}
              
              {/* 管理功能 - 只對特定角色顯示 */}
              {adminItems.filter(item => {
                if (item.role === 'WEB_ADMIN') return userRole === 'WEB_ADMIN'
                if (item.role === 'ADMIN') return userRole === 'ADMIN' || userRole === 'WEB_ADMIN'
                return false
              }).map((item, index) => {
                const isActive = pathname === item.href
                return (
                  <motion.div
                    key={item.name}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Button 
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start transition-all duration-200",
                        index === 0 && "border-t border-white/10 mt-2 pt-2",
                        isActive && "bg-accent text-accent-foreground shadow-md"
                      )}
                      onClick={() => handleNavigation(item.href)}
                    >
                      <motion.div
                        animate={isActive ? { rotate: [0, 5, 0] } : {}}
                        transition={{ duration: 0.3 }}
                        className="flex items-center"
                      >
                        {item.icon}
                      </motion.div>
                      {item.name}
                    </Button>
                  </motion.div>
                )
              })}
            </nav>
          </ScrollArea>
          <div className="mt-auto p-4 border-t">
            <Button variant="ghost" className="w-full justify-start">
              <CircleUser className="w-4 h-4 mr-2" /> 
              {session?.user?.name || session?.user?.email || '使用者'}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" /> 登出
            </Button>
          </div>
        </div>
      </div>
      
      {/* 主內容區域 - 左邊留出側邊欄空間（桌面版），手機版全寬 */}
      <div className="flex flex-col flex-1 md:ml-64">
        <main className="flex-1 min-h-screen overflow-y-auto">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
