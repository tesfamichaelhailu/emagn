import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Transactions } from './pages/Transactions';
import { Disputes } from './pages/Disputes';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminTransactions } from './pages/admin/AdminTransactions';
import { AdminDisputes } from './pages/admin/AdminDisputes';
import { AdminSettings } from './pages/admin/AdminSettings';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            
            {/* Protected routes */}
            <Route path="dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="transactions" element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            } />
            <Route path="disputes" element={
              <ProtectedRoute>
                <Disputes />
              </ProtectedRoute>
            } />
            
            {/* Admin routes */}
            <Route path="admin" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="admin/users" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="admin/products" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminProducts />
              </ProtectedRoute>
            } />
            <Route path="admin/transactions" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminTransactions />
              </ProtectedRoute>
            } />
            <Route path="admin/disputes" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminDisputes />
              </ProtectedRoute>
            } />
            <Route path="admin/settings" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminSettings />
              </ProtectedRoute>
            } />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;