import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Package, ShoppingCart, Users, TrendingUp, AlertTriangle } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()

  if (!session || !session.user.businessId) {
    redirect('/login')
  }

  const businessId = session.user.businessId

  // Fetch dashboard statistics
  const [
    totalProducts,
    totalCustomers,
    totalOrders,
    pendingOrders,
    lowStockProducts,
    recentOrders,
    todayRevenue,
  ] = await Promise.all([
    prisma.product.count({ where: { businessId, isActive: true } }),
    prisma.customer.count({ where: { businessId, isActive: true } }),
    prisma.order.count({ where: { businessId } }),
    prisma.order.count({ where: { businessId, status: 'PENDING' } }),
    prisma.product.count({
      where: {
        businessId,
        isActive: true,
        quantity: { lte: prisma.product.fields.lowStockThreshold },
      },
    }),
    prisma.order.findMany({
      where: { businessId },
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.order.aggregate({
      where: {
        businessId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: {
        total: true,
      },
    }),
  ])

  const stats = [
    {
      title: "Today's Revenue",
      value: `$${Number(todayRevenue._sum.total || 0).toFixed(2)}`,
      icon: DollarSign,
      description: "Revenue generated today",
      trend: "+12.5% from yesterday",
    },
    {
      title: "Total Orders",
      value: totalOrders.toString(),
      icon: ShoppingCart,
      description: `${pendingOrders} pending orders`,
      trend: `${pendingOrders} orders awaiting processing`,
    },
    {
      title: "Products",
      value: totalProducts.toString(),
      icon: Package,
      description: "Active products in inventory",
      trend: lowStockProducts > 0 ? `${lowStockProducts} items low in stock` : "All items in stock",
      alert: lowStockProducts > 0,
    },
    {
      title: "Customers",
      value: totalCustomers.toString(),
      icon: Users,
      description: "Registered customers",
      trend: "+5 new this week",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session.user.name}! Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
                <p
                  className={`text-xs mt-2 flex items-center gap-1 ${
                    stat.alert ? "text-orange-600" : "text-green-600"
                  }`}
                >
                  {stat.alert ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            Latest orders from your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No orders yet. Create your first order to get started!
            </p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer.name}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-medium">
                      ${Number(order.total).toFixed(2)}
                    </p>
                    <p
                      className={`text-xs px-2 py-1 rounded-full inline-block ${
                        order.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : order.status === "DELIVERED"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStockProducts > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
            <CardDescription className="text-orange-700">
              {lowStockProducts} product{lowStockProducts > 1 ? "s" : ""} running low on stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800">
              Go to Inventory to view and restock low stock items.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
