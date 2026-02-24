// components/admin/PermissionMultiSelect.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import MultiSelect from './MultiSelect';

interface PermissionMultiSelectProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

export default function PermissionMultiSelect({
  selectedIds,
  onChange,
  disabled = false,
}: PermissionMultiSelectProps) {
  const [permissions, setPermissions] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const client = apiClient.getClient();
      // Fetch a large page; adjust page_size if you have many permissions (>1000)
      const response = await client.get('/admin/permissions/?page_size=1000');
      // Assuming response.data.results is an array of permissions with id and name
      const items = (response.data.results || []).map((p: any) => ({
        id: p.id,
        name: `${p.name} (${p.codename})`,
      }));
      setPermissions(items);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading permissions...</div>;
  }

  return (
    <MultiSelect
      options={permissions}
      selectedIds={selectedIds}
      onChange={(ids) => onChange(ids as number[])}
      searchPlaceholder="Search permissions..."
      maxHeight="300px"
    />
  );
}