// app/payments/all/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  User, Phone, Hash, Building2, ChevronDown,
  ChevronUp, Users, PieChart, BarChart3,
  ArrowUpDown, Loader2, FileSpreadsheet, Printer
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import Link from 'next/link';

interface OfficerInfo {
  id: number;
  username: string;
  name: string;
}

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
  transaction_officer_id: number | null;
  transaction_officer_username: string | null;
  transaction_officer_name: string | null;
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
  officer_id?: number;
  officer_username?: string;
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
  active_filters: Record<string, any>;
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
  breakdown_by_officer: Array<{
    officer_id: number;
    officer_username: string;
    officer_name: string;
    count: number;
    total: number;
  }>;
  daily_trend: Array<{
    day: string;
    count: number;
    total: number;
  }>;
  filtered_count: number;
}

const PAYMENT_TYPE_OPTIONS = [
  { value: 'reconciled', label: 'Reconciled Payment', color: 'bg-green-100 text-green-800' },
  { value: 'pre_payment', label: 'Pre-payment/Unreconciled', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'discount', label: 'Discount Adjustment', color: 'bg-purple-100 text-purple-800' },
  { value: 'mixed', label: 'Mixed Type', color: 'bg-blue-100 text-blue-800' },
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
  { value: '-amount_received', label: 'Highest Received' },
  { value: 'amount_received', label: 'Lowest Received' },
  { value: '-first_seen_at', label: 'Recently Added' },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 500];

