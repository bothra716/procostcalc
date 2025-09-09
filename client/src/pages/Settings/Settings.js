import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { authAPI, businessProfileAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FiUser, FiBriefcase, FiShield, FiBell, FiGlobe, FiSave } from 'react-icons/fi';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  // Fetch user profile
  const { data: userData, isLoading: userLoading } = useQuery(
    'userProfile',
    authAPI.getProfile
  );

  // Fetch business profile
  const { data: businessData, isLoading: businessLoading } = useQuery(
    'businessProfile',
    businessProfileAPI.get
  );

  // Update user profile mutation
  const updateUserMutation = useMutation(
    (data) => authAPI.updateProfile(data),
    {
      onSuccess: () => {
        toast.success('Profile updated successfully!');
        queryClient.invalidateQueries('userProfile');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      }
    }
  );

  // Update business profile mutation
  const updateBusinessMutation = useMutation(
    (data) => businessProfileAPI.update(data),
    {
      onSuccess: () => {
        toast.success('Business profile updated successfully!');
        queryClient.invalidateQueries('businessProfile');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update business profile');
      }
    }
  );

  // Change password mutation
  const changePasswordMutation = useMutation(
    (data) => authAPI.changePassword(data),
    {
      onSuccess: () => {
        toast.success('Password changed successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to change password');
      }
    }
  );

  const onSubmitProfile = (data) => {
    updateUserMutation.mutate(data);
  };

  const onSubmitBusiness = (data) => {
    updateBusinessMutation.mutate(data);
  };

  const onSubmitPassword = (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
  };

  const user = userData?.data?.data?.user;
  const business = businessData?.data?.data?.profile;

  if (userLoading || businessLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and application preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FiUser className="w-4 h-4 inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'business'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FiBriefcase className="w-4 h-4 inline mr-2" />
            Business
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FiShield className="w-4 h-4 inline mr-2" />
            Security
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FiBell className="w-4 h-4 inline mr-2" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FiGlobe className="w-4 h-4 inline mr-2" />
            Preferences
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          
          <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name *</label>
                <input
                  {...register('firstName', { required: 'First name is required' })}
                  type="text"
                  className={`form-input ${errors.firstName ? 'error' : ''}`}
                  defaultValue={user?.firstName}
                />
                {errors.firstName && (
                  <p className="form-error">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Last Name *</label>
                <input
                  {...register('lastName', { required: 'Last name is required' })}
                  type="text"
                  className={`form-input ${errors.lastName ? 'error' : ''}`}
                  defaultValue={user?.lastName}
                />
                {errors.lastName && (
                  <p className="form-error">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Email Address *</label>
              <input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                defaultValue={user?.email}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Phone Number</label>
              <input
                {...register('phone')}
                type="tel"
                className="form-input"
                defaultValue={user?.phone}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateUserMutation.isLoading}
                className="btn btn-primary"
              >
                {updateUserMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="small" />
                    Updating...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    Update Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'business' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
          
          <form onSubmit={handleSubmit(onSubmitBusiness)} className="space-y-4">
            <div>
              <label className="form-label">Business Name *</label>
              <input
                {...register('businessName', { required: 'Business name is required' })}
                type="text"
                className={`form-input ${errors.businessName ? 'error' : ''}`}
                defaultValue={business?.businessName}
              />
              {errors.businessName && (
                <p className="form-error">{errors.businessName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Business Type</label>
                <select
                  {...register('businessType')}
                  className="form-select"
                  defaultValue={business?.businessType}
                >
                  <option value="">Select business type</option>
                  <option value="Individual">Individual</option>
                  <option value="Partnership">Partnership</option>
                  <option value="LLP">Limited Liability Partnership</option>
                  <option value="Private Limited">Private Limited Company</option>
                  <option value="Public Limited">Public Limited Company</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="form-label">Industry</label>
                <input
                  {...register('industry')}
                  type="text"
                  className="form-input"
                  defaultValue={business?.industry}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Address</label>
              <textarea
                {...register('addressLine')}
                className="form-textarea"
                defaultValue={business?.addressLine}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">City</label>
                <input
                  {...register('city')}
                  type="text"
                  className="form-input"
                  defaultValue={business?.city}
                />
              </div>

              <div>
                <label className="form-label">Pincode</label>
                <input
                  {...register('pincode')}
                  type="text"
                  className="form-input"
                  defaultValue={business?.pincode}
                />
              </div>

              <div>
                <label className="form-label">Tax ID</label>
                <input
                  {...register('taxId')}
                  type="text"
                  className="form-input"
                  defaultValue={business?.taxId}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateBusinessMutation.isLoading}
                className="btn btn-primary"
              >
                {updateBusinessMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="small" />
                    Updating...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    Update Business
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
          
          <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
            <div>
              <label className="form-label">Current Password *</label>
              <input
                {...register('currentPassword', { required: 'Current password is required' })}
                type="password"
                className={`form-input ${errors.currentPassword ? 'error' : ''}`}
              />
              {errors.currentPassword && (
                <p className="form-error">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">New Password *</label>
              <input
                {...register('newPassword', { 
                  required: 'New password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
                type="password"
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
              />
              {errors.newPassword && (
                <p className="form-error">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Confirm New Password *</label>
              <input
                {...register('confirmPassword', { required: 'Please confirm your password' })}
                type="password"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              />
              {errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changePasswordMutation.isLoading}
                className="btn btn-primary"
              >
                {changePasswordMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="small" />
                    Changing...
                  </>
                ) : (
                  <>
                    <FiShield className="w-4 h-4" />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-600">Receive notifications via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Low Stock Alerts</h4>
                <p className="text-sm text-gray-600">Get notified when stock is running low</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Sales Reports</h4>
                <p className="text-sm text-gray-600">Weekly sales summary reports</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Preferences</h3>
          
          <div className="space-y-4">
            <div>
              <label className="form-label">Language</label>
              <select className="form-select" defaultValue={user?.language}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="bn">Bengali</option>
                <option value="gu">Gujarati</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
                <option value="mr">Marathi</option>
                <option value="or">Odia</option>
                <option value="pa">Punjabi</option>
                <option value="ur">Urdu</option>
              </select>
            </div>

            <div>
              <label className="form-label">Currency</label>
              <select className="form-select" defaultValue={user?.currency}>
                <option value="USD">USD - US Dollar</option>
                <option value="INR">INR - Indian Rupee</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
              </select>
            </div>

            <div>
              <label className="form-label">Date Format</label>
              <select className="form-select" defaultValue="MM/DD/YYYY">
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="form-label">Number Format</label>
              <select className="form-select" defaultValue="US">
                <option value="US">US (1,234.56)</option>
                <option value="EU">European (1.234,56)</option>
                <option value="IN">Indian (1,23,456.78)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;