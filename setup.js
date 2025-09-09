#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Costing & Inventory Management System...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
  console.error('❌ Node.js version 16 or higher is required. Current version:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version check passed');

// Create necessary directories
const directories = [
  'server/logs',
  'client/public',
  'client/src/components',
  'client/src/pages',
  'client/src/hooks',
  'client/src/services',
  'client/src/utils'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Install server dependencies
console.log('\n📦 Installing server dependencies...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✅ Server dependencies installed');
} catch (error) {
  console.error('❌ Failed to install server dependencies:', error.message);
  process.exit(1);
}

// Install client dependencies
console.log('\n📦 Installing client dependencies...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: path.join(process.cwd(), 'client') });
  console.log('✅ Client dependencies installed');
} catch (error) {
  console.error('❌ Failed to install client dependencies:', error.message);
  process.exit(1);
}

// Create .env file if it doesn't exist
if (!fs.existsSync('.env')) {
  console.log('\n📝 Creating .env file...');
  const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=costing_system
DB_USER=postgres
DB_PASSWORD=password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-${Math.random().toString(36).substring(2, 15)}
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-${Math.random().toString(36).substring(2, 15)}
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# AWS S3 Configuration (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Logging
LOG_LEVEL=info

# GST API Configuration (for future integration)
GST_API_URL=https://api.gst.gov.in
GST_API_KEY=your-gst-api-key

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file created');
} else {
  console.log('✅ .env file already exists');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Set up PostgreSQL database:');
console.log('   - Install PostgreSQL');
console.log('   - Create database: createdb costing_system');
console.log('   - Update .env with your database credentials');
console.log('\n2. Run database migrations:');
console.log('   npm run migrate');
console.log('\n3. (Optional) Seed with sample data:');
console.log('   npm run seed');
console.log('\n4. Start the development server:');
console.log('   npm run dev');
console.log('\n5. Open your browser and navigate to:');
console.log('   http://localhost:3000');
console.log('\n📚 For more information, see README.md');
