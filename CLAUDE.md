# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhatsApp-First Business Management System for Lebanese SMBs. A full-stack Next.js application that helps small businesses manage operations through a simple interface with WhatsApp integration, replacing scattered messages, paper notebooks, and Excel files.

**Tech Stack:**
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL with Prisma ORM 7 (using `@prisma/adapter-pg`)
- **Auth:** NextAuth.js v5 (beta)
- **State:** Zustand + React Query (TanStack Query)
- **UI:** shadcn/ui components (manually created), Radix UI primitives

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Database operations
npx prisma studio                    # Open database GUI at http://localhost:5555
npx prisma migrate dev --name <name> # Create and apply migration
npx prisma generate                  # Regenerate Prisma Client after schema changes
npx prisma db seed                   # Seed database with demo data
npx prisma migrate reset --force     # Reset database (WARNING: deletes all data)

# Build and production
npm run build
npm run start
npm run lint
```

## Database Architecture

**Critical:** This application uses a **custom PostgreSQL schema** named `"whatsapp-app"` instead of the default `public` schema. Every model and enum in `prisma/schema.prisma` has `@@schema("whatsapp-app")`.

**Prisma 7 Configuration:**
- Uses PostgreSQL adapter (`@prisma/adapter-pg` + `pg` package)
- Database connection configured in `prisma.config.ts`
- Environment variables loaded from `.env.local` then `.env`
- Prisma Client must be initialized with `PrismaPg` adapter (see `src/lib/prisma.ts`)

**Multi-Tenancy:**
- All data scoped by `businessId`
- Users belong to one Business
- Business owns Products, Customers, Orders
- First registered user becomes OWNER with their own Business

**Key Data Relationships:**
```
Business (1) ──> (N) Users, Products, Customers, Orders
Customer (1) ──> (N) Orders
Order (1) ──> (N) OrderItems ──> (1) Product
User (1) ──> (N) Orders (as createdBy)
```

**Important Fields:**
- All monetary values use `Decimal` type (never float)
- `OrderItem` stores price/name snapshots (historical accuracy)
- Products have soft delete via `isActive` flag
- Order numbers are human-readable: `ORD-20240128-001`

## Authentication & Authorization

**NextAuth.js v5 Configuration:**
- Auth config in `src/lib/auth.ts`
- API route: `/api/auth/[...nextauth]`
- Session strategy: JWT
- Credentials provider with bcrypt (cost factor 12)

**User Roles:**
- `OWNER` - Full access (create staff, manage settings)
- `STAFF` - Limited access (no settings/user management)

**Session Data:**
```typescript
session.user = {
  id: string
  email: string
  name: string
  role: "OWNER" | "STAFF"
  businessId: string | null
}
```

**Route Protection:**
- `src/middleware.ts` protects `/dashboard/*` routes
- All API routes check `session?.user?.businessId`
- Client components use `useSession()` from `next-auth/react`
- Server components/API routes use `auth()` from `src/lib/auth.ts` (NextAuth v5 pattern)

## API Patterns

**Standard API Route Structure:**
```typescript
import { auth } from "@/lib/auth"

// GET with filters
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const businessId = session.user.businessId // Extract to avoid null issues

  const searchParams = request.nextUrl.searchParams
  // ... query with businessId filter

  return NextResponse.json(data)
}

// POST with validation
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const validatedData = schema.parse(body) // Zod validation

  const result = await prisma.model.create({
    data: { ...validatedData, businessId: session.user.businessId }
  })

  return NextResponse.json(result, { status: 201 })
}

// Dynamic route params (Next.js 16)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // Must await params in Next.js 16+
  // ... rest of handler
}
```

**React Query Hooks Pattern:**
- Hooks in `src/hooks/use*.ts`
- Mutations automatically invalidate relevant queries
- Optimistic updates for perceived performance
- Query keys include filters for proper caching

## Application Structure

**Route Groups:**
- `(auth)/` - Unauthenticated pages (login, register)
- `(dashboard)/` - Protected pages with layout
- `api/` - API routes

**Layout Hierarchy:**
```
app/layout.tsx (QueryProvider + AuthProvider)
  └── (dashboard)/layout.tsx (Header + Sidebar + MobileNav)
      └── dashboard/*/page.tsx (page content)
```

**Component Organization:**
- `components/ui/` - Base shadcn/ui components
- `components/layout/` - Header, Sidebar, MobileNav
- `components/providers/` - Context providers
- Page-specific components inline or in feature folders

**State Management:**
- **React Query** - Server state (API data)
- **Zustand** - Client state (cart, UI state)
- **NextAuth** - Authentication state

## Styling Architecture

**Tailwind CSS v4:**
- Configuration in `src/app/globals.css` using `@theme inline`
- Custom WhatsApp color: `--color-whatsapp: #25D366`
- shadcn/ui color system with CSS variables
- `cn()` utility from `src/lib/utils.ts` for class merging

