// app/payments/all/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api';
import { 
  CreditCard, Filter, Search, RefreshCw, Eye,
  Calendar, Clock, DollarSign, Download, X,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  Wallet, Banknote, Receipt, Copy, ExternalLink,
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import Link from 'next/link';

interface RepaymentRecord {
  id: string;
  repayment_id: string;
  loan_id: string;
  payment_id: string;
  customer_name: string;
  phone_numbers: string[];
  registration_numbers: string[];
  amount_received: string;
  amount_posted: string;
  amount_remained: string;
  net_payment: string;
  formatted_amount: string;
  transaction_date: string;
  formatted_date: string;
  posted_date: string | null;
  payment_type: 'reconciled' | 'pre_payment' | 'discount' | 'mixed';
  payment_type_display: string;
  is_recorded: number;
  is_discount: boolean;
  status: number;
  status_display: string;
  transaction_type: number;
  transaction_type_display: string;
  payment_success_rate: number;
  case_prefix: string;
  case_id: number;
  main_loan: string | null;
  first_seen_at: string;
  last_updated_at: string;
  sync_date: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RepaymentRecord[];
}

interface FilterParams {
  start_date?: string;
  end_date?: string;
  payment_type?: string;
  is_recorded?: string;
  loan_id?: string;
  customer_name?: string;
  phone_number?: string;
  registration_number?: string;
  amount_min?: number;
  amount_max?: number;
  page: number;
  page_size: number;
  ordering?: string;
}

interface SummaryStats {
  date_range: {
    start: string;
    end: string;
  };
  aggregates: {
    total_repayments: number;
    total_amount_received: number;
    total_amount_posted: number;
    average_amount: number;
    max_amount: number;
    min_amount: number;
    collection_efficiency: number;
  };
  breakdown_by_type: Array<{
    payment_type: string;
    count: number;
    total: number;
    avg: number;
  }>;
  daily_trend: Array<{
    day: string;
    count: number;
    total: number;
  }>;
}

const PAYMENT_TYPE_OPTIONS = [
  { value: 'reconciled', label: 'Reconciled Payment' },
  { value: 'pre_payment', label: 'Pre-payment/Unreconciled' },
  { value: 'discount', label: 'Discount Adjustment' },
  { value: 'mixed', label: 'Mixed Type' },
];

const RECORDED_TYPE_OPTIONS = [
  { value: '1', label: 'Reconciled (isRecorded=1)' },
  { value: '2', label: 'Pre-payment (isRecorded=2)' },
];

const SORT_OPTIONS = [
  { value: '-transaction_date', label: 'Newest First' },
  { value: 'transaction_date', label: 'Oldest First' },
  { value: '-amount_posted', label: 'Highest Amount' },
  { value: 'amount_posted', label: 'Lowest Amount' },
  { value: '-first_seen_at', label: 'Recently Added' },
];

export default function AllPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<RepaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    currentPage: 1,
    pageSize: 20
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    page_size: 20,
    // start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    // end_date: new Date().toISOString().split('T')[0],
    ordering: '-transaction_date'
  });

  useEffect(() => {
    fetchPayments();
    fetchSummaryStats(); // This will now use the current filters
  }, [
    filters.page, filters.page_size, filters.start_date, filters.end_date,
    filters.payment_type, filters.is_recorded, filters.loan_id,
    filters.customer_name, filters.phone_number, filters.registration_number,
    filters.amount_min, filters.amount_max, filters.ordering
  ]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const queryParams = buildQueryParams();
      const response = await client.get<PaginatedResponse>(`/repayments/?${queryParams.toString()}`);
      
      setPayments(response.data.results || []);
      setPagination({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        currentPage: filters.page,
        pageSize: filters.page_size
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummaryStats = async () => {
    setIsSummaryLoading(true);
    try {
      const client = apiClient.getClient();
      const queryParams = buildSummaryQueryParams(); // Build params for summary endpoint
      const response = await client.get<SummaryStats>(
        `/repayments/summary/?${queryParams.toString()}`
      );
      setSummaryStats(response.data);
    } catch (error) {
      console.error('Error fetching summary stats:', error);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const buildQueryParams = () => {
    const queryParams = new URLSearchParams();
    
    if (filters.start_date) queryParams.append('start_date', filters.start_date);
    if (filters.end_date) queryParams.append('end_date', filters.end_date);
    if (filters.payment_type) queryParams.append('payment_type', filters.payment_type);
    if (filters.is_recorded) queryParams.append('is_recorded', filters.is_recorded);
    if (filters.loan_id) queryParams.append('loan_id', filters.loan_id);
    if (filters.customer_name) queryParams.append('customer_name', filters.customer_name);
    if (filters.phone_number) queryParams.append('phone_number', filters.phone_number);
    if (filters.registration_number) queryParams.append('registration_number', filters.registration_number);
    if (filters.amount_min) queryParams.append('amount_min', String(filters.amount_min));
    if (filters.amount_max) queryParams.append('amount_max', String(filters.amount_max));
    if (filters.ordering) queryParams.append('ordering', filters.ordering);
    queryParams.append('page', String(filters.page));
    queryParams.append('page_size', String(filters.page_size));

    return queryParams;
  };

  const buildSummaryQueryParams = () => {
    const queryParams = new URLSearchParams();
    
    // Only include date filters for summary - other filters might not be supported
    if (filters.start_date) queryParams.append('start_date', filters.start_date);
    if (filters.end_date) queryParams.append('end_date', filters.end_date);
    
    // Optional: Include other filters if the backend supports them
    if (filters.payment_type) queryParams.append('payment_type', filters.payment_type);
    if (filters.is_recorded) queryParams.append('is_recorded', filters.is_recorded);
    if (filters.loan_id) queryParams.append('loan_id', filters.loan_id);

    return queryParams;
  };

  const handleViewPayment = (paymentId: string) => {
    router.push(`/repayments/${paymentId}`);
  };

  const handleViewLoan = (loanId: string) => {
    router.push(`/loans/${loanId}`);
  };

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20,
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      ordering: '-transaction_date',
      payment_type: undefined,
      is_recorded: undefined,
      loan_id: undefined,
      customer_name: undefined,
      phone_number: undefined,
      registration_number: undefined,
      amount_min: undefined,
      amount_max: undefined,
    });
  };

  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined || value === null) return 'KES 0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `KES ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const parseAmount = (value: string): number => {
    return parseFloat(value) || 0;
  };

  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'reconciled': return 'bg-green-100 text-green-800';
      case 'pre_payment': return 'bg-yellow-100 text-yellow-800';
      case 'discount': return 'bg-purple-100 text-purple-800';
      case 'mixed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'bg-green-100 text-green-800'; // Completed
      case 2: return 'bg-yellow-100 text-yellow-800'; // Partial
      case 0: return 'bg-gray-100 text-gray-800'; // Pending
      case 3: return 'bg-red-100 text-red-800'; // Failed
      case 4: return 'bg-orange-100 text-orange-800'; // Reversed
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      id: 'transaction_date',
      label: 'Date & Time',
      accessor: (row: RepaymentRecord) => row.transaction_date,
      Cell: (value: string) => (
        <div>
          <div className="font-medium">{value ? new Date(value).toLocaleDateString() : 'N/A'}</div>
          <div className="text-xs text-gray-500">{value ? new Date(value).toLocaleTimeString() : ''}</div>
        </div>
      ),
      width: 150,
    },
    {
      id: 'customer_name',
      label: 'Customer',
      accessor: (row: RepaymentRecord) => row.customer_name,
      Cell: (value: string, row: RepaymentRecord) => (
        <div>
          <div className="font-medium">{value || 'Unknown'}</div>
          <div className="text-xs text-gray-500 flex items-center space-x-2">
            <span className="truncate max-w-[100px]" title={row.loan_id}>
              Loan: {row.loan_id}
            </span>
            {row.phone_numbers && row.phone_numbers.length > 0 && (
              <span>• {row.phone_numbers[0]}</span>
            )}
          </div>
        </div>
      ),
      width: 220,
      filter: {
        type: 'text' as const,
        placeholder: 'Search customer...'
      }
    },
    {
      id: 'amount_posted',
      label: 'Amount',
      accessor: (row: RepaymentRecord) => parseAmount(row.amount_posted),
      Cell: (value: number, row: RepaymentRecord) => (
        <div>
          <div className="font-bold text-green-600">{formatCurrency(row.amount_posted)}</div>
          <div className="text-xs text-gray-500">
            Received: {formatCurrency(row.amount_received)}
          </div>
          {parseAmount(row.amount_remained) > 0 && (
            <div className="text-xs text-yellow-600">
              Remaining: {formatCurrency(row.amount_remained)}
            </div>
          )}
        </div>
      ),
      width: 180,
    },
    {
      id: 'payment_type',
      label: 'Type',
      accessor: (row: RepaymentRecord) => row.payment_type,
      Cell: (value: string, row: RepaymentRecord) => (
        <div>
          <span className={`px-2 py-1 text-xs rounded-full ${getPaymentTypeColor(value)}`}>
            {row.payment_type_display}
          </span>
          {row.is_discount && (
            <div className="text-xs text-purple-600 mt-1">Discount Applied</div>
          )}
        </div>
      ),
      width: 150,
      filter: {
        type: 'choices' as const,
        choices: PAYMENT_TYPE_OPTIONS.map(o => o.value),
        placeholder: 'Filter by type'
      }
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: RepaymentRecord) => row.status,
      Cell: (value: number, row: RepaymentRecord) => (
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}>
          {row.status_display}
        </span>
      ),
      width: 100,
    },
    {
      id: 'payment_id',
      label: 'Payment ID',
      accessor: (row: RepaymentRecord) => row.payment_id,
      Cell: (value: string, row: RepaymentRecord) => (
        <div className="flex items-center space-x-1">
          <span className="font-mono text-xs truncate max-w-[100px]" title={value}>
            {value || 'N/A'}
          </span>
          {value && (
            <button
              onClick={() => handleCopyId(value)}
              className="text-gray-400 hover:text-gray-600"
              title="Copy Payment ID"
            >
              <Copy size={12} />
            </button>
          )}
        </div>
      ),
      width: 120,
    },
    {
      id: 'case_info',
      label: 'Case',
      accessor: (row: RepaymentRecord) => row.case_prefix,
      Cell: (value: string, row: RepaymentRecord) => (
        <div>
          <div className="text-sm">{value || 'N/A'}</div>
          <div className="text-xs text-gray-500">ID: {row.case_id || 'N/A'}</div>
        </div>
      ),
      width: 100,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: RepaymentRecord) => row,
      Cell: (value: RepaymentRecord) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewPayment(value.id)}
            className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
            title="View payment details"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => handleViewLoan(value.loan_id)}
            className="text-green-600 hover:text-green-700 transition-colors p-1 rounded hover:bg-green-50"
            title="View loan"
          >
            <ExternalLink size={18} />
          </button>
        </div>
      ),
      width: 80,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Payments</h1>
          <p className="text-gray-600 mt-2">View and filter all loan repayments</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setIsFilterModalOpen(true)}>
            <Filter size={20} className="mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={resetFilters}>
            <X size={20} className="mr-2" />
            Clear
          </Button>
          <Button variant="outline" onClick={fetchPayments}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      {!isSummaryLoading && summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-3 mr-4">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Posted</p>
                  <p className="text-2xl font-bold">{formatCurrency(summaryStats.aggregates.total_amount_posted)}</p>
                  <p className="text-xs text-gray-500">{formatNumber(summaryStats.aggregates.total_repayments)} transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-green-100 p-3 mr-4">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Collection Efficiency</p>
                  <p className="text-2xl font-bold">{summaryStats.aggregates.collection_efficiency.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Received: {formatCurrency(summaryStats.aggregates.total_amount_received)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-purple-100 p-3 mr-4">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Payment</p>
                  <p className="text-2xl font-bold">{formatCurrency(summaryStats.aggregates.average_amount)}</p>
                  <p className="text-xs text-gray-500">Max: {formatCurrency(summaryStats.aggregates.max_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-orange-100 p-3 mr-4">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date Range</p>
                  <p className="text-sm font-medium">
                    {filters.start_date || summaryStats.date_range.start || 'All time'}
                  </p>
                  <p className="text-xs text-gray-500">to {filters.end_date || summaryStats.date_range.end || 'All time'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Filters Display */}
      {(filters.payment_type || filters.is_recorded || filters.loan_id || filters.customer_name || filters.phone_number || filters.registration_number || filters.amount_min || filters.amount_max) && (
        <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Active Filters:</span>
          {filters.payment_type && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
              Type: {PAYMENT_TYPE_OPTIONS.find(o => o.value === filters.payment_type)?.label || filters.payment_type}
              <button onClick={() => setFilters(prev => ({ ...prev, payment_type: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.is_recorded && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
              {filters.is_recorded === '1' ? 'Reconciled' : 'Pre-payment'}
              <button onClick={() => setFilters(prev => ({ ...prev, is_recorded: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.loan_id && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center">
              Loan: {filters.loan_id}
              <button onClick={() => setFilters(prev => ({ ...prev, loan_id: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.customer_name && (
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm flex items-center">
              Customer: {filters.customer_name}
              <button onClick={() => setFilters(prev => ({ ...prev, customer_name: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.amount_min && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center">
              Min: {formatCurrency(filters.amount_min)}
              <button onClick={() => setFilters(prev => ({ ...prev, amount_min: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Payment Transactions</h2>
            <div className="flex items-center space-x-4">
              <select
                value={filters.ordering}
                onChange={(e) => setFilters(prev => ({ ...prev, ordering: e.target.value, page: 1 }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <div className="text-sm text-gray-600">
                Showing {pagination.count > 0 ? ((filters.page - 1) * filters.page_size) + 1 : 0} - {Math.min(filters.page * filters.page_size, pagination.count)} of {pagination.count}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-600">Loading payments...</div>
            </div>
          ) : (
            <GenericTable
              data={payments}
              columns={columns}
              rowKey={(row: RepaymentRecord) => row.id}
              selectionMode="none"
              virtualized={true}
              pagination={{
                totalCount: pagination.count,
                currentPage: filters.page,
                pageSize: filters.page_size,
                onPageChange: handlePageChange,
                serverSide: true,
                hasNextPage: pagination.next !== null,
                hasPreviousPage: pagination.previous !== null,
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Payments"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Type
            </label>
            <select
              value={filters.payment_type || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, payment_type: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Types</option>
              {PAYMENT_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Record Type
            </label>
            <select
              value={filters.is_recorded || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, is_recorded: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Records</option>
              {RECORDED_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loan ID
            </label>
            <input
              type="text"
              value={filters.loan_id || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, loan_id: e.target.value || undefined }))}
              placeholder="Enter loan ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              value={filters.customer_name || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, customer_name: e.target.value || undefined }))}
              placeholder="Enter customer name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={filters.phone_number || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, phone_number: e.target.value || undefined }))}
              placeholder="Enter phone number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Number
            </label>
            <input
              type="text"
              value={filters.registration_number || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, registration_number: e.target.value || undefined }))}
              placeholder="Enter registration number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Amount (KES)
              </label>
              <input
                type="number"
                value={filters.amount_min || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, amount_min: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="0"
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Amount (KES)
              </label>
              <input
                type="number"
                value={filters.amount_max || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, amount_max: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="1000000"
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsFilterModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setFilters(prev => ({ ...prev, page: 1 }));
              setIsFilterModalOpen(false);
            }}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}