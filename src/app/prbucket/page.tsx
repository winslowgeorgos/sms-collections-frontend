'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { usePermissions } from '@/context/permission-context';
import {
  Plus,
  Edit,
  Power,
  PowerOff,
  Loader2,
  AlertCircle,
  X,
  Settings,
  ShieldAlert,
} from 'lucide-react';

// ============================================================================
// Types -- mirror loan_processor.models.PRBucket / PRBucketTeam and
// PRBucketConfigSerializer exactly.
// ============================================================================

const PR_BUCKETS: { value: string; label: string }[] = [
  { value: 'CURRENT', label: 'Current (Not Yet Due)' },
  { value: 'PR30', label: 'PR 1-30 Days' },
  { value: 'PR31_60', label: 'PR 31-60 Days' },
  { value: 'PR61_90', label: 'PR 61-90 Days' },
  { value: 'PR90_PLUS', label: 'Above 90 Days' },
];

const PR_BUCKET_TEAMS: { value: string; label: string }[] = [
  { value: 'collections', label: 'Collections' },
  { value: 'auctioneer', label: 'Auctioneer' },
  { value: 'third_party', label: 'Third Party' },
  { value: 'legal', label: 'Legal' },
];

const bucketLabel = (value: string) => PR_BUCKETS.find((b) => b.value === value)?.label || value;
const teamLabel = (value: string) => PR_BUCKET_TEAMS.find((t) => t.value === value)?.label || value;

// target_percentage / commission_percentage are DecimalFields -- DRF
// serializes these as quoted strings (e.g. "90.000"), not JSON numbers.
interface PRBucketConfig {
  id: string;
  bucket_code: string;
  bucket_code_display: string;
  team: string;
  team_display: string;
  target_percentage: string;
  commission_percentage: string;
  is_active: boolean;
  created_by: number | null;
  created_by_username: string | null;
  updated_by: number | null;
  updated_by_username: string | null;
  deactivated_by: number | null;
  deactivated_by_username: string | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ConfigFormState {
  bucket_code: string;
  team: string;
  target_percentage: string;
  commission_percentage: string;
}

const emptyForm: ConfigFormState = {
  bucket_code: '',
  team: 'collections',
  target_percentage: '',
  commission_percentage: '',
};

// A DRF validation error body is typically { field_name: ["msg", ...], ... }
// or a top-level { detail: "..." } / { error: "..." }. Flatten whatever shape
// comes back into a single readable string.
const extractErrorMessage = (error: any): string => {
  const data = error?.response?.data;
  if (!data) return error?.message || 'Something went wrong. Please try again.';
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  const parts: string[] = [];
  Object.entries(data).forEach(([field, messages]) => {
    const text = Array.isArray(messages) ? messages.join(' ') : String(messages);
    parts.push(field === 'non_field_errors' ? text : `${field}: ${text}`);
  });
  return parts.length > 0 ? parts.join(' | ') : 'Something went wrong. Please try again.';
};

export default function PRBucketConfigsPage() {
  const { hasAccess } = usePermissions();
  // Gates create/edit/activate/deactivate in the UI. The backend independently
  // enforces this via request.user.is_staff regardless of what this returns,
  // so worst case a non-staff user sees a 403 message instead of a hidden
  // button -- adjust this permission key to whatever your permission system
  // actually uses for "manage PR bucket configs".
  const canManage = hasAccess('can_manage_pr_bucket_configs');

  const [configs, setConfigs] = useState<PRBucketConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [teamFilter, setTeamFilter] = useState('');
  const [bucketFilter, setBucketFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'true' | 'false'>('');

  // Create/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PRBucketConfig | null>(null);
  const [formData, setFormData] = useState<ConfigFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<PRBucketConfig | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Per-row activate spinner
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamFilter, bucketFilter, statusFilter]);

  const fetchConfigs = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const client = apiClient.getClient();
      const params: Record<string, string> = {};
      if (teamFilter) params.team = teamFilter;
      if (bucketFilter) params.bucket_code = bucketFilter;
      if (statusFilter) params.is_active = statusFilter;

