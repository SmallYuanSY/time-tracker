import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { Novu } from '@novu/api'

// 初始化 Novu 客戶端
const novu = new Novu({ 
  secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY
})

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 })
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
      
      console.log(`✅ Novu subscriber created: ${subscriberId}`);
    } catch (novuError) {
      // Novu 錯誤不應該影響用戶註冊流程
      console.error('❌ Failed to create Novu subscriber:', novuError);
    }

    // 不回傳密碼
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ 
      user: userWithoutPassword,
      message: "用戶建立成功，通知服務已設定完成"
    })
  } catch (error) {
    console.error('[POST /api/users]', error)
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 })
  }
} 