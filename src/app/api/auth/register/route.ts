import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(1, "Business name is required"),
  businessPhone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, "Business phone must be a valid phone number"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)
    const normalizedEmail = validatedData.email.toLowerCase().trim()
    const normalizedName = validatedData.name.trim()
    const normalizedBusinessName = validatedData.businessName.trim()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create business and owner user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create business
      const business = await tx.business.create({
        data: {
          name: normalizedBusinessName,
          phone: validatedData.businessPhone,
          whatsappNumber: validatedData.businessPhone,
          currency: "USD",
        },
      })

      // Create owner user
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: normalizedName,
          role: "OWNER",
          businessId: business.id,
        },
      })

      return { business, user }
    })

    return NextResponse.json(
      {
        message: "Registration successful",
        userId: result.user.id,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        )
      }

      if (error.code === "P2021" || error.code === "P2022") {
        return NextResponse.json(
          { error: "Database is not initialized. Run Prisma migrations on your deployment environment." },
          { status: 500 }
        )
      }
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: "Database connection failed. Check DATABASE_URL in your deployment environment." },
        { status: 500 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    )
  }
}
