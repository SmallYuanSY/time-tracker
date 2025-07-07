#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function configureDomain() {
  console.log('🌐 時間追蹤系統 - 網域配置工具');
  console.log('=====================================\n');

  // 收集網域資訊
  const domain = await question('請輸入你的網域名稱 (例如: timetracker.example.com): ');
  
  if (!domain || !domain.includes('.')) {
    console.log('❌ 請輸入有效的網域名稱');
    process.exit(1);
  }

  console.log('\n📋 選擇部署方式:');
  console.log('1. Vercel 部署 (推薦)');
  console.log('2. 自架伺服器部署');
  console.log('3. Docker 部署');
  
  const deployMethod = await question('\n選擇部署方式 (1-3): ');

  // 設定環境變數
  await updateEnvironmentVariables(domain);

  // 根據部署方式提供指引
  switch (deployMethod) {
    case '1':
      await configureVercel(domain);
      break;
    case '2':
      await configureSelfHosted(domain);
      break;
    case '3':
      await configureDocker(domain);
      break;
    default:
      console.log('❌ 無效的選擇');
      process.exit(1);
  }

  console.log('\n✅ 網域配置完成！');
  rl.close();
}

async function updateEnvironmentVariables(domain) {
  console.log('\n🔧 更新環境變數...');
  
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  // 讀取現有的 .env 檔案（如果存在）
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // 更新或新增 NEXTAUTH_URL
  const nextAuthUrl = `https://${domain}`;
  
  if (envContent.includes('NEXTAUTH_URL=')) {
    envContent = envContent.replace(/NEXTAUTH_URL=.*$/m, `NEXTAUTH_URL="${nextAuthUrl}"`);
  } else {
    envContent += `\nNEXTAUTH_URL="${nextAuthUrl}"`;
  }

  // 確保有 NEXTAUTH_SECRET
  if (!envContent.includes('NEXTAUTH_SECRET=')) {
    const secret = require('crypto').randomBytes(32).toString('base64');
    envContent += `\nNEXTAUTH_SECRET="${secret}"`;
  }

  // 寫入檔案
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log('✅ 環境變數已更新');
}

async function configureVercel(domain) {
  console.log('\n🚀 Vercel 部署配置');
  console.log('==================');
  
  // 更新 vercel.json
  const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
  let vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  
  vercelConfig.env = {
    ...vercelConfig.env,
    "NEXTAUTH_URL": `https://${domain}`
  };
  
  fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
  
  console.log('✅ vercel.json 已更新');
  console.log('\n📋 接下來的步驟:');
  console.log('1. 提交變更到 Git:');
  console.log('   git add .');
  console.log('   git commit -m "配置自訂網域"');
  console.log('   git push');
  console.log('\n2. 在 Vercel 儀表板中:');
  console.log(`   - 前往你的專案設定`);
  console.log(`   - 在 "Domains" 部分添加: ${domain}`);
  console.log(`   - 按照指示設定 DNS 記錄`);
  console.log('\n3. DNS 設定範例:');
  console.log(`   類型: CNAME`);
  console.log(`   名稱: ${domain.split('.')[0]} (或 @)`);
  console.log(`   值: cname.vercel-dns.com`);
}

async function configureSelfHosted(domain) {
  console.log('\n🏠 自架伺服器部署配置');
  console.log('=====================');
  
  const serverIp = await question('輸入伺服器 IP 地址: ');
  
  // 建立 Nginx 配置
  const nginxConfig = `server {
    listen 80;
    server_name ${domain};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain};

    # SSL 憑證（Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_private_key /etc/letsencrypt/live/${domain}/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # 反向代理到 Next.js 應用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}`;

  fs.writeFileSync(`nginx-${domain}.conf`, nginxConfig);
  
  console.log('✅ Nginx 配置檔已建立');
  console.log('\n📋 部署步驟:');
  console.log('\n1. DNS 設定:');
  console.log(`   類型: A`);
  console.log(`   名稱: ${domain.split('.')[0]} (或 @)`);
  console.log(`   值: ${serverIp}`);
  console.log('\n2. 伺服器設定:');
  console.log(`   sudo cp nginx-${domain}.conf /etc/nginx/sites-available/${domain}`);
  console.log(`   sudo ln -s /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/`);
  console.log(`   sudo nginx -t`);
  console.log('\n3. 取得 SSL 憑證:');
  console.log(`   sudo certbot --nginx -d ${domain}`);
  console.log('\n4. 啟動應用:');
  console.log('   npm run build');
  console.log('   pm2 start npm --name "time-tracker" -- start');
  console.log('   sudo systemctl restart nginx');
}

async function configureDocker(domain) {
  console.log('\n🐳 Docker 部署配置');
  console.log('==================');
  
  // 更新 docker-compose.yml
  const dockerComposePath = path.join(process.cwd(), 'docker-compose.yml');
  let dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
  
  // 添加環境變數
  if (!dockerComposeContent.includes('NEXTAUTH_URL')) {
    dockerComposeContent = dockerComposeContent.replace(
      /environment:\s*$/m,
      `environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=https://${domain}`
    );
  }
  
  fs.writeFileSync(dockerComposePath, dockerComposeContent);
  
  console.log('✅ docker-compose.yml 已更新');
  console.log('\n📋 部署步驟:');
  console.log('1. 建置並啟動容器:');
  console.log('   docker-compose up -d --build');
  console.log('\n2. 設定反向代理 (使用 Traefik 或 Nginx)');
  console.log('\n3. DNS 設定指向你的伺服器 IP');
}

// 執行主函數
configureDomain().catch(console.error); 