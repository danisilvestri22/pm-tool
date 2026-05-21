import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_CONTACT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: { title: string; body: string; url?: string },
) {
  await webpush.sendNotification(
    subscription as webpush.PushSubscription,
    JSON.stringify(payload),
  )
}
