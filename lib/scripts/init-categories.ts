import { prisma } from '@/lib/prisma'
import { workCategories } from '@/lib/data/workCategories'

export async function initializeCategories() {
  try {
    console.log('開始初始化工作分類...')
    
    // 檢查是否已經有分類
    const existingCount = await prisma.workCategory.count()
    if (existingCount > 0) {
      console.log(`資料庫中已有 ${existingCount} 個分類，跳過初始化`)
      return
    }

    // 將硬編碼的分類插入資料庫
    for (let i = 0; i < workCategories.length; i++) {
      const category = workCategories[i]
      
      try {
        await prisma.workCategory.create({
          data: {
            categoryId: category.id,
            title: category.title,
            content: category.content,
            icon: category.icon,
            description: category.description,
            colorBg: category.color.bg,
            colorText: category.color.text,
            colorBorder: category.color.border,
            colorAccent: category.color.accent,
            isActive: true,
            isSystem: true, // 標記為系統預設分類
            sortOrder: i
          }
        })
        
        console.log(`✓ 已創建分類: ${category.title}`)
      } catch (error) {
        console.error(`✗ 創建分類失敗 ${category.title}:`, error)
      }
    }
    
    console.log('工作分類初始化完成！')
  } catch (error) {
    console.error('初始化工作分類失敗:', error)
    throw error
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  initializeCategories()
    .then(() => {
      console.log('腳本執行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('腳本執行失敗:', error)
      process.exit(1)
    })
} 