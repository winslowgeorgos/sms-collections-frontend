// app/flagged-customers/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { FlaggedCustomer } from '@/types/index';
import { Plus, Edit, Trash2, Search, Filter, UserX, UserCheck, CheckCircle, XCircle } from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import { usePermissions } from '@/context/permission-context'; // <-- ADDED

interface FlaggedCustomerFormData {
  phone_number: string;
  customer_name: string;
  reason_for_flagging: string;
  is_active: boolean;
}

export default function FlaggedCustomersPage() {
  const { hasAccess } = usePermissions(); // <-- ADDED

  const [flaggedCustomers, setFlaggedCustomers] = useState<FlaggedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<FlaggedCustomer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<FlaggedCustomer | null>(null);
  const [deactivateCustomer, setDeactivateCustomer] = useState<FlaggedCustomer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total_flagged: 0,
    active_flags: 0,
    recently_flagged: 0,
    approval_rate: 0
  });

  const [formData, setFormData] = useState<FlaggedCustomerFormData>({
    phone_number: '',
    customer_name: '',
    reason_for_flagging: '',
    is_active: true,
  });

  // Permission shortcuts
  const canCreate = hasAccess('add_flaggedcustomers');
  const canChange = hasAccess('change_flaggedcustomers');
  const canDelete = hasAccess('delete_flaggedcustomers');
  // Adjust this permission codename if your backend uses a different one (e.g., 'can_approve_flag')
  const canApprove = hasAccess('approve_flaggedcustomer');

  useEffect(() => {
    fetchData();
    fetchStats();
  }, []);

  const fetchData = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/flagged-customers/');
      setFlaggedCustomers(response?.data?.results || response?.data || []);
    } catch (error) {
      console.error('Error fetching flagged customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/flagged-customers/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      phone_number: '',
      customer_name: '',
      reason_for_flagging: '',
      is_active: true,
    });
    setFormErrors({});
    setEditingCustomer(null);
  };

  const handleOpenCreate = () => {
    if (!canCreate) return; // Guard
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: FlaggedCustomer) => {
    if (!canChange) return; // Guard
    setFormData({
      phone_number: customer.phone_number,
      customer_name: customer.customer_name,
      reason_for_flagging: customer.reason_for_flagging,
      is_active: customer.is_active,
    });
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (customer: FlaggedCustomer) => {
    if (!canDelete) return; // Guard
    setDeleteCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeactivate = (customer: FlaggedCustomer) => {
    if (!canChange) return; // Guard (toggle active status is a change)
    setDeactivateCustomer(customer);
    setIsDeactivateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteCustomer(null);
  };

  const handleCloseDeactivateModal = () => {
    setIsDeactivateModalOpen(false);
    setDeactivateCustomer(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.phone_number.trim()) {
      errors.phone_number = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{10,20}$/.test(formData.phone_number)) {
      errors.phone_number = 'Please enter a valid phone number';
    }

    if (!formData.customer_name.trim()) {
      errors.customer_name = 'Customer name is required';
    }

    if (!formData.reason_for_flagging.trim()) {
      errors.reason_for_flagging = 'Reason for flagging is required';
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
        phone_number: formData.phone_number,
        customer_name: formData.customer_name,
        reason_for_flagging: formData.reason_for_flagging,
        is_active: formData.is_active,
      };

      if (editingCustomer) {
        await client.put(`/flagged-customers/${editingCustomer.id}/`, submitData);
      } else {
        await client.post('/flagged-customers/', submitData);
      }

      await fetchData();
      await fetchStats();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving flagged customer:', error);
      if (error.response?.data) {
        setFormErrors(error.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCustomer) return;

    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.delete(`/flagged-customers/${deleteCustomer.id}/`);
      await fetchData();
      await fetchStats();
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Error deleting flagged customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateCustomer) return;

    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      const newStatus = !deactivateCustomer.is_active;
      await client.put(`/flagged-customers/${deactivateCustomer.id}/`, {
        is_active: newStatus
      });
      await fetchData();
      await fetchStats();
      handleCloseDeactivateModal();
    } catch (error) {
      console.error('Error updating flagged customer status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (customer: FlaggedCustomer) => {
    if (!canApprove) return; // Guard
    try {
      const client = apiClient.getClient();
      await client.post(`/flagged-customers/${customer.id}/approve_flag/`);
      await fetchData();
      await fetchStats();
    } catch (error) {
      console.error('Error approving flagged customer:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      id: 'customer_name',
      label: 'Customer Name',
      accessor: (row: FlaggedCustomer) => row.customer_name,
      width: 180,
      filter: {
        type: 'text' as const,
        placeholder: 'Search names...'
      }
    },
    {
      id: 'phone_number',
      label: 'Phone Number',
      accessor: (row: FlaggedCustomer) => row.phone_number,
      width: 150,
      filter: {
        type: 'text' as const,
        placeholder: 'Search phone...'
      }
    },
    {
      id: 'reason_for_flagging',
      label: 'Reason',
      accessor: (row: FlaggedCustomer) => row.reason_for_flagging,
      Cell: (value: string) => (
        <div className="max-w-xs">
          <p className="text-gray-600 text-sm line-clamp-2">{value}</p>
        </div>
      ),
      width: 250,
      filter: {
        type: 'text' as const,
        placeholder: 'Search reasons...'
      }
    },
    {
      id: 'is_active',
      label: 'Status',
      accessor: (row: FlaggedCustomer) => row.is_active,
      Cell: (value: boolean) => (
        <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? (
            <>
              <CheckCircle size={12} className="mr-1" />
              Active
            </>
          ) : (
            <>
              <XCircle size={12} className="mr-1" />
              Inactive
            </>
          )}
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
      id: 'approved_by',
      label: 'Approval',
      accessor: (row: FlaggedCustomer) => row.approved_by_username || row.approved_by?.username,
      Cell: (value: string) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value || 'Pending'}
        </span>
      ),
      width: 120,
    },
    {
      id: 'created_by',
      label: 'Flagged By',
      accessor: (row: FlaggedCustomer) => row.created_by_username || row.created_by?.username || 'System',
      width: 120,
    },
    {
      id: 'created_at',
      label: 'Flagged On',
      accessor: (row: FlaggedCustomer) => new Date(row.created_at).toLocaleDateString(),
      width: 120,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: FlaggedCustomer) => row,
      Cell: (value: FlaggedCustomer) => (
        <div className="flex space-x-2">
          {/* Edit button – requires change permission */}
          {canChange && (
            <button
              onClick={() => handleOpenEdit(value)}
              className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
              title="Edit flagged customer"
            >
              <Edit size={16} />
            </button>
          )}
          {/* Approve button – requires approve permission (custom) and conditions */}
          {canApprove && value.is_active && !value.approved_by && (
            <button
              onClick={() => handleApprove(value)}
              className="text-green-600 hover:text-green-700 transition-colors p-1 rounded hover:bg-green-50"
              title="Approve flag"
            >
              <CheckCircle size={16} />
            </button>
          )}
          {/* Activate/Deactivate button – requires change permission */}
          {canChange && (
            <button
              onClick={() => handleOpenDeactivate(value)}
              className={`transition-colors p-1 rounded ${
                value.is_active 
                  ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' 
                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
              }`}
              title={value.is_active ? 'Deactivate flag' : 'Activate flag'}
            >
              {value.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
            </button>
          )}
          {/* Delete button – requires delete permission */}
          {canDelete && (
            <button
              onClick={() => handleOpenDelete(value)}
              className="text-red-600 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
              title="Delete flagged customer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
      width: 140,
    },
  ];

  const filteredCustomers = flaggedCustomers.filter(customer => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.customer_name.toLowerCase().includes(searchLower) ||
      customer.phone_number.toLowerCase().includes(searchLower) ||
      customer.reason_for_flagging.toLowerCase().includes(searchLower) ||
      (customer.created_by_username && customer.created_by_username.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Flagged Customers</h1>
          <p className="text-gray-600 mt-2">Manage customers who require special attention or restrictions</p>
        </div>
        {/* Flag Customer button – requires create permission */}
        {canCreate && (
          <Button onClick={handleOpenCreate} className="bg-red-600 hover:bg-red-700">
            <UserX size={20} className="mr-2" />
            Flag Customer
          </Button>
        )}
      </div>

      {/* Stats Cards – informational, no permission needed */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-red-100 p-3 mr-4">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Flagged</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_flagged}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Flags</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active_flags}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approval_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-yellow-100 p-3 mr-4">
                <Filter className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Recent (7 days)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recently_flagged}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Customers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">Flagged Customers List</h2>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search flagged customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                <Filter size={20} className="mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading flagged customers...</div>
            </div>
          ) : (
            <GenericTable
              data={filteredCustomers}
              columns={columns}
              rowKey={(row: FlaggedCustomer) => row.id}
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
        title={editingCustomer ? 'Edit Flagged Customer' : 'Flag New Customer'}
        size="md"
        isLoading={isSubmitting}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Customer Name"
            name="customer_name"
            type="text"
            value={formData.customer_name}
            onChange={handleInputChange}
            error={formErrors.customer_name}
            required
            placeholder="Enter customer name"
            disabled={!!editingCustomer}
          />

          <FormInput
            label="Phone Number"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleInputChange}
            error={formErrors.phone_number}
            required
            placeholder="Enter phone number"
            disabled={!!editingCustomer}
          />

          <FormInput
            label="Reason for Flagging"
            name="reason_for_flagging"
            type="textarea"
            value={formData.reason_for_flagging}
            onChange={handleInputChange}
            error={formErrors.reason_for_flagging}
            required
            placeholder="Enter detailed reason for flagging this customer..."
            rows={4}
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active Flag
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
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Flag' : 'Flag Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Flagged Customer"
        size="sm"
        isLoading={isSubmitting}
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <UserX className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Remove Flag</h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to remove the flag for <strong>{deleteCustomer?.customer_name}</strong> ({deleteCustomer?.phone_number})?
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
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Remove Flag'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate/Activate Confirmation Modal */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={handleCloseDeactivateModal}
        title={deactivateCustomer?.is_active ? 'Deactivate Flag' : 'Activate Flag'}
        size="sm"
        isLoading={isSubmitting}
      >
        <div className="text-center">
          <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4 ${
            deactivateCustomer?.is_active ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            {deactivateCustomer?.is_active ? (
              <UserX className="h-6 w-6 text-yellow-600" />
            ) : (
              <UserCheck className="h-6 w-6 text-green-600" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {deactivateCustomer?.is_active ? 'Deactivate Flag' : 'Activate Flag'}
          </h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to {deactivateCustomer?.is_active ? 'deactivate' : 'activate'} the flag for{' '}
            <strong>{deactivateCustomer?.customer_name}</strong>?
          </p>
          <div className="flex justify-center space-x-3">
            <Button
              variant="outline"
              onClick={handleCloseDeactivateModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className={`${deactivateCustomer?.is_active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
              onClick={handleDeactivate}
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? 'Updating...' 
                : deactivateCustomer?.is_active 
                  ? 'Deactivate' 
                  : 'Activate'
              }
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}