import { NextRequest } from 'next/server'

/**
 * 獲取客戶端真實 IP 地址
 * 處理各種代理服務器設置，並清理 IPv6 映射前綴
 */
export function getClientIP(request: NextRequest): string {
  // 新增：印出所有 header 方便 debug
  try {
    console.log('x-forwarded-for:', request.headers.get('x-forwarded-for'))
  } catch (e) {
    // ignore
  }

  const xForwardedFor = request.headers.get('x-forwarded-for')
  const xRealIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  let ip = '127.0.0.1' // 預設值
  
  if (xForwardedFor) {
    ip = xForwardedFor.split(',')[0].trim()
  } else if (cfConnectingIP) {
    ip = cfConnectingIP
  } else if (xRealIP) {
    ip = xRealIP
  }
  
  // 移除 IPv6 映射前綴 ::ffff: 和 ::FFFF:
  if (ip.startsWith('::ffff:') || ip.startsWith('::FFFF:')) {
    ip = ip.substring(7)
  }
  
  return ip
} 