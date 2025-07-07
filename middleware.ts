import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''
  
  // 檢測是否為手機裝置
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|webOS/i.test(userAgent)
  
  // 如果是手機裝置但訪問桌面版路由，重定向到手機版
  if (isMobile && !pathname.startsWith('/mobile') && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && pathname !== '/login') {
    const mobileUrl = new URL('/mobile', request.url)
    return NextResponse.redirect(mobileUrl)
  }
  
  // 如果是桌面裝置但訪問手機版路由，重定向到桌面版
  if (!isMobile && pathname.startsWith('/mobile') && pathname !== '/mobile') {
    const desktopPath = pathname.replace('/mobile', '') || '/'
    const desktopUrl = new URL(desktopPath, request.url)
    return NextResponse.redirect(desktopUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 