const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 開始打包 Time Tracker 應用程式...\n');

// 檢查必要檔案是否存在
const requiredFiles = [
  'package.json',
  'next.config.ts',
  'tsconfig.json',
  'tailwind.config.js',
  '.env'
];

console.log('🔍 檢查必要檔案...');
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ 缺少必要檔案: ${file}`);
    process.exit(1);
  }
  console.log(`✅ ${file}`);
}

// 建立打包目錄
const packageDir = 'time-tracker-production';
const packagePath = path.join(__dirname, '..', packageDir);

if (fs.existsSync(packagePath)) {
  console.log(`🗑️  清理舊的打包目錄: ${packageDir}`);
  fs.rmSync(packagePath, { recursive: true, force: true });
}

console.log(`📁 建立打包目錄: ${packageDir}`);
fs.mkdirSync(packagePath, { recursive: true });

// 要包含的目錄和檔案
const includePaths = [
  'app',
  'components',
  'lib',
  'prisma',
  'public',
  'scripts',
  'types',
  'package.json',
  'pnpm-lock.yaml',
  'next.config.ts',
  'tailwind.config.js',
  'tsconfig.json',
  'components.json',
  'eslint.config.mjs',
  'postcss.config.mjs',
  'vercel.json'
];

// 要排除的目錄和檔案
const excludePaths = [
  '.git',
  '.next',
  'node_modules',
  'backups',
  'data',
  '*.log',
  '*.tar.gz',
  '*.zip',
  'time-tracker-production'
];

console.log('\n📋 複製檔案...');

// 複製檔案和目錄
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      
      // 檢查是否在排除清單中
      const shouldExclude = excludePaths.some(exclude => {
        if (exclude.includes('*')) {
          const pattern = exclude.replace('*', '.*');
          return new RegExp(pattern).test(file);
        }
        return file === exclude || srcPath.includes(exclude);
      });
      
      if (!shouldExclude) {
        copyRecursive(srcPath, destPath);
      }
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 複製包含的檔案和目錄
for (const includePath of includePaths) {
  const srcPath = path.join(__dirname, '..', includePath);
  const destPath = path.join(packagePath, includePath);
  
  if (fs.existsSync(srcPath)) {
    console.log(`📄 複製: ${includePath}`);
    copyRecursive(srcPath, destPath);
  } else {
    console.log(`⚠️  檔案不存在: ${includePath}`);
  }
}

// 複製環境變數檔案
const envFiles = ['.env', '.env.local', '.env.production'];
for (const envFile of envFiles) {
  const srcPath = path.join(__dirname, '..', envFile);
  if (fs.existsSync(srcPath)) {
    console.log(`🔐 複製環境變數: ${envFile}`);
    fs.copyFileSync(srcPath, path.join(packagePath, envFile));
  }
}

// 複製 SSL 憑證（如果存在）
const sslDir = path.join(__dirname, '..', 'ssl');
if (fs.existsSync(sslDir)) {
  console.log('🔒 複製 SSL 憑證');
  copyRecursive(sslDir, path.join(packagePath, 'ssl'));
}

// 建立部署指南
const deployGuide = `# Time Tracker 部署指南

## 快速部署

### 1. 安裝依賴
\`\`\`bash
npm install
# 或
pnpm install
\`\`\`

### 2. 設定環境變數
確保 \`.env\` 檔案包含所有必要的環境變數：
- DATABASE_URL
- NEXTAUTH_SECRET
- NEXTAUTH_URL
- NOVU_SECRET_KEY (可選)
- NEXT_PUBLIC_NOVU_APP_ID (可選)

### 3. 設定資料庫
\`\`\`bash
# 執行資料庫遷移
npx prisma migrate deploy

# 生成 Prisma 客戶端
npx prisma generate
\`\`\`

### 4. 建置應用程式
\`\`\`bash
npm run build
\`\`\`

### 5. 啟動伺服器

#### HTTP 版本
\`\`\`bash
npm start
\`\`\`
訪問: http://localhost:3000

#### HTTPS 版本
\`\`\`bash
# 生成 SSL 憑證
npm run generate:ssl

# 啟動 HTTPS 伺服器
npm run start:https
\`\`\`
訪問: https://localhost:3000

## 生產環境建議

1. 使用 PM2 管理程序
2. 設定反向代理 (Nginx/Apache)
3. 使用 Let's Encrypt 取得正式 SSL 憑證
4. 設定防火牆規則
5. 定期備份資料庫

## 故障排除

- 如果遇到端口被占用，請檢查並釋放端口 3000 和 3001
- 如果資料庫連線失敗，請檢查 DATABASE_URL 設定
- 如果認證失敗，請檢查 NEXTAUTH_SECRET 和 NEXTAUTH_URL

## 支援

如有問題，請檢查：
1. 環境變數設定
2. 資料庫連線
3. 端口使用狀況
4. 瀏覽器控制台錯誤
`;

