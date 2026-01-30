import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  verifyWebhookSignature,
  extractMessageFromWebhook,
} from "@/lib/whatsapp"
import {
  parseWhatsAppMessage,
  matchProductsToItems,
} from "@/utils/whatsapp-parser"

// POST - Receive incoming WhatsApp messages from Twilio
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const fields: Record<string, string> = {}
    formData.forEach((value, key) => {
      fields[key] = value.toString()
    })

    // Verify Twilio signature
    const twilioSignature = request.headers.get("x-twilio-signature")
    const webhookUrl = request.url
    if (process.env.TWILIO_AUTH_TOKEN && !verifyWebhookSignature(webhookUrl, fields, twilioSignature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const messageData = extractMessageFromWebhook(fields)

    if (!messageData) {
      return new NextResponse("<Response/>", {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      })
    }

    // Find the business by WhatsApp number configured
    const business = await prisma.business.findFirst({
      where: { whatsappNumber: { not: null } },
    })

    if (!business) {
      console.error("No business configured for WhatsApp")
      return new NextResponse("<Response/>", {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      })
    }

    const businessId = business.id

    // Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        businessId_whatsappNumber: {
          businessId,
          whatsappNumber: messageData.from,
        },
      },
    })

    if (!conversation) {
      // Try to match with existing customer by phone
      const customer = await prisma.customer.findFirst({
        where: {
          businessId,
          phone: { contains: messageData.from.slice(-10) },
          isActive: true,
        },
      })

      conversation = await prisma.conversation.create({
        data: {
          businessId,
          whatsappNumber: messageData.from,
          name: messageData.name,
          customerId: customer?.id || null,
          lastMessageAt: new Date(messageData.timestamp),
          unreadCount: 1,
        },
      })
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(messageData.timestamp),
          unreadCount: { increment: 1 },
          name: messageData.name,
          status: "OPEN",
        },
      })
    }

    // Store message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        businessId,
        content: messageData.text,
        direction: "INBOUND",
        messageType: "TEXT",
        whatsappMessageId: messageData.messageId,
        status: "DELIVERED",
      },
    })

    // Auto-parse: check if message looks like an order
    if (messageData.text && messageData.type === "text") {
      const parsed = parseWhatsAppMessage(messageData.text)
      if (parsed.items.length > 0) {
        // Fetch products for fuzzy matching
        const products = await prisma.product.findMany({
          where: { businessId, isActive: true },
        })

        const matchedItems = matchProductsToItems(
          parsed.items,
          products.map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            quantity: p.quantity,
          }))
        )

        const hasMatches = matchedItems.some((i) => i.matchedProductId)

        if (hasMatches && conversation.customerId) {
          // Create draft order from matched items
          try {
            const validItems = matchedItems.filter((i) => i.matchedProductId)
            const productMap = new Map(products.map((p) => [p.id, p]))

            let total = 0
            const orderItems = validItems.map((item) => {
              const product = productMap.get(item.matchedProductId!)!
              const pricePerUnit = Number(product.price)
              const subtotal = pricePerUnit * item.quantity
              total += subtotal
              return {
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                pricePerUnit,
                subtotal,
              }
            })

            // Generate order number
            const lastOrder = await prisma.order.findFirst({
              where: { businessId },
              orderBy: { orderNumber: "desc" },
            })
            const lastNumber = lastOrder
              ? parseInt(lastOrder.orderNumber.replace(/\D/g, ""))
              : 0
            const orderNumber = `ORD-${String(lastNumber + 1).padStart(5, "0")}`

            // Find a user to assign as creator (owner)
            const owner = await prisma.user.findFirst({
              where: { businessId, role: "OWNER" },
            })

            if (owner) {
              const order = await prisma.order.create({
                data: {
                  orderNumber,
                  businessId,
                  customerId: conversation.customerId,
                  subtotal: total,
                  tax: 0,
                  discount: 0,
                  deliveryFee: 0,
                  total,
                  status: "PENDING",
                  paymentMethod: "CASH",
                  paymentStatus: "UNPAID",
                  notes: `Auto-parsed from WhatsApp message:\n${messageData.text}`,
                  importedFromWhatsapp: true,
                  createdById: owner.id,
                  items: { create: orderItems },
                },
              })

              // Link message to the draft order
              await prisma.message.update({
                where: { id: message.id },
                data: { orderId: order.id },
              })
            }
          } catch (err) {
            console.error("Failed to auto-create draft order:", err)
          }
        }
      }
    }

    // Return empty TwiML response
    return new NextResponse("<Response/>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    })
  } catch (error) {
    console.error("Webhook error:", error)
    // Always return 200 to prevent Twilio from retrying
    return new NextResponse("<Response/>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    })
  }
}
