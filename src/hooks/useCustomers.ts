import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  totalOrders: number
  totalSpent: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface CustomerWithOrders extends Customer {
  orders: Array<{
    id: string
    orderNumber: string
    total: number
    status: string
    createdAt: string
  }>
}

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)

      const response = await fetch(`/api/customers?${params}`)
      if (!response.ok) throw new Error("Failed to fetch customers")
      return response.json() as Promise<Customer[]>
    },
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${id}`)
      if (!response.ok) throw new Error("Failed to fetch customer")
      return response.json() as Promise<CustomerWithOrders>
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Customer, "id" | "createdAt" | "updatedAt" | "isActive" | "totalOrders" | "totalSpent">) => {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create customer")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update customer")
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["customer", variables.id] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete customer")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}
