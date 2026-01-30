"use client"

import { useState } from "react"
import { useOrders, useCancelOrder } from "@/hooks/useOrders"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Plus, Package, DollarSign, User, Calendar } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function OrdersPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>("")
  const { data: orders, isLoading } = useOrders(statusFilter)
  const cancelOrder = useCancelOrder()

  const handleCancelOrder = async (id: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to cancel order ${orderNumber}?`)) return

    try {
      await cancelOrder.mutateAsync(id)
    } catch (error: any) {
      alert(error.message || "Failed to cancel order")
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800"
      case "CONFIRMED":
      case "PREPARING":
        return "bg-blue-100 text-blue-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "CANCELLED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800"
      case "UNPAID":
        return "bg-orange-100 text-orange-800"
      case "PARTIAL":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer orders and track fulfillment
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/orders/import">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <ShoppingCart className="mr-2 h-4 w-4 text-[#25D366]" />
              Import from WhatsApp
            </Button>
          </Link>
          <Link href="/dashboard/orders/new">
            <Button size="lg" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("")}
        >
          All Orders
        </Button>
        <Button
          variant={statusFilter === "PENDING" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("PENDING")}
        >
          Pending
        </Button>
        <Button
          variant={statusFilter === "CONFIRMED" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("CONFIRMED")}
        >
          Confirmed
        </Button>
        <Button
          variant={statusFilter === "PREPARING" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("PREPARING")}
        >
          Preparing
        </Button>
        <Button
          variant={statusFilter === "DELIVERED" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("DELIVERED")}
        >
          Delivered
        </Button>
      </div>

      {/* Summary Stats */}
      {orders && orders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(orders.reduce((sum, o) => sum + Number(o.total), 0))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List */}
      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{order.customer.name}</span>
                          <span>•</span>
                          <span>{order.customer.phone}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                          {order.paymentStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{order.items.length} item(s)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{formatCurrency(Number(order.total))}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>

                    {order.deliveryAddress && (
                      <p className="text-sm text-muted-foreground">
                        Delivery: {order.deliveryAddress}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    >
                      View Details
                    </Button>
                    {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelOrder(order.id, order.orderNumber)}
                        disabled={cancelOrder.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter ? "Try adjusting your filters" : "Create your first order to get started"}
            </p>
            {!statusFilter && (
              <Link href="/dashboard/orders/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Order
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
