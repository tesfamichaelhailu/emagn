@echo off
echo 🚀 Starting Emagn Platform Development Environment
echo ==================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js is available

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
if not exist "node_modules" (
    npm install
)

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd ..\frontend
if not exist "node_modules" (
    npm install
)

REM Go back to root
cd ..

echo.
echo 🎯 Setup Instructions:
echo ======================
echo 1. Make sure MySQL is running
echo 2. Create database: CREATE DATABASE emagn_platform;
echo 3. Import schema: mysql -u root -p emagn_platform ^< backend\database\schema.sql
echo 4. Import seed data: mysql -u root -p emagn_platform ^< backend\database\seed.sql
echo 5. Update backend\.env with your database credentials
echo.
echo 🚀 To start the development servers:
echo ====================================
echo Backend:  cd backend ^&^& npm run dev
echo Frontend: cd frontend ^&^& npm start
echo.
echo 🌐 URLs:
echo ========
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo API Health: http://localhost:5000/api/health
echo.
echo 🔐 Demo Accounts:
echo =================
echo Buyer:      buyer1@example.com / admin123
echo Seller:     seller1@example.com / admin123
echo Admin:      admin@emagn.com / admin123
echo Super Admin: superadmin@emagn.com / admin123
echo.
echo ✨ Happy coding!
pause