      const response = await client.get('/pr-bucket-configs/', { params });
      // Handle both a plain array and DRF's paginated { results: [...] } shape.
      const data = response.data;
      const list: PRBucketConfig[] = Array.isArray(data) ? data : data?.results || [];
      setConfigs(list);
    } catch (error: any) {
      console.error('Error fetching PR bucket configs:', error);
      setLoadError(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingConfig(null);
    setFormData(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (config: PRBucketConfig) => {
    setEditingConfig(config);
    setFormData({
      bucket_code: config.bucket_code,
      team: config.team,
      target_percentage: config.target_percentage,
      commission_percentage: config.commission_percentage,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingConfig(null);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.bucket_code) {
      setFormError('PR Bucket is required');
      return;
    }
    if (!formData.team) {
      setFormError('Team is required');
      return;
    }
    const targetValue = parseFloat(formData.target_percentage);
    if (!formData.target_percentage || Number.isNaN(targetValue) || targetValue < 0) {
      setFormError('Target % must be a number of 0 or greater');
      return;
    }
    const commissionValue = parseFloat(formData.commission_percentage);
    if (!formData.commission_percentage || Number.isNaN(commissionValue) || commissionValue < 0) {
      setFormError('Commission % must be a number of 0 or greater');
      return;
    }

    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      const payload = {
        bucket_code: formData.bucket_code,
        team: formData.team,
        target_percentage: targetValue,
        commission_percentage: commissionValue,
      };

      if (editingConfig) {
        await client.patch(`/pr-bucket-configs/${editingConfig.id}/`, payload);
      } else {
        await client.post('/pr-bucket-configs/', payload);
      }

      setIsModalOpen(false);
      setEditingConfig(null);
      setFormData(emptyForm);
      await fetchConfigs();
    } catch (error: any) {
      console.error('Error saving PR bucket config:', error);
      setFormError(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (config: PRBucketConfig) => {
    setActivatingId(config.id);
    try {
      const client = apiClient.getClient();
      await client.post(`/pr-bucket-configs/${config.id}/activate/`);
      await fetchConfigs();
    } catch (error: any) {
      console.error('Error activating PR bucket config:', error);
      alert(extractErrorMessage(error));
    } finally {
      setActivatingId(null);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      const client = apiClient.getClient();
      await client.post(`/pr-bucket-configs/${deactivateTarget.id}/deactivate/`);
      setDeactivateTarget(null);
      await fetchConfigs();
    } catch (error: any) {
      console.error('Error deactivating PR bucket config:', error);
      alert(extractErrorMessage(error));
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="mr-3 h-7 w-7 text-blue-600" />
            PR Bucket Configurations
          </h1>
          <p className="text-gray-600 mt-1">
            CBK loan-aging target % and commission % per PR bucket and team.
          </p>
        </div>
        {canManage && (
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateModal}>
            <Plus size={16} className="mr-2" />
            Add Configuration
          </Button>
        )}
      </div>

      {!canManage && (
        <div className="flex items-start p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <ShieldAlert size={16} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>You have read-only access to PR bucket configurations. Only staff users can create, edit, activate or deactivate them.</span>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PR Bucket</label>
              <select
                value={bucketFilter}
                onChange={(e) => setBucketFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Buckets</option>
                {PR_BUCKETS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Teams</option>
                {PR_BUCKET_TEAMS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as '' | 'true' | 'false')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setTeamFilter('');
                  setBucketFilter('');
                  setStatusFilter('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-600">Loading configurations...</span>
            </div>
          ) : loadError ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
              <p className="mt-2 text-sm text-red-600">{loadError}</p>
              <Button variant="outline" className="mt-4" onClick={fetchConfigs}>
                Retry
              </Button>
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No configurations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {canManage ? 'Add a configuration to get started.' : 'No PR bucket configurations match these filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">PR Bucket</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Target %</th>
                    <th className="px-4 py-3">Commission %</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {configs.map((config) => (
                    <tr key={config.id} className={!config.is_active ? 'bg-gray-50' : undefined}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {config.bucket_code_display || bucketLabel(config.bucket_code)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {config.team_display || teamLabel(config.team)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {parseFloat(config.target_percentage).toLocaleString(undefined, { maximumFractionDigits: 3 })}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {parseFloat(config.commission_percentage).toLocaleString(undefined, { maximumFractionDigits: 4 })}%
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {config.is_active ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {config.updated_at ? new Date(config.updated_at).toLocaleString() : '—'}
                        {config.updated_by_username && (
                          <div className="text-xs text-gray-400">by {config.updated_by_username}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end space-x-2">
                          {canManage && (
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(config)} aria-label="Edit">
                              <Edit size={14} />
                            </Button>
                          )}
                          {canManage && config.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeactivateTarget(config)}
                              aria-label="Deactivate"
                            >
                              <PowerOff size={14} />
                            </Button>
                          )}
                          {canManage && !config.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleActivate(config)}
                              disabled={activatingId === config.id}
                              aria-label="Activate"
                            >
                              {activatingId === config.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Power size={14} />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingConfig ? 'Edit Configuration' : 'Add Configuration'}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal} disabled={isSubmitting}>
                <X size={16} />
              </Button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-4 space-y-4">
                {formError && (
                  <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                    <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PR Bucket <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.bucket_code}
                    onChange={(e) => setFormData({ ...formData, bucket_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="" disabled>Select a bucket</option>
                    {PR_BUCKETS.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {PR_BUCKET_TEAMS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target % <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.target_percentage}
                      onChange={(e) => setFormData({ ...formData, target_percentage: e.target.value })}
                      placeholder="e.g. 90"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Commission % <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.commission_percentage}
                      onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })}
                      placeholder="e.g. 0.10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Target % is applied to an installment's balance; Commission % is applied to the amount
                  posted to it during the current calendar month.
                </p>
              </div>

              <div className="flex justify-end space-x-3 p-4 border-t">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingConfig ? (
                    'Save Changes'
                  ) : (
                    'Create Configuration'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate confirmation modal */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
                Deactivate Configuration
              </h2>
            </div>
            <div className="p-4 text-sm text-gray-700 space-y-2">
              <p>
                This will deactivate the <strong>{bucketLabel(deactivateTarget.bucket_code)}</strong> /{' '}
                <strong>{teamLabel(deactivateTarget.team)}</strong> configuration.
              </p>
              <p className="text-gray-500">
                Hard deletion isn't allowed for CBK audit compliance -- this is a soft delete
                (<code>is_active</code> set to false). It will no longer be used for new target/commission
                calculations, and can be reactivated later.
              </p>
            </div>
            <div className="flex justify-end space-x-3 p-4 border-t">
              <Button variant="outline" onClick={() => setDeactivateTarget(null)} disabled={isDeactivating}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={confirmDeactivate}
                disabled={isDeactivating}
              >
                {isDeactivating ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  'Deactivate'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}