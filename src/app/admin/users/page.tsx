// app/admin/users/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import GenericTable from '@/components/ui/cTable';
import { Edit, Trash2, Users } from 'lucide-react';
import AssignGroupsModal from '@/components/admin/AssignGroupsModal';

interface User {
  id: number;
  username: string;
  full_name: string;
  first_name: string;
  last_name: string;

  email: string;
  groups: { id: number; name: string }[];
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
}

interface GroupOption {
  id: number;
  name: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
    totalCount: 0,
  });
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; groupIds: number[] } | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Create/Edit modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    is_active: true,
    is_staff: false,
    is_superuser: false,
    groups: [] as number[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // For group multi-select in create/edit
  const [allGroups, setAllGroups] = useState<GroupOption[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const fetchUsers = async (page = 1, searchTerm = '') => {
    setLoading(true);
    try {
      const client = apiClient.getClient();
      const params: any = { page, page_size: pagination.pageSize };
      if (searchTerm) params.search = searchTerm;
      // Use the new admin endpoint
      const response = await client.get('/admin/users/', { params });
      setUsers(response.data.results);
      setPagination({
        currentPage: page,
        pageSize: pagination.pageSize,
        totalCount: response.data.count,
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get('/admin/groups/?page_size=1000');
      setAllGroups(response.data.results || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchUsers(pagination.currentPage, search);
  }, []);

  const handleSearch = (term: string) => {
    setSearch(term);
    fetchUsers(1, term);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      is_active: true,
      is_staff: false,
      is_superuser: false,
      groups: [],
    });
    setFormErrors({});
    fetchGroups(); // load groups for the select
    setIsUserModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      password: '', // password field left empty
      is_active: user.is_active,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
      groups: user.groups.map(g => g.id),
    });
    setFormErrors({});
    fetchGroups();
    setIsUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false);
  };

  const handleUserFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setUserForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateUserForm = () => {
    const errors: Record<string, string> = {};
    if (!userForm.username.trim()) errors.username = 'Username is required';
    if (!editingUser && !userForm.password) errors.password = 'Password is required for new users';
    return errors;
  };

  const handleUserSubmit = async () => {
    const errors = validateUserForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      const { password, ...payload } = userForm;
      const finalPayload = password ? { ...payload, password } : payload;

      if (editingUser) {
        await client.put(`/admin/users/${editingUser.id}/`, payload);
      } else {
        await client.post('/admin/users/', payload);
      }
      fetchUsers(pagination.currentPage, search);
      handleCloseUserModal();
    } catch (error: any) {
      if (error.response?.data) {
        setFormErrors(error.response.data);
      } else {
        console.error('Failed to save user:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.delete(`/admin/users/${deleteTarget.id}/`);
      fetchUsers(pagination.currentPage, search);
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignGroups = (user: User) => {
    setSelectedUser({
      id: user.id,
      name: user.full_name || user.username,
      groupIds: user.groups.map(g => g.id),
    });
    setIsAssignModalOpen(true);
  };

  const columns = [
    {
      id: 'full_name',
      label: 'Name',
      accessor: (row: User) => row.full_name || row.username,
      width: 180,
    },
    {
      id: 'username',
      label: 'Username',
      accessor: (row: User) => row.username,
      width: 150,
    },
    {
      id: 'email',
      label: 'Email',
      accessor: (row: User) => row.email,
      width: 200,
    },
    {
      id: 'groups',
      label: 'Groups',
      accessor: (row: User) => row.groups.map(g => g.name).join(', '),
      width: 200,
    },
    {
      id: 'is_active',
      label: 'Active',
      accessor: (row: User) => (row.is_active ? 'Yes' : 'No'),
      width: 80,
    },
    {
      id: 'is_staff',
      label: 'Staff',
      accessor: (row: User) => (row.is_staff ? 'Yes' : 'No'),
      width: 80,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: User) => row,
      Cell: (value: User) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleAssignGroups(value)}
            className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
            title="Assign Groups"
          >
            <Users size={16} />
          </button>
          <button
            onClick={() => openEditModal(value)}
            className="text-gray-600 hover:text-gray-700 p-1 rounded hover:bg-gray-50"
            title="Edit User"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => { setDeleteTarget(value); setIsDeleteModalOpen(true); }}
            className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
            title="Delete User"
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
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <Button onClick={openCreateModal}>Create User</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Users</h2>
          </div>
        </CardHeader>
        <CardContent>
          <GenericTable
            data={users}
            columns={columns}
            rowKey={(row) => row.id}
            selectionMode="none"
            virtualized={false}
            pagination={{
              totalCount: pagination.totalCount,
              currentPage: pagination.currentPage,
              pageSize: pagination.pageSize,
              onPageChange: (page) => fetchUsers(page, search),
              serverSide: true,
            }}
            serverSideSearch={search}
            onServerSearchChange={handleSearch}
          />
        </CardContent>
      </Card>

      {/* Create/Edit User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        title={editingUser ? 'Edit User' : 'Create User'}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleUserSubmit(); }} className="space-y-4">
          <FormInput
            label="Username"
            name="username"
            value={userForm.username}
            onChange={handleUserFormChange}
            error={formErrors.username}
            required
          />
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={userForm.email}
            onChange={handleUserFormChange}
            error={formErrors.email}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              name="first_name"
              value={userForm.first_name}
              onChange={handleUserFormChange}
            />
            <FormInput
              label="Last Name"
              name="last_name"
              value={userForm.last_name}
              onChange={handleUserFormChange}
            />
          </div>
          <FormInput
            label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
            name="password"
            type="password"
            value={userForm.password}
            onChange={handleUserFormChange}
            error={formErrors.password}
            required={!editingUser}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Groups</label>
            {loadingGroups ? (
              <div className="text-sm text-gray-500">Loading groups...</div>
            ) : (
              <select
                multiple
                value={userForm.groups.map(String)}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => Number(option.value));
                  setUserForm(prev => ({ ...prev, groups: selected }));
                }}
                className="w-full border rounded-md p-2 text-sm h-32"
              >
                {allGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_active"
                checked={userForm.is_active}
                onChange={handleUserFormChange}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_staff"
                checked={userForm.is_staff}
                onChange={handleUserFormChange}
              />
              Staff
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_superuser"
                checked={userForm.is_superuser}
                onChange={handleUserFormChange}
              />
              Superuser
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCloseUserModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User"
        size="sm"
      >
        <div className="text-center">
          <p className="mb-4">
            Are you sure you want to delete <strong>{deleteTarget?.full_name || deleteTarget?.username}</strong>?
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Groups Modal */}
      {selectedUser && (
        <AssignGroupsModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          userId={selectedUser.id}
          userName={selectedUser.name}
          currentGroupIds={selectedUser.groupIds}
          onAssigned={() => fetchUsers(pagination.currentPage, search)}
        />
      )}
    </div>
  );
}