import React, { useState, useEffect } from 'react';
import { TemplateFormData, Product, Day } from '@/types';
import { apiClient } from '@/lib/api';

interface TemplateFormProps {
  onSubmit: (data: TemplateFormData) => void;
  onCancel: () => void;
  initialData?: TemplateFormData;
  isLoading?: boolean;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<TemplateFormData>({
    template_name: '',
    product_ids: [],  // Changed to array
    day_ids: [],      // Changed to array
    template_desc: '',
    scheduled_datetime: '',
    is_active: true,
    is_campaign_template: false, // Added new field
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [days, setDays] = useState<Day[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const client = apiClient.getClient();
        const [productsRes, daysRes] = await Promise.all([
          client.get('/products/'),
          client.get('/days/'),
        ]);
        setProducts(productsRes.data);
        setDays(daysRes.data);
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleMultiSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    field: 'product_ids' | 'day_ids'
  ) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      [field]: selectedOptions,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name
          </label>
          <input
            type="text"
            name="template_name"
            value={formData.template_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Products (Select multiple)
          </label>
          <select
            name="product_ids"
            multiple
            value={formData.product_ids}
            onChange={(e) => handleMultiSelectChange(e, 'product_ids')}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 h-32"
          >
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.product_name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Hold Ctrl/Cmd to select multiple products
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Days (Select multiple)
          </label>
          <select
            name="day_ids"
            multiple
            value={formData.day_ids}
            onChange={(e) => handleMultiSelectChange(e, 'day_ids')}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 h-32"
          >
            {days.map(day => (
              <option key={day.id} value={day.id}>
                {day.day_name} ({day.number_of_days} days)
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Hold Ctrl/Cmd to select multiple days
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scheduled Date/Time
          </label>
          <input
            type="datetime-local"
            name="scheduled_datetime"
            value={formData.scheduled_datetime}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Template Description
        </label>
        <textarea
          name="template_desc"
          value={formData.template_desc}
          onChange={handleChange}
          required
          rows={4}
          placeholder="Enter SMS template with variables like {{name}}, {{balance}}, etc."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        <p className="text-sm text-gray-500 mt-1">
          Use variables: {'{{name}}'}, {'{{balance}}'}, {'{{due_date}}'}, {'{{loan_id}}'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">Active</label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_campaign_template"
            checked={formData.is_campaign_template}
            onChange={handleChange}
            className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">Campaign Template</label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-accent-600 border border-transparent rounded-md hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </form>
  );
};