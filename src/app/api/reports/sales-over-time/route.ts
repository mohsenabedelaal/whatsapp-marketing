import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get sales over time for charts
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "week" // week, month
    const businessId = session.user.businessId

    const now = new Date()
    let startDate: Date
    let groupBy: "day" | "week"

    if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      groupBy = "day"
    } else {
      // Default to last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      groupBy = "day"
    }

    // Fetch orders in the period
    const orders = await prisma.order.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate },
        status: { not: "CANCELLED" },
      },
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Group by date
    const salesByDate = new Map<string, { revenue: number; orders: number }>()

    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split("T")[0] // YYYY-MM-DD
      const existing = salesByDate.get(date) || { revenue: 0, orders: 0 }
      salesByDate.set(date, {
        revenue: existing.revenue + Number(order.total),
        orders: existing.orders + 1,
      })
    })

    // Fill in missing dates with zeros
    const result = []
    const currentDate = new Date(startDate)
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split("T")[0]
      const data = salesByDate.get(dateStr) || { revenue: 0, orders: 0 }
      result.push({
        date: dateStr,
        revenue: data.revenue,
        orders: data.orders,
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching sales over time:", error)
    return NextResponse.json(
      { error: "Failed to fetch sales data" },
      { status: 500 }
    )
  }
}
