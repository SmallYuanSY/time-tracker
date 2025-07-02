const Database = require('better-sqlite3')
const { Client } = require('pg')

// 定義用戶類型
interface User {
  id: string
  name: string
  email: string
  password: string
  role: string
  employeeId?: string
  emailVerified?: Date | null
  image?: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

// SQLite 數據庫路徑
const SQLITE_PATH = './prisma/dev.db'

// 創建 PostgreSQL 客戶端
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL
})

async function main() {
  try {
    // 連接到 PostgreSQL
    await pgClient.connect()

    // 連接到 SQLite 數據庫
    const db = new Database(SQLITE_PATH)

    // 讀取所有用戶
    const users = db.prepare('SELECT * FROM User').all() as User[]
    console.log(`找到 ${users.length} 個用戶`)

    // 遍歷用戶數據並插入到 PostgreSQL
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const employeeId = String(i + 1).padStart(2, '0')

      try {
        await pgClient.query('INSERT INTO "User" (id, "employeeId", email, name, password, role, "emailVerified", image, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [
          user.id,
          employeeId,
          user.email,
          user.name,
          user.password,
          user.role,
          user.emailVerified,
          user.image,
          user.createdAt ? new Date(user.createdAt) : new Date(),
          user.updatedAt ? new Date(user.updatedAt) : new Date()
        ])
        console.log(`已遷移用戶 ${user.name}，分配編號 ${employeeId}`)
      } catch (error) {
        console.error(`遷移用戶 ${user.name} 失敗：`, error)
      }
    }

    // 關閉連接
    db.close()
    await pgClient.end()
  } catch (error) {
    console.error('遷移過程中發生錯誤：', error)
    process.exit(1)
  }
}

main() 