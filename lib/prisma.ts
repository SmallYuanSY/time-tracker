// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 確保在開發環境中不會重複建立連接
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: ['error'],  // 只顯示錯誤日誌
  })
}

export const prisma = globalForPrisma.prisma

// 確保在應用關閉時斷開連接
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
