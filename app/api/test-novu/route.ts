import { NextResponse } from 'next/server';

export async function GET() {
  const hasNovuKey = !!process.env.NOVU_SECRET_KEY;
  const hasNovuAppId = !!process.env.NEXT_PUBLIC_NOVU_APP_ID;

  return NextResponse.json({
    novuKeyExists: hasNovuKey,
    novuAppIdExists: hasNovuAppId,
    // 只顯示金鑰的前幾個字符，確保安全
    novuKeyPreview: hasNovuKey ? `${process.env.NOVU_SECRET_KEY?.slice(0, 4)}...` : null,
    novuAppIdPreview: hasNovuAppId ? `${process.env.NEXT_PUBLIC_NOVU_APP_ID?.slice(0, 4)}...` : null
  });
} 