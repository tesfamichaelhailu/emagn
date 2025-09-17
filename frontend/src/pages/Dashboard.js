import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Welcome back, {user?.first_name}!
        </h1>
        <div className="card p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Dashboard Coming Soon
          </h2>
          <p className="text-gray-600">
            Your personalized dashboard will show your transactions, products, and account overview.
          </p>
          <p className="text-gray-500 mt-2 text-sm">
            Role: {user?.role}
          </p>
        </div>
      </div>
    </div>
  );
};