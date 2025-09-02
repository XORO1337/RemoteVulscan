#!/bin/bash

echo "🔍 CAPTCHA Configuration Validator"
echo "=================================="

# Check .env file
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    exit 1
fi

echo "✅ .env file found"

# Check for TURNSTILE_SITE_KEY
SITE_KEY=$(grep "TURNSTILE_SITE_KEY=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
if [ -z "$SITE_KEY" ]; then
    echo "❌ TURNSTILE_SITE_KEY not set in .env"
    exit 1
fi

echo "✅ TURNSTILE_SITE_KEY found: ${SITE_KEY:0:10}..."

# Check for TURNSTILE_SECRET_KEY
SECRET_KEY=$(grep "TURNSTILE_SECRET_KEY=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
if [ -z "$SECRET_KEY" ]; then
    echo "❌ TURNSTILE_SECRET_KEY not set in .env"
    exit 1
fi

echo "✅ TURNSTILE_SECRET_KEY found: ${SECRET_KEY:0:10}..."

# Validate key format
if [[ $SITE_KEY == "1x00000000000000000000AA" ]]; then
    echo "ℹ️  Using test site key (always passes)"
elif [[ $SITE_KEY == "2x00000000000000000000AB" ]]; then
    echo "ℹ️  Using test site key (always blocks)"
elif [[ $SITE_KEY == "3x00000000000000000000FF" ]]; then
    echo "ℹ️  Using test site key (forces interactive challenge)"
elif [[ $SITE_KEY =~ ^0x[A-Za-z0-9_-]{40,}$ ]]; then
    echo "✅ Production site key format detected"
else
    echo "⚠️  Unusual site key format - may not work"
fi

echo ""
echo "🌐 Testing API endpoint..."

# Test the public-config endpoint
if command -v curl &> /dev/null; then
    RESPONSE=$(curl -s http://localhost:3000/api/public-config 2>/dev/null || echo "FAILED")
    if [ "$RESPONSE" = "FAILED" ]; then
        echo "⚠️  Could not test API (server may not be running)"
        echo "   Start server with: npm run dev"
    else
        echo "✅ API response: $RESPONSE"
    fi
else
    echo "⚠️  curl not available, skipping API test"
fi

echo ""
echo "📝 Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Visit: http://localhost:3000/debug-captcha"
echo "3. Check browser console for any errors"
echo "4. If issues persist, try production keys from Cloudflare"
