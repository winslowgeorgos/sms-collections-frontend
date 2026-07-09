// app/admin/groups/page.tsx (full updated version)

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import GenericTable from '@/components/ui/cTable';
import { Edit, Trash2, Shield } from 'lucide-react';
import AssignPermissionsModal from '@/components/admin/AssignPermissionsModal';
import PermissionMultiSelect from '@/components/admin/PermissionMultiSelect';

interface Group {
  id: number;
  name: string;
  permission_count: number;
  user_count: number;
  permissions: number[]; // ids
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
    totalCount: 0,
  });
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: '', permissions: [] as number[] });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Permission assignment modal
  const [permModal, setPermModal] = useState<{ open: boolean; group: Group | null }>({ open: false, group: null });

  const fetchGroups = async (page = 1, searchTerm = '') => {
    setLoading(true);
    try {
      const client = apiClient.getClient();
      const params: any = { page, page_size: pagination.pageSize };
      if (searchTerm) params.search = searchTerm;
      const response = await client.get('/admin/groups/', { params });
      setGroups(response.data.results);
      setPagination({
        currentPage: page,
        pageSize: pagination.pageSize,
        totalCount: response.data.count,
      });
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups(pagination.currentPage, search);
  }, []);

  const handleSearch = (term: string) => {
    setSearch(term);
    fetchGroups(1, term);
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    setFormData({ name: '', permissions: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setFormData({ name: group.name, permissions: group.permissions });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormErrors({});
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Group name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      const payload = { name: formData.name, permissions: formData.permissions };
      if (editingGroup) {
        await client.put(`/admin/groups/${editingGroup.id}/`, payload);
      } else {
        await client.post('/admin/groups/', payload);
      }
      fetchGroups(pagination.currentPage, search);
      handleCloseModal();
    } catch (error: any) {
      console.error('Failed to save group:', error);
      if (error.response?.data) setFormErrors(error.response.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.delete(`/admin/groups/${deleteTarget.id}/`);
      fetchGroups(pagination.currentPage, search);
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      id: 'name',
      label: 'Group Name',
      accessor: (row: Group) => row.name,
      width: 200,
    },
    {
      id: 'permission_count',
      label: 'Permissions',
      accessor: (row: Group) => row.permission_count,
      width: 100,
    },
    {
      id: 'user_count',
      label: 'Users',
      accessor: (row: Group) => row.user_count,
      width: 100,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: Group) => row,
      Cell: (value: Group) => (
        <div className="flex gap-2">
          <button
            onClick={() => setPermModal({ open: true, group: value })}
            className="text-purple-600 hover:text-purple-700 p-1 rounded hover:bg-purple-50"
            title="Manage Permissions"
          >
            <Shield size={16} />
          </button>
          <button
            onClick={() => openEditModal(value)}
            className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
            title="Edit Group"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => { setDeleteTarget(value); setIsDeleteModalOpen(true); }}
            className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
            title="Delete Group"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      width: 140,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Group Management</h1>
        <Button onClick={openCreateModal}>Create Group</Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Groups</h2>
        </CardHeader>
        <CardContent>
          <GenericTable
            data={groups}
            columns={columns}
            rowKey={(row) => row.id}
            selectionMode="none"
            virtualized={false}
            pagination={{
              totalCount: pagination.totalCount,
              currentPage: pagination.currentPage,
              pageSize: pagination.pageSize,
              onPageChange: (page) => fetchGroups(page, search),
              serverSide: true,
            }}
            
            serverSideSearch={search}
            onServerSearchChange={handleSearch}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Group Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingGroup ? 'Edit Group' : 'Create Group'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <FormInput
            label="Group Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={formErrors.name}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permissions <span className="text-gray-500 text-xs">({formData.permissions.length} selected)</span>
            </label>
            <PermissionMultiSelect
              selectedIds={formData.permissions}
              onChange={(ids) => setFormData(prev => ({ ...prev, permissions: ids }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Group" size="sm">
        <div className="text-center">
          <p className="mb-4">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permission Assignment Modal (if you still want a separate modal for bulk updates) */}
      {permModal.group && (
        <AssignPermissionsModal
          isOpen={permModal.open}
          onClose={() => setPermModal({ open: false, group: null })}
          groupId={permModal.group.id}
          groupName={permModal.group.name}
          currentPermissionIds={permModal.group.permissions}
          onAssigned={() => fetchGroups(pagination.currentPage, search)}
        />
      )}
    </div>
  );
}