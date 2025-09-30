#!/bin/bash

# Quick Test Runner for Certificate Generator

echo "🧪 Running Certificate Generator Tests..."

# Test 1: Check if server starts
echo "🔍 Test 1: Server Startup"
timeout 10s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 5

if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server started successfully"
    kill $SERVER_PID 2>/dev/null
else
    echo "❌ Server failed to start"
    exit 1
fi

# Test 2: Health Check
echo "🔍 Test 2: Health Check"
npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 5

HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
fi

kill $SERVER_PID 2>/dev/null

# Test 3: Database Connection
echo "🔍 Test 3: Database Connection"
if pg_isready -q; then
    echo "✅ Database connection available"
else
    echo "❌ Database connection failed"
fi

# Test 4: Check Required Files
echo "🔍 Test 4: Required Files"
REQUIRED_FILES=(
    "src/app.ts"
    "src/config/database.ts"
    "src/routes/auth.ts"
    "src/routes/templates.ts"
    "src/routes/certificates.ts"
    "src/routes/verification.ts"
    ".env"
    "package.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "🎯 Manual Testing Steps:"
echo "1. Start server: npm run dev"
echo "2. Visit: http://localhost:3000"
echo "3. Register: test@example.com / Password123!"
echo "4. Create certificates using test-participants.csv"
echo "5. Test verification with generated certificate ID"
echo ""
echo "📋 API Testing:"
echo "curl -X GET http://localhost:3000/health"
echo "curl -X GET http://localhost:3000/api/templates/defaults"
echo ""
