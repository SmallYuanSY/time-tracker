"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  FileText,
  Clock,
  Users,
  CalendarDays,
  ArrowLeft
} from "lucide-react"
import { Project } from "@/types/project"

interface ProjectLayoutProps {
  children: React.ReactNode
  project: Project
}

export function ProjectLayout({ children, project }: ProjectLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()

  const sidebarItems = [
    { 
      name: "概觀", 
      icon: <FileText className="w-4 h-4 mr-2" />, 
      href: `/projects/${project.code}`,
      id: 'overview'
    },
    { 
      name: "工作紀錄", 
      icon: <Clock className="w-4 h-4 mr-2" />, 
      href: `/projects/${project.code}/worklog`,
      id: 'worklog'
    },
    { 
      name: "專案成員", 
      icon: <Users className="w-4 h-4 mr-2" />, 
      href: `/projects/${project.code}/members`,
      id: 'members'
    },
    { 
      name: "專案行事曆", 
      icon: <CalendarDays className="w-4 h-4 mr-2" />, 
      href: `/projects/${project.code}/calendar`,
      id: 'calendar'
    }
  ]

  const handleNavigation = (href: string) => {
    if (href !== "#" && pathname !== href) {
      router.push(href)
    }
  }

  return (
    <div className="flex h-screen w-full bg-muted/40">
      {/* 固定側邊欄 - 只在桌面版顯示 */}
      <div className="hidden border-r bg-background md:block w-64 h-screen fixed z-40">
        <div className="flex h-full flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4">
            <Link 
              href="/projects" 
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回案件列表
            </Link>
          </div>

          <div className="px-4 py-2 border-b">
            <h2 className="text-lg font-semibold truncate">{project.name}</h2>
            <p className="text-sm text-muted-foreground">{project.code}</p>
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
            </nav>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="p-3 bg-accent rounded-lg">
              <div className="text-sm">
                <p className="font-medium">專案狀態</p>
                <p className={cn(
                  "mt-1",
                  project.status === 'ACTIVE' ? "text-green-600" : "text-gray-600"
                )}>
                  {project.status === 'ACTIVE' ? '進行中' : '已結案'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容區域 */}
      <div className="flex-1 md:pl-64">
        <div className="container p-4">
          {children}
        </div>
      </div>
    </div>
  )
} 