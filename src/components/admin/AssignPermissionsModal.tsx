// components/admin/AssignPermissionsModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import MultiSelect from './MultiSelect';

interface AssignPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
  currentPermissionIds: number[];
  onAssigned: () => void;
}

export default function AssignPermissionsModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  currentPermissionIds,
  onAssigned,
}: AssignPermissionsModalProps) {
  const [allPermissions, setAllPermissions] = useState<{ id: number; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(currentPermissionIds);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
      setSelectedIds(currentPermissionIds);
    }
  }, [isOpen, currentPermissionIds]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const client = apiClient.getClient();
      // Fetch all permissions (you may want pagination, but for a modal we can fetch a large page)
      const response = await client.get('/admin/permissions/?page_size=1000');
      setAllPermissions(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = apiClient.getClient();
      await client.post(`/admin/groups/${groupId}/permissions/`, { permission_ids: selectedIds });
      onAssigned();
      onClose();
    } catch (error) {
      console.error('Failed to assign permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Permissions for Group: ${groupName}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select permissions for this group.
        </p>
        {loading ? (
          <div className="py-8 text-center">Loading permissions...</div>
        ) : (
          <MultiSelect
            options={allPermissions.map(p => ({ id: p.id, name: p.name }))}
            selectedIds={selectedIds}
            onChange={(ids) => setSelectedIds(ids.filter((id): id is number => typeof id === 'number'))}
            searchPlaceholder="Search permissions..."
          />
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}