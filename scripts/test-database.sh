#!/bin/bash

echo "🧪 Testing Database Connection"
echo "==============================="

cd /workspaces/RemoteVulscan

# Set environment
export $(grep -v '^#' .env | xargs)

echo "📍 DATABASE_URL: $DATABASE_URL"

# Ensure db directory exists
mkdir -p db

# Test with npm
echo "⚙️  Generating Prisma client..."
npm run prisma:generate || npx prisma generate

echo "📊 Creating database..."
npm run prisma:push --force-reset || npx prisma db push --force-reset

echo "🔍 Checking database file..."
if [ -f "db/custom.db" ]; then
    ls -la db/custom.db
    echo "✅ Database file created successfully"
else
    echo "❌ Database file not found"
    exit 1
fi

echo "🧪 Testing database connection..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.\$connect();
    console.log('✅ Database connection successful');
    
    // Test a simple query
    const count = await prisma.website.count();
    console.log('✅ Query successful - Website count:', count);
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

test();
"

echo "🎉 Database test completed successfully!"
