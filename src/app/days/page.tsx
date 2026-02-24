// app/days/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { Day, CustomRule } from '@/types';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import { usePermissions } from '@/context/permission-context'; // <-- ADDED

interface DayFormData {
  day_name: string;
  day_description: string;
  number_of_days: number;
  is_custom: boolean;
  custom_date: string;
  custom_rule: string;
  is_active: boolean;
}

export default function DaysPage() {
  const { hasAccess } = usePermissions(); // <-- ADDED

  // Permission shortcuts – adjust codenames as needed
  const canCreate = hasAccess('add_days');
  const canChange = hasAccess('change_days');
  const canDelete = hasAccess('delete_days');

  const [days, setDays] = useState<Day[]>([]);
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<Day | null>(null);
  const [deleteDay, setDeleteDay] = useState<Day | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<DayFormData>({
    day_name: '',
    day_description: '',
    number_of_days: 0,
    is_custom: false,
    custom_date: '',
    custom_rule: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const client = apiClient.getClient();
      const [daysRes, rulesRes] = await Promise.all([
        client.get('/days/'),
        client.get('/custom-rules/'),
      ]);

      console.log(daysRes, rulesRes)

      setDays(daysRes?.data?.results || []);
      setCustomRules(rulesRes?.data?.results || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      day_name: '',
      day_description: '',
      number_of_days: 0,
      is_custom: false,
      custom_date: '',
      custom_rule: '',
      is_active: true,
    });
    setFormErrors({});
    setEditingDay(null);
  };

  const handleOpenCreate = () => {
    if (!canCreate) return; // Guard
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (day: Day) => {
    if (!canChange) return; // Guard
    setFormData({
      day_name: day.day_name,
      day_description: day.day_description,
      number_of_days: day.number_of_days,
      is_custom: day.is_custom,
      custom_date: day.custom_date || '',
      custom_rule: day.custom_rule || '',
      is_active: day.is_active,
    });
    setEditingDay(day);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (day: Day) => {
    if (!canDelete) return; // Guard
    setDeleteDay(day);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteDay(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.day_name.trim()) {
      errors.day_name = 'Day name is required';
    }

    if (!formData.day_description.trim()) {
      errors.day_description = 'Day description is required';
    }

    if (formData.is_custom && !formData.custom_date && !formData.custom_rule) {
      errors.custom_rule = 'Either custom date or custom rule is required for custom days';
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
        custom_date: formData.is_custom ? formData.custom_date || null : null,
        custom_rule: formData.is_custom ? formData.custom_rule || null : null,
      };

      if (editingDay) {
        await client.put(`/days/${editingDay.id}/`, submitData);
      } else {
        await client.post('/days/', submitData);
      }

      await fetchData();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving day:', error);
      if (error.response?.data) {
        setFormErrors(error.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDay) return;

    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.delete(`/days/${deleteDay.id}/`);
      await fetchData();
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Error deleting day:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? Number(value) : value
    }));

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const columns = [
    {
      id: 'day_name',
      label: 'Day Name',
      accessor: (row: Day) => row.day_name,
      width: 200,
    },
    {
      id: 'day_description',
      label: 'Description',
      accessor: (row: Day) => row.day_description,
      Cell: (value: string) => (
        <p className="text-gray-600 text-sm line-clamp-2">{value}</p>
      ),
      width: 250,
    },
    {
      id: 'number_of_days',
      label: 'Days',
      accessor: (row: Day) => row.number_of_days,
      Cell: (value: number) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value < 0 ? 'bg-warning-100 text-warning-800' : 
          value > 0 ? 'bg-accent-100 text-accent-800' : 
          'bg-gray-100 text-gray-800'
        }`}>
          {value > 0 ? `+${value}` : value}
        </span>
      ),
      width: 100,
    },
    {
      id: 'is_custom',
      label: 'Type',
      accessor: (row: Day) => row.is_custom,
      Cell: (value: boolean) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {value ? 'Custom' : 'Standard'}
        </span>
      ),
      width: 100,
    },
    {
      id: 'is_active',
      label: 'Status',
      accessor: (row: Day) => row.is_active,
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
      accessor: (row: Day) => row,
      Cell: (value: Day) => (
        <div className="flex space-x-2">
          {/* Edit button – requires change permission */}
          {canChange && (
            <button
              onClick={() => handleOpenEdit(value)}
              className="text-accent-600 hover:text-accent-700 transition-colors"
              title="Edit day"
            >
              <Edit size={16} />
            </button>
          )}
          {/* Delete button – requires delete permission */}
          {canDelete && (
            <button
              onClick={() => handleOpenDelete(value)}
              className="text-error-600 hover:text-error-700 transition-colors"
              title="Delete day"
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
          <h1 className="text-3xl font-bold text-gray-900">Days</h1>
          <p className="text-gray-600 mt-2">Manage days configuration for SMS scheduling</p>
        </div>
      </div>

      {/* Days Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">All Days</h2>
            {/* Add Day button – requires create permission */}
            {canCreate && (
              <Button onClick={handleOpenCreate} className="bg-accent-600 hover:bg-accent-700">
                <Plus size={20} className="mr-2" />
                Add Day
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading days...</div>
            </div>
          ) : (
            <GenericTable
              data={days}
              columns={columns}
              rowKey={(row: Day) => row.id}
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
        title={editingDay ? 'Edit Day' : 'Create New Day'}
        size="lg"
        isLoading={isSubmitting}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Day Name"
            name="day_name"
            type="text"
            value={formData.day_name}
            onChange={handleInputChange}
            error={formErrors.day_name}
            required
            placeholder="Enter day name"
          />

          <FormInput
            label="Day Description"
            name="day_description"
            type="textarea"
            value={formData.day_description}
            onChange={handleInputChange}
            error={formErrors.day_description}
            required
            placeholder="Enter day description"
            rows={3}
          />

          <FormInput
            label="Number of Days"
            name="number_of_days"
            type="number"
            value={formData.number_of_days}
            onChange={handleInputChange}
            error={formErrors.number_of_days}
            required
            placeholder="Enter number of days (negative for before due, positive for after due)"
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_custom"
              name="is_custom"
              checked={formData.is_custom}
              onChange={handleInputChange}
              className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded"
            />
            <label htmlFor="is_custom" className="ml-2 block text-sm text-gray-900">
              Custom Day
            </label>
          </div>

          {formData.is_custom && (
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Custom Date"
                name="custom_date"
                type="date"
                value={formData.custom_date}
                onChange={handleInputChange}
                placeholder="Select custom date"
              />

              <FormInput
                label="Custom Rule"
                name="custom_rule"
                type="select"
                value={formData.custom_rule}
                onChange={handleInputChange}
                options={customRules.map(r => ({ value: r.id, label: r.rule_name }))}
                placeholder="Select custom rule"
              />
            </div>
          )}

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
              {isSubmitting ? 'Saving...' : editingDay ? 'Update Day' : 'Create Day'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Day"
        size="sm"
        isLoading={isSubmitting}
      >
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete <strong>{deleteDay?.day_name}</strong>? This action cannot be undone.
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