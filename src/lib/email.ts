const RESEND_API_KEY = process.env.RESEND_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.EMAIL_FROM || 'PropIntel <noreply@propintel.com>'

export type EmailResult = {
  sent: boolean
  reason?: string
  id?: string
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.warn('[email] No RESEND_API_KEY configured — email not sent to', to)
    return { sent: false, reason: 'no_api_key' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      console.error('[email] Send failed:', err)
      return { sent: false, reason: err.message || 'send_failed' }
    }

    const data = await res.json()
    return { sent: true, id: data.id }
  } catch (err) {
    console.error('[email] Send error:', err)
    return { sent: false, reason: 'network_error' }
  }
}

export function getAppUrl(): string {
  return APP_URL
}
