# Copilot Instructions for WhatsApp Project

## Project Overview
This repository contains a WhatsApp-first business management system tailored for Lebanese SMBs. It is a full-stack Next.js application with WhatsApp integration to streamline operations. Key technologies include:
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js v5
- **State Management:** Zustand + React Query

## Key Architectural Patterns

### Database
- **Custom Schema:** All Prisma models use the `"whatsapp-app"` schema.
- **Multi-Tenancy:** Data is scoped by `businessId`. Relationships:
  - `Business` → `Users`, `Products`, `Customers`, `Orders`
  - `Order` → `OrderItems` → `Product`
- **Important Fields:**
  - Monetary values use `Decimal` type.
  - Products use `isActive` for soft deletes.
  - Orders have human-readable IDs (e.g., `ORD-20240128-001`).

### Authentication
- **NextAuth.js v5:** Configured in `src/lib/auth.ts`.
- **Session Strategy:** JWT with role-based access (`OWNER`, `STAFF`).
- **Route Protection:** Middleware (`src/middleware.ts`) ensures authenticated access to `/dashboard/*`.

### API Design
- **Structure:** API routes are in `src/app/api/`.
- **Authorization:** All routes validate `session.user.businessId`.
- **Validation:** Use Zod schemas for request validation.
- **Dynamic Routes:** Next.js 16 requires `await` for `params`.

### State Management
- **React Query:** For server state (e.g., API data).
- **Zustand:** For client state (e.g., cart, UI state).

### Styling
- **Tailwind CSS:** Mobile-first design with custom WhatsApp color (`#25D366`).
- **Utility:** Use `cn()` from `src/lib/utils.ts` for class merging.

## Developer Workflows

### Development
```bash
npm run dev  # Start development server
npx prisma studio  # Open database GUI
```

### Database
```bash
npx prisma migrate dev --name <name>  # Create migration
npx prisma db seed  # Seed database
npx prisma migrate reset --force  # Reset database
```

### Build & Production
```bash
npm run build
npm run start
npm run lint
```

## Code Organization
- **Frontend:** `src/app/` contains pages and layouts.
- **API:** `src/app/api/` contains backend routes.
- **Components:**
  - `components/ui/` for reusable UI components.
  - `components/layout/` for layout elements (e.g., `Header`, `Sidebar`).
- **Hooks:** `src/hooks/` for React Query hooks.
- **Utilities:** `src/lib/` for shared logic (e.g., `prisma.ts`, `auth.ts`).

## Examples

### API Route
```typescript
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const businessId = session.user.businessId
  const data = await prisma.model.findMany({ where: { businessId } })
  return NextResponse.json(data)
}
```

### React Query Hook
```typescript
import { useQuery } from '@tanstack/react-query'

export function useCustomers() {
  return useQuery(['customers'], async () => {
    const res = await fetch('/api/customers')
    return res.json()
  })
}
```

## Notes
- **Environment Variables:**
  - `DATABASE_URL` must include `?schema=whatsapp-app`.
  - `NEXTAUTH_SECRET` is required for authentication.
- **Pending Features:**
  - Mobile PWA support.
  - Testing and QA.
  - Production deployment.

Refer to `CLAUDE.md` for more details.