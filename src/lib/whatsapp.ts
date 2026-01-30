/**
 * Twilio WhatsApp API Client
 * Handles sending messages and webhook validation for Twilio's WhatsApp sandbox/API
 */

import twilio from "twilio"

function getConfig() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER!,
  }
}

function getClient() {
  const { accountSid, authToken } = getConfig()
  return twilio(accountSid, authToken)
}

/**
 * Send a text message via Twilio WhatsApp API
 */
export async function sendTextMessage(to: string, text: string): Promise<{ messageId: string }> {
  const { whatsappNumber } = getConfig()
  const client = getClient()

  // Ensure numbers are in whatsapp: format
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:+${to.replace(/^\+/, "")}`
  const fromFormatted = `whatsapp:+${whatsappNumber.replace(/^\+/, "")}`

  const message = await client.messages.create({
    body: text,
    from: fromFormatted,
    to: toFormatted,
  })

  return { messageId: message.sid }
}

/**
 * Verify webhook signature from Twilio
 */
export function verifyWebhookSignature(
  url: string,
  params: Record<string, string>,
  twilioSignature: string | null
): boolean {
  if (!twilioSignature) return false

  const { authToken } = getConfig()
  return twilio.validateRequest(authToken, twilioSignature, url, params)
}

/**
 * Extract message data from a Twilio webhook payload (form-data fields)
 */
export function extractMessageFromWebhook(fields: Record<string, string>): {
  from: string
  name: string
  messageId: string
  text: string
  type: string
  timestamp: number
} | null {
  try {
    const body = fields.Body
    const from = fields.From // format: whatsapp:+1234567890
    const messageSid = fields.MessageSid
    const profileName = fields.ProfileName

    if (!from || !messageSid) return null

    // Strip the "whatsapp:" prefix for storage
    const phoneNumber = from.replace("whatsapp:", "")

    return {
      from: phoneNumber,
      name: profileName || phoneNumber,
      messageId: messageSid,
      text: body || "",
      type: "text",
      timestamp: Date.now(),
    }
  } catch {
    return null
  }
}
