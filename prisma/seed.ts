import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@site.local' },
    update: {},
    create: {
      email: 'admin@site.local',
      password: hashedAdminPassword,
      name: 'System Administrator',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create sample users for each role
  const sampleUsers = [
    {
      email: 'owner@example.com',
      password: await bcrypt.hash('password123', 12),
      name: 'SME Owner',
      role: Role.OWNER,
    },
    {
      email: 'staff@example.com',
      password: await bcrypt.hash('password123', 12),
      name: 'SME Employee',
      role: Role.STAFF,
    },
    {
      email: 'member@example.com',
      password: await bcrypt.hash('password123', 12),
      name: 'Affiliate Partner',
      role: Role.MEMBER,
    },
  ];

  for (const userData of sampleUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    console.log(`✅ ${userData.role} user created:`, user.email);
  }

  // Create sample posts
  const samplePosts = [
    {
      title: 'Welcome to AffiliateFlow',
      content: 'This is your first post! Use this space to share updates, announcements, or important information with your team.',
      status: 'PUBLISHED' as const,
      authorId: admin.id,
      createdById: admin.id,
    },
    {
      title: 'Getting Started Guide',
      content: 'Learn how to make the most of our affiliate management platform. Check out the documentation for detailed guides.',
      status: 'PUBLISHED' as const,
      authorId: admin.id,
      createdById: admin.id,
    },
    {
      title: 'New Features Coming Soon',
      content: 'We are working on exciting new features including advanced analytics, automated reporting, and mobile app support.',
      status: 'DRAFT' as const,
      authorId: admin.id,
      createdById: admin.id,
    },
  ];

  for (const postData of samplePosts) {
    const post = await prisma.post.create({
      data: postData,
    });
    console.log(`✅ Sample post created:`, post.title);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('Admin: admin@site.local / Admin@12345');
  console.log('Owner: owner@example.com / password123');
  console.log('Staff: staff@example.com / password123');
  console.log('Member: member@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
