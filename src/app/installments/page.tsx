// app/installments/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api';
import {
  CreditCard, Filter, Search, RefreshCw, X, Users,
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import {
  Installment, InstallmentSummary, PRBucketSummaryMap, EMPTY_SUMMARY,
  InstallmentSummaryPanel, getInstallmentColumns, PR_BUCKETS, PR_BUCKET_TEAMS,
} from '@/components/installments/shared';

import { usePRVisibility } from '@/hooks/user-pr-visibility';

interface InstallmentFilters {
  search?: string;
  officer_id?: string;
  officer_username?: string;
  pr_bucket?: string;
  pr_bucket_team?: string;
  has_pr_bucket?: string;
  is_overdue?: string;
  is_current_month?: string;
  paid_off?: string;
  assigned_only?: string;
  unassigned_only?: string;
  due_date_after?: string;
  due_date_before?: string;
  cumulative_min?: string;
  cumulative_max?: string;
  has_commission?: string;
  ordering?: string;
  page: number;
  page_size: number;
}

const DEFAULT_FILTERS: InstallmentFilters = {
  page: 1,
  page_size: 20,
  ordering: '-due_date',
};

const SORT_OPTIONS = [
  { value: '-due_date', label: 'Due Date (Latest First)' },
  { value: 'due_date', label: 'Due Date (Earliest First)' },
  { value: '-cumulative_balance', label: 'Highest Cumulative Balance' },
  { value: 'cumulative_balance', label: 'Lowest Cumulative Balance' },
  { value: '-installment_commission', label: 'Highest Commission' },
  { value: '-percentaged_target', label: 'Highest Target' },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 500];

const FILTER_KEYS: (keyof InstallmentFilters)[] = [
  'search', 'officer_id', 'officer_username', 'pr_bucket', 'pr_bucket_team',
  'has_pr_bucket', 'is_overdue', 'is_current_month', 'paid_off',
  'assigned_only', 'unassigned_only', 'due_date_after', 'due_date_before',
  'cumulative_min', 'cumulative_max', 'has_commission', 'ordering',
];

export default function AllInstallmentsPage() {
  const router = useRouter();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const vsbility = usePRVisibility();

  const [summary, setSummary] = useState<InstallmentSummary>(EMPTY_SUMMARY);
  const [prBucketSummary, setPrBucketSummary] = useState<PRBucketSummaryMap>({});

  const [pagination, setPagination] = useState({ count: 0, page: 1, page_size: 20, total_pages: 0 });
  const [filters, setFilters] = useState<InstallmentFilters>({ ...DEFAULT_FILTERS });
  const [tempFilters, setTempFilters] = useState<InstallmentFilters>({ ...DEFAULT_FILTERS });

  const activeFilterCount = FILTER_KEYS.filter(key => {
    const value = filters[key];
    return value !== undefined && value !== null && value !== '';
  }).length;

  useEffect(() => {
    fetchInstallments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.page, filters.page_size, filters.search, filters.officer_id,
    filters.officer_username, filters.pr_bucket, filters.pr_bucket_team,
    filters.has_pr_bucket, filters.is_overdue, filters.is_current_month,
    filters.paid_off, filters.assigned_only, filters.unassigned_only,
    filters.due_date_after, filters.due_date_before, filters.cumulative_min,
    filters.cumulative_max, filters.has_commission, filters.ordering,
  ]);

  const buildQueryParams = () => {
    const queryParams = new URLSearchParams();
    FILTER_KEYS.forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    queryParams.append('page', String(filters.page));
    queryParams.append('page_size', String(filters.page_size));
    return queryParams;
  };

  const fetchInstallments = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const queryParams = buildQueryParams();
      const response = await client.get(`/installments/?${queryParams.toString()}`);
      const data = response.data;

      setInstallments(data?.results || []);
      setSummary(data?.summary || EMPTY_SUMMARY);
      setPrBucketSummary(data?.pr_bucket_summary || {});
      setPagination({
        count: data?.count || 0,
        page: data?.page || filters.page,
        page_size: data?.page_size || filters.page_size,
        total_pages: data?.total_pages || 0,
      });
    } catch (error) {
      console.error('Error fetching installments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof InstallmentFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSelectBucket = (bucketKey: string | undefined) => {
    if (!bucketKey) {
      handleFilterChange('pr_bucket', undefined);
      handleFilterChange('has_pr_bucket', undefined);
      return;
    }
    if (bucketKey === 'unassigned') {
      setFilters(prev => ({ ...prev, pr_bucket: undefined, has_pr_bucket: 'false', page: 1 }));
      return;
    }
    setFilters(prev => ({ ...prev, pr_bucket: bucketKey, has_pr_bucket: undefined, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setTempFilters({ ...DEFAULT_FILTERS });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const openFilterModal = () => {
    setTempFilters({ ...filters });
    setIsFilterModalOpen(true);
  };

  const applyAdvancedFilters = () => {
    setFilters({ ...tempFilters, page: 1 });
    setIsFilterModalOpen(false);
  };

  const handleViewInstallment = (installment: Installment) => {
    router.push(`/installments/${installment.id}`);
  };

  const handleViewLoan = (loanId: string) => {
    router.push(`/loans/${loanId}`);
  };

  const columns = React.useMemo(
    () => getInstallmentColumns({ onViewInstallment: handleViewInstallment, onViewLoan: handleViewLoan, showLoanOfficerColumn: true, visibility: vsbility }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const activeBucket = filters.pr_bucket || (filters.has_pr_bucket === 'false' ? 'unassigned' : undefined);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-blue-600" />
            All Installments
          </h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <span>Active loans, up to the current month</span>
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
              {pagination.count.toLocaleString()} installments
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={openFilterModal} className="relative">
            <Filter size={18} className="mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={resetFilters} disabled={activeFilterCount === 0}>
            <X size={18} className="mr-2" />
            Clear
          </Button>
          <Button variant="outline" onClick={fetchInstallments} disabled={isLoading}>
            <RefreshCw size={18} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary + PR Bucket Breakdown */}
      <InstallmentSummaryPanel
        summary={summary}
        prBucketSummary={prBucketSummary}
        isLoading={isLoading && installments.length === 0}
        activeBucket={activeBucket}
        onSelectBucket={handleSelectBucket}
      />

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by customer name, phone number, loan ID, registration number, or identity number..."
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      {/* Installments Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Installment Records</h2>
              <div className="text-sm text-gray-500">
                {pagination.count > 0 ? (
                  <>
                    Showing {(filters.page - 1) * filters.page_size + 1} - {Math.min(filters.page * filters.page_size, pagination.count)} of {pagination.count.toLocaleString()}
                  </>
                ) : (
                  'No records found'
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={filters.ordering}
                onChange={(e) => handleFilterChange('ordering', e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={filters.page_size}
                onChange={(e) => setFilters(prev => ({ ...prev, page_size: Number(e.target.value), page: 1 }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
              <div className="text-gray-600">Loading installments...</div>
            </div>
          ) : installments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-gray-400 mb-2">
                <CreditCard size={48} className="mx-auto" />
              </div>
              <div className="text-gray-600 font-medium">No installments found</div>
              <div className="text-sm text-gray-400 mt-1">Try adjusting your filters</div>
            </div>
          ) : (
            <GenericTable
              data={installments}
              columns={columns}
              rowKey={(row: Installment) => row.id}
              selectionMode="none"
              virtualized={true}
              pagination={{
                totalCount: pagination.count,
                currentPage: filters.page,
                pageSize: filters.page_size,
                onPageChange: handlePageChange,
                onPageSizeChange: (newSize: number) => setFilters(prev => ({ ...prev, page_size: newSize, page: 1 })),
                hasNextPage: filters.page < pagination.total_pages,
                hasPreviousPage: filters.page > 1,
                serverSide: true,
              }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          )}
        </CardContent>
      </Card>

      {/* Advanced Filters Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-blue-600" />
            <span>Filter Installments</span>
            {activeFilterCount > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>
        }
        size="lg"
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto px-1">
          {/* Officer */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              Officer
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Officer ID</label>
                <input
                  type="text"
                  value={tempFilters.officer_id || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, officer_id: e.target.value || undefined }))}
                  placeholder="Officer ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Officer Username</label>
                <input
                  type="text"
                  value={tempFilters.officer_username || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, officer_username: e.target.value || undefined }))}
                  placeholder="e.g. Mary.Otieno"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={tempFilters.assigned_only === 'true'}
                  onChange={(e) => setTempFilters(prev => ({
                    ...prev,
                    assigned_only: e.target.checked ? 'true' : undefined,
                    unassigned_only: e.target.checked ? undefined : prev.unassigned_only,
                  }))}
                />
                Assigned only
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={tempFilters.unassigned_only === 'true'}
                  onChange={(e) => setTempFilters(prev => ({
                    ...prev,
                    unassigned_only: e.target.checked ? 'true' : undefined,
                    assigned_only: e.target.checked ? undefined : prev.assigned_only,
                  }))}
                />
                Unassigned only
              </label>
            </div>
          </div>

          {/* PR Bucket */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">PR Bucket (CBK Categorization)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bucket</label>
                <select
                  value={tempFilters.pr_bucket || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, pr_bucket: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">All Buckets</option>
                  {PR_BUCKETS.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
                <select
                  value={tempFilters.pr_bucket_team || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, pr_bucket_team: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">All Teams</option>
                  {PR_BUCKET_TEAMS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={tempFilters.has_commission === 'true'}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, has_commission: e.target.checked ? 'true' : undefined }))}
                />
                Has commission earned
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={tempFilters.has_pr_bucket === 'false'}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, has_pr_bucket: e.target.checked ? 'false' : undefined }))}
                />
                No bucket assigned
              </label>
            </div>
          </div>

          {/* Status */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Overdue</label>
                <select
                  value={tempFilters.is_overdue ?? ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, is_overdue: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Any</option>
                  <option value="true">Overdue</option>
                  <option value="false">Not Overdue</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Current Month</label>
                <select
                  value={tempFilters.is_current_month ?? ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, is_current_month: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Any</option>
                  <option value="true">Current Month</option>
                  <option value="false">Not Current Month</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Paid Off</label>
                <select
                  value={tempFilters.paid_off ?? ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, paid_off: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Any</option>
                  <option value="true">Paid Off</option>
                  <option value="false">Not Paid Off</option>
                </select>
              </div>
            </div>
          </div>

          {/* Due Date Range */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Due Date Range</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due After</label>
                <input
                  type="date"
                  value={tempFilters.due_date_after || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, due_date_after: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Before</label>
                <input
                  type="date"
                  value={tempFilters.due_date_before || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, due_date_before: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Cumulative Balance Range */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Cumulative Balance (KSh)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Minimum</label>
                <input
                  type="number"
                  value={tempFilters.cumulative_min || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, cumulative_min: e.target.value || undefined }))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Maximum</label>
                <input
                  type="number"
                  value={tempFilters.cumulative_max || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, cumulative_max: e.target.value || undefined }))}
                  placeholder="1000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                resetFilters();
                setIsFilterModalOpen(false);
              }}
            >
              <X size={16} className="mr-2" />
              Reset All
            </Button>
            <Button onClick={applyAdvancedFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}