import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface ConversationMessage {
  id: string
  content: string
  createdAt: string
}

interface Conversation {
  id: string
  whatsappNumber: string
  name: string | null
  lastMessageAt: string
  unreadCount: number
  status: string
  customerId: string | null
  customer: { id: string; name: string; phone: string } | null
  messages: ConversationMessage[]
}

interface Message {
  id: string
  content: string
  direction: "INBOUND" | "OUTBOUND"
  messageType: string
  whatsappMessageId: string | null
  status: string
  createdAt: string
  order: { id: string; orderNumber: string; status: string; total: number } | null
}

interface ConversationDetail {
  conversation: Conversation
  messages: Message[]
}

export function useConversations(status?: string) {
  return useQuery({
    queryKey: ["conversations", status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      const response = await fetch(`/api/messages?${params}`)
      if (!response.ok) throw new Error("Failed to fetch conversations")
      return response.json() as Promise<Conversation[]>
    },
    refetchInterval: 10000, // Poll every 10s for new messages
  })
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversation-messages", conversationId],
    queryFn: async () => {
      const response = await fetch(`/api/messages/${conversationId}`)
      if (!response.ok) throw new Error("Failed to fetch messages")
      return response.json() as Promise<ConversationDetail>
    },
    enabled: !!conversationId,
    refetchInterval: 5000, // Poll every 5s when viewing a conversation
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { conversationId: string; content: string }) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send message")
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      queryClient.invalidateQueries({
        queryKey: ["conversation-messages", variables.conversationId],
      })
    },
  })
}

export function useNotifyCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/notify`, {
        method: "POST",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send notification")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread-count"],
    queryFn: async () => {
      const response = await fetch("/api/messages?status=OPEN")
      if (!response.ok) return 0
      const conversations: Conversation[] = await response.json()
      return conversations.reduce((sum, c) => sum + c.unreadCount, 0)
    },
    refetchInterval: 15000,
  })
}
