import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'alan6716s@gmail.com' },
    update: {},
    create: {
      email: 'alan6716s@gmail.com',
      employeeId: '20',
      name: '羅祺翔',
      role: 'WEB_ADMIN', // 直接使用 enum 名稱（Prisma 會自動轉換為 DB enum）
      password: '$2b$10$lX/gEob3Zt0cHeb/.GJrYOzXLajTGKYUllWk4oKvB2jz4/9bH0A0W',
    },
  });

  console.log(`✅ Admin created: ${admin.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
