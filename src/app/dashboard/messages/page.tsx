"use client"

import { useState, useRef, useEffect } from "react"
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
} from "@/hooks/useMessages"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  MessageSquare,
  Send,
  ArrowLeft,
  ShoppingCart,
  User,
} from "lucide-react"
import Link from "next/link"

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations, isLoading: loadingConversations } =
    useConversations()
  const { data: conversationData, isLoading: loadingMessages } =
    useConversationMessages(selectedId)
  const sendMessage = useSendMessage()

  const messages = conversationData?.messages || []
  const selectedConversation = conversations?.find((c) => c.id === selectedId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!selectedId || !messageText.trim()) return
    try {
      await sendMessage.mutateAsync({
        conversationId: selectedId,
        content: messageText.trim(),
      })
      setMessageText("")
    } catch {
      // error handled by mutation
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground mt-1">
          WhatsApp conversations with customers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-14rem)]">
        {/* Conversation List */}
        <Card
          className={cn(
            "md:col-span-1 overflow-y-auto",
            selectedId && "hidden md:block"
          )}
        >
          <div className="p-3 border-b">
            <h2 className="font-semibold text-sm">Conversations</h2>
          </div>

          {loadingConversations ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : !conversations?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">
                Messages from WhatsApp will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "w-full text-left p-3 hover:bg-accent transition-colors",
                    selectedId === conv.id && "bg-accent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {conv.name || conv.whatsappNumber}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.messages[0]?.content || "No messages"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(conv.lastMessageAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-whatsapp text-white text-xs h-5 min-w-5 flex items-center justify-center">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {conv.customer && (
                    <div className="flex items-center gap-1 mt-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {conv.customer.name}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Message Thread */}
        <Card
          className={cn(
            "md:col-span-2 flex flex-col",
            !selectedId && "hidden md:flex"
          )}
        >
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-3 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedId(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {selectedConversation?.name ||
                      selectedConversation?.whatsappNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation?.whatsappNumber}
                  </p>
                </div>
                {selectedConversation?.customer && (
                  <Link
                    href={`/dashboard/customers/${selectedConversation.customer.id}`}
                  >
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-1" />
                      Profile
                    </Button>
                  </Link>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="text-center text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.direction === "OUTBOUND"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-3 py-2",
                          msg.direction === "OUTBOUND"
                            ? "bg-whatsapp text-white"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              "text-xs",
                              msg.direction === "OUTBOUND"
                                ? "text-white/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString(
                              undefined,
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          {msg.order && (
                            <Link
                              href={`/dashboard/orders/${msg.order.id}`}
                              className={cn(
                                "inline-flex items-center gap-1 text-xs underline",
                                msg.direction === "OUTBOUND"
                                  ? "text-white/80"
                                  : "text-primary"
                              )}
                            >
                              <ShoppingCart className="h-3 w-3" />
                              {msg.order.orderNumber}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send input */}
              <div className="p-3 border-t flex gap-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  onClick={handleSend}
                  disabled={
                    !messageText.trim() || sendMessage.isPending
                  }
                  className="bg-whatsapp hover:bg-whatsapp/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
