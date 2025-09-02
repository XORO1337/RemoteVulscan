#!/bin/bash

echo "🗄️  Database Initialization Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

# Create db directory if it doesn't exist
if [ ! -d "db" ]; then
    echo "📁 Creating db directory..."
    mkdir -p db
    echo "✅ Database directory created"
fi

# Check current database file
if [ -f "db/custom.db" ]; then
    echo "⚠️  Existing database found"
    read -p "Do you want to reset the database? This will delete all data. (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing existing database..."
        rm -f db/custom.db
        echo "✅ Existing database removed"
    else
        echo "ℹ️  Keeping existing database"
    fi
fi

# Set proper permissions
echo "🔒 Setting proper permissions..."
chmod 755 db/
if [ -f "db/custom.db" ]; then
    chmod 664 db/custom.db
fi

# Generate Prisma client
echo "⚙️  Generating Prisma client..."
if command -v pnpm &> /dev/null; then
    pnpm prisma generate
elif command -v npm &> /dev/null; then
    npm run prisma generate || npx prisma generate
else
    echo "❌ Neither pnpm nor npm found"
    exit 1
fi

# Push database schema
echo "📊 Creating database schema..."
if command -v pnpm &> /dev/null; then
    pnpm prisma db push
elif command -v npm &> /dev/null; then
    npm run prisma db push || npx prisma db push
else
    echo "❌ Neither pnpm nor npm found"
    exit 1
fi

# Verify database
if [ -f "db/custom.db" ]; then
    DB_SIZE=$(du -h db/custom.db | cut -f1)
    echo "✅ Database created successfully (Size: $DB_SIZE)"
    echo "📍 Database location: $(pwd)/db/custom.db"
else
    echo "❌ Database creation failed"
    exit 1
fi

echo ""
echo "🎉 Database initialization complete!"
echo "You can now start your application with: npm run dev"
