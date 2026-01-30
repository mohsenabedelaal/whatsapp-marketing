import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendTextMessage } from "@/lib/whatsapp"

// POST - Send order status notification to customer via WhatsApp
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const businessId = session.user.businessId

    const order = await prisma.order.findFirst({
      where: { id, businessId },
      include: {
        customer: true,
        items: true,
        business: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const phone = order.customer.phone.replace(/[^0-9]/g, "")
    if (!phone) {
      return NextResponse.json(
        { error: "Customer has no phone number" },
        { status: 400 }
      )
    }

    // Build notification message
    const itemsList = order.items
      .map((item) => `  - ${item.productName} x${item.quantity}`)
      .join("\n")

    const statusMessages: Record<string, string> = {
      PENDING: "Your order has been received and is pending confirmation.",
      CONFIRMED: "Your order has been confirmed!",
      PREPARING: "Your order is being prepared.",
      READY: "Your order is ready for pickup/delivery!",
      DELIVERED: "Your order has been delivered. Thank you!",
      CANCELLED: "Your order has been cancelled.",
    }

    const statusText = statusMessages[order.status] || `Order status: ${order.status}`

    const message = [
      `*${order.business.name}*`,
      `Order: ${order.orderNumber}`,
      "",
      statusText,
      "",
      `Items:`,
      itemsList,
      "",
      `Total: $${Number(order.total).toFixed(2)}`,
      `Payment: ${order.paymentStatus}`,
    ].join("\n")

    const { messageId } = await sendTextMessage(phone, message)

    // Store the outbound message
    // Find or create conversation for this customer
    let conversation = await prisma.conversation.findFirst({
      where: { businessId, whatsappNumber: phone },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          businessId,
          whatsappNumber: phone,
          name: order.customer.name,
          customerId: order.customer.id,
        },
      })
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        businessId,
        content: message,
        direction: "OUTBOUND",
        messageType: "TEXT",
        whatsappMessageId: messageId,
        status: "SENT",
        orderId: order.id,
      },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    })

    return NextResponse.json({ success: true, messageId })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    )
  }
}
