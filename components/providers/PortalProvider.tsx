"use client"

import { useEffect } from 'react'

export function PortalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 在應用啟動時建立 portal 容器
    if (typeof window !== 'undefined') {
      let portalRoot = document.getElementById('portal-root')
      
      if (!portalRoot) {
        portalRoot = document.createElement('div')
        portalRoot.id = 'portal-root'
        portalRoot.style.position = 'relative'
        portalRoot.style.zIndex = '9999'
        document.body.appendChild(portalRoot)
      }
    }
  }, [])

  return <>{children}</>
} 