import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:mohsen.ab.92@localhost:5432/postgres?schema=whatsapp-app'
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting database seed...')

  // Create demo business
  const business = await prisma.business.create({
    data: {
      name: 'Demo Shop',
      phone: '+96170123456',
      address: 'Beirut, Lebanon',
      currency: 'USD',
      whatsappNumber: '+96170123456',
    },
  })
  console.log('✅ Created demo business:', business.name)

  // Create owner user
  const hashedPassword = await bcrypt.hash('password123', 12)

  const owner = await prisma.user.create({
    data: {
      email: 'owner@demo.com',
      password: hashedPassword,
      name: 'Shop Owner',
      role: 'OWNER',
      businessId: business.id,
    },
  })
  console.log('✅ Created owner user:', owner.email)

  // Create staff user
  const staff = await prisma.user.create({
    data: {
      email: 'staff@demo.com',
      password: hashedPassword,
      name: 'Staff Member',
      role: 'STAFF',
      businessId: business.id,
    },
  })
  console.log('✅ Created staff user:', staff.email)

  // Create sample products
  const products = [
    { name: 'Coca Cola', price: 1.50, cost: 0.80, quantity: 100, category: 'Beverages', sku: 'BEV-001' },
    { name: 'Pepsi', price: 1.50, cost: 0.80, quantity: 80, category: 'Beverages', sku: 'BEV-002' },
    { name: 'Water 500ml', price: 0.50, cost: 0.25, quantity: 200, category: 'Beverages', sku: 'BEV-003' },
    { name: 'Chips - Lays', price: 1.00, cost: 0.60, quantity: 150, category: 'Snacks', sku: 'SNK-001' },
    { name: 'Chocolate Bar', price: 1.25, cost: 0.75, quantity: 120, category: 'Snacks', sku: 'SNK-002' },
    { name: 'Bread', price: 2.00, cost: 1.20, quantity: 50, category: 'Bakery', sku: 'BAK-001' },
    { name: 'Milk 1L', price: 3.00, cost: 2.00, quantity: 40, category: 'Dairy', sku: 'DAI-001' },
    { name: 'Eggs (12)', price: 4.00, cost: 2.50, quantity: 30, category: 'Dairy', sku: 'DAI-002' },
    { name: 'Rice 1kg', price: 5.00, cost: 3.50, quantity: 25, category: 'Grains', sku: 'GRN-001' },
    { name: 'Pasta', price: 2.50, cost: 1.50, quantity: 60, category: 'Grains', sku: 'GRN-002' },
  ]

  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
        businessId: business.id,
        lowStockThreshold: 10,
      },
    })
  }
  console.log(`✅ Created ${products.length} sample products`)

  // Create sample customers
  const customers = [
    { name: 'Ahmad Hassan', phone: '+96171123456', email: 'ahmad@example.com', address: 'Hamra, Beirut' },
    { name: 'Fatima Ali', phone: '+96171234567', email: 'fatima@example.com', address: 'Verdun, Beirut' },
    { name: 'Karim Khalil', phone: '+96171345678', email: 'karim@example.com', address: 'Achrafieh, Beirut' },
    { name: 'Layla Mansour', phone: '+96171456789', email: 'layla@example.com', address: 'Jnah, Beirut' },
    { name: 'Omar Saab', phone: '+96171567890', email: 'omar@example.com', address: 'Ras Beirut' },
  ]

  for (const customer of customers) {
    await prisma.customer.create({
      data: {
        ...customer,
        businessId: business.id,
      },
    })
  }
  console.log(`✅ Created ${customers.length} sample customers`)

  // Create sample orders
  const allCustomers = await prisma.customer.findMany({ where: { businessId: business.id } })
  const allProducts = await prisma.product.findMany({ where: { businessId: business.id } })

  for (let i = 0; i < 5; i++) {
    const customer = allCustomers[i % allCustomers.length]
    const orderDate = new Date()
    orderDate.setDate(orderDate.getDate() - i * 2) // Spread orders over last 10 days

    // Select 2-4 random products for the order
    const numItems = Math.floor(Math.random() * 3) + 2
    const orderProducts = []
    const usedIndexes = new Set()

    for (let j = 0; j < numItems; j++) {
      let randomIndex
      do {
        randomIndex = Math.floor(Math.random() * allProducts.length)
      } while (usedIndexes.has(randomIndex))
      usedIndexes.add(randomIndex)
      orderProducts.push(allProducts[randomIndex])
    }

    let subtotal = 0
    const items = orderProducts.map((product) => {
      const quantity = Math.floor(Math.random() * 3) + 1
      const itemSubtotal = Number(product.price) * quantity
      subtotal += itemSubtotal

      return {
        productId: product.id,
        productName: product.name,
        quantity,
        pricePerUnit: product.price,
        subtotal: itemSubtotal,
      }
    })

    const total = subtotal
    const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`

    await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        businessId: business.id,
        createdById: owner.id,
        subtotal,
        total,
        status: i === 0 ? 'PENDING' : i === 1 ? 'CONFIRMED' : 'DELIVERED',
        paymentMethod: 'CASH',
        paymentStatus: i < 2 ? 'UNPAID' : 'PAID',
        paidAmount: i < 2 ? 0 : total,
        createdAt: orderDate,
        items: {
          create: items,
        },
      },
    })

    // Update customer stats
    if (i >= 2) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: total },
        },
      })
    }
  }
  console.log('✅ Created 5 sample orders')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📝 Demo credentials:')
  console.log('   Owner: owner@demo.com / password123')
  console.log('   Staff: staff@demo.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
