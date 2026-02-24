// app/templates/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { Template, Product, Day } from '@/types';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import { usePermissions } from '@/context/permission-context';

interface TemplateFormData {
  template_name: string;
  product_ids: string[];
  day_ids: string[];
  template_desc: string;
  scheduled_datetime: string;
  is_active: boolean;
  is_campaign_template: boolean;
}

export default function TemplatesPage() {
  const { hasAccess } = usePermissions();

  // Permission shortcuts – adjust codenames as needed
  const canCreate = hasAccess('add_template');
  const canChange = hasAccess('change_template');
  const canDelete = hasAccess('delete_template');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<TemplateFormData>({
    template_name: '',
    product_ids: [],
    day_ids: [],
    template_desc: '',
    scheduled_datetime: '',
    is_active: true,
    is_campaign_template: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const client = apiClient.getClient();
      const [templatesRes, productsRes, daysRes] = await Promise.all([
        client.get('/templates/'),
        client.get('/products/'),
        client.get('/days/'),
      ]);

      setTemplates(templatesRes?.data?.results || templatesRes?.data || []);
      setProducts(productsRes?.data?.results || productsRes?.data || []);
      setDays(daysRes?.data?.results || daysRes?.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      template_name: '',
      product_ids: [],
      day_ids: [],
      template_desc: '',
      scheduled_datetime: '',
      is_active: true,
      is_campaign_template: false,
    });
    setFormErrors({});
    setEditingTemplate(null);
  };

  const handleOpenCreate = () => {
    if (!canCreate) return; // Guard
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenDelete = (template: Template) => {
    if (!canDelete) return; // Guard
    setDeleteTemplate(template);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteTemplate(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.template_name.trim()) {
      errors.template_name = 'Template name is required';
    }

    if (formData.product_ids.length === 0) {
      errors.product_ids = 'At least one product is required';
    }

    if (formData.day_ids.length === 0) {
      errors.day_ids = 'At least one day is required';
    }

    if (!formData.template_desc.trim()) {
      errors.template_desc = 'Template description is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      
      const submitData = {
        template_name: formData.template_name,
        template_desc: formData.template_desc,
        scheduled_datetime: formData.scheduled_datetime || null,
        is_active: formData.is_active,
        is_campaign_template: formData.is_campaign_template,
        product_ids: formData.product_ids,
        day_ids: formData.day_ids,
      };

      console.log('Submitting template data:', JSON.stringify(submitData, null, 2));

      if (editingTemplate) {
        await client.put(`/templates/${editingTemplate.id}/`, submitData);
      } else {
        await client.post('/templates/', submitData);
      }

      await fetchData();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving template:', error);
      if (error.response?.data) {
        console.error('API error response:', error.response.data);
        setFormErrors(error.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (template: Template) => {
    if (!canChange) return; // Guard
    console.log('Editing template:', template);
    
    setFormData({
      template_name: template.template_name,
      product_ids: template.products?.map(p => p.id) || template.product_ids || [],
      day_ids: template.days?.map(d => d.id) || template.day_ids || [],
      template_desc: template.template_desc,
      scheduled_datetime: template.scheduled_datetime || '',
      is_active: template.is_active,
      is_campaign_template: template.is_campaign_template || false,
    });
    
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;

    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.delete(`/templates/${deleteTemplate.id}/`);
      await fetchData();
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Error deleting template:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
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
    
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const columns = [
    {
      id: 'template_name',
      label: 'Template Name',
      accessor: (row: Template) => row.template_name,
      width: 200,
      filter: {
        type: 'text' as const,
        placeholder: 'Search templates...'
      }
    },
    {
      id: 'products',
      label: 'Products',
      accessor: (row: Template) => row.products || row.product_names,
      Cell: (value: Product[] | string[]) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(value) && value.slice(0, 3).map((item, index) => (
            <span 
              key={index} 
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
            >
              {typeof item === 'object' ? item.product_name : item}
            </span>
          ))}
          {Array.isArray(value) && value.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
              +{value.length - 3} more
            </span>
          )}
        </div>
      ),
      width: 200,
    },
    {
      id: 'days',
      label: 'Days',
      accessor: (row: Template) => row.days || row.day_names,
      Cell: (value: Day[] | string[]) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(value) && value.slice(0, 3).map((item, index) => (
            <span 
              key={index} 
              className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
            >
              {typeof item === 'object' ? item.day_name : item}
            </span>
          ))}
          {Array.isArray(value) && value.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
              +{value.length - 3} more
            </span>
          )}
        </div>
      ),
      width: 150,
    },
    {
      id: 'template_desc',
      label: 'Description',
      accessor: (row: Template) => row.template_desc,
      Cell: (value: string) => (
        <p className="text-gray-600 text-sm line-clamp-2">{value}</p>
      ),
      width: 250,
      filter: {
        type: 'text' as const,
        placeholder: 'Search description...'
      }
    },
    {
      id: 'is_campaign_template',
      label: 'Type',
      accessor: (row: Template) => row.is_campaign_template,
      Cell: (value: boolean) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Campaign' : 'Regular'}
        </span>
      ),
      width: 100,
      filter: {
        type: 'choices' as const,
        choices: ['true', 'false'],
        placeholder: 'All types'
      }
    },
    {
      id: 'is_active',
      label: 'Status',
      accessor: (row: Template) => row.is_active,
      Cell: (value: boolean) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
      width: 100,
      filter: {
        type: 'choices' as const,
        choices: ['true', 'false'],
        placeholder: 'All statuses'
      }
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: Template) => row,
      Cell: (value: Template) => (
        <div className="flex space-x-2">
          {/* Edit button – requires change permission */}
          {canChange && (
            <button
              onClick={() => handleOpenEdit(value)}
              className="text-accent-600 hover:text-accent-700 transition-colors"
              title="Edit template"
            >
              <Edit size={16} />
            </button>
          )}
          {/* Delete button – requires delete permission */}
          {canDelete && (
            <button
              onClick={() => handleOpenDelete(value)}
              className="text-error-600 hover:text-error-700 transition-colors"
              title="Delete template"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
      width: 100,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-600 mt-2">Manage SMS templates for different products and days</p>
        </div>
        {/* Add Template button – requires create permission */}
        {canCreate && (
          <Button onClick={handleOpenCreate} className="bg-accent-600 hover:bg-accent-700">
            <Plus size={20} className="mr-2" />
            Add Template
          </Button>
        )}
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">All Templates</h2>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <Button variant="outline">
                <Filter size={20} className="mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading templates...</div>
            </div>
          ) : (
            <GenericTable
              data={templates}
              columns={columns}
              rowKey={(row: Template) => row.id}
              selectionMode="none"
              virtualized={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTemplate ? 'Edit Template' : 'Create New Template'}
        size="lg"
        isLoading={isSubmitting}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Template Name"
            name="template_name"
            type="text"
            value={formData.template_name}
            onChange={handleInputChange}
            error={formErrors.template_name}
            required
            placeholder="Enter template name"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Products (Select multiple) *
            </label>
            <select
              name="product_ids"
              multiple
              value={formData.product_ids}
              onChange={(e) => handleMultiSelectChange(e, 'product_ids')}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 h-32 ${
                formErrors.product_ids ? 'border-error-300' : 'border-gray-300'
              }`}
            >
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.product_name}
                </option>
              ))}
            </select>
            {formErrors.product_ids && (
              <p className="text-sm text-error-600">{formErrors.product_ids}</p>
            )}
            <p className="text-sm text-gray-500">
              Hold Ctrl/Cmd to select multiple products
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Days (Select multiple) *
            </label>
            <select
              name="day_ids"
              multiple
              value={formData.day_ids}
              onChange={(e) => handleMultiSelectChange(e, 'day_ids')}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 h-32 ${
                formErrors.day_ids ? 'border-error-300' : 'border-gray-300'
              }`}
            >
              {days.map(day => (
                <option key={day.id} value={day.id}>
                  {day.day_name} ({day.number_of_days} days)
                </option>
              ))}
            </select>
            {formErrors.day_ids && (
              <p className="text-sm text-error-600">{formErrors.day_ids}</p>
            )}
            <p className="text-sm text-gray-500">
              Hold Ctrl/Cmd to select multiple days
            </p>
          </div>

          <FormInput
            label="Template Description"
            name="template_desc"
            type="textarea"
            value={formData.template_desc}
            onChange={handleInputChange}
            error={formErrors.template_desc}
            required
            placeholder="Enter template description with variables like {{name}}, {{balance}}, etc."
            rows={6}
          />

          <FormInput
            label="Scheduled Date & Time"
            name="scheduled_datetime"
            type="datetime-local"
            value={formData.scheduled_datetime}
            onChange={handleInputChange}
            placeholder="Select scheduled date and time"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_campaign_template"
                name="is_campaign_template"
                checked={formData.is_campaign_template}
                onChange={handleInputChange}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="is_campaign_template" className="ml-2 block text-sm text-gray-900">
                Campaign Template
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent-600 hover:bg-accent-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Template"
        size="sm"
        isLoading={isSubmitting}
      >
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete <strong>{deleteTemplate?.template_name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-3">
            <Button
              variant="outline"
              onClick={handleCloseDeleteModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-error-600 hover:bg-error-700"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}