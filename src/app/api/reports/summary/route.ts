import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get summary statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const businessId = session.user.businessId

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Today's stats
    const [todayOrders, todayRevenue] = await Promise.all([
      prisma.order.count({
        where: {
          businessId,
          createdAt: { gte: todayStart },
        },
      }),
      prisma.order.aggregate({
        where: {
          businessId,
          createdAt: { gte: todayStart },
          status: { not: "CANCELLED" },
        },
        _sum: { total: true },
      }),
    ])

    // Week's stats
    const [weekOrders, weekRevenue] = await Promise.all([
      prisma.order.count({
        where: {
          businessId,
          createdAt: { gte: weekStart },
        },
      }),
      prisma.order.aggregate({
        where: {
          businessId,
          createdAt: { gte: weekStart },
          status: { not: "CANCELLED" },
        },
        _sum: { total: true },
      }),
    ])

    // Month's stats
    const [monthOrders, monthRevenue] = await Promise.all([
      prisma.order.count({
        where: {
          businessId,
          createdAt: { gte: monthStart },
        },
      }),
      prisma.order.aggregate({
        where: {
          businessId,
          createdAt: { gte: monthStart },
          status: { not: "CANCELLED" },
        },
        _sum: { total: true },
      }),
    ])

    // All-time stats
    const [totalOrders, totalRevenue, totalCustomers, totalProducts] = await Promise.all([
      prisma.order.count({ where: { businessId } }),
      prisma.order.aggregate({
        where: {
          businessId,
          status: { not: "CANCELLED" },
        },
        _sum: { total: true },
      }),
      prisma.customer.count({
        where: { businessId, isActive: true },
      }),
      prisma.product.count({
        where: { businessId, isActive: true },
      }),
    ])

    // Order status breakdown
    const statusBreakdown = await prisma.order.groupBy({
      by: ["status"],
      where: { businessId },
      _count: { status: true },
    })

    // Payment status breakdown
    const paymentBreakdown = await prisma.order.groupBy({
      by: ["paymentStatus"],
      where: { businessId },
      _count: { paymentStatus: true },
    })

    return NextResponse.json({
      today: {
        orders: todayOrders,
        revenue: Number(todayRevenue._sum.total || 0),
      },
      week: {
        orders: weekOrders,
        revenue: Number(weekRevenue._sum.total || 0),
      },
      month: {
        orders: monthOrders,
        revenue: Number(monthRevenue._sum.total || 0),
      },
      allTime: {
        orders: totalOrders,
        revenue: Number(totalRevenue._sum.total || 0),
        customers: totalCustomers,
        products: totalProducts,
      },
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      paymentBreakdown: paymentBreakdown.map((item) => ({
        status: item.paymentStatus,
        count: item._count.paymentStatus,
      })),
    })
  } catch (error) {
    console.error("Error fetching summary:", error)
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    )
  }
}
