import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { businessProfileAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const BusinessProfile = () => {
  const [countries] = useState([
    { code: 'IN', name: 'India' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'SG', name: 'Singapore' },
    { code: 'AE', name: 'United Arab Emirates' },
  ]);

  const [indianStates, setIndianStates] = useState([]);
  const [gstinValidation, setGstinValidation] = useState(null);
  const [isValidatingGstin, setIsValidatingGstin] = useState(false);

  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  const selectedCountry = watch('country');
  const taxId = watch('taxId');

  // Fetch business profile
  const { data: profileData, isLoading: profileLoading } = useQuery(
    'businessProfile',
    businessProfileAPI.get,
    {
      onSuccess: (data) => {
        if (data.data.success && data.data.data.profile) {
          const profile = data.data.data.profile;
          setValue('businessName', profile.businessName);
          setValue('country', profile.country);
          setValue('state', profile.state);
          setValue('addressLine', profile.addressLine);
          setValue('city', profile.city);
          setValue('pincode', profile.pincode);
          setValue('taxId', profile.taxId);
          setValue('businessType', profile.businessType);
          setValue('industry', profile.industry);
        }
      }
    }
  );

  // Fetch Indian states
  const { data: statesData } = useQuery(
    'indianStates',
    businessProfileAPI.getIndianStates,
    {
      enabled: selectedCountry === 'IN',
      onSuccess: (data) => {
        if (data.data.success) {
          setIndianStates(data.data.data.states);
        }
      }
    }
  );

  // GSTIN validation mutation
  const validateGstinMutation = useMutation(
    (gstin) => businessProfileAPI.validateGSTIN(gstin),
    {
      onSuccess: (data) => {
        if (data.data.success) {
          setGstinValidation(data.data.data);
          if (data.data.data.isValid && data.data.data.stateCode) {
            // Auto-select state if GSTIN is valid
            const state = indianStates.find(s => s.code === data.data.data.stateCode);
            if (state) {
              setValue('state', data.data.data.stateCode);
            }
          }
        }
      },
      onError: () => {
        setGstinValidation({ isValid: false });
      }
    }
  );

  // Save business profile mutation
  const saveProfileMutation = useMutation(
    (data) => businessProfileAPI.create(data),
    {
      onSuccess: (data) => {
        if (data.data.success) {
          toast.success('Business profile saved successfully!');
          queryClient.invalidateQueries('businessProfile');
        } else {
          toast.error(data.data.message || 'Failed to save profile');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to save profile');
      }
    }
  );

  // Validate GSTIN when taxId changes and country is India
  useEffect(() => {
    if (selectedCountry === 'IN' && taxId && taxId.length === 15) {
      setIsValidatingGstin(true);
      validateGstinMutation.mutate(taxId);
    } else {
      setGstinValidation(null);
    }
  }, [taxId, selectedCountry]);

  const onSubmit = (data) => {
    saveProfileMutation.mutate(data);
  };

  const handleGstinChange = (e) => {
    const value = e.target.value.toUpperCase();
    setValue('taxId', value);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Business Profile</h1>
          <p className="card-subtitle">
            Set up your business information for accurate costing and compliance
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
            
            <div>
              <label htmlFor="businessName" className="form-label">
                Business Name *
              </label>
              <input
                {...register('businessName', { required: 'Business name is required' })}
                type="text"
                className={`form-input ${errors.businessName ? 'error' : ''}`}
                placeholder="Enter your business name"
              />
              {errors.businessName && (
                <p className="form-error">{errors.businessName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="businessType" className="form-label">
                  Business Type
                </label>
                <select
                  {...register('businessType')}
                  className="form-select"
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
                <label htmlFor="industry" className="form-label">
                  Industry
                </label>
                <input
                  {...register('industry')}
                  type="text"
                  className="form-input"
                  placeholder="e.g., Manufacturing, Retail, Services"
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Location Information</h3>
            
            <div>
              <label htmlFor="country" className="form-label">
                Country *
              </label>
              <select
                {...register('country', { required: 'Country is required' })}
                className={`form-select ${errors.country ? 'error' : ''}`}
              >
                <option value="">Select country</option>
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p className="form-error">{errors.country.message}</p>
              )}
            </div>

            {selectedCountry === 'IN' && (
              <div>
                <label htmlFor="state" className="form-label">
                  State *
                </label>
                <select
                  {...register('state', { 
                    required: selectedCountry === 'IN' ? 'State is required for India' : false 
                  })}
                  className={`form-select ${errors.state ? 'error' : ''}`}
                >
                  <option value="">Select state</option>
                  {indianStates.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="form-error">{errors.state.message}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="addressLine" className="form-label">
                Address
              </label>
              <textarea
                {...register('addressLine')}
                className="form-textarea"
                placeholder="Enter your business address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="form-label">
                  City
                </label>
                <input
                  {...register('city')}
                  type="text"
                  className="form-input"
                  placeholder="Enter city"
                />
              </div>

              <div>
                <label htmlFor="pincode" className="form-label">
                  {selectedCountry === 'IN' ? 'PIN Code' : 'Postal Code'}
                </label>
                <input
                  {...register('pincode')}
                  type="text"
                  className="form-input"
                  placeholder={selectedCountry === 'IN' ? 'Enter PIN code' : 'Enter postal code'}
                />
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Tax Information</h3>
            
            <div>
              <label htmlFor="taxId" className="form-label">
                {selectedCountry === 'IN' ? 'GSTIN' : 'Tax ID'}
              </label>
              <div className="relative">
                <input
                  {...register('taxId')}
                  type="text"
                  className={`form-input ${errors.taxId ? 'error' : ''}`}
                  placeholder={selectedCountry === 'IN' ? 'Enter 15-digit GSTIN' : 'Enter tax ID'}
                  onChange={handleGstinChange}
                  maxLength={selectedCountry === 'IN' ? 15 : undefined}
                />
                {isValidatingGstin && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <LoadingSpinner size="small" />
                  </div>
                )}
              </div>
              
              {gstinValidation && (
                <div className={`mt-2 text-sm ${
                  gstinValidation.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {gstinValidation.isValid ? (
                    <span>✓ Valid GSTIN - {gstinValidation.stateName}</span>
                  ) : (
                    <span>✗ Invalid GSTIN format</span>
                  )}
                </div>
              )}
              
              {selectedCountry === 'IN' && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: 2 digits (state) + 10 characters (PAN) + 1 character (entity) + 1 character (Z) + 1 character (checksum)
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveProfileMutation.isLoading}
              className="btn btn-primary"
            >
              {saveProfileMutation.isLoading ? (
                <>
                  <LoadingSpinner size="small" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusinessProfile;
