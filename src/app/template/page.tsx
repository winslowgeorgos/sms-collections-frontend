// app/templates/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button, ButtonStyles } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { Template, Product, Day } from '@/types';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import GenericTable from '@/components/ui/cTable';

interface TemplateFormData {
  template_name: string;
  product: string;
  day: string;
  template_desc: string;
  scheduled_datetime: string;
  is_active: boolean;
}

export default function TemplatesPage() {
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
    product: '',
    day: '',
    template_desc: '',
    scheduled_datetime: '',
    is_active: true,
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

      setTemplates(templatesRes?.data?.results || []);
      setProducts(productsRes?.data?.results || []);
      setDays(daysRes?.data?.results || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      template_name: '',
      product: '',
      day: '',
      template_desc: '',
      scheduled_datetime: '',
      is_active: true,
    });
    setFormErrors({});
    setEditingTemplate(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (template: Template) => {
    setFormData({
      template_name: template.template_name,
      product: template.product,
      day: template.day,
      template_desc: template.template_desc,
      scheduled_datetime: template.scheduled_datetime || '',
      is_active: template.is_active,
    });
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (template: Template) => {
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

    if (!formData.product) {
      errors.product = 'Product is required';
    }

    if (!formData.day) {
      errors.day = 'Day is required';
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
        ...formData,
        scheduled_datetime: formData.scheduled_datetime || null,
      };

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
        setFormErrors(error.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
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

  const columns = [
    {
      id: 'template_name',
      label: 'Template Name',
      accessor: (row: Template) => row.template_name,
      width: 200,
    },
    {
      id: 'product_name',
      label: 'Product',
      accessor: (row: Template) => row.product_name || 'N/A',
      width: 150,
    },
    {
      id: 'day_name',
      label: 'Day',
      accessor: (row: Template) => row.day_name || 'N/A',
      width: 120,
    },
    {
      id: 'template_desc',
      label: 'Description',
      accessor: (row: Template) => row.template_desc,
      Cell: (value: string) => (
        <p className="text-gray-600 text-sm line-clamp-2">{value}</p>
      ),
      width: 300,
    },
    {
      id: 'scheduled_datetime',
      label: 'Scheduled At',
      accessor: (row: Template) => row.scheduled_datetime,
      Cell: (value: string) => (
        <span className="text-gray-600 text-sm">
          {value ? new Date(value).toLocaleString() : 'Not scheduled'}
        </span>
      ),
      width: 180,
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
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: Template) => row,
      Cell: (value: Template) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleOpenEdit(value)}
            className="text-accent-600 hover:text-accent-700 transition-colors"
            title="Edit template"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleOpenDelete(value)}
            className="text-error-600 hover:text-error-700 transition-colors"
            title="Delete template"
          >
            <Trash2 size={16} />
          </button>
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
       
      </div>


      {/* Templates Table */}
      <Card>
        <CardHeader>
         <div className="flex items-center justify-between w-full">
  <h2 className="text-xl font-semibold text-gray-900">All Templates</h2>

  <Button onClick={handleOpenCreate} className="bg-accent-600 hover:bg-accent-700">
    <Plus size={20} className="mr-2" />
    Add Template
  </Button>
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

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Product"
              name="product"
              type="select"
              value={formData.product}
              onChange={handleInputChange}
              error={formErrors.product}
              required
              options={products.map(p => ({ value: p.id, label: p.product_name }))}
            />

            <FormInput
              label="Day"
              name="day"
              type="select"
              value={formData.day}
              onChange={handleInputChange}
              error={formErrors.day}
              required
              options={days.map(d => ({ value: d.id, label: d.day_name }))}
            />
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