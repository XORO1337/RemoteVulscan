#!/bin/bash

# RemoteVulscan Environment Setup Script

echo "🔧 Setting up RemoteVulscan environment..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📋 Creating .env file from example..."
    cp .env.example .env
    echo "✅ .env file created from .env.example"
else
    echo "⚠️  .env file already exists, skipping creation"
fi

# Create database directory if it doesn't exist
if [ ! -d "db" ]; then
    echo "📁 Creating database directory..."
    mkdir -p db
    echo "✅ Database directory created"
fi

# Check if database file exists
if [ ! -f "db/custom.db" ]; then
    echo "🗄️  Initializing database..."
    if command -v pnpm &> /dev/null; then
        pnpm prisma generate
        pnpm prisma db push
    elif command -v npm &> /dev/null; then
        npm run prisma generate
        npm run prisma db push
    else
        echo "❌ Neither pnpm nor npm found. Please install dependencies manually."
        exit 1
    fi
    echo "✅ Database initialized"
else
    echo "⚠️  Database already exists, skipping initialization"
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env file and add your Turnstile keys"
echo "2. Run 'pnpm dev' or 'npm run dev' to start the application"
echo ""
echo "🔗 Get Turnstile keys from: https://developers.cloudflare.com/turnstile/get-started/"
echo ""
echo "Made with ❤️ by Hardik (@XORO1337) "
