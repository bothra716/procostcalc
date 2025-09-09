import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { productsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FiEdit, FiTrash2, FiDownload, FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const ProductDetail = () => {
  const { id } = useParams();

  const { data: productData, isLoading } = useQuery(
    ['product', id],
    () => productsAPI.getById(id),
    {
      enabled: !!id,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!productData?.data?.success) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Product not found</p>
        <Link to="/products" className="btn btn-primary mt-4">
          <FiArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
      </div>
    );
  }

  const product = productData.data.data.product;
  const materials = productData.data.data.materials || [];
  const jobWork = productData.data.data.jobWork || [];
  const additionalCosts = productData.data.data.additionalCosts || [];
  const costBreakdown = productData.data.data.costBreakdown || {};

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/products" className="text-gray-400 hover:text-gray-600">
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600">{product.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to={`/products/${id}/edit`}
            className="btn btn-outline"
          >
            <FiEdit className="w-4 h-4" />
            Edit
          </Link>
          <button className="btn btn-outline">
            <FiDownload className="w-4 h-4" />
            Export
          </button>
          <button className="btn btn-danger">
            <FiTrash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Product Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Unit</label>
                <p className="text-gray-900">{product.unit}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Current Stock</label>
                <p className="text-gray-900">{product.currentStock} {product.unit}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Opening Stock</label>
                <p className="text-gray-900">{product.openingStock} {product.unit}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Scrap Value</label>
                <p className="text-gray-900">${product.scrapValue.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Selling Price</label>
                <p className="text-gray-900">
                  {product.sellingPrice ? `$${product.sellingPrice.toFixed(2)}` : 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Target Margin</label>
                <p className="text-gray-900">
                  {product.targetMarginPercent ? `${product.targetMarginPercent.toFixed(1)}%` : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Materials */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Materials</h3>
            {materials.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Material Name</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Unit Cost</th>
                      <th>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material) => (
                      <tr key={material.id}>
                        <td className="font-medium">{material.materialName}</td>
                        <td>{material.quantity}</td>
                        <td>{material.unit}</td>
                        <td>${material.unitCost.toFixed(2)}</td>
                        <td className="font-semibold">${material.totalCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No materials added</p>
            )}
          </div>

          {/* Job Work */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Work</h3>
            {jobWork.length > 0 ? (
              <div className="space-y-3">
                {jobWork.map((job) => (
                  <div key={job.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-900">{job.description}</span>
                    <span className="font-semibold">${job.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No job work added</p>
            )}
          </div>

          {/* Additional Costs */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Costs</h3>
            {additionalCosts.length > 0 ? (
              <div className="space-y-3">
                {additionalCosts.map((cost) => (
                  <div key={cost.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{cost.costType}</span>
                      {cost.description && (
                        <p className="text-sm text-gray-600">{cost.description}</p>
                      )}
                    </div>
                    <span className="font-semibold">${cost.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No additional costs added</p>
            )}
          </div>
        </div>

        {/* Cost Summary */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Materials Total</span>
                <span className="font-semibold">${costBreakdown.materialsTotal?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Job Work Total</span>
                <span className="font-semibold">${costBreakdown.jobWorkTotal?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Additional Costs</span>
                <span className="font-semibold">${costBreakdown.additionalCostsTotal?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-900 font-semibold">Total Cost</span>
                  <span className="font-bold text-lg">${costBreakdown.totalProductCost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Less: Scrap Value</span>
                  <span>${product.scrapValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-blue-600">
                  <span>Net Cost</span>
                  <span>${costBreakdown.netCost?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profitability Analysis */}
          {product.sellingPrice && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profitability</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Selling Price</span>
                  <span className="font-semibold">${product.sellingPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Cost</span>
                  <span className="font-semibold">${costBreakdown.netCost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-900 font-semibold">Profit</span>
                    <span className={`font-bold text-lg ${
                      (product.sellingPrice - (costBreakdown.netCost || 0)) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${(product.sellingPrice - (costBreakdown.netCost || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Margin %</span>
                    <span className={`font-semibold ${
                      ((product.sellingPrice - (costBreakdown.netCost || 0)) / product.sellingPrice * 100) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {((product.sellingPrice - (costBreakdown.netCost || 0)) / product.sellingPrice * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
