import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateBusinessSchema = z.object({
  name: z.string().min(1, "Business name is required").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().optional(),
  whatsappNumber: z.string().optional(),
})

// GET - Get business information
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        currency: true,
        whatsappNumber: true,
        createdAt: true,
      },
    })

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    return NextResponse.json(business)
  } catch (error) {
    console.error("Error fetching business:", error)
    return NextResponse.json(
      { error: "Failed to fetch business information" },
      { status: 500 }
    )
  }
}

// PATCH - Update business information (owner only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only owners can update business settings
    if (session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateBusinessSchema.parse(body)

    const business = await prisma.business.update({
      where: { id: session.user.businessId },
      data: validatedData,
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        currency: true,
        whatsappNumber: true,
        createdAt: true,
      },
    })

    return NextResponse.json(business)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating business:", error)
    return NextResponse.json(
      { error: "Failed to update business information" },
      { status: 500 }
    )
  }
}
