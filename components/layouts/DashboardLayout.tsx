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

const sidebarItems = [
  { name: "總覽", icon: <LayoutDashboard className="w-4 h-4 mr-2" />, href: "/" },
  { name: "工作日誌", icon: <BookOpen className="w-4 h-4 mr-2" />, href: "/journal" },
  { name: "案件管理", icon: <Briefcase className="w-4 h-4 mr-2" />, href: "/projects" },
  { name: "聯絡人", icon: <Users className="w-4 h-4 mr-2" />, href: "/contacts" },
  { name: "請假", icon: <FileClock className="w-4 h-4 mr-2" />, href: "/leave" },
  { name: "設定", icon: <Settings className="w-4 h-4 mr-2" />, href: "#" },
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
