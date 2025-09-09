import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { productsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FiPlus, FiTrash2, FiSave, FiArrowLeft } from 'react-icons/fi';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const isEdit = !!id;

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      unit: 'pcs',
      scrapValue: 0,
      openingStock: 0,
      sellingPrice: '',
      targetMarginPercent: '',
      materials: [],
      jobWork: [],
      additionalCosts: []
    }
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control,
    name: 'materials'
  });

  const { fields: jobWorkFields, append: appendJobWork, remove: removeJobWork } = useFieldArray({
    control,
    name: 'jobWork'
  });

  const { fields: additionalCostFields, append: appendAdditionalCost, remove: removeAdditionalCost } = useFieldArray({
    control,
    name: 'additionalCosts'
  });

  // Fetch product data for editing
  useEffect(() => {
    if (isEdit) {
      setIsLoading(true);
      productsAPI.getById(id)
        .then(response => {
          if (response.data.success) {
            const product = response.data.data.product;
            setValue('name', product.name);
            setValue('description', product.description);
            setValue('unit', product.unit);
            setValue('scrapValue', product.scrapValue);
            setValue('openingStock', product.openingStock);
            setValue('sellingPrice', product.sellingPrice || '');
            setValue('targetMarginPercent', product.targetMarginPercent || '');
            
            // Set materials
            const materials = response.data.data.materials.map(m => ({
              materialName: m.materialName,
              quantity: m.quantity,
              unit: m.unit,
              unitCost: m.unitCost
            }));
            setValue('materials', materials);
            
            // Set job work
            const jobWork = response.data.data.jobWork.map(j => ({
              description: j.description,
              cost: j.cost
            }));
            setValue('jobWork', jobWork);
            
            // Set additional costs
            const additionalCosts = response.data.data.additionalCosts.map(a => ({
              costType: a.costType,
              description: a.description,
              cost: a.cost
            }));
            setValue('additionalCosts', additionalCosts);
          }
        })
        .catch(error => {
          toast.error('Failed to load product data');
          console.error(error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isEdit, setValue]);

  // Create/Update product mutation
  const saveProductMutation = useMutation(
    (data) => {
      if (isEdit) {
        return productsAPI.update(id, data);
      } else {
        return productsAPI.create(data);
      }
    },
    {
      onSuccess: (response) => {
        if (response.data.success) {
          toast.success(isEdit ? 'Product updated successfully!' : 'Product created successfully!');
          queryClient.invalidateQueries('products');
          navigate('/products');
        } else {
          toast.error(response.data.message || 'Failed to save product');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to save product');
      }
    }
  );

  // Add material mutation
  const addMaterialMutation = useMutation(
    (data) => productsAPI.addMaterial(id, data),
    {
      onSuccess: () => {
        toast.success('Material added successfully!');
        queryClient.invalidateQueries(['product', id]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add material');
      }
    }
  );

  // Add job work mutation
  const addJobWorkMutation = useMutation(
    (data) => productsAPI.addJobWork(id, data),
    {
      onSuccess: () => {
        toast.success('Job work added successfully!');
        queryClient.invalidateQueries(['product', id]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add job work');
      }
    }
  );

  // Add additional cost mutation
  const addAdditionalCostMutation = useMutation(
    (data) => productsAPI.addAdditionalCost(id, data),
    {
      onSuccess: () => {
        toast.success('Additional cost added successfully!');
        queryClient.invalidateQueries(['product', id]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add additional cost');
      }
    }
  );

  const onSubmit = (data) => {
    // Calculate total costs
    const materialsTotal = data.materials.reduce((sum, material) => {
      return sum + (material.quantity * material.unitCost);
    }, 0);

    const jobWorkTotal = data.jobWork.reduce((sum, job) => {
      return sum + job.cost;
    }, 0);

    const additionalCostsTotal = data.additionalCosts.reduce((sum, cost) => {
      return sum + cost.cost;
    }, 0);

    const productData = {
      name: data.name,
      description: data.description,
      unit: data.unit,
      scrapValue: parseFloat(data.scrapValue) || 0,
      openingStock: parseFloat(data.openingStock) || 0,
      sellingPrice: data.sellingPrice ? parseFloat(data.sellingPrice) : null,
      targetMarginPercent: data.targetMarginPercent ? parseFloat(data.targetMarginPercent) : null
    };

    if (isEdit) {
      // For editing, save the product first, then add materials/job work/additional costs
      saveProductMutation.mutate(productData);
      
      // Add materials
      data.materials.forEach(material => {
        if (material.materialName && material.quantity && material.unitCost) {
          addMaterialMutation.mutate({
            materialName: material.materialName,
            quantity: parseFloat(material.quantity),
            unit: material.unit,
            unitCost: parseFloat(material.unitCost)
          });
        }
      });

      // Add job work
      data.jobWork.forEach(job => {
        if (job.description && job.cost) {
          addJobWorkMutation.mutate({
            description: job.description,
            cost: parseFloat(job.cost)
          });
        }
      });

      // Add additional costs
      data.additionalCosts.forEach(cost => {
        if (cost.costType && cost.cost) {
          addAdditionalCostMutation.mutate({
            costType: cost.costType,
            description: cost.description,
            cost: parseFloat(cost.cost)
          });
        }
      });
    } else {
      // For new products, save everything together
      saveProductMutation.mutate(productData);
    }
  };

  const calculateTotalCost = () => {
    const materialsTotal = materialFields.reduce((sum, field, index) => {
      const material = watch(`materials.${index}`);
      return sum + ((material?.quantity || 0) * (material?.unitCost || 0));
    }, 0);

    const jobWorkTotal = jobWorkFields.reduce((sum, field, index) => {
      const job = watch(`jobWork.${index}`);
      return sum + (job?.cost || 0);
    }, 0);

    const additionalCostsTotal = additionalCostFields.reduce((sum, field, index) => {
      const cost = watch(`additionalCosts.${index}`);
      return sum + (cost?.cost || 0);
    }, 0);

    return materialsTotal + jobWorkTotal + additionalCostsTotal;
  };

  const totalCost = calculateTotalCost();
  const scrapValue = parseFloat(watch('scrapValue') || 0);
  const netCost = totalCost - scrapValue;
  const sellingPrice = parseFloat(watch('sellingPrice') || 0);
  const profit = sellingPrice - netCost;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/products')}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update product information and costs' : 'Create a new product with detailed costing'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Product Name *</label>
              <input
                {...register('name', { required: 'Product name is required' })}
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="form-error">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Unit *</label>
              <select
                {...register('unit', { required: 'Unit is required' })}
                className={`form-select ${errors.unit ? 'error' : ''}`}
              >
                <option value="pcs">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="g">Grams</option>
                <option value="l">Liters</option>
                <option value="ml">Milliliters</option>
                <option value="m">Meters</option>
                <option value="cm">Centimeters</option>
                <option value="sqm">Square Meters</option>
                <option value="box">Box</option>
                <option value="set">Set</option>
                <option value="pair">Pair</option>
              </select>
              {errors.unit && (
                <p className="form-error">{errors.unit.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              {...register('description')}
              className="form-textarea"
              placeholder="Enter product description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Opening Stock</label>
              <input
                {...register('openingStock', { min: 0 })}
                type="number"
                step="0.01"
                className="form-input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="form-label">Scrap Value</label>
              <input
                {...register('scrapValue', { min: 0 })}
                type="number"
                step="0.01"
                className="form-input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="form-label">Selling Price</label>
              <input
                {...register('sellingPrice', { min: 0 })}
                type="number"
                step="0.01"
                className="form-input"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Target Margin %</label>
            <input
              {...register('targetMarginPercent', { min: 0, max: 100 })}
              type="number"
              step="0.01"
              className="form-input"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Materials */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Materials</h3>
            <button
              type="button"
              onClick={() => appendMaterial({ materialName: '', quantity: 0, unit: 'kg', unitCost: 0 })}
              className="btn btn-outline btn-sm"
            >
              <FiPlus className="w-4 h-4" />
              Add Material
            </button>
          </div>

          <div className="space-y-4">
            {materialFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="form-label">Material Name</label>
                  <input
                    {...register(`materials.${index}.materialName`)}
                    type="text"
                    className="form-input"
                    placeholder="e.g., Steel, Plastic"
                  />
                </div>

                <div>
                  <label className="form-label">Quantity</label>
                  <input
                    {...register(`materials.${index}.quantity`, { min: 0 })}
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="form-label">Unit</label>
                  <select
                    {...register(`materials.${index}.unit`)}
                    className="form-select"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="pcs">pcs</option>
                    <option value="m">m</option>
                    <option value="l">l</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Unit Cost</label>
                  <input
                    {...register(`materials.${index}.unitCost`, { min: 0 })}
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeMaterial(index)}
                    className="btn btn-danger btn-sm w-full"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {materialFields.length === 0 && (
              <p className="text-center text-gray-500 py-4">No materials added yet</p>
            )}
          </div>
        </div>

        {/* Job Work */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Job Work</h3>
            <button
              type="button"
              onClick={() => appendJobWork({ description: '', cost: 0 })}
              className="btn btn-outline btn-sm"
            >
              <FiPlus className="w-4 h-4" />
              Add Job Work
            </button>
          </div>

          <div className="space-y-4">
            {jobWorkFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="md:col-span-3">
                  <label className="form-label">Description</label>
                  <input
                    {...register(`jobWork.${index}.description`)}
                    type="text"
                    className="form-input"
                    placeholder="e.g., Machining, Assembly, Painting"
                  />
                </div>

                <div>
                  <label className="form-label">Cost</label>
                  <input
                    {...register(`jobWork.${index}.cost`, { min: 0 })}
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeJobWork(index)}
                    className="btn btn-danger btn-sm"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {jobWorkFields.length === 0 && (
              <p className="text-center text-gray-500 py-4">No job work added yet</p>
            )}
          </div>
        </div>

        {/* Additional Costs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Additional Costs</h3>
            <button
              type="button"
              onClick={() => appendAdditionalCost({ costType: 'Transport', description: '', cost: 0 })}
              className="btn btn-outline btn-sm"
            >
              <FiPlus className="w-4 h-4" />
              Add Cost
            </button>
          </div>

          <div className="space-y-4">
            {additionalCostFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="form-label">Cost Type</label>
                  <select
                    {...register(`additionalCosts.${index}.costType`)}
                    className="form-select"
                  >
                    <option value="Transport">Transport</option>
                    <option value="Packing">Packing</option>
                    <option value="Quality Control">Quality Control</option>
                    <option value="Testing">Testing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <input
                    {...register(`additionalCosts.${index}.description`)}
                    type="text"
                    className="form-input"
                    placeholder="Description"
                  />
                </div>

                <div>
                  <label className="form-label">Cost</label>
                  <input
                    {...register(`additionalCosts.${index}.cost`, { min: 0 })}
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeAdditionalCost(index)}
                    className="btn btn-danger btn-sm w-full"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {additionalCostFields.length === 0 && (
              <p className="text-center text-gray-500 py-4">No additional costs added yet</p>
            )}
          </div>
        </div>

        {/* Cost Summary */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Materials Total:</span>
                <span className="font-semibold">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Job Work Total:</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Additional Costs:</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-900">Total Cost:</span>
                <span className="font-bold text-lg">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Less: Scrap Value:</span>
                <span className="font-semibold">${scrapValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span className="font-semibold">Net Cost:</span>
                <span className="font-bold">${netCost.toFixed(2)}</span>
              </div>
            </div>

            {sellingPrice > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Selling Price:</span>
                  <span className="font-semibold">${sellingPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Cost:</span>
                  <span className="font-semibold">${netCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold text-gray-900">Profit:</span>
                  <span className={`font-bold text-lg ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Margin %:</span>
                  <span className={`font-bold text-lg ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margin.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveProductMutation.isLoading}
            className="btn btn-primary"
          >
            {saveProductMutation.isLoading ? (
              <>
                <LoadingSpinner size="small" />
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                {isEdit ? 'Update Product' : 'Create Product'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
