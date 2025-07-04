const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 檢查憑證是否存在
const sslDir = path.join(__dirname, '..', 'ssl');
const certPath = path.join(sslDir, 'localhost.crt');
const keyPath = path.join(sslDir, 'localhost.key');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log('❌ SSL 憑證不存在，請先執行: npm run generate:ssl');
  process.exit(1);
}

// 讀取 SSL 憑證
const options = {
  cert: fs.readFileSync(certPath),
  key: fs.readFileSync(keyPath)
};

console.log('🚀 啟動 HTTPS 伺服器...');
console.log('📝 注意：使用自簽名憑證，瀏覽器會顯示安全警告');
console.log('🔗 訪問: https://localhost:3000');

// 啟動 Next.js 伺服器在 HTTP 端口
const nextServer = spawn('npx', [
  'next',
  'start',
  '--port', '3001'  // 在內部端口 3001 啟動
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: '3001'
  }
});

// 等待一下讓 Next.js 伺服器啟動
setTimeout(() => {
  // 建立 HTTPS 代理伺服器
  const httpsServer = https.createServer(options, (req, res) => {
    // 代理請求到 Next.js 伺服器
    const proxyReq = require('http').request({
      hostname: 'localhost',
      port: 3001,
      path: req.url,
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    req.pipe(proxyReq);
  });

  httpsServer.listen(3000, () => {
    console.log('✅ HTTPS 伺服器已啟動在 https://localhost:3000');
  });

  httpsServer.on('error', (error) => {
    console.error('❌ HTTPS 伺服器錯誤:', error);
    process.exit(1);
  });

  // 優雅關閉
  process.on('SIGINT', () => {
    console.log('\n🛑 正在關閉伺服器...');
    httpsServer.close();
    nextServer.kill();
    process.exit(0);
  });

}, 2000);

nextServer.on('error', (error) => {
  console.error('❌ Next.js 伺服器錯誤:', error);
  process.exit(1);
});

nextServer.on('close', (code) => {
  console.log(`Next.js 伺服器已關閉，退出碼: ${code}`);
  process.exit(code);
}); 