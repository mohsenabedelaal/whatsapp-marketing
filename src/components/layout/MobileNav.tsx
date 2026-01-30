"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  MessageSquare,
} from "lucide-react"
import { useUnreadCount } from "@/hooks/useMessages"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
]

export function MobileNav() {
  const pathname = usePathname()
  const { data: unreadCount } = useUnreadCount()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <div className="flex items-center justify-around">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <Icon className={cn("h-6 w-6", isActive && "text-primary")} />
                {item.name === "Messages" && unreadCount ? (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-whatsapp text-white text-[10px] font-bold">
                    {unreadCount}
                  </span>
                ) : null}
              </span>
              <span className="truncate">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
