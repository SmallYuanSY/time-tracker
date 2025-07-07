#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

console.log('🔄 SQLite 到 PostgreSQL 資料遷移工具');
console.log('==========================================');

// 建立兩個 Prisma 客戶端
const sqlitePrisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./prisma/data/sqlite.db"
    }
  }
});

const postgresPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://timetracker_user:password@localhost:5432/time_tracker_db"
    }
  }
});

// 遷移函數
async function migrateData() {
  try {
    console.log('📊 開始資料遷移...');
    
    // 1. 遷移使用者
    console.log('👥 遷移使用者資料...');
    const users = await sqlitePrisma.user.findMany();
    console.log(`發現 ${users.length} 個使用者`);
    
    for (const user of users) {
      try {
        await postgresPrisma.user.upsert({
          where: { id: user.id },
          update: user,
          create: user
        });
        console.log(`✅ 使用者 ${user.email} 已遷移`);
      } catch (error) {
        console.log(`❌ 使用者 ${user.email} 遷移失敗:`, error.message);
      }
    }
    
    // 2. 遷移專案
    console.log('📁 遷移專案資料...');
    const projects = await sqlitePrisma.project.findMany();
    console.log(`發現 ${projects.length} 個專案`);
    
    for (const project of projects) {
      try {
        await postgresPrisma.project.upsert({
          where: { id: project.id },
          update: project,
          create: project
        });
        console.log(`✅ 專案 ${project.name} 已遷移`);
      } catch (error) {
        console.log(`❌ 專案 ${project.name} 遷移失敗:`, error.message);
      }
    }
    
    // 3. 遷移聯絡人
    console.log('📞 遷移聯絡人資料...');
    const contacts = await sqlitePrisma.contact.findMany();
    console.log(`發現 ${contacts.length} 個聯絡人`);
    
    for (const contact of contacts) {
      try {
        await postgresPrisma.contact.upsert({
          where: { id: contact.id },
          update: contact,
          create: contact
        });
        console.log(`✅ 聯絡人 ${contact.contactName} 已遷移`);
      } catch (error) {
        console.log(`❌ 聯絡人 ${contact.contactName} 遷移失敗:`, error.message);
      }
    }
    
    // 4. 遷移工作分類
    console.log('📋 遷移工作分類...');
    const workCategories = await sqlitePrisma.workCategory.findMany();
    console.log(`發現 ${workCategories.length} 個工作分類`);
    
    for (const category of workCategories) {
      try {
        await postgresPrisma.workCategory.upsert({
          where: { id: category.id },
          update: category,
          create: category
        });
        console.log(`✅ 工作分類 ${category.title} 已遷移`);
      } catch (error) {
        console.log(`❌ 工作分類 ${category.title} 遷移失敗:`, error.message);
      }
    }
    
    // 5. 遷移工作記錄
    console.log('📝 遷移工作記錄...');
    const workLogs = await sqlitePrisma.workLog.findMany();
    console.log(`發現 ${workLogs.length} 個工作記錄`);
    
    for (const workLog of workLogs) {
      try {
        await postgresPrisma.workLog.upsert({
          where: { id: workLog.id },
          update: workLog,
          create: workLog
        });
        console.log(`✅ 工作記錄 ${workLog.id} 已遷移`);
      } catch (error) {
        console.log(`❌ 工作記錄 ${workLog.id} 遷移失敗:`, error.message);
      }
    }
    
    // 6. 遷移打卡記錄
    console.log('🕐 遷移打卡記錄...');
    const clocks = await sqlitePrisma.clock.findMany();
    console.log(`發現 ${clocks.length} 個打卡記錄`);
    
    for (const clock of clocks) {
      try {
        await postgresPrisma.clock.upsert({
          where: { id: clock.id },
          update: clock,
          create: clock
        });
        console.log(`✅ 打卡記錄 ${clock.id} 已遷移`);
      } catch (error) {
        console.log(`❌ 打卡記錄 ${clock.id} 遷移失敗:`, error.message);
      }
    }
    
    // 7. 遷移加班記錄
    console.log('⏰ 遷移加班記錄...');
    const overtimes = await sqlitePrisma.overtime.findMany();
    console.log(`發現 ${overtimes.length} 個加班記錄`);
    
    for (const overtime of overtimes) {
      try {
        await postgresPrisma.overtime.upsert({
          where: { id: overtime.id },
          update: overtime,
          create: overtime
        });
        console.log(`✅ 加班記錄 ${overtime.id} 已遷移`);
      } catch (error) {
        console.log(`❌ 加班記錄 ${overtime.id} 遷移失敗:`, error.message);
      }
    }
    
    // 8. 遷移請假記錄
    console.log('🏖️ 遷移請假記錄...');
    const leaveRequests = await sqlitePrisma.leaveRequest.findMany();
    console.log(`發現 ${leaveRequests.length} 個請假記錄`);
    
    for (const leave of leaveRequests) {
      try {
        await postgresPrisma.leaveRequest.upsert({
          where: { id: leave.id },
          update: leave,
          create: leave
        });
        console.log(`✅ 請假記錄 ${leave.id} 已遷移`);
      } catch (error) {
        console.log(`❌ 請假記錄 ${leave.id} 遷移失敗:`, error.message);
      }
    }
    
    // 9. 遷移專案使用者關聯
    console.log('🔗 遷移專案使用者關聯...');
    const projectToUsers = await sqlitePrisma.projectToUser.findMany();
    console.log(`發現 ${projectToUsers.length} 個專案使用者關聯`);
    
    for (const relation of projectToUsers) {
      try {
        await postgresPrisma.projectToUser.upsert({
          where: { 
            projectId_userId: {
              projectId: relation.projectId,
              userId: relation.userId
            }
          },
          update: relation,
          create: relation
        });
        console.log(`✅ 專案使用者關聯 ${relation.projectId}-${relation.userId} 已遷移`);
      } catch (error) {
        console.log(`❌ 專案使用者關聯遷移失敗:`, error.message);
      }
    }
    
    console.log('🎉 資料遷移完成！');
    
    // 顯示統計資訊
    console.log('\n📊 遷移統計：');
    const postgresUsers = await postgresPrisma.user.count();
    const postgresProjects = await postgresPrisma.project.count();
    const postgresWorkLogs = await postgresPrisma.workLog.count();
    const postgresClocks = await postgresPrisma.clock.count();
    
    console.log(`使用者: ${postgresUsers}`);
    console.log(`專案: ${postgresProjects}`);
    console.log(`工作記錄: ${postgresWorkLogs}`);
    console.log(`打卡記錄: ${postgresClocks}`);
    
  } catch (error) {
    console.error('❌ 遷移過程中發生錯誤:', error);
  } finally {
    await sqlitePrisma.$disconnect();
    await postgresPrisma.$disconnect();
  }
}

