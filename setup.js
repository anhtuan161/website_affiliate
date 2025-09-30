#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up AffiliateFlow...\n');

// Check if .env exists, if not create it
if (!fs.existsSync('.env')) {
  console.log('📝 Creating .env file...');
  const envContent = `# Database
DATABASE_URL="file:./dev.db"

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET="affiliate-flow-access-secret-$(Date.now())"
JWT_REFRESH_SECRET="affiliate-flow-refresh-secret-$(Date.now())"

# Server
PORT=5000
NODE_ENV=development

# Admin Account (seeded)
ADMIN_EMAIL=admin@site.local
ADMIN_PASSWORD=Admin@12345
`;
  
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file created');
} else {
  console.log('✅ .env file already exists');
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Generate Prisma client
console.log('\n🗄️ Setting up database...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}

// Push database schema
try {
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Database schema pushed');
} catch (error) {
  console.error('❌ Failed to push database schema:', error.message);
  process.exit(1);
}

// Seed database
try {
  execSync('npm run db:seed', { stdio: 'inherit' });
  console.log('✅ Database seeded with initial data');
} catch (error) {
  console.error('❌ Failed to seed database:', error.message);
  process.exit(1);
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Run "npm run dev" to start the development server');
console.log('2. Open http://localhost:3000 in your browser');
console.log('3. Login with admin@site.local / Admin@12345');
console.log('\n🔑 Default login credentials:');
console.log('• Admin: admin@site.local / Admin@12345');
console.log('• Owner: owner@example.com / password123');
console.log('• Staff: staff@example.com / password123');
console.log('• Member: member@example.com / password123');
console.log('\n📚 See README.md for more information');
