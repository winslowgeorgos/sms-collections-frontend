// app/yard-management/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api';
import { 
  Plus, Edit, Trash2, Search, RefreshCw, MapPin, 
  Phone, User, Building2, AlertCircle, CheckCircle,
  Eye, ExternalLink, Warehouse, Clipboard, XCircle,
  ChevronDown, ChevronUp, Filter, Download
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import { ActionGuard } from '@/components/auth/action-guard';
import { Badge } from '@/components/ui/badge';

interface YardLocation {
  id: number;
  name: string;
  location: string;
  contact_phone: string | null;
  contact_person: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

interface YardFilters {
  search?: string;
  is_active?: boolean;
  ordering?: string;
  page: number;
  page_size: number;
}

interface YardStats {
  total_yards: number;
  active_yards: number;
  inactive_yards: number;
  yards_with_contact: number;
  total_loans_in_yards: number;
  total_installments_in_yards: number;
}

export default function YardManagementPage() {
  const [yards, setYards] = useState<YardLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<YardFilters>({
    page: 1,
    page_size: 20,
    is_active: true,
    ordering: 'name',
    search: ''
  });
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<YardStats>({
    total_yards: 0,
    active_yards: 0,
    inactive_yards: 0,
    yards_with_contact: 0,
    total_loans_in_yards: 0,
    total_installments_in_yards: 0,
  });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedYard, setSelectedYard] = useState<YardLocation | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact_phone: '',
    contact_person: '',
    notes: '',
    is_active: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchYards();
    fetchYardStats();
  }, [filters.page, filters.page_size, filters.is_active, filters.ordering, filters.search]);

  const fetchYards = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const queryParams = new URLSearchParams();
      
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));
      if (filters.ordering) queryParams.append('ordering', filters.ordering);
      queryParams.append('page', String(filters.page));
      queryParams.append('page_size', String(filters.page_size));

      const response = await client.get(`/loan-processor/yard-locations/?${queryParams.toString()}`);
      setYards(response.data || []);
      setTotalCount(response.data?.count || response.data?.length || 0);
    } catch (error) {
      console.error('Error fetching yards:', error);
      setError('Failed to fetch yard locations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchYardStats = async () => {
    try {
      const client = apiClient.getClient();
      // You might need to create a stats endpoint or calculate from the list
      const response = await client.get('/loan-processor/yard-locations/stats/');
      setStats(response.data || {
        total_yards: yards.length,
        active_yards: yards.filter(y => y.is_active).length,
        inactive_yards: yards.filter(y => !y.is_active).length,
        yards_with_contact: yards.filter(y => y.contact_phone || y.contact_person).length,
        total_loans_in_yards: 0,
        total_installments_in_yards: 0,
      });
    } catch (error) {
      console.error('Error fetching yard stats:', error);
      // Fallback: calculate from yards list
      setStats({
        total_yards: yards.length,
        active_yards: yards.filter(y => y.is_active).length,
        inactive_yards: yards.filter(y => !y.is_active).length,
        yards_with_contact: yards.filter(y => y.contact_phone || y.contact_person).length,
        total_loans_in_yards: 0,
        total_installments_in_yards: 0,
      });
    }
  };

  const handleFilterChange = (key: keyof YardFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20,
      is_active: true,
      ordering: 'name',
      search: ''
    });
  };

  // ============ CRUD HANDLERS ============

  const openCreateModal = () => {
    setFormData({
      name: '',
      location: '',
      contact_phone: '',
      contact_person: '',
      notes: '',
      is_active: true,
    });
    setError(null);
    setSuccess(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (yard: YardLocation) => {
    setSelectedYard(yard);
    setFormData({
      name: yard.name,
      location: yard.location,
      contact_phone: yard.contact_phone || '',
      contact_person: yard.contact_person || '',
      notes: yard.notes || '',
      is_active: yard.is_active,
    });
    setError(null);
    setSuccess(null);
    setIsEditModalOpen(true);
  };

  const openViewModal = (yard: YardLocation) => {
    setSelectedYard(yard);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (yard: YardLocation) => {
    setSelectedYard(yard);
    setIsDeleteModalOpen(true);
  };

  const handleCreateYard = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const client = apiClient.getClient();
      const response = await client.post('/loan-processor/yard-locations/create/', formData);

      if (response.data.success) {
        setSuccess('Yard location created successfully!');
        await fetchYards();
        await fetchYardStats();
        setTimeout(() => {
          setIsCreateModalOpen(false);
        }, 1000);
      } else {
        setError(response.data.error || 'Failed to create yard location');
      }
    } catch (error: any) {
      console.error('Error creating yard:', error);
      setError(
        error?.response?.data?.error || 
        error?.message || 
        'An error occurred while creating the yard location'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateYard = async () => {
    if (!selectedYard) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const client = apiClient.getClient();
      const response = await client.put(
        `/loan-processor/yard-locations/update/${selectedYard.id}/`,
        formData
      );

      if (response.data.success) {
        setSuccess('Yard location updated successfully!');
        await fetchYards();
        await fetchYardStats();
        setTimeout(() => {
          setIsEditModalOpen(false);
        }, 1000);
      } else {
        setError(response.data.error || 'Failed to update yard location');
      }
    } catch (error: any) {
      console.error('Error updating yard:', error);
      setError(
        error?.response?.data?.error || 
        error?.message || 
        'An error occurred while updating the yard location'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteYard = async () => {
    if (!selectedYard) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const client = apiClient.getClient();
      const response = await client.delete(
        `/loan-processor/yard-locations/delete/${selectedYard.id}/`
      );

      if (response.data.success) {
        setSuccess(`Yard location "${selectedYard.name}" deleted successfully!`);
        await fetchYards();
        await fetchYardStats();
        setTimeout(() => {
          setIsDeleteModalOpen(false);
          setSelectedYard(null);
        }, 1000);
      } else {
        setError(response.data.error || 'Failed to delete yard location');
      }
    } catch (error: any) {
      console.error('Error deleting yard:', error);
      setError(
        error?.response?.data?.error || 
        error?.message || 
        'An error occurred while deleting the yard location'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (yard: YardLocation) => {
    try {
      const client = apiClient.getClient();
      const response = await client.patch(
        `/loan-processor/yard-locations/update/${yard.id}/`,
        { is_active: !yard.is_active }
      );

      if (response.data.success) {
        await fetchYards();
        await fetchYardStats();
      }
    } catch (error) {
      console.error('Error toggling yard status:', error);
    }
  };

  const handleExportYards = async () => {
    try {
      const client = apiClient.getClient();
      const queryParams = new URLSearchParams();
      
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));
      queryParams.append('format', 'csv');

      const response = await client.get(`/loan-processor/yard-locations/export/?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `yard-locations-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting yards:', error);
    }
  };

  // ============ TABLE COLUMNS ============

  const columns = [
    {
      id: 'name',
      label: 'Yard Name',
      accessor: (row: YardLocation) => row.name,
      Cell: (value: string, row: YardLocation) => (
        <button
          onClick={() => openViewModal(row)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          {value}
        </button>
      ),
      width: 200,
      sortable: true,
    },
    {
      id: 'location',
      label: 'Location',
      accessor: (row: YardLocation) => row.location,
      Cell: (value: string) => (
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin size={14} className="text-gray-400" />
          {value}
        </div>
      ),
      width: 250,
      sortable: true,
    },
    {
      id: 'contact_person',
      label: 'Contact Person',
      accessor: (row: YardLocation) => row.contact_person || '-',
      Cell: (value: string) => (
        <div className="flex items-center gap-2">
          <User size={14} className="text-gray-400" />
          {value}
        </div>
      ),
      width: 180,
    },
    {
      id: 'contact_phone',
      label: 'Contact Phone',
      accessor: (row: YardLocation) => row.contact_phone || '-',
      Cell: (value: string) => (
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-gray-400" />
          {value}
        </div>
      ),
      width: 160,
    },
    {
      id: 'is_active',
      label: 'Status',
      accessor: (row: YardLocation) => row.is_active,
      Cell: (value: boolean) => (
        value ? (
          <Badge variant="success" className="bg-green-100 text-green-800 border-green-200 gap-1">
            <CheckCircle size={12} />
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200 gap-1">
            <XCircle size={12} />
            Inactive
          </Badge>
        )
      ),
      width: 120,
    },
    {
      id: 'created_by_name',
      label: 'Created By',
      accessor: (row: YardLocation) => row.created_by_name || 'System',
      width: 150,
    },
    {
      id: 'created_at',
      label: 'Created At',
      accessor: (row: YardLocation) => new Date(row.created_at).toLocaleDateString(),
      width: 120,
      sortable: true,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: YardLocation) => row,
      Cell: (value: YardLocation) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openViewModal(value)}
            className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
            title="View yard details"
          >
            <Eye size={16} />
          </button>
          <ActionGuard
            requirement="can_manage_yards"
            fallback={null}
          >
            <button
              onClick={() => openEditModal(value)}
              className="text-amber-600 hover:text-amber-700 transition-colors p-1 rounded hover:bg-amber-50"
              title="Edit yard"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => handleToggleActive(value)}
              className={`transition-colors p-1 rounded hover:bg-gray-50 ${
                value.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
              }`}
              title={value.is_active ? 'Deactivate yard' : 'Activate yard'}
            >
              {value.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
            </button>
            <button
              onClick={() => openDeleteModal(value)}
              className="text-red-600 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
              title="Delete yard"
            >
              <Trash2 size={16} />
            </button>
          </ActionGuard>
        </div>
      ),
      width: 140,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Warehouse className="h-8 w-8 text-blue-600" />
            Yard Management
          </h1>
          <p className="text-gray-600 mt-2">Manage yard locations where repossessed vehicles are stored</p>
        </div>
        <div className="flex space-x-3">
          <ActionGuard
            requirement="can_export_yards"
            fallback={
              <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
                <Download size={20} className="mr-2" />
                Export
              </Button>
            }
            showTooltip
            tooltipMessage="You need permission to export yards"
          >
            <Button variant="outline" onClick={handleExportYards}>
              <Download size={20} className="mr-2" />
              Export
            </Button>
          </ActionGuard>
          <ActionGuard
            requirement="can_manage_yards"
            fallback={
              <Button disabled className="opacity-50 cursor-not-allowed">
                <Plus size={20} className="mr-2" />
                Add Yard
              </Button>
            }
            showTooltip
            tooltipMessage="You need permission to manage yards"
          >
            <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
              <Plus size={20} className="mr-2" />
              Add Yard
            </Button>
          </ActionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <Warehouse className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Yards</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_yards}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Yards</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active_yards}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-gray-100 p-3 mr-4">
                <XCircle className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Yards</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inactive_yards}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-purple-100 p-3 mr-4">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">With Contact</p>
                <p className="text-2xl font-bold text-gray-900">{stats.yards_with_contact}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-orange-100 p-3 mr-4">
                <Building2 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Loans in Yards</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_loans_in_yards}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search yards by name, location, or contact..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div>
          <select
            value={filters.is_active === undefined ? '' : String(filters.is_active)}
            onChange={(e) => {
              const value = e.target.value;
              handleFilterChange('is_active', value === '' ? undefined : value === 'true');
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>

        <div>
          <select
            value={filters.ordering || 'name'}
            onChange={(e) => handleFilterChange('ordering', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name (A-Z)</option>
            <option value="-name">Sort by Name (Z-A)</option>
            <option value="location">Sort by Location (A-Z)</option>
            <option value="-location">Sort by Location (Z-A)</option>
            <option value="-created_at">Sort by Newest</option>
            <option value="created_at">Sort by Oldest</option>
          </select>
        </div>

        <Button variant="outline" onClick={resetFilters}>
          <RefreshCw size={16} className="mr-2" />
          Reset Filters
        </Button>

        <Button variant="outline" onClick={fetchYards}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Yards Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">Yard Locations</h2>
            <div className="text-sm text-gray-600">
              Showing {totalCount > 0 ? ((filters.page - 1) * filters.page_size) + 1 : 0} - {Math.min(filters.page * filters.page_size, totalCount)} of {totalCount} yards
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading yards...</div>
            </div>
          ) : yards.length === 0 ? (
            <div className="text-center py-12">
              <Warehouse className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No yard locations found</p>
              <p className="text-gray-400 text-sm">Click "Add Yard" to create your first yard location</p>
            </div>
          ) : (
            <GenericTable
              data={yards}
              columns={columns}
              rowKey={(row: YardLocation) => row.id}
              selectionMode="none"
              virtualized={true}
              pagination={{
                totalCount,
                currentPage: filters.page,
                pageSize: filters.page_size,
                onPageChange: handlePageChange,
                onPageSizeChange: (newSize) => {
                  setFilters(prev => ({ ...prev, page_size: newSize, page: 1 }));
                },
                hasNextPage: filters.page * filters.page_size < totalCount,
                hasPreviousPage: filters.page > 1,
                serverSide: true
              }}
              pageSizeOptions={[20, 50, 100]}
            />
          )}
        </CardContent>
      </Card>

      {/* ============ CREATE YARD MODAL ============ */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null);
          setSuccess(null);
        }}
        title="Create New Yard Location"
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yard Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., DT Dobie Yard"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Westlands, Nairobi"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              value={formData.contact_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., +254 700 000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any additional notes about this yard..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active_create"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active_create" className="ml-2 block text-sm text-gray-900">
              Active (available for use)
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t mt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsCreateModalOpen(false);
              setError(null);
              setSuccess(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateYard} 
            disabled={isSubmitting || !formData.name || !formData.location}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Yard'}
          </Button>
        </div>
      </Modal>

      {/* ============ EDIT YARD MODAL ============ */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setError(null);
          setSuccess(null);
          setSelectedYard(null);
        }}
        title={`Edit Yard: ${selectedYard?.name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yard Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              value={formData.contact_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active_edit" className="ml-2 block text-sm text-gray-900">
              Active (available for use)
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t mt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsEditModalOpen(false);
              setError(null);
              setSuccess(null);
              setSelectedYard(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateYard} 
            disabled={isSubmitting || !formData.name || !formData.location}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update Yard'}
          </Button>
        </div>
      </Modal>

      {/* ============ VIEW YARD MODAL ============ */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedYard(null);
        }}
        title="Yard Details"
        size="md"
      >
        {selectedYard && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-3">
                  <Warehouse className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedYard.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedYard.is_active ? (
                      <Badge variant="success" className="bg-green-100 text-green-800">
                        <CheckCircle size={12} className="mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        <XCircle size={12} className="mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="font-medium">Location:</span>
                </div>
                <p className="pl-6 text-gray-800">{selectedYard.location}</p>
              </div>

              {selectedYard.contact_person && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User size={16} className="text-gray-400" />
                    <span className="font-medium">Contact Person:</span>
                  </div>
                  <p className="pl-6 text-gray-800">{selectedYard.contact_person}</p>
                </div>
              )}

              {selectedYard.contact_phone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={16} className="text-gray-400" />
                    <span className="font-medium">Contact Phone:</span>
                  </div>
                  <p className="pl-6 text-gray-800">{selectedYard.contact_phone}</p>
                </div>
              )}

              {selectedYard.notes && (
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clipboard size={16} className="text-gray-400" />
                    <span className="font-medium">Notes:</span>
                  </div>
                  <p className="pl-6 text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                    {selectedYard.notes}
                  </p>
                </div>
              )}

              <div className="col-span-2 border-t pt-4 mt-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Created By:</span>
                    <p className="font-medium text-gray-800">{selectedYard.created_by_name || 'System'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created At:</span>
                    <p className="font-medium text-gray-800">
                      {new Date(selectedYard.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Updated:</span>
                    <p className="font-medium text-gray-800">
                      {new Date(selectedYard.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <p className="font-mono text-sm text-gray-600">#{selectedYard.id}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedYard(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============ DELETE YARD MODAL ============ */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setError(null);
          setSuccess(null);
          setSelectedYard(null);
        }}
        title="Delete Yard Location"
        size="sm"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Delete Yard: {selectedYard?.name}
            </h3>
            <p className="text-sm text-gray-500">
              Are you sure you want to delete this yard location? This action cannot be undone.
              {selectedYard?.is_active && (
                <span className="block mt-2 text-amber-600 font-medium">
                  ⚠️ This yard is currently active. It will be deactivated instead of permanently deleted.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t mt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsDeleteModalOpen(false);
              setError(null);
              setSuccess(null);
              setSelectedYard(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteYard} 
            disabled={isSubmitting}
            variant="danger"
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? 'Deleting...' : 'Delete Yard'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}