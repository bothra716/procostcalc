import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { productsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('ASC');

  const { data: productsData, isLoading } = useQuery(
    ['products', { search: searchTerm, page: currentPage, sortBy, sortOrder }],
    () => productsAPI.getAll({ search: searchTerm, page: currentPage, sortBy, sortOrder }),
    {
      keepPreviousData: true,
    }
  );

  const products = productsData?.data?.data?.products || [];
  const pagination = productsData?.data?.data?.pagination || {};

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your product catalog and costing</p>
        </div>
        <Link
          to="/products/new"
          className="btn btn-primary mt-4 sm:mt-0"
        >
          <FiPlus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                className="form-input pl-10"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
            >
              <option value="name">Sort by Name</option>
              <option value="created_at">Sort by Date</option>
              <option value="current_stock">Sort by Stock</option>
            </select>
            <button
              onClick={() => handleSort(sortBy)}
              className="btn btn-outline"
            >
              {sortOrder === 'ASC' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="cursor-pointer hover:bg-gray-50">
                  Product Name
                </th>
                <th>Unit</th>
                <th onClick={() => handleSort('current_stock')} className="cursor-pointer hover:bg-gray-50">
                  Current Stock
                </th>
                <th>Selling Price</th>
                <th>Margin %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-gray-600">{product.unit}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.currentStock <= 10 
                          ? 'bg-red-100 text-red-800' 
                          : product.currentStock <= 50 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.currentStock} {product.unit}
                      </span>
                    </td>
                    <td className="text-gray-900">
                      {product.sellingPrice ? `$${product.sellingPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="text-gray-900">
                      {product.targetMarginPercent ? `${product.targetMarginPercent.toFixed(1)}%` : '-'}
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/products/${product.id}`}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/products/${product.id}/edit`}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="Edit"
                        >
                          <FiEdit className="w-4 h-4" />
                        </Link>
                        <button
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No products found. <Link to="/products/new" className="text-blue-600 hover:underline">Add your first product</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalCount)} of {pagination.totalCount} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={!pagination.hasPrev}
                className="btn btn-outline btn-sm"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                disabled={!pagination.hasNext}
                className="btn btn-outline btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
