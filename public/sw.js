// Jobsner Service Worker for Web Push & Background Notifications
const CACHE_NAME = 'jobsner-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for Push Events from Web Push Protocol
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Jobsner Notification', message: event.data.text() };
    }
  }

  const title = data.title || '🚨 New Candidate Allocated | Jobsner';
  const options = {
    body: data.message || 'A new verified candidate has been allocated to your job posting.',
    icon: '/jobsner-logo.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    data: data.data || data.metadata || { url: '/' },
    tag: data.tag || 'jobsner-notification',
    renotify: true,
    actions: [
      { action: 'view', title: '👁 View Candidate' },
      { action: 'close', title: '✕ Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click: Focus active tab or open candidate view
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            payload: event.notification.data
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Listen for direct messages from client to trigger system notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_POPUP_NOTIFICATION') {
    const payload = event.data.payload || {};
    const title = payload.title || '🚨 Jobsner Alert';
    const options = {
      body: payload.message || '',
      icon: '/jobsner-logo.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      data: payload.metadata || {},
      tag: payload.id || `notif-${Date.now()}`,
      renotify: true
    };
    self.registration.showNotification(title, options);
  }
});
