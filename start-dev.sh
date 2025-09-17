#!/bin/bash

# Emagn Platform Development Startup Script

echo "🚀 Starting Emagn Platform Development Environment"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MySQL is running
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed. Please install MySQL first."
    exit 1
fi

echo "✅ Node.js and MySQL are available"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Go back to root
cd ..

echo ""
echo "🎯 Setup Instructions:"
echo "======================"
echo "1. Make sure MySQL is running"
echo "2. Create database: CREATE DATABASE emagn_platform;"
echo "3. Import schema: mysql -u root -p emagn_platform < backend/database/schema.sql"
echo "4. Import seed data: mysql -u root -p emagn_platform < backend/database/seed.sql"
echo "5. Update backend/.env with your database credentials"
echo ""
echo "🚀 To start the development servers:"
echo "===================================="
echo "Backend:  cd backend && npm run dev"
echo "Frontend: cd frontend && npm start"
echo ""
echo "🌐 URLs:"
echo "========"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo "API Health: http://localhost:5000/api/health"
echo ""
echo "🔐 Demo Accounts:"
echo "================="
echo "Buyer:      buyer1@example.com / admin123"
echo "Seller:     seller1@example.com / admin123"
echo "Admin:      admin@emagn.com / admin123"
echo "Super Admin: superadmin@emagn.com / admin123"
echo ""
echo "✨ Happy coding!"