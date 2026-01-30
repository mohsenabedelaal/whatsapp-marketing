"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCustomers } from "@/hooks/useCustomers"
import { useCreateOrder } from "@/hooks/useOrders"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MessageSquare, Check, X, AlertCircle, Loader2, Search } from "lucide-react"
import Link from "next/link"

interface ParsedItem {
  rawText: string
  productName: string
  quantity: number
  confidence: number
  matchedProductId?: string
  matchedProductName?: string
}

interface ParseResult {
  items: ParsedItem[]
  unparsedLines: string[]
  totalItems: number
  matchedCount: number
  unmatchedCount: number
}

export default function ImportWhatsAppOrderPage() {
  const router = useRouter()
  const createOrder = useCreateOrder()

  const [step, setStep] = useState(1)
  const [message, setMessage] = useState("")
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")

  const { data: customers } = useCustomers(customerSearch)
  const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId)

  const handleParseMessage = async () => {
    if (!message.trim()) {
      setErrors({ message: "Please paste a WhatsApp message" })
      return
    }

    setIsParsing(true)
    setErrors({})

    try {
      const response = await fetch("/api/whatsapp/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to parse message")
      }

      const result = await response.json()
      setParseResult(result)
      setStep(2)
    } catch (error: any) {
      setErrors({ submit: error.message || "Failed to parse message" })
    } finally {
      setIsParsing(false)
    }
  }

  const handleCreateOrder = async () => {
    setErrors({})

    if (!selectedCustomerId) {
      setErrors({ customer: "Please select a customer" })
      return
    }

    if (!parseResult || parseResult.matchedCount === 0) {
      setErrors({ submit: "No matched products to import" })
      return
    }

    try {
      const orderItems = parseResult.items
        .filter((item) => item.matchedProductId)
        .map((item) => ({
          productId: item.matchedProductId!,
          quantity: item.quantity,
        }))

      await createOrder.mutateAsync({
        customerId: selectedCustomerId,
        items: orderItems,
        notes: orderNotes || `Imported from WhatsApp:\n${message}`,
        deliveryAddress: deliveryAddress || undefined,
        paymentMethod: "CASH",
      })

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Import from WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Paste a WhatsApp message to automatically create an order
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-white" : "bg-muted"}`}>
            1
          </div>
          <span className="text-sm font-medium">Paste Message</span>
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-white" : "bg-muted"}`}>
            2
          </div>
          <span className="text-sm font-medium">Review & Select Customer</span>
        </div>
      </div>

      {errors.submit && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
          {errors.submit}
        </div>
      )}

      {/* Step 1: Paste Message */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Paste WhatsApp Message
            </CardTitle>
            <CardDescription>
              Copy the order message from WhatsApp and paste it here. The system will automatically detect products and quantities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.message && (
              <p className="text-sm text-red-600">{errors.message}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Order Message</Label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Example formats:
2x Coca Cola
Pepsi x1
3 Water
Chips (2)

Or any natural text with product names and quantities!`}
                className="w-full min-h-[200px] p-3 rounded-md border border-input bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Supports formats like: "2x Product", "Product x2", "Product (2)", "2 Product", or just "Product"
              </p>
            </div>

            <Button
              onClick={handleParseMessage}
              disabled={isParsing || !message.trim()}
              className="w-full"
            >
              {isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                "Parse Message"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review Parsed Items */}
      {step === 2 && parseResult && (
        <div className="space-y-6">
          {/* Parse Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Parsing Results</CardTitle>
              <CardDescription>
                Review the detected products and select a customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-900">{parseResult.totalItems}</div>
                  <div className="text-sm text-blue-700">Total Items</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-900">{parseResult.matchedCount}</div>
                  <div className="text-sm text-green-700">Matched</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-orange-50">
                  <div className="text-2xl font-bold text-orange-900">{parseResult.unmatchedCount}</div>
                  <div className="text-sm text-orange-700">Not Matched</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parsed Items */}
          <Card>
            <CardHeader>
              <CardTitle>Detected Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {parseResult.items.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      item.matchedProductId
                        ? "border-green-200 bg-green-50"
                        : "border-orange-200 bg-orange-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {item.matchedProductId ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-orange-600" />
                          )}
                          <span className="font-medium">
                            {item.quantity}x {item.rawText}
                          </span>
                        </div>
                        {item.matchedProductId ? (
                          <p className="text-sm text-green-700 ml-6 mt-1">
                            → Matched: <span className="font-semibold">{item.matchedProductName}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-orange-700 ml-6 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            No matching product found in inventory
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={item.matchedProductId ? "bg-green-100" : "bg-orange-100"}>
                        {Math.round(item.confidence * 100)}% confident
                      </Badge>
                    </div>
                  </div>
                ))}

                {parseResult.unparsedLines.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Unparsed lines:</p>
                    {parseResult.unparsedLines.map((line, index) => (
                      <p key={index} className="text-sm text-gray-600">• {line}</p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Customer</CardTitle>
              <CardDescription>Who is this order for?</CardDescription>
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

              <div className="space-y-2 max-h-64 overflow-y-auto">
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

              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">Delivery Address (Optional)</Label>
                <Input
                  id="deliveryAddress"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Delivery address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Order Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Additional notes"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setStep(1)
                setParseResult(null)
              }}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={createOrder.isPending || !selectedCustomerId || parseResult.matchedCount === 0}
              className="flex-1"
            >
              {createOrder.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Order...
                </>
              ) : (
                `Create Order (${parseResult.matchedCount} items)`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
