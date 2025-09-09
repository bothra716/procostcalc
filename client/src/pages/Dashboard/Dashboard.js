import React from 'react';
import { useQuery } from 'react-query';
import { dashboardAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const Dashboard = () => {
  const { data: kpisData, isLoading: kpisLoading } = useQuery(
    'dashboardKPIs',
    dashboardAPI.getKPIs
  );

  const { data: trendsData, isLoading: trendsLoading } = useQuery(
    'dashboardTrends',
    dashboardAPI.getTrends
  );

  const { data: quickStatsData, isLoading: quickStatsLoading } = useQuery(
    'dashboardQuickStats',
    dashboardAPI.getQuickStats
  );

  if (kpisLoading || trendsLoading || quickStatsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const kpis = kpisData?.data?.data?.kpis || {};
  const trends = trendsData?.data?.data || {};
  const quickStats = quickStatsData?.data?.data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your business performance</p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900">
                ${quickStats.todaySales?.amount?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-500">
                {quickStats.todaySales?.transactions || 0} transactions
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
              <p className="text-sm font-medium text-gray-600">This Month's Overheads</p>
              <p className="text-2xl font-bold text-gray-900">
                ${quickStats.monthOverheads?.amount?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-500">
                {quickStats.monthOverheads?.expenses || 0} expenses
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">📊</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {quickStats.lowStockCount || 0}
              </p>
              <p className="text-sm text-gray-500">Items need attention</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-xl">⚠️</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {quickStats.recentProducts || 0}
              </p>
              <p className="text-sm text-gray-500">Added this week</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">📦</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Products</span>
              <span className="font-semibold">{kpis.totalProducts || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Sales</span>
              <span className="font-semibold">${kpis.totalSales?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Overheads</span>
              <span className="font-semibold">${kpis.totalOverheads?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Profit Margin</span>
              <span className={`font-semibold ${kpis.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpis.profitMargin?.toFixed(2) || '0.00'}%
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Material Costs</span>
              <span className="font-semibold">${kpis.totalMaterialCost?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Job Work Costs</span>
              <span className="font-semibold">${kpis.totalJobWorkCost?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Additional Costs</span>
              <span className="font-semibold">${kpis.totalAdditionalCost?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-gray-900 font-semibold">Total Product Cost</span>
              <span className="font-bold text-lg">${kpis.totalProductCost?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
        <div className="space-y-3">
          {kpisData?.data?.data?.recentActivities?.length > 0 ? (
            kpisData.data.data.recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activities</p>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {kpisData?.data?.data?.lowStockAlerts?.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alerts</h3>
          <div className="space-y-3">
            {kpisData.data.data.lowStockAlerts.map((alert, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{alert.name}</p>
                  <p className="text-sm text-gray-600">
                    Current stock: {alert.currentStock} {alert.unit}
                  </p>
                </div>
                <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                  Low Stock
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