**Responsive Design:**
- Mobile-first approach
- Breakpoint: `md:` at 768px
- Desktop: Sidebar + bottom content
- Mobile: Drawer sidebar + bottom tab navigation
- Touch targets: minimum 44x44px

## Key Implementation Details

**Prisma Client Singleton:**
```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })
```

**Environment Variables:**
- `.env.local` - Local development (gitignored)
- `.env.example` - Template for team
- `DATABASE_URL` - Must include `?schema=whatsapp-app`
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`

**Seed Data:**
- Demo business: "Demo Shop"
- Owner: `owner@demo.com` / `password123`
- Staff: `staff@demo.com` / `password123`
- 10 products, 5 customers, 5 orders

## Current Implementation Status

**Completed Features (MVP Ready):**
- ✅ Authentication (login, register, logout, role-based sessions)
- ✅ Dashboard (real-time stats, recent orders, low stock alerts)
- ✅ Inventory Management (CRUD, search, filters, stock tracking)
- ✅ Customer Management (CRUD, order history, WhatsApp click-to-call)
- ✅ Order Management (create, atomic inventory transactions, status tracking, cancellation)
- ✅ WhatsApp Integration (message parser with fuzzy matching, import orders)
- ✅ Reports & Analytics (sales over time, best sellers, status breakdowns)
- ✅ Settings & User Management (business config, staff accounts, role control)

**Pending Features:**
- ⏳ Mobile PWA (service worker, offline support, app manifest)
- ⏳ Testing & QA
- ⏳ Production deployment

## Order Management Implementation

**Critical Transaction Pattern:**
```typescript
// Order creation with atomic inventory deduction
const order = await prisma.$transaction(async (tx) => {
  // 1. Validate product availability
  const products = await tx.product.findMany({
    where: { id: { in: productIds }, businessId }
  })

  // 2. Check stock levels
  for (const item of items) {
    if (product.quantity < item.quantity) {
      throw new Error("Insufficient stock")
    }
  }

  // 3. Create order with snapshot pricing
  const order = await tx.order.create({
    data: {
      // ... order data
      items: {
        create: items.map(item => ({
          productId: item.productId,
          productName: product.name,  // Snapshot
          pricePerUnit: product.price, // Snapshot
          quantity: item.quantity,
          subtotal: product.price * item.quantity
        }))
      }
    }
  })

  // 4. Deduct inventory atomically
  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { quantity: { decrement: item.quantity } }
    })
  }

  // 5. Update customer stats
  await tx.customer.update({
    where: { id: customerId },
    data: {
      totalOrders: { increment: 1 },
      totalSpent: { increment: total }
    }
  })

  return order
})
```

**Order Cancellation:**
- Reverses inventory deduction atomically
- Updates customer stats
- Cannot cancel DELIVERED orders
- Sets status to CANCELLED (soft delete pattern)

**Payment & Status Enums:**
- Status: `PENDING` → `CONFIRMED` → `PREPARING` → `DELIVERED` | `CANCELLED`
- Payment Method: `CASH` | `CARD` | `BANK_TRANSFER`
- Payment Status: `UNPAID` | `PAID` | `PARTIAL`

## WhatsApp Integration

**Message Parser** (`src/utils/whatsapp-parser.ts`):
- Supports multiple formats: `2x Product`, `Product x2`, `Product (2)`, `2 Product`
- Fuzzy matching using Levenshtein distance (60%+ threshold)
- Filters out noise (greetings, delivery instructions)
- Returns confidence scores for each match

**Import Flow:**
1. User pastes WhatsApp message
2. Parser extracts product names and quantities
3. Fuzzy match against inventory
4. User reviews matched/unmatched items
5. Select customer and create order
6. Original message saved in order notes

## Important Constraints

- **Never hard delete** - Use soft delete with `isActive: false`
- **All queries must filter by `businessId`** - Multi-tenancy security
- **Decimal precision** - Use Prisma `Decimal` type for money, never float
- **Password security** - bcrypt with cost factor 12
- **Atomic inventory** - Always use `prisma.$transaction` for order creation
- **Zod error handling** - Access validation errors via `error.issues[0].message` (not `error.errors`)
- **Next.js 16 params** - Dynamic route params must be awaited: `const { id } = await params`
- **TypeScript null safety** - Extract `businessId` to variable before passing to Prisma queries

## Reporting & Analytics

**Available Reports:**
- Summary stats (today/week/month/all-time)
- Sales over time (daily breakdown with bar chart)
- Best sellers (by quantity sold, revenue generated)
- Order status distribution
- Payment status breakdown

**API Endpoints:**
- `GET /api/reports/summary` - Comprehensive statistics
- `GET /api/reports/best-sellers?period=week&limit=10` - Top products
- `GET /api/reports/sales-over-time?period=week` - Time series data

## Shopping Cart

**Zustand Store** (`src/stores/cartStore.ts`):
```typescript
interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  availableStock: number
}

// Actions: addItem, removeItem, updateQuantity, clearCart, getTotal, getItemCount
```

- Stock validation prevents overselling
- Quantity updates respect available stock
- Used in new order creation flow (3-step wizard)
