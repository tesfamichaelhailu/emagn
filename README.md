# Emagn Platform - Secure Online Transaction Platform

A comprehensive e-commerce platform built with React.js, Node.js, and MySQL that provides secure transactions through an escrow system, human-mediated dispute resolution, and role-based access control.

## 🚀 Features

### Core Functionality
- **Secure Escrow System**: Payments held safely until delivery confirmation
- **Role-Based Access Control**: Guest, Buyer, Seller, Admin, and Super Admin roles
- **Human-Mediated Dispute Resolution**: Fair conflict resolution process
- **Product Management**: Comprehensive product listing and management
- **Transaction Tracking**: Real-time transaction status updates
- **User Management**: Complete user profile and account management

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting and CORS protection
- SQL injection prevention
- XSS protection

### User Roles
- **Guest**: Browse products without purchasing
- **Buyer**: Purchase products and manage transactions
- **Seller**: List products and manage sales
- **Admin**: Manage disputes and oversee transactions
- **Super Admin**: Full system control and configuration

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Express Validator** for input validation
- **Helmet** for security headers
- **CORS** for cross-origin requests

### Frontend
- **React.js** with functional components
- **React Router** for navigation
- **React Query** for data fetching
- **React Hook Form** for form management
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hot Toast** for notifications

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd emagn-platform
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=emagn_platform

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Database Setup

1. Create MySQL database:
```sql
CREATE DATABASE emagn_platform;
```

2. Import the schema and seed data:
```bash
mysql -u root -p emagn_platform < backend/database/schema.sql
mysql -u root -p emagn_platform < backend/database/seed.sql
```

### 4. Start Backend Server
```bash
cd backend
npm run dev
```

The backend will be available at `http://localhost:5000`

### 5. Frontend Setup

```bash
cd frontend
npm install
```

### 6. Start Frontend Development Server
```bash
cd frontend
npm start
```

The frontend will be available at `http://localhost:3000`

## 🔐 Demo Accounts

The system comes with pre-configured demo accounts:

- **Buyer**: `buyer1@example.com` / `admin123`
- **Seller**: `seller1@example.com` / `admin123`
- **Admin**: `admin@emagn.com` / `admin123`
- **Super Admin**: `superadmin@emagn.com` / `admin123`

## 📁 Project Structure

```
emagn-platform/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── database/
│   │   ├── schema.sql
│   │   └── seed.sql
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validation.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── products.js
│   │   ├── transactions.js
│   │   ├── disputes.js
│   │   ├── admin.js
│   │   └── categories.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Seller only)
- `PUT /api/products/:id` - Update product (Seller only)

### Transactions
- `POST /api/transactions` - Create transaction (Buyer only)
- `GET /api/transactions/my-transactions` - Get user transactions
- `PUT /api/transactions/:id/status` - Update transaction status

### Disputes
- `POST /api/disputes` - Create dispute
- `GET /api/disputes/my-disputes` - Get user disputes
- `POST /api/disputes/:id/messages` - Add dispute message

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/users` - Get all users (Admin only)
- `PUT /api/admin/settings` - Update system settings (Super Admin only)

## 🎨 UI Components

The frontend includes a comprehensive set of reusable components:

- **Layout Components**: Header, Footer, Navigation
- **Form Components**: Input fields, buttons, validation
- **Card Components**: Product cards, transaction cards
- **Status Components**: Badges, indicators
- **Modal Components**: Confirmation dialogs, forms

## 🔒 Security Considerations

- All passwords are hashed using bcrypt with salt rounds
- JWT tokens are used for stateless authentication
- Input validation on both client and server side
- SQL injection prevention through parameterized queries
- CORS configuration for cross-origin requests
- Rate limiting to prevent abuse
- Helmet.js for security headers

## 🚀 Deployment

### Backend Deployment
1. Set up a production MySQL database
2. Configure environment variables for production
3. Install dependencies: `npm install --production`
4. Start the server: `npm start`

### Frontend Deployment
1. Build the production bundle: `npm run build`
2. Deploy the `build` folder to your hosting service
3. Configure environment variables for API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions, please contact:
- Email: support@emagn.com
- Documentation: [Link to documentation]

## 🔮 Future Enhancements

- [ ] Payment gateway integration (Stripe, PayPal)
- [ ] Real-time notifications with WebSockets
- [ ] Advanced search and filtering
- [ ] Mobile app development
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Email notification system
- [ ] File upload for product images
- [ ] Review and rating system
- [ ] Advanced reporting features