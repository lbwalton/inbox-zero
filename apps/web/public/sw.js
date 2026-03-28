/// <reference lib="webworker" />

/**
 * Bntly Service Worker for push notifications.
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "Bntly",
      body: event.data.text(),
    };
  }

  const title = data.title || "Bntly Notification";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: data.tag || "bntly-notification",
    data: {
      url: data.url || "/",
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let url = event.notification.data?.url || "/";
  // Prevent open redirect: only allow same-origin or relative URLs
  try {
    const parsed = new URL(url, self.location.origin);
    if (parsed.origin !== self.location.origin) {
      url = "/";
    }
  } catch {
    url = "/";
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        // Open a new window if none found
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      }),
  );
});
