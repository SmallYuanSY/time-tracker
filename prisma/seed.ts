const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // 創建管理員帳號
  const hashedPassword = await hash('admin123', 12)
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: '管理員',
      role: 'ADMIN'
    }
  })

  console.log('種子資料已建立')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 