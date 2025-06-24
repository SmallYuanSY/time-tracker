"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSession, signOut } from "next-auth/react"
import {
  CircleUser,
  FileClock,
  LayoutDashboard,
  LogOut,
  Settings,
  Bell,
} from "lucide-react"

const sidebarItems = [
  { name: "總覽", icon: <LayoutDashboard className="w-4 h-4 mr-2" />, href: "/" },
  { name: "工作記錄", icon: <FileClock className="w-4 h-4 mr-2" />, href: "/worklog" },
  { name: "請假", icon: <FileClock className="w-4 h-4 mr-2" />, href: "/leave" },
  { name: "通知", icon: <Bell className="w-4 h-4 mr-2" />, href: "/notifications" },
  { name: "設定", icon: <Settings className="w-4 h-4 mr-2" />, href: "#" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    })
  }

  const handleNavigation = (href: string) => {
    if (href !== "#") {
      router.push(href)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <div className="hidden border-r bg-background md:block w-64">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4">
            <span className="text-lg font-semibold">工作日誌</span>
          </div>
          <ScrollArea className="flex-1 px-2 py-4">
            <nav className="grid gap-1">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Button 
                    key={item.name} 
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleNavigation(item.href)}
                  >
                    {item.icon}
                    {item.name}
                  </Button>
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
      <div className="flex flex-col flex-1">
        <main className="flex-1 p-4 overflow-auto">
          {/* 移除原本的 showEndOfDay 控制，改由主頁控制 */}
          {children}
        </main>
      </div>
    </div>
  )
}
