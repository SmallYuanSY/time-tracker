import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

// 設定 VAPID 詳細資訊
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:" + (process.env.VAPID_MAILTO_EMAIL || "example@example.com"),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
} else {
  console.warn("VAPID keys not configured, push notifications disabled");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('未授權', { status: 401 });
    }

    const { title, body, url, tag } = await req.json();
    const userId = (session.user as any).id;

    // 取得使用者的所有推送訂閱
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    // 準備推送的資料
    const payload = JSON.stringify({
      title,
      body,
      url,
      tag,
      icon: '/favicon.ico'
    });

    // 發送到所有訂閱端點
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                auth: subscription.auth,
                p256dh: subscription.p256dh
              }
            },
            payload
          );
        } catch (error) {
          // 如果發送失敗且是因為訂閱已過期，則刪除該訂閱
          if ((error as any).statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: subscription.id }
            });
          }
          throw error;
        }
      })
    );

    // 檢查結果
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`${failures.length} 個推送通知發送失敗`);
    }

    return NextResponse.json({
      success: true,
      sent: results.length - failures.length,
      failed: failures.length
    });
  } catch (error) {
    console.error('發送推送通知失敗:', error);
    return new NextResponse('伺服器錯誤', { status: 500 });
  }
}
