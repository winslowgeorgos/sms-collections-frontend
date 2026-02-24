// app/admin/permissions/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import GenericTable from '@/components/ui/cTable';

interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type_name: string;
  content_type_app: string;
  content_type: number; // id
}

interface ContentType {
  id: number;
  app_label: string;
  model: string;
}

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 50,
    totalCount: 0,
  });
  const [search, setSearch] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');

  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    codename: '',
    content_type: '',
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchPermissions = async (page = pagination.currentPage) => {
    setLoading(true);
    try {
      const client = apiClient.getClient();
      const params: any = {
        page,
        page_size: pagination.pageSize,
      };
      if (search) params.search = search;
      if (appFilter) params.app = appFilter;
      if (modelFilter) params.model = modelFilter;

      const response = await client.get('/admin/permissions/', { params });
      setPermissions(response.data.results);
      setPagination({
        currentPage: page,
        pageSize: pagination.pageSize,
        totalCount: response.data.count,
      });
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions(1);
  }, [search, appFilter, modelFilter]);

  const fetchContentTypes = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/admin/content-types/');
      setContentTypes(response.data);
    } catch (error) {
      console.error('Failed to load content types:', error);
    }
  };

  const handleCreatePermission = async () => {
    setCreating(true);
    setCreateErrors({});
    try {
      const client = apiClient.getClient();
      await client.post('/admin/permissions/', {
        name: createForm.name,
        codename: createForm.codename,
        content_type: createForm.content_type,
      });
      setIsCreateModalOpen(false);
      setCreateForm({ name: '', codename: '', content_type: '' });
      fetchPermissions(1); // refresh list
    } catch (error: any) {
      if (error.response?.data) {
        setCreateErrors(error.response.data);
      } else {
        console.error('Failed to create permission:', error);
      }
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      id: 'name',
      label: 'Permission Name',
      accessor: (row: Permission) => row.name,
      width: 250,
    },
    {
      id: 'codename',
      label: 'Codename',
      accessor: (row: Permission) => row.codename,
      width: 180,
    },
    {
      id: 'content_type_app',
      label: 'App',
      accessor: (row: Permission) => row.content_type_app,
      width: 120,
    },
    {
      id: 'content_type_name',
      label: 'Model',
      accessor: (row: Permission) => row.content_type_name,
      width: 150,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Permission Management</h1>
        <Button
          onClick={() => {
            setIsCreateModalOpen(true);
            fetchContentTypes();
          }}
        >
          Create Permission
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">All Permissions</h2>
          <div className="flex flex-wrap gap-4 mt-2">
            <input
              type="text"
              placeholder="Search by name or codename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded px-3 py-1 text-sm w-64"
            />
            <input
              type="text"
              placeholder="Filter by app"
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="border rounded px-3 py-1 text-sm w-48"
            />
            <input
              type="text"
              placeholder="Filter by model"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="border rounded px-3 py-1 text-sm w-48"
            />
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setAppFilter('');
                setModelFilter('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <GenericTable
            data={permissions}
            columns={columns}
            rowKey={(row: Permission) => row.id}
            selectionMode="none"
            virtualized={false}
            pagination={{
              totalCount: pagination.totalCount,
              currentPage: pagination.currentPage,
              pageSize: pagination.pageSize,
              onPageChange: (page) => fetchPermissions(page),
              serverSide: true,
            }}
            serverSideSearch={search}
            onServerSearchChange={setSearch}
          />
        </CardContent>
      </Card>

      {/* Create Permission Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Permission"
        size="md"
      >
        <div className="space-y-4">
          <FormInput
            label="Name"
            name="name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            error={createErrors.name}
            required
            placeholder="e.g., Can view dashboard"
          />
          <FormInput
            label="Codename"
            name="codename"
            value={createForm.codename}
            onChange={(e) => setCreateForm({ ...createForm, codename: e.target.value })}
            error={createErrors.codename}
            required
            placeholder="e.g., can_view_dashboard"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Type (Model)
            </label>
            <select
              value={createForm.content_type}
              onChange={(e) => setCreateForm({ ...createForm, content_type: e.target.value })}
              className="w-full border rounded-md p-2 text-sm"
            >
              <option value="">Select a model</option>
              {contentTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.app_label} | {ct.model}
                </option>
              ))}
            </select>
            {createErrors.content_type && (
              <p className="text-red-500 text-xs mt-1">{createErrors.content_type}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePermission} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}