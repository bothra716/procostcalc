import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { overheadsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiFilter, FiTrendingUp } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Overheads = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingOverhead, setEditingOverhead] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    startDate: null,
    endDate: null,
    search: ''
  });

  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm();

  // Fetch overheads
  const { data: overheadsData, isLoading } = useQuery(
    ['overheads', filters],
    () => overheadsAPI.getAll({
      category: filters.category || undefined,
      startDate: filters.startDate?.toISOString().split('T')[0],
      endDate: filters.endDate?.toISOString().split('T')[0],
      search: filters.search || undefined
    }),
    {
      keepPreviousData: true,
    }
  );

  // Fetch analytics
  const { data: analyticsData } = useQuery(
    ['overheadsAnalytics', filters],
    () => overheadsAPI.getAnalytics({
      startDate: filters.startDate?.toISOString().split('T')[0],
      endDate: filters.endDate?.toISOString().split('T')[0]
    })
  );

  // Create/Update overhead mutation
  const saveOverheadMutation = useMutation(
    (data) => editingOverhead ? overheadsAPI.update(editingOverhead.id, data) : overheadsAPI.create(data),
    {
      onSuccess: (data) => {
        if (data.data.success) {
          toast.success(editingOverhead ? 'Overhead updated successfully!' : 'Overhead created successfully!');
          queryClient.invalidateQueries('overheads');
          queryClient.invalidateQueries('overheadsAnalytics');
          setShowForm(false);
          setEditingOverhead(null);
          reset();
        } else {
          toast.error(data.data.message || 'Failed to save overhead');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to save overhead');
      }
    }
  );

  // Delete overhead mutation
  const deleteOverheadMutation = useMutation(
    (id) => overheadsAPI.delete(id),
    {
      onSuccess: () => {
        toast.success('Overhead deleted successfully!');
        queryClient.invalidateQueries('overheads');
        queryClient.invalidateQueries('overheadsAnalytics');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete overhead');
      }
    }
  );

  const onSubmit = (data) => {
    saveOverheadMutation.mutate(data);
  };

  const handleEdit = (overhead) => {
    setEditingOverhead(overhead);
    setValue('category', overhead.category);
    setValue('subcategory', overhead.subcategory);
    setValue('description', overhead.description);
    setValue('amount', overhead.amount);
    setValue('expenseDate', new Date(overhead.expenseDate));
    setValue('isRecurring', overhead.isRecurring);
    setValue('recurringFrequency', overhead.recurringFrequency);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this overhead?')) {
      deleteOverheadMutation.mutate(id);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const overheads = overheadsData?.data?.data?.overheads || [];
  const analytics = analyticsData?.data?.data || {};

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
          <h1 className="text-2xl font-bold text-gray-900">Overheads</h1>
          <p className="text-gray-600">Manage your business overhead expenses</p>
        </div>
        <button
          onClick={() => {
            setEditingOverhead(null);
            setShowForm(true);
            reset();
          }}
          className="btn btn-primary mt-4 sm:mt-0"
        >
          <FiPlus className="w-4 h-4" />
          Add Overhead
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Overheads</p>
              <p className="text-2xl font-bold text-gray-900">
                ${analytics.totalAmount?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-500">
                {analytics.totalCount || 0} expenses
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {analytics.byCategory?.map((category, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{category.category}</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${category.totalAmount?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-gray-500">
                  {category.count || 0} expenses
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">📊</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search overheads..."
                className="form-input pl-10"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="form-select"
            >
              <option value="">All Categories</option>
              <option value="Fixed">Fixed</option>
              <option value="Variable">Variable</option>
              <option value="Recurring">Recurring</option>
              <option value="One-time">One-time</option>
            </select>
            <DatePicker
              selected={filters.startDate}
              onChange={(date) => handleFilterChange('startDate', date)}
              placeholderText="Start Date"
              className="form-input"
              dateFormat="yyyy-MM-dd"
            />
            <DatePicker
              selected={filters.endDate}
              onChange={(date) => handleFilterChange('endDate', date)}
              placeholderText="End Date"
              className="form-input"
              dateFormat="yyyy-MM-dd"
            />
            <button
              onClick={() => setFilters({ category: '', startDate: null, endDate: null, search: '' })}
              className="btn btn-outline"
            >
              <FiFilter className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Overheads Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Recurring</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overheads.length > 0 ? (
                overheads.map((overhead) => (
                  <tr key={overhead.id}>
                    <td>
                      <div>
                        <div className="font-medium text-gray-900">{overhead.description}</div>
                        {overhead.subcategory && (
                          <div className="text-sm text-gray-500">{overhead.subcategory}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        overhead.category === 'Fixed' ? 'bg-blue-100 text-blue-800' :
                        overhead.category === 'Variable' ? 'bg-green-100 text-green-800' :
                        overhead.category === 'Recurring' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {overhead.category}
                      </span>
                    </td>
                    <td className="font-semibold">${overhead.amount.toFixed(2)}</td>
                    <td className="text-gray-600">
                      {new Date(overhead.expenseDate).toLocaleDateString()}
                    </td>
                    <td>
                      {overhead.isRecurring ? (
                        <span className="text-green-600 text-sm">
                          {overhead.recurringFrequency}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">No</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(overhead)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(overhead.id)}
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
                    No overheads found. <button onClick={() => setShowForm(true)} className="text-blue-600 hover:underline">Add your first overhead</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingOverhead ? 'Edit Overhead' : 'Add New Overhead'}
              </h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Category *</label>
                    <select
                      {...register('category', { required: 'Category is required' })}
                      className={`form-select ${errors.category ? 'error' : ''}`}
                    >
                      <option value="">Select category</option>
                      <option value="Fixed">Fixed</option>
                      <option value="Variable">Variable</option>
                      <option value="Recurring">Recurring</option>
                      <option value="One-time">One-time</option>
                    </select>
                    {errors.category && (
                      <p className="form-error">{errors.category.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Subcategory</label>
                    <input
                      {...register('subcategory')}
                      type="text"
                      className="form-input"
                      placeholder="e.g., Rent, Utilities"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Description *</label>
                  <textarea
                    {...register('description', { required: 'Description is required' })}
                    className={`form-textarea ${errors.description ? 'error' : ''}`}
                    placeholder="Describe the expense"
                    rows={3}
                  />
                  {errors.description && (
                    <p className="form-error">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Amount *</label>
                    <input
                      {...register('amount', { 
                        required: 'Amount is required',
                        min: { value: 0, message: 'Amount must be positive' }
                      })}
                      type="number"
                      step="0.01"
                      className={`form-input ${errors.amount ? 'error' : ''}`}
                      placeholder="0.00"
                    />
                    {errors.amount && (
                      <p className="form-error">{errors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Expense Date *</label>
                    <DatePicker
                      selected={watch('expenseDate')}
                      onChange={(date) => setValue('expenseDate', date)}
                      className={`form-input ${errors.expenseDate ? 'error' : ''}`}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select date"
                    />
                    {errors.expenseDate && (
                      <p className="form-error">{errors.expenseDate.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      {...register('isRecurring')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Recurring expense</span>
                  </label>
                </div>

                {watch('isRecurring') && (
                  <div>
                    <label className="form-label">Recurring Frequency *</label>
                    <select
                      {...register('recurringFrequency', { 
                        required: watch('isRecurring') ? 'Frequency is required for recurring expenses' : false 
                      })}
                      className={`form-select ${errors.recurringFrequency ? 'error' : ''}`}
                    >
                      <option value="">Select frequency</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                    {errors.recurringFrequency && (
                      <p className="form-error">{errors.recurringFrequency.message}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingOverhead(null);
                      reset();
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveOverheadMutation.isLoading}
                    className="btn btn-primary"
                  >
                    {saveOverheadMutation.isLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Saving...
                      </>
                    ) : (
                      editingOverhead ? 'Update' : 'Create'
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

export default Overheads;