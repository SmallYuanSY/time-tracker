const webpush = require('web-push');

// 生成 VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys 已生成：');
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
console.log('\n將這些金鑰加入到 .env.local 檔案中：');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey); 