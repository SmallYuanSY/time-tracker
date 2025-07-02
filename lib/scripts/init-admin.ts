import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

async function initAdmin() {
  try {
    // 檢查是否已存在管理員
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    })

    if (existingAdmin) {
      console.log('管理員帳號已存在')
      return existingAdmin
    }

    // 創建管理員帳號
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.create({
      data: {
        name: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    console.log('成功創建管理員帳號:', admin)
    return admin
  } catch (error) {
    console.error('初始化管理員帳號失敗:', error)
    throw error
  }
}

// 如果直接執行這個檔案
if (require.main === module) {
  initAdmin()
    .then(() => {
      console.log('管理員帳號初始化完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('初始化失敗:', error)
      process.exit(1)
    })
}

module.exports = { initAdmin } 