"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode, useState, useEffect } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)

  // 監聽路由變化顯示載入狀態
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [pathname])

  // 根據路由類型選擇不同的動畫效果
  const getPageVariants = () => {
    if (pathname.includes('/worklog')) {
      // 工作記錄頁面 - 從右滑入
      return {
        initial: { opacity: 0, x: 100, scale: 0.95 },
        in: { opacity: 1, x: 0, scale: 1 },
        out: { opacity: 0, x: -100, scale: 1.05 }
      }
    } else if (pathname.includes('/journal')) {
      // 工作日誌頁面 - 淡入加縮放
      return {
        initial: { opacity: 0, scale: 0.9, rotateX: 10 },
        in: { opacity: 1, scale: 1, rotateX: 0 },
        out: { opacity: 0, scale: 1.1, rotateX: -10 }
      }
    } else if (pathname.includes('/projects') || pathname.includes('/contacts')) {
      // 管理頁面 - 從下滑入
      return {
        initial: { opacity: 0, y: 50, scale: 0.95 },
        in: { opacity: 1, y: 0, scale: 1 },
        out: { opacity: 0, y: -50, scale: 1.05 }
      }
    } else {
      // 默認動畫 - 基本淡入
      return {
        initial: { opacity: 0, y: 20, scale: 0.98 },
        in: { opacity: 1, y: 0, scale: 1 },
        out: { opacity: 0, y: -20, scale: 1.02 }
      }
    }
  }

  const pageVariants = getPageVariants()

  return (
    <>
      {/* 載入指示器 */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 md:left-64 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
              className="h-full bg-white/30 origin-left"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 頁面內容轉場 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={{ 
            duration: 0.4,
            type: "tween"
          }}
          className="w-full min-h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  )
} 