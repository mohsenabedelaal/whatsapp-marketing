import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "DELIVERED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["UNPAID", "PAID", "PARTIAL"]).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER"]).optional(),
  notes: z.string().optional(),
  deliveryAddress: z.string().optional(),
})

// GET - Get single order with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const order = await prisma.order.findFirst({
      where: {
        id,
        businessId: session.user.businessId,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    )
  }
}

// PATCH - Update order status and details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const body = await request.json()
    const validatedData = updateOrderSchema.parse(body)

    // Check if order exists and belongs to user's business
    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        businessId: session.user.businessId,
      },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Prevent updating cancelled orders
    if (existingOrder.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot update a cancelled order" },
        { status: 400 }
      )
    }

    const order = await prisma.order.update({
      where: { id },
      data: validatedData,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating order:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}

// DELETE - Cancel order and restore inventory
export async function DELETE(
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

    // Use transaction to ensure atomic operation
    await prisma.$transaction(async (tx) => {
      // 1. Fetch order with items
      const order = await tx.order.findFirst({
        where: {
          id,
          businessId,
        },
        include: {
          items: true,
        },
      })

      if (!order) {
        throw new Error("Order not found")
      }

      if (order.status === "CANCELLED") {
        throw new Error("Order is already cancelled")
      }

      if (order.status === "DELIVERED") {
        throw new Error("Cannot cancel a delivered order")
      }

      // 2. Restore inventory
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        })
      }

      // 3. Update customer stats
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          totalOrders: { decrement: 1 },
          totalSpent: { decrement: Number(order.total) },
        },
      })

      // 4. Mark order as cancelled
      await tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          // Keep payment status as-is for cancelled orders
        },
      })
    })

    return NextResponse.json({ message: "Order cancelled successfully" })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Error cancelling order:", error)
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    )
  }
}