// 驗證函數
async function verifyMigration() {
  console.log('\n🔍 驗證遷移結果...');
  
  try {
    const sqliteUserCount = await sqlitePrisma.user.count();
    const postgresUserCount = await postgresPrisma.user.count();
    
    const sqliteWorkLogCount = await sqlitePrisma.workLog.count();
    const postgresWorkLogCount = await postgresPrisma.workLog.count();
    
    console.log('\n📋 資料對比：');
    console.log(`使用者 - SQLite: ${sqliteUserCount}, PostgreSQL: ${postgresUserCount}`);
    console.log(`工作記錄 - SQLite: ${sqliteWorkLogCount}, PostgreSQL: ${postgresWorkLogCount}`);
    
    if (sqliteUserCount === postgresUserCount && sqliteWorkLogCount === postgresWorkLogCount) {
      console.log('✅ 資料遷移驗證成功！');
    } else {
      console.log('⚠️ 資料數量不一致，請檢查遷移結果');
    }
    
  } catch (error) {
    console.error('❌ 驗證過程中發生錯誤:', error);
  }
}

// 主函數
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'migrate':
      await migrateData();
      break;
    case 'verify':
      await verifyMigration();
      break;
    case 'full':
      await migrateData();
      await verifyMigration();
      break;
    default:
      console.log('用法: node scripts/migrate-sqlite-to-postgres.js <command>');
      console.log('');
      console.log('可用指令:');
      console.log('  migrate - 執行資料遷移');
      console.log('  verify  - 驗證遷移結果');
      console.log('  full    - 執行完整遷移和驗證');
      break;
  }
}

main().catch(console.error); 