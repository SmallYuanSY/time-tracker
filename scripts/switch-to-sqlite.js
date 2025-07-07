#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 切換回 SQLite 資料庫...');

// 讀取現有的 .env 檔案
const envPath = path.join(process.cwd(), '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// 替換 DATABASE_URL 回 SQLite
const sqliteUrl = 'file:./prisma/data/sqlite.db';
envContent = envContent.replace(
  /DATABASE_URL="[^"]*"/,
  `DATABASE_URL="${sqliteUrl}"`
);

// 寫回檔案
fs.writeFileSync(envPath, envContent);

// 同時更新 Prisma schema
const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// 替換 datasource 設定
schemaContent = schemaContent.replace(
  /datasource db \{[\s\S]*?\}/,
  `datasource db {
  provider = "sqlite"
  url      = "file:./data/sqlite.db"
}`
);

fs.writeFileSync(schemaPath, schemaContent);

console.log('✅ 環境變數已更新');
console.log('📍 DATABASE_URL 已設定為:', sqliteUrl);
console.log('📍 Prisma schema 已切換回 SQLite');
console.log('');
console.log('下一步：');
console.log('1. 執行 npm run db:migrate 來建立資料表');
console.log('2. 執行 npm run db:seed 來初始化資料');
console.log('3. 執行 npm run build 重新建置');
console.log('4. 執行 npm run start 啟動應用程式'); 