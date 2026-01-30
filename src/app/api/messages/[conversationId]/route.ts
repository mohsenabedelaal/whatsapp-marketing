import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Messages in a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId } = await params
    const businessId = session.user.businessId

    // Verify conversation belongs to business
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    const messages = await prisma.message.findMany({
      where: { conversationId, businessId },
      include: {
        order: { select: { id: true, orderNumber: true, status: true, total: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    // Mark conversation as read
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    })

    return NextResponse.json({ conversation, messages })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}
