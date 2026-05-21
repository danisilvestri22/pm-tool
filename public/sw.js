self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'PM Tool', {
      body: data.body,
      icon: '/favicon.ico',
      data: data.url ? { url: data.url } : undefined,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url))
  }
})
