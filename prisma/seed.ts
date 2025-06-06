import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create sample clients
  const client1 = await prisma.client.create({
    data: {
      name: 'TechCorp Solutions',
      contact: 'john_doe',
      email: 'john@techcorp.com',
      phone: '+1-555-0123',
    },
  })

  const client2 = await prisma.client.create({
    data: {
      name: 'StartupXYZ',
      contact: 'sarah_smith',
      email: 'sarah@startupxyz.com',
      phone: '+1-555-0456',
    },
  })

  const client3 = await prisma.client.create({
    data: {
      name: 'E-commerce Plus',
      contact: 'mike_wilson',
      email: 'mike@ecommerceplus.com',
      phone: '+1-555-0789',
    },
  })

  console.log('✅ Created sample clients')

  // Create sample quotes
  const quote1 = await prisma.quote.create({
    data: {
      name: 'AI-Powered Customer Support System',
      description: 'Build a complete customer support system with AI chatbot integration',
      startDateEstimated: new Date('2024-02-01'),
      endDateEstimated: new Date('2024-03-15'),
      source: 'LinkedIn',
      sourceLink: 'https://linkedin.com/in/johndoe',
      priceEstimated: 15000,
      minimumPrice: 12000,
      requirements: [
        'AI chatbot with natural language processing',
        'Integration with existing CRM',
        'Real-time analytics dashboard',
        'Multi-language support',
      ],
      status: 'ACCEPTED',
      clientId: client1.id,
    },
  })

  const quote2 = await prisma.quote.create({
    data: {
      name: 'E-commerce Mobile App',
      description: 'React Native mobile app for online store',
      startDateEstimated: new Date('2024-01-15'),
      endDateEstimated: new Date('2024-02-28'),
      source: 'Fiverr',
      sourceLink: 'https://fiverr.com/order/123456',
      priceEstimated: 8000,
      minimumPrice: 6500,
      requirements: [
        'iOS and Android compatibility',
        'Payment gateway integration',
        'Push notifications',
        'Offline mode support',
      ],
      status: 'QUOTED',
      clientId: client2.id,
    },
  })

  const quote3 = await prisma.quote.create({
    data: {
      name: 'Inventory Management System',
      description: 'Web-based inventory tracking and management system',
      startDateEstimated: new Date('2024-03-01'),
      endDateEstimated: new Date('2024-04-15'),
      source: 'Workana',
      sourceLink: 'https://workana.com/project/123',
      priceEstimated: 12000,
      minimumPrice: 10000,
      requirements: [
        'Real-time inventory tracking',
        'Barcode scanning',
        'Automated reorder alerts',
        'Reporting and analytics',
      ],
      status: 'REJECTED',
      clientId: client3.id,
    },
  })

  console.log('✅ Created sample quotes')

  // Create a project from the accepted quote
  const project1 = await prisma.project.create({
    data: {
      name: quote1.name,
      description: quote1.description,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-03-20'),
      agreedPrice: 14500,
      minimumCost: 12000,
      aiMessageRate: 0.05, // $0.05 per AI message
      status: 'ACTIVE',
      quoteId: quote1.id,
    },
  })

  console.log('✅ Created sample project')

  // Create sample milestones
  const milestone1 = await prisma.milestone.create({
    data: {
      title: 'Project Setup & Architecture',
      projectId: project1.id,
    },
  })

  const milestone2 = await prisma.milestone.create({
    data: {
      title: 'AI Chatbot Development',
      projectId: project1.id,
    },
  })

  console.log('✅ Created sample milestones')

  // Create sample issues
  const issue1 = await prisma.issue.create({
    data: {
      number: 1,
      title: 'Setup project structure and dependencies',
      type: 'MANUAL',
      status: 'CLOSED',
      aiMessageEstimate: 10,
      aiMessageReal: 8,
      costEstimated: 500,
      costReal: 400,
      projectId: project1.id,
      milestoneId: milestone1.id,
    },
  })

  const issue2 = await prisma.issue.create({
    data: {
      number: 2,
      title: 'Implement AI chatbot core functionality',
      type: 'AUGMENT',
      status: 'OPEN',
      aiMessageEstimate: 50,
      aiMessageReal: 35,
      costEstimated: 2500,
      costReal: 1750,
      projectId: project1.id,
      milestoneId: milestone2.id,
    },
  })

  console.log('✅ Created sample issues')

  // Create sample AI messages
  await prisma.aiMessage.createMany({
    data: [
      {
        amount: 5,
        cost: 0.25,
        date: new Date('2024-02-02'),
        issueId: issue1.id,
      },
      {
        amount: 3,
        cost: 0.15,
        date: new Date('2024-02-03'),
        issueId: issue1.id,
      },
      {
        amount: 15,
        cost: 0.75,
        date: new Date('2024-02-05'),
        issueId: issue2.id,
      },
      {
        amount: 20,
        cost: 1.00,
        date: new Date('2024-02-08'),
        issueId: issue2.id,
      },
    ],
  })

  console.log('✅ Created sample AI messages')

  // Create sample manual tasks
  await prisma.manualTask.createMany({
    data: [
      {
        description: 'Initial project consultation and planning',
        cost: 500,
        projectId: project1.id,
      },
      {
        description: 'Database design and setup',
        cost: 800,
        projectId: project1.id,
      },
    ],
  })

  console.log('✅ Created sample manual tasks')

  // Create sample payments
  await prisma.payment.createMany({
    data: [
      {
        amount: 5000,
        date: new Date('2024-02-01'),
        method: 'PayPal',
        comment: 'Initial payment - 50% upfront',
        projectId: project1.id,
      },
      {
        amount: 2500,
        date: new Date('2024-02-15'),
        method: 'Bank Transfer',
        comment: 'Milestone 1 completion',
        projectId: project1.id,
      },
    ],
  })

  console.log('✅ Created sample payments')

  // Create sample extra expenses
  await prisma.extraExpense.createMany({
    data: [
      {
        description: 'OpenAI API credits',
        amount: 150,
        date: new Date('2024-02-10'),
        projectId: project1.id,
      },
      {
        description: 'Third-party API subscription',
        amount: 99,
        date: new Date('2024-02-05'),
        projectId: project1.id,
      },
    ],
  })

  console.log('✅ Created sample extra expenses')

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
