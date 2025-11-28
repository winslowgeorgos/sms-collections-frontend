// app/custom-rules/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { CustomRule, Product } from '@/types';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import GenericTable from '@/components/ui/cTable';

interface CustomRuleFormData {
  rule_name: string;
  column_name: string;
  operator: string;
  value: string;
  value_2: string;
  product: string;
  is_active: boolean;
}

const COLUMN_CHOICES = [
  { value: 'total_amount', label: 'Total Amount' },
  { value: 'repaid', label: 'Repaid' },
  { value: 'balance', label: 'Balance' },
  { value: 'due_days', label: 'Due Days' },
  { value: 'days_until_due', label: 'Days Until Due' },
  { value: 'is_overdue', label: 'Is Overdue' },
  { value: 'loan_type', label: 'Loan Type' },
  { value: 'status', label: 'Status' },
  { value: 'installment_numbers', label: 'Installment Numbers' },
  { value: 'customer_id', label: 'Customer ID' },
  { value: 'phone_number', label: 'Phone Number' },
];

const OPERATOR_CHOICES = [
  { value: '=', label: 'Equals' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: '>=', label: 'Greater Than or Equal' },
  { value: '<=', label: 'Less Than or Equal' },
  { value: 'BETWEEN', label: 'Between' },
  { value: 'IN', label: 'In' },
  { value: '!=', label: 'Not Equals' },
];

export default function CustomRulesPage() {
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  const [deleteRule, setDeleteRule] = useState<CustomRule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CustomRuleFormData>({
    rule_name: '',
    column_name: '',
    operator: '',
    value: '',
    value_2: '',
    product: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const client = apiClient.getClient();
      const [rulesRes, productsRes] = await Promise.all([
        client.get('/custom-rules/'),
        client.get('/products/'),
      ]);

      setCustomRules(rulesRes?.data?.results || []);
      setProducts(productsRes?.data?.results || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      column_name: '',
      operator: '',
      value: '',
      value_2: '',
      product: '',
      is_active: true,
    });
    setFormErrors({});
    setEditingRule(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: CustomRule) => {
    setFormData({
      rule_name: rule.rule_name,
      column_name: rule.column_name,
      operator: rule.operator,
      value: rule.value,
      value_2: rule.value_2 || '',
      product: rule.product,
      is_active: rule.is_active,
    });
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (rule: CustomRule) => {
    setDeleteRule(rule);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteRule(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.rule_name.trim()) {
      errors.rule_name = 'Rule name is required';
    }

    if (!formData.column_name) {
      errors.column_name = 'Column name is required';
    }

    if (!formData.operator) {
      errors.operator = 'Operator is required';
    }

    if (!formData.value.trim()) {
      errors.value = 'Value is required';
    }

    if (formData.operator === 'BETWEEN' && !formData.value_2.trim()) {
      errors.value_2 = 'Second value is required for BETWEEN operator';
    }

    if (!formData.product) {
      errors.product = 'Product is required';
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
        value_2: formData.operator === 'BETWEEN' ? formData.value_2 : null,
      };

      if (editingRule) {
        await client.put(`/custom-rules/${editingRule.id}/`, submitData);
      } else {
        await client.post('/custom-rules/', submitData);
      }

      await fetchData();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving custom rule:', error);
      if (error.response?.data) {
        setFormErrors(error.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRule) return;

    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.delete(`/custom-rules/${deleteRule.id}/`);
      await fetchData();
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Error deleting custom rule:', error);
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
      id: 'rule_name',
      label: 'Rule Name',
      accessor: (row: CustomRule) => row.rule_name,
      width: 200,
    },
    {
      id: 'column_name',
      label: 'Column',
      accessor: (row: CustomRule) => row.column_name,
      Cell: (value: string) => (
        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
          {COLUMN_CHOICES.find(c => c.value === value)?.label || value}
        </span>
      ),
      width: 150,
    },
    {
      id: 'operator',
      label: 'Operator',
      accessor: (row: CustomRule) => row.operator,
      Cell: (value: string) => (
        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
          {OPERATOR_CHOICES.find(o => o.value === value)?.label || value}
        </span>
      ),
      width: 120,
    },
    {
      id: 'value',
      label: 'Value',
      accessor: (row: CustomRule) => row.value,
      width: 120,
    },
    {
      id: 'value_2',
      label: 'Value 2',
      accessor: (row: CustomRule) => row.value_2 || '-',
      width: 120,
    },
    {
      id: 'product_name',
      label: 'Product',
      accessor: (row: CustomRule) => row.product_name || 'N/A',
      width: 150,
    },
    {
      id: 'is_active',
      label: 'Status',
      accessor: (row: CustomRule) => row.is_active,
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
      accessor: (row: CustomRule) => row,
      Cell: (value: CustomRule) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleOpenEdit(value)}
            className="text-accent-600 hover:text-accent-700 transition-colors"
            title="Edit rule"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleOpenDelete(value)}
            className="text-error-600 hover:text-error-700 transition-colors"
            title="Delete rule"
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
          <h1 className="text-3xl font-bold text-gray-900">Custom Rules</h1>
          <p className="text-gray-600 mt-2">Manage custom rules for SMS template conditions</p>
        </div>
 
      </div>


      {/* Custom Rules Table */}
      <Card>
        <CardHeader>
        <div className="flex items-center justify-between w-full">

          <h2 className="text-xl font-semibold text-gray-900">All Custom Rules</h2>
                 <Button onClick={handleOpenCreate} className="bg-accent-600 hover:bg-accent-700">
          <Plus size={20} className="mr-2" />
          Add Rule
        </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading rules...</div>
            </div>
          ) : (
            <GenericTable
              data={customRules}
              columns={columns}
              rowKey={(row: CustomRule) => row.id}
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
        title={editingRule ? 'Edit Custom Rule' : 'Create New Custom Rule'}
        size="lg"
        isLoading={isSubmitting}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Rule Name"
            name="rule_name"
            type="text"
            value={formData.rule_name}
            onChange={handleInputChange}
            error={formErrors.rule_name}
            required
            placeholder="Enter rule name"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Column Name"
              name="column_name"
              type="select"
              value={formData.column_name}
              onChange={handleInputChange}
              error={formErrors.column_name}
              required
              options={COLUMN_CHOICES}
            />

            <FormInput
              label="Operator"
              name="operator"
              type="select"
              value={formData.operator}
              onChange={handleInputChange}
              error={formErrors.operator}
              required
              options={OPERATOR_CHOICES}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Value"
              name="value"
              type="text"
              value={formData.value}
              onChange={handleInputChange}
              error={formErrors.value}
              required
              placeholder="Enter value"
            />

            {formData.operator === 'BETWEEN' && (
              <FormInput
                label="Value 2"
                name="value_2"
                type="text"
                value={formData.value_2}
                onChange={handleInputChange}
                error={formErrors.value_2}
                required={formData.operator === 'BETWEEN'}
                placeholder="Enter second value"
              />
            )}
          </div>

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
              {isSubmitting ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Custom Rule"
        size="sm"
        isLoading={isSubmitting}
      >
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete <strong>{deleteRule?.rule_name}</strong>? This action cannot be undone.
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