#!/bin/bash

# Certificate Generator - Quick Test Setup Script

echo "🚀 Setting up Certificate Generator for testing..."

# 1. Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first:"
    echo "   sudo systemctl start postgresql"
    echo "   or"
    echo "   brew services start postgresql"
    exit 1
fi

echo "✅ PostgreSQL is running"

# 2. Create database if it doesn't exist
if ! psql -lqt | cut -d \| -f 1 | grep -qw certificate_gen; then
    echo "📄 Creating database 'certificate_gen'..."
    createdb certificate_gen
    echo "✅ Database created"
else
    echo "✅ Database 'certificate_gen' already exists"
fi

# 3. Run migrations
echo "🔄 Running database migrations..."
npm run db:migrate

# 4. Seed default templates
echo "🌱 Seeding default templates..."
npm run db:seed

# 5. Create upload directories
echo "📁 Creating upload directories..."
mkdir -p uploads/templates uploads/logos certificates

# 6. Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "🎉 Setup complete! You can now test the application:"
echo ""
echo "   npm run dev     # Start development server"
echo "   npm run start   # Start production server"
echo ""
echo "🌐 Once started, visit:"
echo "   http://localhost:3000        - Main application"
echo "   http://localhost:3000/health - Health check"
echo "   http://localhost:3000/verify - Certificate verification"
echo ""
echo "📋 Test credentials:"
echo "   Email: test@example.com"
echo "   Password: Password123!"
echo ""
echo "📄 Use test-participants.csv for bulk upload testing"
