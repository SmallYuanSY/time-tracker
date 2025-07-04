const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 部署環境檢查...\n');

// 檢查 Node.js 版本
try {
  const nodeVersion = process.version;
  console.log(`✅ Node.js 版本: ${nodeVersion}`);
  
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    console.log('⚠️  建議使用 Node.js 18+ 版本');
  }
} catch (error) {
  console.log('❌ 無法檢查 Node.js 版本');
}

// 檢查 npm 版本
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm 版本: ${npmVersion}`);
} catch (error) {
  console.log('❌ 無法檢查 npm 版本');
}

// 檢查必要檔案
const requiredFiles = [
  'package.json',
  'next.config.ts',
  'tsconfig.json',
  'tailwind.config.js'
];

console.log('\n📋 檢查必要檔案...');
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ 缺少: ${file}`);
  }
}

// 檢查環境變數檔案
console.log('\n🔐 檢查環境變數...');
const envFiles = ['.env', '.env.local', '.env.production'];
let envFound = false;

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    console.log(`✅ ${envFile}`);
    envFound = true;
    
    // 讀取並檢查環境變數
    const envContent = fs.readFileSync(envFile, 'utf8');
    const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
    
    for (const varName of requiredVars) {
      if (envContent.includes(varName)) {
        console.log(`  ✅ ${varName}`);
      } else {
        console.log(`  ⚠️  缺少: ${varName}`);
      }
    }
  }
}

if (!envFound) {
  console.log('❌ 缺少環境變數檔案 (.env)');
  console.log('請建立 .env 檔案並設定必要的環境變數');
}

// 檢查端口可用性
console.log('\n🔌 檢查端口可用性...');
const ports = [3000, 3001];

for (const port of ports) {
  try {
    const result = execSync(`lsof -i :${port}`, { encoding: 'utf8' });
    if (result.trim()) {
      console.log(`⚠️  端口 ${port} 已被占用`);
      console.log(`    ${result.split('\n')[0]}`);
    } else {
      console.log(`✅ 端口 ${port} 可用`);
    }
  } catch (error) {
    console.log(`✅ 端口 ${port} 可用`);
  }
}

// 檢查資料庫連線
console.log('\n🗄️  檢查資料庫連線...');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
  
  if (dbUrlMatch) {
    const dbUrl = dbUrlMatch[1];
    console.log(`✅ 找到資料庫連線: ${dbUrl.split('@')[1] || '已設定'}`);
    
    // 檢查 Prisma 是否可用
    try {
      execSync('npx prisma --version', { stdio: 'ignore' });
      console.log('✅ Prisma CLI 可用');
    } catch (error) {
      console.log('❌ Prisma CLI 不可用，請執行: npm install');
    }
  } else {
    console.log('❌ 缺少 DATABASE_URL');
  }
}

// 檢查 SSL 憑證
console.log('\n🔒 檢查 SSL 憑證...');
const sslDir = path.join(__dirname, '..', 'ssl');
if (fs.existsSync(sslDir)) {
  const certFiles = ['localhost.crt', 'localhost.key'];
  for (const certFile of certFiles) {
    if (fs.existsSync(path.join(sslDir, certFile))) {
      console.log(`✅ SSL 憑證: ${certFile}`);
    } else {
      console.log(`❌ 缺少 SSL 憑證: ${certFile}`);
    }
  }
} else {
  console.log('ℹ️  未找到 SSL 憑證目錄');
  console.log('如需 HTTPS，請執行: npm run generate:ssl');
}

console.log('\n📋 部署建議:');
console.log('1. 確保所有必要檔案存在');
console.log('2. 設定正確的環境變數');
console.log('3. 確保端口 3000 和 3001 可用');
console.log('4. 檢查資料庫連線');
console.log('5. 如需 HTTPS，生成 SSL 憑證');

console.log('\n🚀 準備部署命令:');
console.log('npm install');
console.log('npx prisma migrate deploy');
console.log('npx prisma generate');
console.log('npm run build');
console.log('npm start 或 npm run start:https'); 