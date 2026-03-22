// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDmaff-5_UXtil0ZtESAtzMqEl-1SgznBI",
  authDomain:        "smart-ledger-ai-759b7.firebaseapp.com",
  projectId:         "smart-ledger-ai-759b7",
  storageBucket:     "smart-ledger-ai-759b7.firebasestorage.app",
  messagingSenderId: "944905505473",
  appId:             "1:944905505473:web:fdabb655c6bd733933a240",
});

const messaging = firebase.messaging();

// バックグラウンド通知の受信
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification ?? {};
  self.registration.showNotification(title ?? "SmartLedger AI", {
    body:  body  ?? "",
    icon:  icon  ?? "/icon-192.png",
    badge: "/icon-192.png",
    data:  payload.data,
  });
});

// 通知クリック → アプリを開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});