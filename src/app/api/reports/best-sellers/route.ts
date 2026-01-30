import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get best selling products
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "all" // all, today, week, month
    const limit = parseInt(searchParams.get("limit") || "10")

    const businessId = session.user.businessId

    // Calculate date range
    let dateFilter = {}
    const now = new Date()

    if (period === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      dateFilter = { gte: todayStart }
    } else if (period === "week") {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      dateFilter = { gte: weekStart }
    } else if (period === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      dateFilter = { gte: monthStart }
    }

    // Get best sellers with aggregated data
    const bestSellers = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          businessId,
          status: { not: "CANCELLED" },
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: limit,
    })

    // Fetch product details
    const productIds = bestSellers.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        quantity: true,
        category: true,
      },
    })

    const productsMap = new Map(products.map((p) => [p.id, p]))

    // Combine data
    const results = bestSellers.map((item) => {
      const product = productsMap.get(item.productId)
      return {
        productId: item.productId,
        productName: product?.name || "Unknown Product",
        category: product?.category,
        currentPrice: product ? Number(product.price) : 0,
        currentStock: product?.quantity || 0,
        totalQuantitySold: item._sum.quantity || 0,
        totalRevenue: Number(item._sum.subtotal || 0),
        orderCount: item._count.id,
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching best sellers:", error)
    return NextResponse.json(
      { error: "Failed to fetch best sellers" },
      { status: 500 }
    )
  }
}
