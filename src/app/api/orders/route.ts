import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
})

const createOrderSchema = z.object({
  customerId: z.string(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER"]).default("CASH"),
})

// GET - List all orders with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || ""
    const customerId = searchParams.get("customerId") || ""

    const where: any = {
      businessId: session.user.businessId,
    }

    if (status) {
      where.status = status
    }

    if (customerId) {
      where.customerId = customerId
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}

// POST - Create new order with atomic inventory transaction
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createOrderSchema.parse(body)

    const businessId = session.user.businessId

    // Verify customer belongs to business
    const customer = await prisma.customer.findFirst({
      where: {
        id: validatedData.customerId,
        businessId,
        isActive: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Use transaction to ensure atomic operation
    const order = await prisma.$transaction(async (tx) => {
      // 1. Fetch all products and validate availability
      const productIds = validatedData.items.map((item) => item.productId)
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          businessId,
          isActive: true,
        },
      })

      if (products.length !== productIds.length) {
        throw new Error("One or more products not found")
      }

      // 2. Build items map and calculate total
      const productsMap = new Map(products.map((p) => [p.id, p]))
      let total = 0
      const orderItems: Array<{
        productId: string
        productName: string
        quantity: number
        pricePerUnit: number
        subtotal: number
      }> = []

      for (const item of validatedData.items) {
        const product = productsMap.get(item.productId)
        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }

        // Check inventory availability
        if (product.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
          )
        }

        const pricePerUnit = Number(product.price)
        const subtotal = pricePerUnit * item.quantity
        total += subtotal

        orderItems.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          pricePerUnit,
          subtotal,
        })
      }

      // 3. Generate order number
      const lastOrder = await tx.order.findFirst({
        where: { businessId },
        orderBy: { orderNumber: "desc" },
      })

      const lastNumber = lastOrder
        ? parseInt(lastOrder.orderNumber.replace(/\D/g, ""))
        : 0
      const orderNumber = `ORD-${String(lastNumber + 1).padStart(5, "0")}`

      // 4. Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          businessId,
          customerId: validatedData.customerId,
          subtotal: total,
          tax: 0,
          discount: 0,
          deliveryFee: 0,
          total,
          status: "PENDING",
          paymentMethod: validatedData.paymentMethod,
          paymentStatus: "UNPAID",
          deliveryAddress: validatedData.deliveryAddress,
          notes: validatedData.notes,
          createdById: session.user.id!,
          items: {
            create: orderItems,
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      // 5. Deduct inventory atomically
      for (const item of validatedData.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        })
      }

      // 6. Update customer stats
      await tx.customer.update({
        where: { id: validatedData.customerId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: total },
        },
      })

      return newOrder
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Error creating order:", error)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}
