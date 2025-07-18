import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { Novu } from '@novu/api'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextRequest } from 'next/server'

// 初始化 Novu 客戶端
const novu = new Novu({ 
  secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('[GET /api/users]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // 檢查權限：只有 WEB_ADMIN 可以創建用戶
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!currentUser || currentUser.role !== 'WEB_ADMIN') {
      return NextResponse.json({ error: "只有網頁管理員可以創建用戶" }, { status: 403 })
    }

    const { email, password, name, role } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 })
    }

    // 驗證角色欄位
    const validRoles = ['ADMIN', 'WEB_ADMIN', 'EMPLOYEE']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: "無效的角色" }, { status: 400 })
    }

    // 檢查使用者是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "使用者已存在" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'EMPLOYEE',
      },
    })

    // 在 Novu 中建立 subscriber
    try {
      const subscriberId = `user_${user.id}`;
      await novu.subscribers.create({
        subscriberId: subscriberId,
        email: user.email,
        firstName: user.name || undefined,
        // 可以加入更多用戶資料
        data: {
          userId: user.id,
          registeredAt: user.createdAt.toISOString(),
        }
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Novu subscriber created: ${subscriberId}`);
      }
    } catch (novuError) {
      // Novu 錯誤不應該影響用戶註冊流程
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Failed to create Novu subscriber:', novuError);
      }
    }

    // 不回傳密碼
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ 
      user: userWithoutPassword,
      message: "用戶建立成功，通知服務已設定完成"
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[POST /api/users]', error)
    }
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    // 檢查權限：只有 WEB_ADMIN 可以更新用戶
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!currentUser || currentUser.role !== 'WEB_ADMIN') {
      return NextResponse.json({ error: "只有網頁管理員可以更新用戶" }, { status: 403 })
    }

    const { id, email, password, name, role } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "缺少用戶ID" }, { status: 400 })
    }

    // 驗證角色欄位
    const validRoles = ['ADMIN', 'WEB_ADMIN', 'EMPLOYEE']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: "無效的角色" }, { status: 400 })
    }

    // 檢查用戶是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "用戶不存在" }, { status: 404 })
    }

    // 如果要更新電子郵件，檢查是否與其他用戶重複
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })

      if (emailExists) {
        return NextResponse.json({ error: "電子郵件已被使用" }, { status: 409 })
      }
    }

    // 準備更新資料
    const updateData: any = {}
    
    if (email) updateData.email = email
    if (name !== undefined) updateData.name = name
    if (role) updateData.role = role
    
    // 如果提供了新密碼，則加密並更新
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    // 注意：Novu subscriber 會在下次觸發事件時自動更新

    return NextResponse.json({ 
      user: updatedUser,
      message: "用戶資料更新成功"
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUT /api/users]', error)
    }
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 })
  }
} 