export default function AllPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<RepaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    currentPage: 1,
    pageSize: 20
  });
  
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    page_size: 20,
    ordering: '-transaction_date'
  });

  // Count active filters
  useEffect(() => {
    const count = Object.keys(filters).filter(key => {
      const value = filters[key as keyof FilterParams];
      return value !== undefined && value !== null && value !== '' && 
             !['page', 'page_size', 'ordering'].includes(key);
    }).length;
    setActiveFilterCount(count);
  }, [filters]);

  // Fetch data when filters change
  useEffect(() => {
    fetchPayments();
    fetchSummaryStats();
  }, [
    filters.page, filters.page_size, filters.start_date, filters.end_date,
    filters.payment_type, filters.is_recorded, filters.loan_id,
    filters.customer_name, filters.phone_number, filters.registration_number,
    filters.officer_id, filters.officer_username,
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
      const queryParams = buildSummaryQueryParams();
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
    if (filters.officer_id) queryParams.append('officer_id', String(filters.officer_id));
    if (filters.officer_username) queryParams.append('officer_username', filters.officer_username);
    if (filters.amount_min) queryParams.append('amount_min', String(filters.amount_min));
    if (filters.amount_max) queryParams.append('amount_max', String(filters.amount_max));
    if (filters.ordering) queryParams.append('ordering', filters.ordering);
    queryParams.append('page', String(filters.page));
    queryParams.append('page_size', String(filters.page_size));

    return queryParams;
  };

  const buildSummaryQueryParams = () => {
    const queryParams = new URLSearchParams();
    
    if (filters.start_date) queryParams.append('start_date', filters.start_date);
    if (filters.end_date) queryParams.append('end_date', filters.end_date);
    if (filters.payment_type) queryParams.append('payment_type', filters.payment_type);
    if (filters.is_recorded) queryParams.append('is_recorded', filters.is_recorded);
    if (filters.loan_id) queryParams.append('loan_id', filters.loan_id);
    if (filters.customer_name) queryParams.append('customer_name', filters.customer_name);
    if (filters.phone_number) queryParams.append('phone_number', filters.phone_number);
    if (filters.registration_number) queryParams.append('registration_number', filters.registration_number);
    if (filters.officer_id) queryParams.append('officer_id', String(filters.officer_id));
    if (filters.officer_username) queryParams.append('officer_username', filters.officer_username);
    if (filters.amount_min) queryParams.append('amount_min', String(filters.amount_min));
    if (filters.amount_max) queryParams.append('amount_max', String(filters.amount_max));

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
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize: number) => {
    setFilters(prev => ({ ...prev, page_size: newSize, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20,
      ordering: '-transaction_date',
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
    const option = PAYMENT_TYPE_OPTIONS.find(o => o.value === type);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 0: return 'bg-gray-100 text-gray-800';
      case 3: return 'bg-red-100 text-red-800';
      case 4: return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEfficiencyColor = (rate: number) => {
    if (rate >= 100) return 'text-green-600';
    if (rate >= 80) return 'text-blue-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-KE', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-KE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const columns = useMemo(() => [
    {
      id: 'transaction_date',
      label: 'Date & Time',
      accessor: (row: RepaymentRecord) => row.transaction_date,
      Cell: (value: string) => (
        <div className="min-w-[120px]">
          <div className="font-medium text-sm">{formatDate(value)}</div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={12} />
            {formatTime(value)}
          </div>
        </div>
      ),
      width: 150,
    },
    {
      id: 'customer_info',
      label: 'Customer',
      accessor: (row: RepaymentRecord) => row.customer_name,
      Cell: (value: string, row: RepaymentRecord) => (
        <div className="min-w-[200px]">
          <div className="font-medium text-sm truncate" title={value || 'Unknown'}>
            {value || 'Unknown'}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Hash size={10} />
              <span className="font-mono truncate max-w-[100px]" title={row.loan_id}>
                {row.loan_id}
              </span>
            </span>
            {row.phone_numbers && row.phone_numbers.length > 0 && (
              <span className="flex items-center gap-1">
                <Phone size={10} />
                {row.phone_numbers[0]}
              </span>
            )}
          </div>
        </div>
      ),
      width: 220,
    },
    {
      id: 'amount_received',
      label: 'Amount Received',
      accessor: (row: RepaymentRecord) => parseAmount(row.amount_received),
      Cell: (value: number, row: RepaymentRecord) => (
        <div className="min-w-[120px] text-right">
          <div className="font-semibold text-blue-600">
            {formatCurrency(row.amount_received)}
          </div>
        </div>
      ),
      width: 140,
    },
    {
      id: 'amount_posted',
      label: 'Amount Posted',
      accessor: (row: RepaymentRecord) => parseAmount(row.amount_posted),
      Cell: (value: number, row: RepaymentRecord) => (
        <div className="min-w-[120px] text-right">
          <div className="font-bold text-green-600">
            {formatCurrency(row.amount_posted)}
          </div>
          {parseAmount(row.amount_remained) > 0 && (
            <div className="text-xs text-yellow-600">
              Remaining: {formatCurrency(row.amount_remained)}
            </div>
          )}
        </div>
      ),
      width: 140,
    },
    {
      id: 'efficiency',
      label: 'Efficiency',
      accessor: (row: RepaymentRecord) => row.payment_success_rate,
      Cell: (value: number) => (
        <div className="min-w-[80px]">
          <div className={`font-semibold ${getEfficiencyColor(value)}`}>
            {value.toFixed(1)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div 
              className={`h-1.5 rounded-full ${value >= 100 ? 'bg-green-500' : value >= 80 ? 'bg-blue-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
        </div>
      ),
      width: 100,
    },
    {
      id: 'payment_type',
      label: 'Type',
      accessor: (row: RepaymentRecord) => row.payment_type,
      Cell: (value: string, row: RepaymentRecord) => (
        <div className="min-w-[130px]">
          <span className={`px-2 py-1 text-xs rounded-full ${getPaymentTypeColor(value)}`}>
            {row.payment_type_display}
          </span>
          {row.is_discount && (
            <div className="text-xs text-purple-600 mt-0.5">Discount Applied</div>
          )}
        </div>
      ),
      width: 150,
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
      id: 'officer',
      label: 'Officer',
      accessor: (row: RepaymentRecord) => row.transaction_officer_name,
      Cell: (value: string | null, row: RepaymentRecord) => (
        <div className="min-w-[120px]">
          {value ? (
            <div>
              <div className="font-medium text-sm truncate" title={value}>
                {value}
              </div>
              <div className="text-xs text-gray-500 truncate" title={row.transaction_officer_username || ''}>
                @{row.transaction_officer_username || 'N/A'}
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Unassigned</span>
          )}
        </div>
      ),
      width: 150,
    },
    {
      id: 'payment_id',
      label: 'Payment ID',
      accessor: (row: RepaymentRecord) => row.payment_id,
      Cell: (value: string, row: RepaymentRecord) => (
        <div className="min-w-[100px] flex items-center gap-1">
          <span className="font-mono text-xs truncate max-w-[80px]" title={value || 'N/A'}>
            {value || 'N/A'}
          </span>
          {value && (
            <button
              onClick={() => handleCopyId(value)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
        <div className="min-w-[80px]">
          <div className="text-sm font-medium">{value || 'N/A'}</div>
          <div className="text-xs text-gray-500">#{row.case_id || 'N/A'}</div>
        </div>
      ),
      width: 100,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: RepaymentRecord) => row,
      Cell: (value: RepaymentRecord) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewPayment(value.id)}
            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
            title="View payment details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleViewLoan(value.loan_id)}
            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all"
            title="View loan"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      ),
      width: 80,
    },
  ], []);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const client = apiClient.getClient();
      const queryParams = buildQueryParams();
      const response = await client.get(`/repayments/export/?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `repayments_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-blue-600" />
            Payment Transactions
          </h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <span>View and filter all loan repayments</span>
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
              {pagination.count.toLocaleString()} records
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsFilterModalOpen(true)}
            className="relative"
          >
            <Filter size={18} className="mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={resetFilters}
            disabled={activeFilterCount === 0}
          >
            <X size={18} className="mr-2" />
            Clear
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchPayments}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 size={18} className="mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet size={18} className="mr-2" />
            )}
            Export
          </Button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      {!isSummaryLoading && summaryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Received</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summaryStats.aggregates.total_amount_received)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatNumber(summaryStats.aggregates.total_repayments)} transactions
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Collection Efficiency</p>
                  <p className={`text-2xl font-bold ${getEfficiencyColor(summaryStats.aggregates.collection_efficiency)}`}>
                    {summaryStats.aggregates.collection_efficiency.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Received: {formatCurrency(summaryStats.aggregates.total_amount_received)}
                  </p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Average Payment</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summaryStats.aggregates.average_amount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Max: {formatCurrency(summaryStats.aggregates.max_amount)}
                  </p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Active Officers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summaryStats.breakdown_by_officer?.length || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {summaryStats.filtered_count.toLocaleString()} filtered records
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 p-3">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Breakdown by Officer */}
      {!isSummaryLoading && summaryStats?.breakdown_by_officer && summaryStats.breakdown_by_officer.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users size={16} className="text-gray-500" />
                Collections by Officer
              </h3>
              <span className="text-xs text-gray-500">
                {summaryStats.breakdown_by_officer.length} officers
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {summaryStats.breakdown_by_officer.map((officer) => (
                <div 
                  key={officer.officer_id}
                  className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => {
                    setFilters(prev => ({ 
                      ...prev, 
                      officer_id: officer.officer_id,
                      page: 1 
                    }));
                  }}
                >
                  <div className="font-medium text-sm truncate" title={officer.officer_name}>
                    {officer.officer_name}
                  </div>
                  <div className="text-xs text-gray-500">@{officer.officer_username}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-600">{officer.count} payments</span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(officer.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
          <span className="text-sm font-medium text-gray-700">Active Filters:</span>
          {filters.start_date && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1 border border-blue-200">
              <Calendar size={12} />
              From: {formatDate(filters.start_date)}
              <button onClick={() => setFilters(prev => ({ ...prev, start_date: undefined }))} className="hover:text-blue-900">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.end_date && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1 border border-blue-200">
              <Calendar size={12} />
              To: {formatDate(filters.end_date)}
              <button onClick={() => setFilters(prev => ({ ...prev, end_date: undefined }))} className="hover:text-blue-900">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.payment_type && (
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm flex items-center gap-1 border border-purple-200">
              {PAYMENT_TYPE_OPTIONS.find(o => o.value === filters.payment_type)?.label || filters.payment_type}
              <button onClick={() => setFilters(prev => ({ ...prev, payment_type: undefined }))} className="hover:text-purple-900">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.is_recorded && (
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm flex items-center gap-1 border border-green-200">
              {filters.is_recorded === '1' ? 'Reconciled' : 'Pre-payment'}
              <button onClick={() => setFilters(prev => ({ ...prev, is_recorded: undefined }))} className="hover:text-green-900">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.loan_id && (
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm flex items-center gap-1 border border-indigo-200">
              <Hash size={12} />
              Loan: {filters.loan_id}
              <button onClick={() => setFilters(prev => ({ ...prev, loan_id: undefined }))} className="hover:text-indigo-900">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.customer_name && (
            <span className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-sm flex items-center gap-1 border border-pink-200">
              <User size={12} />
              Customer: {filters.customer_name}
              <button onClick={() => setFilters(prev => ({ ...prev, customer_name: undefined }))} className="hover:text-pink-900">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.officer_id && summaryStats?.breakdown_by_officer && (
            <span className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-sm flex items-center gap-1 border border-cyan-200">
              <Users size={12} />
              Officer: {summaryStats.breakdown_by_officer.find(o => o.officer_id === filters.officer_id)?.officer_name || filters.officer_id}
              <button onClick={() => setFilters(prev => ({ ...prev, officer_id: undefined, officer_username: undefined }))} className="hover:text-cyan-900">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.amount_min && (
            <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm flex items-center gap-1 border border-yellow-200">
              <DollarSign size={12} />
              Min: {formatCurrency(filters.amount_min)}
              <button onClick={() => setFilters(prev => ({ ...prev, amount_min: undefined }))} className="hover:text-yellow-900">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.amount_max && (
            <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm flex items-center gap-1 border border-yellow-200">
              <DollarSign size={12} />
              Max: {formatCurrency(filters.amount_max)}
              <button onClick={() => setFilters(prev => ({ ...prev, amount_max: undefined }))} className="hover:text-yellow-900">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Payments Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Transaction Records</h2>
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
                onChange={(e) => setFilters(prev => ({ ...prev, ordering: e.target.value, page: 1 }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={filters.page_size}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
              <div className="text-gray-600">Loading payments...</div>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-gray-400 mb-2">
                <Receipt size={48} className="mx-auto" />
              </div>
              <div className="text-gray-600 font-medium">No payments found</div>
              <div className="text-sm text-gray-400 mt-1">Try adjusting your filters</div>
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
                onPageSizeChange: handlePageSizeChange,
                hasNextPage: pagination.next !== null,
                hasPreviousPage: pagination.previous !== null,
                serverSide: true
              }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          )}
        </CardContent>
      </Card>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-blue-600" />
            <span>Filter Payments</span>
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
          {/* Date Range */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              Date Range
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.end_date || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <DollarSign size={16} className="text-gray-500" />
              Amount Range (KES)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Minimum</label>
                <input
                  type="number"
                  value={filters.amount_min || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, amount_min: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="0"
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Maximum</label>
                <input
                  type="number"
                  value={filters.amount_max || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, amount_max: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="1000000"
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Payment Type & Record Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <CreditCard size={16} className="text-gray-500" />
                Payment Type
              </h4>
              <select
                value={filters.payment_type || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, payment_type: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Receipt size={16} className="text-gray-500" />
                Record Type
              </h4>
              <select
                value={filters.is_recorded || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, is_recorded: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">All Records</option>
                {RECORDED_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Fields */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Search size={16} className="text-gray-500" />
              Search
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loan ID</label>
                <input
                  type="text"
                  value={filters.loan_id || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, loan_id: e.target.value || undefined }))}
                  placeholder="Enter loan ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={filters.customer_name || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, customer_name: e.target.value || undefined }))}
                  placeholder="Enter customer name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={filters.phone_number || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, phone_number: e.target.value || undefined }))}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Registration Number</label>
                <input
                  type="text"
                  value={filters.registration_number || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, registration_number: e.target.value || undefined }))}
                  placeholder="Enter registration number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Officer Filter */}
          {summaryStats?.breakdown_by_officer && summaryStats.breakdown_by_officer.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Users size={16} className="text-gray-500" />
                Officer
              </h4>
              <select
                value={filters.officer_id || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const officer = summaryStats.breakdown_by_officer.find(o => o.officer_id === Number(value));
                    setFilters(prev => ({ 
                      ...prev, 
                      officer_id: Number(value),
                      officer_username: officer?.officer_username || undefined
                    }));
                  } else {
                    setFilters(prev => ({ ...prev, officer_id: undefined, officer_username: undefined }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">All Officers</option>
                {summaryStats.breakdown_by_officer.map((officer) => (
                  <option key={officer.officer_id} value={officer.officer_id}>
                    {officer.officer_name} (@{officer.officer_username}) - {officer.count} payments
                  </option>
                ))}
              </select>
            </div>
          )}

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