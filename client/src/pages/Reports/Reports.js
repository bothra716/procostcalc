import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { reportsAPI, productsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FiDownload, FiFileText, FiTrendingUp, FiBarChart2 } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  const [filters, setFilters] = useState({
    category: '',
    format: 'json'
  });

  // Fetch products for product reports
  const { data: productsData } = useQuery(
    'productsForReports',
    () => productsAPI.getAll({ limit: 1000 })
  );

  // Fetch product cost report
  const { data: productCostData, isLoading: productCostLoading } = useQuery(
    ['productCostReport', selectedProduct, filters.format],
    () => selectedProduct ? reportsAPI.getProductCost(selectedProduct, filters.format) : null,
    {
      enabled: !!selectedProduct && selectedReport === 'product-cost',
    }
  );

  // Fetch overheads report
  const { data: overheadsData, isLoading: overheadsLoading } = useQuery(
    ['overheadsReport', dateRange, filters],
    () => reportsAPI.getOverheads({
      startDate: dateRange.startDate?.toISOString().split('T')[0],
      endDate: dateRange.endDate?.toISOString().split('T')[0],
      category: filters.category || undefined,
      format: filters.format
    }),
    {
      enabled: selectedReport === 'overheads',
    }
  );

  // Fetch profitability report
  const { data: profitabilityData, isLoading: profitabilityLoading } = useQuery(
    ['profitabilityReport', dateRange, filters.format],
    () => reportsAPI.getProfitability({
      startDate: dateRange.startDate?.toISOString().split('T')[0],
      endDate: dateRange.endDate?.toISOString().split('T')[0],
      format: filters.format
    }),
    {
      enabled: selectedReport === 'profitability',
    }
  );

  const products = productsData?.data?.data?.products || [];

  const handleDownload = (data, filename) => {
    if (filters.format === 'pdf' || filters.format === 'excel') {
      // For PDF/Excel, the API should return a blob
      const blob = new Blob([data], { 
        type: filters.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      // For JSON, download as JSON file
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const getReportData = () => {
    switch (selectedReport) {
      case 'product-cost':
        return productCostData?.data?.data;
      case 'overheads':
        return overheadsData?.data?.data;
      case 'profitability':
        return profitabilityData?.data?.data;
      default:
        return null;
    }
  };

  const isLoading = productCostLoading || overheadsLoading || profitabilityLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600">Generate detailed reports and analytics</p>
      </div>

      {/* Report Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => setSelectedReport('product-cost')}
          className={`card cursor-pointer transition-all ${
            selectedReport === 'product-cost' 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:shadow-lg'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiFileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Product Cost Report</h3>
              <p className="text-sm text-gray-600">Detailed cost breakdown for products</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setSelectedReport('overheads')}
          className={`card cursor-pointer transition-all ${
            selectedReport === 'overheads' 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:shadow-lg'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <FiBarChart2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Overheads Report</h3>
              <p className="text-sm text-gray-600">Expense analysis and trends</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setSelectedReport('profitability')}
          className={`card cursor-pointer transition-all ${
            selectedReport === 'profitability' 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:shadow-lg'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Profitability Analysis</h3>
              <p className="text-sm text-gray-600">Profit margins and performance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Configuration */}
      {selectedReport && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedReport === 'product-cost' && (
              <div>
                <label className="form-label">Select Product *</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="form-select"
                >
                  <option value="">Choose a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(selectedReport === 'overheads' || selectedReport === 'profitability') && (
              <>
                <div>
                  <label className="form-label">Start Date</label>
                  <DatePicker
                    selected={dateRange.startDate}
                    onChange={(date) => setDateRange(prev => ({ ...prev, startDate: date }))}
                    className="form-input"
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select start date"
                  />
                </div>

                <div>
                  <label className="form-label">End Date</label>
                  <DatePicker
                    selected={dateRange.endDate}
                    onChange={(date) => setDateRange(prev => ({ ...prev, endDate: date }))}
                    className="form-input"
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select end date"
                  />
                </div>
              </>
            )}

            {selectedReport === 'overheads' && (
              <div>
                <label className="form-label">Category Filter</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="form-select"
                >
                  <option value="">All Categories</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Variable">Variable</option>
                  <option value="Recurring">Recurring</option>
                  <option value="One-time">One-time</option>
                </select>
              </div>
            )}

            <div>
              <label className="form-label">Export Format</label>
              <select
                value={filters.format}
                onChange={(e) => setFilters(prev => ({ ...prev, format: e.target.value }))}
                className="form-select"
              >
                <option value="json">JSON</option>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                const data = getReportData();
                if (data) {
                  const filename = `${selectedReport}-report-${new Date().toISOString().split('T')[0]}.${filters.format}`;
                  handleDownload(data, filename);
                }
              }}
              disabled={isLoading || !getReportData()}
              className="btn btn-primary"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="small" />
                  Generating...
                </>
              ) : (
                <>
                  <FiDownload className="w-4 h-4" />
                  Download Report
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {selectedReport && getReportData() && !isLoading && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Preview</h3>
          
          {selectedReport === 'product-cost' && (
            <ProductCostPreview data={getReportData()} />
          )}

          {selectedReport === 'overheads' && (
            <OverheadsPreview data={getReportData()} />
          )}

          {selectedReport === 'profitability' && (
            <ProfitabilityPreview data={getReportData()} />
          )}
        </div>
      )}
    </div>
  );
};

