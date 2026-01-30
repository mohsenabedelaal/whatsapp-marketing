"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, Download, Calendar } from "lucide-react"

interface SummaryData {
  today: { orders: number; revenue: number }
  week: { orders: number; revenue: number }
  month: { orders: number; revenue: number }
  allTime: { orders: number; revenue: number; customers: number; products: number }
  statusBreakdown: Array<{ status: string; count: number }>
  paymentBreakdown: Array<{ status: string; count: number }>
}

interface BestSeller {
  productId: string
  productName: string
  category?: string
  totalQuantitySold: number
  totalRevenue: number
  orderCount: number
}

interface SalesData {
  date: string
  revenue: number
  orders: number
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [period, setPeriod] = useState<"week" | "month">("week")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [period])

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const [summaryRes, bestSellersRes, salesRes] = await Promise.all([
        fetch("/api/reports/summary"),
        fetch(`/api/reports/best-sellers?period=${period}&limit=10`),
        fetch(`/api/reports/sales-over-time?period=${period}`),
      ])

      const [summaryData, bestSellersData, salesTimeData] = await Promise.all([
        summaryRes.json(),
        bestSellersRes.json(),
        salesRes.json(),
      ])

      setSummary(summaryData)
      setBestSellers(bestSellersData)
      setSalesData(salesTimeData)
    } catch (error) {
      console.error("Error fetching reports:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "CONFIRMED":
      case "PREPARING":
        return "bg-blue-100 text-blue-800"
      case "CANCELLED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your business performance and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        <Button
          variant={period === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("week")}
        >
          Last 7 Days
        </Button>
        <Button
          variant={period === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("month")}
        >
          This Month
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Today's Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.today.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary.today.orders} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.week.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary.week.orders} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.month.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary.month.orders} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              All Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.allTime.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary.allTime.orders} total orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Over Time</CardTitle>
            <CardDescription>Daily revenue and order count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesData.map((day, index) => {
                const maxRevenue = Math.max(...salesData.map((d) => d.revenue))
                const width = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{formatDate(day.date)}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{day.orders} orders</span>
                        <span className="font-semibold">{formatCurrency(day.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-8 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Distribution of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.statusBreakdown.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <Badge className={getStatusColor(item.status)} variant="outline">
                    {item.status}
                  </Badge>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Payment collection overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.paymentBreakdown.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <Badge
                    className={
                      item.status === "PAID"
                        ? "bg-green-100 text-green-800"
                        : item.status === "UNPAID"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                    variant="outline"
                  >
                    {item.status}
                  </Badge>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Sellers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Best Selling Products
          </CardTitle>
          <CardDescription>Top performers for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-sm">Rank</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Product</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Category</th>
                  <th className="text-right py-3 px-2 font-medium text-sm">Quantity Sold</th>
                  <th className="text-right py-3 px-2 font-medium text-sm">Revenue</th>
                  <th className="text-right py-3 px-2 font-medium text-sm">Orders</th>
                </tr>
              </thead>
              <tbody>
                {bestSellers.length > 0 ? (
                  bestSellers.map((product, index) => (
                    <tr key={product.productId} className="border-b last:border-0">
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          #{index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-2 font-medium">{product.productName}</td>
                      <td className="py-3 px-2">
                        {product.category ? (
                          <Badge variant="outline">{product.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">{product.totalQuantitySold}</td>
                      <td className="py-3 px-2 text-right font-semibold text-green-600">
                        {formatCurrency(product.totalRevenue)}
                      </td>
                      <td className="py-3 px-2 text-right">{product.orderCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No sales data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Business Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Business Overview</CardTitle>
          <CardDescription>All-time statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted">
              <Users className="h-8 w-8 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{summary.allTime.customers}</div>
              <div className="text-sm text-muted-foreground">Customers</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <Package className="h-8 w-8 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{summary.allTime.products}</div>
              <div className="text-sm text-muted-foreground">Products</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <ShoppingCart className="h-8 w-8 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{summary.allTime.orders}</div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <DollarSign className="h-8 w-8 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{formatCurrency(summary.allTime.revenue)}</div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
