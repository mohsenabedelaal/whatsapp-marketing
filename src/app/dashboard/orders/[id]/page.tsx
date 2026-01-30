"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOrder, useUpdateOrder, useCancelOrder } from "@/hooks/useOrders"
import { useNotifyCustomer } from "@/hooks/useMessages"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Package, User, Phone, MapPin, Calendar, DollarSign, CreditCard, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: order, isLoading } = useOrder(params.id)
  const updateOrder = useUpdateOrder()
  const cancelOrder = useCancelOrder()
  const notifyCustomer = useNotifyCustomer()

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleStatusUpdate = async (status: string) => {
    try {
      await updateOrder.mutateAsync({
        id: params.id,
        data: { status: status as any },
      })
    } catch (error: any) {
      setErrors({ submit: error.message || "Failed to update order status" })
    }
  }

  const handlePaymentStatusUpdate = async (paymentStatus: string) => {
    try {
      await updateOrder.mutateAsync({
        id: params.id,
        data: { paymentStatus: paymentStatus as any },
      })
    } catch (error: any) {
      setErrors({ submit: error.message || "Failed to update payment status" })
    }
  }

  const handleCancelOrder = async () => {
    if (!confirm(`Are you sure you want to cancel order ${order?.orderNumber}?`)) return

    try {
      await cancelOrder.mutateAsync(params.id)
      router.push("/dashboard/orders")
    } catch (error: any) {
      setErrors({ submit: error.message || "Failed to cancel order" })
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
      month: "long",
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
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
        <p className="text-muted-foreground">Loading order...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Order not found</h3>
        <Link href="/dashboard/orders">
          <Button>Back to Orders</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
            <p className="text-muted-foreground mt-1">
              Created {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge className={getStatusColor(order.status)} variant="outline">
              {order.status}
            </Badge>
            <Badge className={getPaymentStatusColor(order.paymentStatus)} variant="outline">
              {order.paymentStatus}
            </Badge>
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
          {errors.submit}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>Products in this order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between pb-4 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(Number(item.price))} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(Number(item.subtotal))}</p>
                  </div>
                ))}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(Number(order.total))}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Order Status */}
          {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>Change the order status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={order.status === "PENDING" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusUpdate("PENDING")}
                    disabled={updateOrder.isPending}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={order.status === "CONFIRMED" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusUpdate("CONFIRMED")}
                    disabled={updateOrder.isPending}
                  >
                    Confirmed
                  </Button>
                  <Button
                    variant={order.status === "PREPARING" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusUpdate("PREPARING")}
                    disabled={updateOrder.isPending}
                  >
                    Preparing
                  </Button>
                  <Button
                    variant={order.status === "DELIVERED" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusUpdate("DELIVERED")}
                    disabled={updateOrder.isPending}
                  >
                    Delivered
                  </Button>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Payment Status:</p>
                  <div className="flex gap-2">
                    <Button
                      variant={order.paymentStatus === "UNPAID" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePaymentStatusUpdate("UNPAID")}
                      disabled={updateOrder.isPending}
                    >
                      Unpaid
                    </Button>
                    <Button
                      variant={order.paymentStatus === "PAID" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePaymentStatusUpdate("PAID")}
                      disabled={updateOrder.isPending}
                    >
                      Paid
                    </Button>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  onClick={handleCancelOrder}
                  disabled={cancelOrder.isPending}
                  className="w-full"
                >
                  {cancelOrder.isPending ? "Cancelling..." : "Cancel Order"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{order.customer.name}</p>
                  <Link
                    href={`/dashboard/customers/${order.customer.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    View Profile
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`https://wa.me/${order.customer.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {order.customer.phone}
                </a>
              </div>

              {order.deliveryAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{order.deliveryAddress}</p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={async () => {
                  try {
                    await notifyCustomer.mutateAsync(params.id)
                  } catch (error: any) {
                    setErrors({ submit: error.message || "Failed to notify customer" })
                  }
                }}
                disabled={notifyCustomer.isPending}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {notifyCustomer.isPending ? "Sending..." : "Notify via WhatsApp"}
              </Button>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{order.paymentMethod}</p>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">{formatCurrency(Number(order.total))}</p>
              </div>
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(order.createdAt)}</p>
                </div>
              </div>

              {order.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
