#!/bin/bash
# Quick test script to verify the project structure

echo "🔍 Testing project structure..."

# Check if key directories exist
if [ -d "src/components" ] && [ -d "src/hooks" ] && [ -d "src/lib" ]; then
    echo "✅ Source directories are properly organized"
else
    echo "❌ Missing source directories"
    exit 1
fi

# Check if duplicate directories are removed
if [ ! -d "components" ] && [ ! -d "hooks" ] && [ ! -d "lib" ] && [ ! -d "styles" ]; then
    echo "✅ Duplicate directories successfully removed"
else
    echo "❌ Duplicate directories still exist"
    exit 1
fi

# Check if correct config file exists
if [ -f "next.config.js" ] && [ ! -f "next.config.ts" ] && [ ! -f "next.config.mjs" ]; then
    echo "✅ Correct Next.js configuration file in place"
else
    echo "❌ Wrong Next.js configuration files"
    exit 1
fi

# Check if package-lock.json is removed
if [ ! -f "package-lock.json" ]; then
    echo "✅ package-lock.json properly removed (using pnpm)"
else
    echo "❌ package-lock.json still exists"
    exit 1
fi

echo "🎉 Project structure cleanup verification complete!"
