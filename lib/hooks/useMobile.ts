'use client'

import { useState, useEffect } from 'react'

interface UseMobileReturn {
  isMobile: boolean
  isLoaded: boolean
}

/**
 * 檢測是否為手機裝置的 Hook
 * 正確處理服務端渲染，避免水合錯誤
 */
export function useMobile(): UseMobileReturn {
  const [isMobile, setIsMobile] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      // 檢查螢幕寬度
      const screenWidth = window.innerWidth
      
      // 檢查 User Agent
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileKeywords = [
        'mobile', 'android', 'iphone', 'ipod', 'ipad', 
        'blackberry', 'windows phone', 'webos'
      ]
      
      const isMobileUA = mobileKeywords.some(keyword => 
        userAgent.includes(keyword)
      )
      
      // 小螢幕判定（768px 以下為手機版）
      const isSmallScreen = screenWidth < 768
      
      // 觸控裝置判定
      const hasTouchSupport = 'ontouchstart' in window || 
        navigator.maxTouchPoints > 0
      
      // 綜合判定
      const mobileResult = isMobileUA || (isSmallScreen && hasTouchSupport)
      
      setIsMobile(mobileResult)
      setIsLoaded(true)
    }

    // 初始檢查
    checkMobile()
    
    // 監聽視窗大小變化
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return {
    isMobile,
    isLoaded
  }
}

/**
 * 僅在客戶端才返回 true 的手機檢測 Hook
 * 用於避免水合錯誤，但會有短暫的載入延遲
 */
export function useMobileSSR(): boolean {
  const { isMobile, isLoaded } = useMobile()
  
  // 在服務端渲染和未載入完成時，預設為桌面版
  return isLoaded ? isMobile : false
} 