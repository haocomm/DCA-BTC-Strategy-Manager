import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample user
  const user = await prisma.user.upsert({
    where: { email: 'demo@dcabitcoin.com' },
    update: {},
    create: {
      email: 'demo@dcabitcoin.com',
      name: 'Bitcoin Trader',
      isActive: true,
    },
  });
  console.log('✅ Created demo user:', user.email);

  // Create sample exchanges
  const binance = await prisma.exchange.create({
    data: {
      userId: user.id,
      name: 'Binance Main',
      type: 'BINANCE',
      apiKey: 'demo_api_key_12345',
      apiSecret: 'demo_secret_key_67890',
      isActive: true,
    },
  });

  const coinbase = await prisma.exchange.create({
    data: {
      userId: user.id,
      name: 'Coinbase Pro',
      type: 'COINBASE',
      apiKey: 'demo_cb_api_key',
      apiSecret: 'demo_cb_secret_key',
      isActive: true,
    },
  });
  console.log('✅ Created sample exchanges');

  // Create sample strategies
  const dailyDCA = await prisma.strategy.create({
    data: {
      userId: user.id,
      exchangeId: binance.id,
      name: 'Daily Bitcoin DCA',
      description: 'Buy $100 of Bitcoin every day at 9 AM',
      pair: 'BTCUSDT',
      amount: 100.0,
      amountType: 'FIXED',
      frequency: 'DAILY',
      startDate: new Date('2024-01-01'),
      isActive: true,
    },
  });

  const weeklyDCA = await prisma.strategy.create({
    data: {
      userId: user.id,
      exchangeId: coinbase.id,
      name: 'Weekly Bitcoin Accumulation',
      description: 'Buy $500 of Bitcoin every Monday',
      pair: 'BTC-USD',
      amount: 500.0,
      amountType: 'FIXED',
      frequency: 'WEEKLY',
      startDate: new Date('2024-01-01'),
      isActive: true,
    },
  });

  const hourlyMicro = await prisma.strategy.create({
    data: {
      userId: user.id,
      exchangeId: binance.id,
      name: 'Hourly Micro DCA',
      description: 'Buy $10 of Bitcoin every hour',
      pair: 'BTCUSDT',
      amount: 10.0,
      amountType: 'FIXED',
      frequency: 'HOURLY',
      startDate: new Date('2024-01-01'),
      isActive: false,
    },
  });
  console.log('✅ Created sample strategies');

  // Create sample executions
  const executions = [];
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const executionDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // i days ago
    const price = 42000 + Math.random() * 10000; // Random price between $42k-$52k

    executions.push({
      strategyId: dailyDCA.id,
      exchangeId: binance.id,
      amount: 100.0,
      price: price,
      quantity: 100.0 / price,
      status: 'COMPLETED',
      timestamp: executionDate,
    });
  }

  await prisma.execution.createMany({
    data: executions,
  });
  console.log('✅ Created sample executions');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: 1`);
  console.log(`- Exchanges: 2`);
  console.log(`- Strategies: 3`);
  console.log(`- Executions: ${executions.length}`);
  console.log('\n🚀 Platform is ready for demonstration!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });