import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('未授權', { status: 401 });
    }

    const subscription = await req.json();
    const userId = (session.user as any).id;

    // 儲存或更新訂閱資訊
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscription.endpoint
        }
      },
      update: {
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
        updatedAt: new Date()
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('儲存推送訂閱失敗:', error);
    return new NextResponse('伺服器錯誤', { status: 500 });
  }
} 