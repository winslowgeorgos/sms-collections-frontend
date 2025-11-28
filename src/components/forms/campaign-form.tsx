import React, { useState } from 'react';
import { CampaignFormData } from '@/types';
import { Upload } from 'lucide-react';

interface CampaignFormProps {
  onSubmit: (data: CampaignFormData) => void;
  onCancel: () => void;
  initialData?: CampaignFormData;
  isLoading?: boolean;
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CampaignFormData>({
    campaign_name: '',
    template_content: '',
    customer_file: null,
    scheduled_date: '',
    is_active: true,
  });

  const [fileError, setFileError] = useState('');

  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_file) {
      setFileError('Please upload a customer file');
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, customer_file: file }));
    setFileError('');

    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      
      if (!validTypes.includes(file.type)) {
        setFileError('Please upload a valid Excel file (.xlsx, .xls)');
        setFormData(prev => ({ ...prev, customer_file: null }));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Name
          </label>
          <input
            type="text"
            name="campaign_name"
            value={formData.campaign_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scheduled Date
          </label>
          <input
            type="datetime-local"
            name="scheduled_date"
            value={formData.scheduled_date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Customer File
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-accent-600 hover:text-accent-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-accent-500">
                <span>Upload Excel file</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              Excel files with customer_name and phone_number columns
            </p>
            {formData.customer_file && (
              <p className="text-sm text-success">Selected: {formData.customer_file.name}</p>
            )}
            {fileError && <p className="text-sm text-error">{fileError}</p>}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Template Content
        </label>
        <textarea
          name="template_content"
          value={formData.template_content}
          onChange={handleChange}
          required
          rows={4}
          placeholder="Enter SMS template content for this campaign"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

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
          {isLoading ? 'Creating...' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
};