import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@padel.com' },
    update: {},
    create: {
      email: 'admin@padel.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create Court 1
  let court1 = await prisma.court.findFirst({
    where: { name: 'Court 1' },
  });
  if (!court1) {
    court1 = await prisma.court.create({
      data: {
        name: 'Court 1',
        basePricePerHour: 100.0,
      },
    });
  }
  console.log('✅ Created court:', court1.name);

  // Create Court 2
  let court2 = await prisma.court.findFirst({
    where: { name: 'Court 2' },
  });
  if (!court2) {
    court2 = await prisma.court.create({
      data: {
        name: 'Court 2',
        basePricePerHour: 100.0,
      },
    });
  }
  console.log('✅ Created court:', court2.name);

  // Create Pricing Rule for Peak Hours (18:00-23:00) on Court 1
  let pricingRule = await prisma.pricingRule.findFirst({
    where: {
      courtId: court1.id,
      startTime: '18:00',
      endTime: '23:00',
    },
  });
  if (!pricingRule) {
    pricingRule = await prisma.pricingRule.create({
      data: {
        courtId: court1.id,
        startTime: '18:00',
        endTime: '23:00',
        multiplier: 1.5, // 1.5x multiplier for peak hours
      },
    });
  }
  console.log('✅ Created pricing rule:', `Peak hours (${pricingRule.startTime}-${pricingRule.endTime}) with ${pricingRule.multiplier}x multiplier`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

