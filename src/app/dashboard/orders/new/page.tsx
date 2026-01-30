"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCustomers } from "@/hooks/useCustomers"
import { useProducts } from "@/hooks/useProducts"
import { useCreateOrder } from "@/hooks/useOrders"
import { useCartStore } from "@/stores/cartStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, User } from "lucide-react"
import Link from "next/link"

export default function NewOrderPage() {
  const router = useRouter()
  const createOrder = useCreateOrder()

  const [step, setStep] = useState(1)
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "BANK_TRANSFER">("CASH")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: customers } = useCustomers(customerSearch)
  const { data: products } = useProducts({ search: productSearch })

  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal } = useCartStore()

  const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId)

  const handleAddToCart = (product: any) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      availableStock: product.quantity,
    })
  }

  const handleSubmit = async () => {
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (!selectedCustomerId) newErrors.customer = "Please select a customer"
    if (items.length === 0) newErrors.items = "Please add at least one item to the order"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await createOrder.mutateAsync({
        customerId: selectedCustomerId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        notes: orderNotes || undefined,
        deliveryAddress: deliveryAddress || undefined,
        paymentMethod,
      })

      clearCart()
      router.push("/dashboard/orders")
    } catch (error: any) {
      setErrors({ submit: error.message || "Failed to create order" })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Create New Order</h1>
        <p className="text-muted-foreground mt-1">
          Select a customer, add products, and complete the order
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-white" : "bg-muted"}`}>
            1
          </div>
          <span className="text-sm font-medium">Customer</span>
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-white" : "bg-muted"}`}>
            2
          </div>
          <span className="text-sm font-medium">Products</span>
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className={`flex items-center gap-2 ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-primary text-white" : "bg-muted"}`}>
            3
          </div>
          <span className="text-sm font-medium">Review</span>
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
          {/* Step 1: Select Customer */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Customer</CardTitle>
                <CardDescription>Choose who this order is for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {errors.customer && (
                  <p className="text-sm text-red-600">{errors.customer}</p>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers by name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {customers && customers.length > 0 ? (
                    customers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomerId(customer.id)
                          if (customer.address) {
                            setDeliveryAddress(customer.address)
                          }
                        }}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedCustomerId === customer.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.phone}</p>
                            {customer.address && (
                              <p className="text-sm text-muted-foreground mt-1">{customer.address}</p>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">{customer.totalOrders} orders</p>
                            <p className="font-medium">{formatCurrency(Number(customer.totalSpent))}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No customers found. <Link href="/dashboard/customers/new" className="text-primary underline">Add a customer</Link> first.
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedCustomerId}
                  className="w-full"
                >
                  Continue to Products
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Add Products */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Add Products</CardTitle>
                <CardDescription>Search and add products to the order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {errors.items && (
                  <p className="text-sm text-red-600">{errors.items}</p>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {products && products.length > 0 ? (
                    products.map((product) => {
                      const inCart = items.find((item) => item.productId === product.id)
                      const availableStock = product.quantity - (inCart?.quantity || 0)

                      return (
                        <div
                          key={product.id}
                          className="p-4 rounded-lg border flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{product.name}</p>
                              {product.quantity <= product.lowStockThreshold && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-800">
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(Number(product.price))} • {product.quantity} in stock
                            </p>
                          </div>

                          <Button
                            onClick={() => handleAddToCart(product)}
                            disabled={product.quantity === 0 || availableStock === 0}
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {inCart ? "Add More" : "Add"}
                          </Button>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No products found. <Link href="/dashboard/inventory/new" className="text-primary underline">Add products</Link> to inventory first.
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={items.length === 0} className="flex-1">
                    Continue to Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review and Submit */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>Add final details and confirm the order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress">Delivery Address</Label>
                  <Input
                    id="deliveryAddress"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter delivery address (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes</Label>
                  <Input
                    id="notes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Special instructions (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={paymentMethod === "CASH" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("CASH")}
                      className="flex-1"
                    >
                      Cash
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === "CARD" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("CARD")}
                      className="flex-1"
                    >
                      Card
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === "BANK_TRANSFER" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("BANK_TRANSFER")}
                      className="flex-1"
                    >
                      Bank Transfer
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createOrder.isPending}
                    className="flex-1"
                  >
                    {createOrder.isPending ? "Creating..." : "Create Order"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Customer */}
              {selectedCustomer && (
                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{selectedCustomer.name}</p>
                      <p className="text-muted-foreground">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Items */}
              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.productId} className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.availableStock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium ml-auto">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(getTotal())}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCart}
                    className="w-full"
                  >
                    Clear Cart
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No items in cart
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
