import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { parseWhatsAppMessage, matchProductsToItems } from "@/utils/whatsapp-parser"

const parseSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
})

// POST - Parse WhatsApp message
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { message } = parseSchema.parse(body)

    // Fetch all active products for matching
    const products = await prisma.product.findMany({
      where: {
        businessId: session.user.businessId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        quantity: true,
      },
    })

    // Parse the message
    const parseResult = parseWhatsAppMessage(message)

    // Match parsed items to products
    const matchedItems = matchProductsToItems(
      parseResult.items,
      products.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: p.quantity,
      }))
    )

    return NextResponse.json({
      items: matchedItems,
      unparsedLines: parseResult.unparsedLines,
      totalItems: parseResult.totalItems,
      matchedCount: matchedItems.filter(item => item.matchedProductId).length,
      unmatchedCount: matchedItems.filter(item => !item.matchedProductId).length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error parsing WhatsApp message:", error)
    return NextResponse.json(
      { error: "Failed to parse message" },
      { status: 500 }
    )
  }
}
