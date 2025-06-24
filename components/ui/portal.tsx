"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: React.ReactNode
  container?: Element | null
}

export function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = useState(false)
  const [portalContainer, setPortalContainer] = useState<Element | null>(null)

  useEffect(() => {
    setMounted(true)
    
    // 使用提供的容器或建立/取得預設容器
    if (container) {
      setPortalContainer(container)
    } else {
      // 尋找或建立預設的 portal 容器
      let defaultContainer = document.getElementById('portal-root')
      
      if (!defaultContainer) {
        defaultContainer = document.createElement('div')
        defaultContainer.id = 'portal-root'
        defaultContainer.style.position = 'relative'
        defaultContainer.style.zIndex = '9999'
        document.body.appendChild(defaultContainer)
      }
      
      setPortalContainer(defaultContainer)
    }

    return () => {
      setMounted(false)
    }
  }, [container])

  if (!mounted || !portalContainer) {
    return null
  }

  return createPortal(children, portalContainer)
} 