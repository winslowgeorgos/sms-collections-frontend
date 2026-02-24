// components/admin/AssignGroupsModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import MultiSelect from './MultiSelect';

interface AssignGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  currentGroupIds: number[];
  onAssigned: () => void;
}

export default function AssignGroupsModal({
  isOpen,
  onClose,
  userId,
  userName,
  currentGroupIds,
  onAssigned,
}: AssignGroupsModalProps) {
  const [allGroups, setAllGroups] = useState<{ id: number; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(currentGroupIds);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      setSelectedIds(currentGroupIds);
    }
  }, [isOpen, currentGroupIds]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const client = apiClient.getClient();
      // Fetch all groups (you may want pagination, but for a modal we can fetch all or search on client)
      const response = await client.get('/admin/groups/?page_size=1000');
      setAllGroups(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = apiClient.getClient();
      await client.post(`/admin/users/${userId}/groups/`, { group_ids: selectedIds });
      onAssigned();
      onClose();
    } catch (error) {
      console.error('Failed to assign groups:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Groups to ${userName}`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select groups for this user. Existing groups are pre‑selected.
        </p>
        {loading ? (
          <div className="py-8 text-center">Loading groups...</div>
        ) : (
          <MultiSelect
            options={allGroups.map(g => ({ id: g.id, name: g.name }))}
            selectedIds={selectedIds}
            onChange={(ids) => setSelectedIds(ids.filter((id) => typeof id === 'number') as number[])}
            searchPlaceholder="Search groups..."
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