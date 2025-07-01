import { prisma } from '../prisma'

async function initOvertimeProject() {
  try {
    // 檢查是否已存在OT專案
    const existingProject = await prisma.project.findUnique({
      where: { code: 'OT' }
    })

    if (existingProject) {
      console.log('OT專案已存在')
      return existingProject
    }

    // 找一個管理員用戶作為專案管理者
    const adminUser = await prisma.user.findFirst({
      where: {
        role: { in: ['ADMIN', 'WEB_ADMIN'] }
      }
    })

    if (!adminUser) {
      throw new Error('找不到管理員用戶來管理OT專案')
    }

    // 創建OT專案
    const otProject = await prisma.project.create({
      data: {
        code: 'OT',
        name: '加班',
        description: '員工加班時間記錄專用專案',
        category: '管理',
        managerId: adminUser.id,
        status: 'ACTIVE'
      }
    })

    console.log('成功創建OT專案:', otProject)
    return otProject
  } catch (error) {
    console.error('初始化OT專案失敗:', error)
    throw error
  }
}

// 如果直接執行這個檔案
if (require.main === module) {
  initOvertimeProject()
    .then(() => {
      console.log('OT專案初始化完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('初始化失敗:', error)
      process.exit(1)
    })
}

export { initOvertimeProject } 