// Product Cost Report Preview Component
const ProductCostPreview = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Product Information</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span className="font-medium">{data.product.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Unit:</span>
            <span className="font-medium">{data.product.unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Selling Price:</span>
            <span className="font-medium">
              {data.product.sellingPrice ? `$${data.product.sellingPrice.toFixed(2)}` : 'Not set'}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Cost Breakdown</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Materials Total:</span>
            <span className="font-medium">${data.costBreakdown.materialsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Job Work Total:</span>
            <span className="font-medium">${data.costBreakdown.jobWorkTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Additional Costs:</span>
            <span className="font-medium">${data.costBreakdown.additionalCostsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold text-gray-900">Total Cost:</span>
            <span className="font-bold text-lg">${data.costBreakdown.totalProductCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Less: Scrap Value:</span>
            <span className="font-medium">${data.product.scrapValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-blue-600">
            <span className="font-semibold">Net Cost:</span>
            <span className="font-bold">${data.costBreakdown.netCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    {data.materials.length > 0 && (
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Materials</h4>
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
              {data.materials.map((material, index) => (
                <tr key={index}>
                  <td className="font-medium">{material.name}</td>
                  <td>{material.quantity}</td>
                  <td>{material.unit}</td>
                  <td>${material.unitCost.toFixed(2)}</td>
                  <td className="font-semibold">${material.totalCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

// Overheads Report Preview Component
const OverheadsPreview = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-2xl font-bold text-gray-900">${data.totalAmount.toFixed(2)}</p>
        <p className="text-sm text-gray-600">Total Amount</p>
      </div>
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-2xl font-bold text-gray-900">{data.totalCount}</p>
        <p className="text-sm text-gray-600">Total Expenses</p>
      </div>
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-2xl font-bold text-gray-900">
          {data.totalCount > 0 ? (data.totalAmount / data.totalCount).toFixed(2) : '0.00'}
        </p>
        <p className="text-sm text-gray-600">Average per Expense</p>
      </div>
    </div>

    {data.summary.length > 0 && (
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Summary by Category</h4>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Total Amount</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {data.summary.map((category, index) => (
                <tr key={index}>
                  <td className="font-medium">{category.category}</td>
                  <td className="font-semibold">${category.totalAmount.toFixed(2)}</td>
                  <td>{category.count}</td>
                  <td>
                    {((category.totalAmount / data.totalAmount) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

// Profitability Report Preview Component
const ProfitabilityPreview = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-2xl font-bold text-gray-900">{data.summary.totalProducts}</p>
        <p className="text-sm text-gray-600">Total Products</p>
      </div>
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-2xl font-bold text-gray-900">${data.summary.totalSales.toFixed(2)}</p>
        <p className="text-sm text-gray-600">Total Sales</p>
      </div>
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-2xl font-bold text-gray-900">${data.summary.totalCost.toFixed(2)}</p>
        <p className="text-sm text-gray-600">Total Cost</p>
      </div>
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className={`text-2xl font-bold ${
          data.summary.overallProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {data.summary.overallProfitMargin.toFixed(1)}%
        </p>
        <p className="text-sm text-gray-600">Overall Margin</p>
      </div>
    </div>

    {data.products.length > 0 && (
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Product Performance</h4>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Quantity Sold</th>
                <th>Total Sales</th>
                <th>Total Cost</th>
                <th>Profit</th>
                <th>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((product, index) => (
                <tr key={index}>
                  <td className="font-medium">{product.name}</td>
                  <td>{product.totalQuantitySold}</td>
                  <td className="font-semibold">${product.totalSales.toFixed(2)}</td>
                  <td>${product.totalCost.toFixed(2)}</td>
                  <td className={`font-semibold ${
                    product.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${product.profit.toFixed(2)}
                  </td>
                  <td className={`font-semibold ${
                    product.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {product.profitMargin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

export default Reports;