fs.writeFileSync(path.join(packagePath, 'DEPLOY.md'), deployGuide);

// 建立啟動腳本
const startScript = `#!/bin/bash
echo "🚀 啟動 Time Tracker 應用程式..."

# 檢查環境變數
if [ ! -f ".env" ]; then
    echo "❌ 缺少 .env 檔案"
    echo "請複製 .env.example 並設定必要的環境變數"
    exit 1
fi

# 檢查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安裝依賴套件..."
    npm install
fi

# 檢查 Prisma 客戶端
if [ ! -d "node_modules/.prisma" ]; then
    echo "🔧 生成 Prisma 客戶端..."
    npx prisma generate
fi

# 檢查建置檔案
if [ ! -d ".next" ]; then
    echo "🏗️  建置應用程式..."
    npm run build
fi

echo "✅ 啟動伺服器..."
echo "🌐 HTTP: http://localhost:3000"
echo "🔒 HTTPS: https://localhost:3000 (需要 SSL 憑證)"
echo ""
echo "按 Ctrl+C 停止伺服器"

# 啟動伺服器
npm start
`;

fs.writeFileSync(path.join(packagePath, 'start.sh'), startScript);
fs.chmodSync(path.join(packagePath, 'start.sh'), '755');

// 建立 Windows 啟動腳本
const startScriptWin = `@echo off
echo 🚀 啟動 Time Tracker 應用程式...

REM 檢查環境變數
if not exist ".env" (
    echo ❌ 缺少 .env 檔案
    echo 請複製 .env.example 並設定必要的環境變數
    pause
    exit /b 1
)

REM 檢查 node_modules
if not exist "node_modules" (
    echo 📦 安裝依賴套件...
    npm install
)

REM 檢查 Prisma 客戶端
if not exist "node_modules\\.prisma" (
    echo 🔧 生成 Prisma 客戶端...
    npx prisma generate
)

REM 檢查建置檔案
if not exist ".next" (
    echo 🏗️  建置應用程式...
    npm run build
)

echo ✅ 啟動伺服器...
echo 🌐 HTTP: http://localhost:3000
echo 🔒 HTTPS: https://localhost:3000 (需要 SSL 憑證)
echo.
echo 按 Ctrl+C 停止伺服器

REM 啟動伺服器
npm start
pause
`;

fs.writeFileSync(path.join(packagePath, 'start.bat'), startScriptWin);

// 建立壓縮檔案
console.log('\n🗜️  建立壓縮檔案...');

try {
  // 建立 tar.gz
  const tarCommand = `tar -czf ${packageDir}.tar.gz -C ${path.dirname(packagePath)} ${path.basename(packagePath)}`;
  execSync(tarCommand, { stdio: 'inherit' });
  console.log(`✅ 建立: ${packageDir}.tar.gz`);
  
  // 建立 zip
  const zipCommand = `zip -r ${packageDir}.zip ${packageDir}`;
  execSync(zipCommand, { stdio: 'inherit' });
  console.log(`✅ 建立: ${packageDir}.zip`);
  
} catch (error) {
  console.log('⚠️  壓縮失敗，但打包目錄已建立');
}

// 清理打包目錄
console.log(`🗑️  清理打包目錄: ${packageDir}`);
fs.rmSync(packagePath, { recursive: true, force: true });

console.log('\n🎉 打包完成！');
console.log(`📦 壓縮檔案: ${packageDir}.tar.gz 和 ${packageDir}.zip`);
console.log('\n📋 部署步驟:');
console.log('1. 解壓縮檔案到目標目錄');
console.log('2. 設定環境變數 (.env)');
console.log('3. 執行: npm install');
console.log('4. 執行: npx prisma migrate deploy');
console.log('5. 執行: npm run build');
console.log('6. 執行: npm start 或 npm run start:https'); 