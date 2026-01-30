import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendTextMessage } from "@/lib/whatsapp"

// GET - List conversations
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const businessId = session.user.businessId
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || ""

    const where: any = { businessId }
    if (status) where.status = status

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
    })

    return NextResponse.json(conversations)
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}

const sendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1),
})

// POST - Send a message in a conversation
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const businessId = session.user.businessId
    const body = await request.json()
    const { conversationId, content } = sendMessageSchema.parse(body)

    // Verify conversation belongs to business
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    // Send via WhatsApp API
    const { messageId: whatsappMessageId } = await sendTextMessage(
      conversation.whatsappNumber,
      content
    )

    // Store in database
    const message = await prisma.message.create({
      data: {
        conversationId,
        businessId,
        content,
        direction: "OUTBOUND",
        messageType: "TEXT",
        whatsappMessageId,
        status: "SENT",
      },
    })

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error("Error sending message:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
