import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  subtotal: number
  product: {
    id: string
    name: string
    price: number
  }
}

interface Order {
  id: string
  orderNumber: string
  customerId: string
  total: number
  status: string
  paymentStatus: string
  paymentMethod: string
  deliveryAddress?: string
  notes?: string
  createdAt: string
  updatedAt: string
  customer: {
    id: string
    name: string
    phone: string
  }
  items: OrderItem[]
}

export function useOrders(status?: string, customerId?: string) {
  return useQuery({
    queryKey: ["orders", status, customerId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      if (customerId) params.set("customerId", customerId)

      const response = await fetch(`/api/orders?${params}`)
      if (!response.ok) throw new Error("Failed to fetch orders")
      return response.json() as Promise<Order[]>
    },
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${id}`)
      if (!response.ok) throw new Error("Failed to fetch order")
      return response.json() as Promise<Order>
    },
    enabled: !!id,
  })
}

interface CreateOrderData {
  customerId: string
  items: Array<{
    productId: string
    quantity: number
  }>
  notes?: string
  deliveryAddress?: string
  paymentMethod?: "CASH" | "CARD" | "BANK_TRANSFER"
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateOrderData) => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create order")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}

interface UpdateOrderData {
  status?: "PENDING" | "CONFIRMED" | "PREPARING" | "DELIVERED" | "CANCELLED"
  paymentStatus?: "UNPAID" | "PAID" | "PARTIAL"
  paymentMethod?: "CASH" | "CARD" | "BANK_TRANSFER"
  notes?: string
  deliveryAddress?: string
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOrderData }) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update order")
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["order", variables.id] })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to cancel order")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}
