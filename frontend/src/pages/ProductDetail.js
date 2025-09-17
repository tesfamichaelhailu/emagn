import React from 'react';
import { useParams } from 'react-router-dom';

export const ProductDetail = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Product Details</h1>
        <div className="card p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Product Detail Page Coming Soon
          </h2>
          <p className="text-gray-600">
            Product ID: {id}
          </p>
          <p className="text-gray-600 mt-2">
            This page will show detailed product information, seller details, and purchase options.
          </p>
        </div>
      </div>
    </div>
  );
};