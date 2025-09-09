import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { stockAPI, productsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FiPlus, FiPackage, FiTrendingUp, FiAlertTriangle, FiEye } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Stock = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [movementType, setMovementType] = useState('IN');

  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm();

  // Fetch stock summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery(
    'stockSummary',
    stockAPI.getSummary
  );

  // Fetch low stock alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery(
    'lowStockAlerts',
    stockAPI.getLowStockAlerts
  );

  // Fetch products for dropdowns
  const { data: productsData } = useQuery(
    'productsForStock',
    () => productsAPI.getAll({ limit: 1000 })
  );

  // Fetch stock movements for selected product
  const { data: movementsData, isLoading: movementsLoading } = useQuery(
    ['stockMovements', selectedProduct?.id],
    () => selectedProduct ? stockAPI.getMovements(selectedProduct.id) : null,
    {
      enabled: !!selectedProduct,
    }
  );

  // Fetch sales for selected product
  const { data: salesData, isLoading: salesLoading } = useQuery(
    ['productSales', selectedProduct?.id],
    () => selectedProduct ? stockAPI.getSales(selectedProduct.id) : null,
    {
      enabled: !!selectedProduct,
    }
  );

  // Stock movement mutation
  const movementMutation = useMutation(
    (data) => stockAPI.addMovement(data),
    {
      onSuccess: (data) => {
        if (data.data.success) {
          toast.success('Stock movement recorded successfully!');
          queryClient.invalidateQueries('stockSummary');
          queryClient.invalidateQueries('lowStockAlerts');
          if (selectedProduct) {
            queryClient.invalidateQueries(['stockMovements', selectedProduct.id]);
          }
          setShowMovementForm(false);
          reset();
        } else {
          toast.error(data.data.message || 'Failed to record movement');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to record movement');
      }
    }
  );

  // Sale recording mutation
  const saleMutation = useMutation(
    (data) => stockAPI.recordSale(data),
    {
      onSuccess: (data) => {
        if (data.data.success) {
          toast.success('Sale recorded successfully!');
          queryClient.invalidateQueries('stockSummary');
          queryClient.invalidateQueries('lowStockAlerts');
          if (selectedProduct) {
            queryClient.invalidateQueries(['productSales', selectedProduct.id]);
            queryClient.invalidateQueries(['stockMovements', selectedProduct.id]);
          }
          setShowSaleForm(false);
          reset();
        } else {
          toast.error(data.data.message || 'Failed to record sale');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to record sale');
      }
    }
  );

  const onSubmitMovement = (data) => {
    movementMutation.mutate(data);
  };

  const onSubmitSale = (data) => {
    saleMutation.mutate(data);
  };

  const products = productsData?.data?.data?.products || [];
  const summary = summaryData?.data?.data || {};
  const alerts = alertsData?.data?.data?.lowStockProducts || [];
  const movements = movementsData?.data?.data?.movements || [];
  const sales = salesData?.data?.data?.sales || [];

  if (summaryLoading || alertsLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Stock & Sales</h1>
          <p className="text-gray-600">Track inventory movements and sales</p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <button
            onClick={() => {
              setMovementType('IN');
              setShowMovementForm(true);
              reset();
            }}
            className="btn btn-success"
          >
            <FiPlus className="w-4 h-4" />
            Stock In
          </button>
          <button
            onClick={() => {
              setMovementType('OUT');
              setShowMovementForm(true);
              reset();
            }}
            className="btn btn-danger"
          >
            <FiPackage className="w-4 h-4" />
            Stock Out
          </button>
          <button
            onClick={() => {
              setShowSaleForm(true);
              reset();
            }}
            className="btn btn-primary"
          >
            <FiTrendingUp className="w-4 h-4" />
            Record Sale
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalProducts || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiPackage className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Stock Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary.totalStockValue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-yellow-600">
                {summary.lowStockCount || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FiAlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">
                {summary.outOfStockCount || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Low Stock Alerts
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'movements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Stock Movements
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sales'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sales History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Selection</h3>
            <div className="space-y-3">
              {products.slice(0, 10).map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedProduct?.id === product.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      <p className="text-sm text-gray-600">{product.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {product.currentStock} {product.unit}
                      </p>
                      <p className="text-sm text-gray-600">
                        {product.sellingPrice ? `$${product.sellingPrice.toFixed(2)}` : 'No price set'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedProduct && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedProduct.name} - Stock Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Stock</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedProduct.currentStock} {selectedProduct.unit}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Opening Stock</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedProduct.openingStock} {selectedProduct.unit}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total In</label>
                    <p className="text-lg font-semibold text-green-600">
                      {selectedProduct.totalIn || 0} {selectedProduct.unit}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Out</label>
                    <p className="text-lg font-semibold text-red-600">
                      {selectedProduct.totalOut || 0} {selectedProduct.unit}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Selling Price</span>
                    <span className="font-semibold text-gray-900">
                      {selectedProduct.sellingPrice ? `$${selectedProduct.sellingPrice.toFixed(2)}` : 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alerts</h3>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{alert.name}</h4>
                    <p className="text-sm text-gray-600">
                      Current: {alert.currentStock} {alert.unit} | 
                      Suggested Production: {alert.suggestedProduction} {alert.unit}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                      Low Stock
                    </span>
                    <button
                      onClick={() => {
                        setSelectedProduct(alert);
                        setActiveTab('movements');
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      <FiEye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No low stock alerts</p>
          )}
        </div>
      )}

      {activeTab === 'movements' && selectedProduct && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Stock Movements - {selectedProduct.name}
          </h3>
          {movementsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="medium" />
            </div>
          ) : movements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Reference</th>
                    <th>Notes</th>
                    <th>Date</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          movement.movementType === 'IN' ? 'bg-green-100 text-green-800' :
                          movement.movementType === 'OUT' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {movement.movementType}
                        </span>
                      </td>
                      <td className="font-semibold">{movement.quantity}</td>
                      <td className="text-gray-600">{movement.reference || '-'}</td>
                      <td className="text-gray-600">{movement.notes || '-'}</td>
                      <td className="text-gray-600">
                        {new Date(movement.movementDate).toLocaleDateString()}
                      </td>
                      <td className="text-gray-600">{movement.createdBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No movements recorded</p>
          )}
        </div>
      )}

      {activeTab === 'sales' && selectedProduct && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sales History - {selectedProduct.name}
          </h3>
          {salesLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="medium" />
            </div>
          ) : sales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Amount</th>
                    <th>Customer</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="text-gray-600">
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </td>
                      <td className="font-semibold">{sale.quantity}</td>
                      <td className="text-gray-900">${sale.unitPrice.toFixed(2)}</td>
                      <td className="font-semibold text-green-600">${sale.totalAmount.toFixed(2)}</td>
                      <td className="text-gray-600">{sale.customerName || '-'}</td>
                      <td className="text-gray-600">{sale.invoiceNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No sales recorded</p>
          )}
        </div>
      )}

      {/* Stock Movement Form Modal */}
      {showMovementForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Record Stock {movementType === 'IN' ? 'In' : 'Out'}
              </h3>
              
              <form onSubmit={handleSubmit(onSubmitMovement)} className="space-y-4">
                <div>
                  <label className="form-label">Product *</label>
                  <select
                    {...register('productId', { required: 'Product is required' })}
                    className={`form-select ${errors.productId ? 'error' : ''}`}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Stock: {product.currentStock} {product.unit})
                      </option>
                    ))}
                  </select>
                  {errors.productId && (
                    <p className="form-error">{errors.productId.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Movement Type *</label>
                  <select
                    {...register('movementType', { required: 'Movement type is required' })}
                    className={`form-select ${errors.movementType ? 'error' : ''}`}
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value)}
                  >
                    <option value="IN">Stock In</option>
                    <option value="OUT">Stock Out</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                  {errors.movementType && (
                    <p className="form-error">{errors.movementType.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Quantity *</label>
                  <input
                    {...register('quantity', { 
                      required: 'Quantity is required',
                      min: { value: 0.01, message: 'Quantity must be positive' }
                    })}
                    type="number"
                    step="0.01"
                    className={`form-input ${errors.quantity ? 'error' : ''}`}
                    placeholder="0.00"
                  />
                  {errors.quantity && (
                    <p className="form-error">{errors.quantity.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Reference</label>
                  <input
                    {...register('reference')}
                    type="text"
                    className="form-input"
                    placeholder="e.g., Purchase Order #123"
                  />
                </div>

                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    {...register('notes')}
                    className="form-textarea"
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMovementForm(false);
                      reset();
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={movementMutation.isLoading}
                    className="btn btn-primary"
                  >
                    {movementMutation.isLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Recording...
                      </>
                    ) : (
                      'Record Movement'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sale Form Modal */}
      {showSaleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Sale</h3>
              
              <form onSubmit={handleSubmit(onSubmitSale)} className="space-y-4">
                <div>
                  <label className="form-label">Product *</label>
                  <select
                    {...register('productId', { required: 'Product is required' })}
                    className={`form-select ${errors.productId ? 'error' : ''}`}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Stock: {product.currentStock} {product.unit})
                      </option>
                    ))}
                  </select>
                  {errors.productId && (
                    <p className="form-error">{errors.productId.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Quantity *</label>
                    <input
                      {...register('quantity', { 
                        required: 'Quantity is required',
                        min: { value: 0.01, message: 'Quantity must be positive' }
                      })}
                      type="number"
                      step="0.01"
                      className={`form-input ${errors.quantity ? 'error' : ''}`}
                      placeholder="0.00"
                    />
                    {errors.quantity && (
                      <p className="form-error">{errors.quantity.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Unit Price *</label>
                    <input
                      {...register('unitPrice', { 
                        required: 'Unit price is required',
                        min: { value: 0.01, message: 'Price must be positive' }
                      })}
                      type="number"
                      step="0.01"
                      className={`form-input ${errors.unitPrice ? 'error' : ''}`}
                      placeholder="0.00"
                    />
                    {errors.unitPrice && (
                      <p className="form-error">{errors.unitPrice.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Sale Date *</label>
                  <DatePicker
                    selected={watch('saleDate')}
                    onChange={(date) => setValue('saleDate', date)}
                    className={`form-input ${errors.saleDate ? 'error' : ''}`}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select date"
                  />
                  {errors.saleDate && (
                    <p className="form-error">{errors.saleDate.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Customer Name</label>
                    <input
                      {...register('customerName')}
                      type="text"
                      className="form-input"
                      placeholder="Customer name"
                    />
                  </div>

                  <div>
                    <label className="form-label">Invoice Number</label>
                    <input
                      {...register('invoiceNumber')}
                      type="text"
                      className="form-input"
                      placeholder="Invoice number"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    {...register('notes')}
                    className="form-textarea"
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaleForm(false);
                      reset();
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saleMutation.isLoading}
                    className="btn btn-primary"
                  >
                    {saleMutation.isLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Recording...
                      </>
                    ) : (
                      'Record Sale'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;