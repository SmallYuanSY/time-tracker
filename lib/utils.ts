import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 獲取設備資訊的工具函數
export interface DeviceInfo {
  macAddress?: string
  browserInfo: string
  screenResolution: string
  timezone: string
  language: string
  platform: string
  cookieEnabled: boolean
  onlineStatus: boolean
  batteryLevel?: number
  connectionType?: string
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceInfo: DeviceInfo = {
    browserInfo: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onlineStatus: navigator.onLine,
  }

  try {
    // 嘗試獲取網路連接資訊
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      deviceInfo.connectionType = connection.effectiveType || connection.type || 'unknown'
    }

    // 嘗試獲取電池資訊
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery()
        deviceInfo.batteryLevel = Math.round(battery.level * 100)
      } catch (e) {

      }
    }

    // 嘗試獲取 MAC 地址（注意：現代瀏覽器通常不允許直接獲取）
    // 這裡我們嘗試一些替代方案，但實際上很難獲取真實的 MAC 地址
    try {
      // 方法1：嘗試使用 WebRTC 獲取本地 IP 和網路資訊
      await getMacAddressViaWebRTC(deviceInfo)
    } catch (e) {
      // 如果 WebRTC 方法失敗，嘗試其他方法
      deviceInfo.macAddress = await generateDeviceFingerprint()
    }

  } catch (error) {
    console.warn('獲取部分設備資訊失敗:', error)
  }

  return deviceInfo
}

// 使用 WebRTC 嘗試獲取網路資訊
async function getMacAddressViaWebRTC(deviceInfo: DeviceInfo): Promise<void> {
  return new Promise((resolve) => {
    const rtc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    
    rtc.createDataChannel('')
    rtc.createOffer().then(offer => rtc.setLocalDescription(offer))
    
    const timeout = setTimeout(() => {
      rtc.close()
      resolve()
    }, 2000) // 2秒超時
    
    rtc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.candidate
        
        // 嘗試從 ICE candidate 中提取網路資訊
        if (candidate.includes('host')) {
          // 這裡無法獲取真實的 MAC 地址，所以我們生成一個設備指紋
          deviceInfo.macAddress = generateDeviceFingerprint()
          clearTimeout(timeout)
          rtc.close()
          resolve()
        }
      }
    }
  })
}

// 生成設備指紋作為唯一識別碼（代替 MAC 地址）
function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Device fingerprint', 2, 2)
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.cookieEnabled ? '1' : '0',
    canvas.toDataURL()
  ].join('|')
  
  // 創建一個基於設備特徵的哈希
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 轉換為32位整數
  }
  
  // 格式化為類似 MAC 地址的格式
  const hashStr = Math.abs(hash).toString(16).padStart(12, '0').slice(0, 12)
  return hashStr.match(/.{2}/g)?.join(':') || 'unknown'
}
