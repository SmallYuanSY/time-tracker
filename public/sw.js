// 監聽推送事件
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/'
      },
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 監聽通知點擊事件
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // 如果通知包含 URL，則開啟該 URL
  const urlToOpen = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(function(clientList) {
      // 檢查是否已有開啟的視窗
      for (let client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // 如果沒有開啟的視窗，則開啟新視窗
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
}); 