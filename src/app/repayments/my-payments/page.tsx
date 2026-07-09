// app/payments/my-payments/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api';
import { 
  CreditCard, Calendar, Clock, DollarSign, TrendingUp,
  Eye, RefreshCw, Wallet, CheckCircle, AlertCircle,
  TrendingDown, Receipt, Users, Copy, ExternalLink,
  BarChart3, PieChart, Activity, Filter, X,
  Phone, User, Hash, FileText, Printer, Share2,
  Link as LinkIcon, Download, Loader2, Building2,
  ChevronDown, ChevronUp, ArrowUpDown, FileSpreadsheet,
  Search
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
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

interface MyPaymentsResponse {
  summary: {
    total_collected: number;
    total_transactions: number;
    reconciled_amount: number;
    pre_payment_amount: number;
    discount_amount: number;
    average_payment: number;
    collection_rate: number;
    assigned_balance: number;
    assigned_loans: number;
  };
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: RepaymentRecord[];
}

interface PaymentDetail extends RepaymentRecord {
  posted_date: string | null;
  created_date: string | null;
  is_early_repay: boolean;
  is_pre_payment: boolean;
  transaction_type_code: string;
  extra_reason: string;
  transaction_files: string;
  user_name: string;
  user_id: string;
  discount_tracking_amount: number;
  discount_maintenance_amount: number;
  discount_interest_amount: number;
  discount_penalty_amount: number;
  discount_other_amount: number;
  raw_records_preview: {
    count: number;
    preview: any;
  } | null;
  main_loan_details: {
    id: string;
    loan_id: string;
    customer_name: string;
    phone_number: string;
    total_outstanding: number;
    current_assigned_officer: string | null;
  } | null;
  repayment_summary: {
    payment_efficiency: number;
    amount_received: number;
    amount_posted: number;
    difference: number;
    is_fully_posted: boolean;
  };
}

interface PaymentTrend {
  date: string;
  amount: number;
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
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function MyPaymentsPage() {
  const router = useRouter();
  const [data, setData] = useState<MyPaymentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [trendData, setTrendData] = useState<PaymentTrend[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    page_size: 20,
    ordering: '-transaction_date',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
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
    fetchMyPayments();
    fetchPaymentTrend();
    fetchSummaryStats();
  }, [
    filters.page, filters.page_size, filters.start_date, filters.end_date,
    filters.payment_type, filters.is_recorded, filters.loan_id,
    filters.customer_name, filters.phone_number, filters.registration_number,
    filters.officer_id, filters.officer_username,
    filters.amount_min, filters.amount_max, filters.ordering
  ]);

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

  const fetchMyPayments = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const queryParams = buildQueryParams();
      const response = await client.get<MyPaymentsResponse>(
        `/repayments/my_payments/?${queryParams.toString()}`
      );
      setData(response.data);
    } catch (error) {
      console.error('Error fetching my payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentTrend = async () => {
    try {
      const client = apiClient.getClient();
      const queryParams = new URLSearchParams();
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);
      
      const response = await client.get<PaymentTrend[]>(
        `/repayments/my_payments_trend/?${queryParams.toString()}`
      );
      setTrendData(response.data);
    } catch (error) {
      console.error('Error fetching payment trend:', error);
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

  const fetchPaymentDetail = async (paymentId: string) => {
    setIsLoadingPayment(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get<PaymentDetail>(`/repayments/${paymentId}/`);
      setSelectedPayment(response.data);
      setIsPaymentModalOpen(true);
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const handleViewPayment = (paymentId: string) => {
    fetchPaymentDetail(paymentId);
  };

  const handleViewLoan = (loanId: string) => {
    router.push(`/loans/${loanId}`);
  };

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20,
      ordering: '-transaction_date',
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize: number) => {
    setFilters(prev => ({ ...prev, page_size: newSize, page: 1 }));
  };

  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined || value === null) return 'KES 0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `KES ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCompactCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'KES 0';
    if (value >= 1000000) {
      return `KES ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `KES ${(value / 1000).toFixed(1)}K`;
    }
    return `KES ${value.toFixed(0)}`;
  };

  const parseAmount = (value: string): number => {
    return parseFloat(value) || 0;
  };

  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return '0%';
    return `${value.toFixed(1)}%`;
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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

  // Prepare data for pie chart
  const getPieChartData = () => {
    if (!summaryStats) return [];
    
    const typeMap = new Map();
    summaryStats.breakdown_by_type.forEach(item => {
      const key = item.payment_type;
      if (!typeMap.has(key)) {
        typeMap.set(key, { name: key, value: 0, count: 0 });
      }
      const existing = typeMap.get(key);
      existing.value += item.total;
      existing.count += item.count;
    });
    
    return Array.from(typeMap.values());
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
      link.setAttribute('download', `my_payments_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Wallet className="h-8 w-8 text-blue-600" />
            My Collections
          </h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <span>Track payments you've collected from assigned loans</span>
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
              {data?.count.toLocaleString() || 0} records
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
            onClick={fetchMyPayments}
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

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Collected</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(data.summary.total_collected)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatNumber(data.summary.total_transactions)} transactions
                  </p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Collection Rate</p>
                  <p className={`text-2xl font-bold ${data.summary.collection_rate >= 100 ? 'text-green-600' : data.summary.collection_rate >= 80 ? 'text-blue-600' : data.summary.collection_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {data.summary.collection_rate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Assigned: {formatCurrency(data.summary.assigned_balance)}
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
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
                    {formatCurrency(data.summary.average_payment)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatNumber(data.summary.assigned_loans)} assigned loans
                  </p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Discounts Applied</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(data.summary.discount_amount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pre-payments: {formatCurrency(data.summary.pre_payment_amount)}
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 p-3">
                  <TrendingDown className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Statistics Section */}
      {!isSummaryLoading && summaryStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overall Statistics */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-gray-500" />
                Overall Statistics
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Total Repayments</p>
                    <p className="text-xl font-bold">{formatNumber(summaryStats.aggregates.total_repayments)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Collection Efficiency</p>
                    <p className={`text-xl font-bold ${getEfficiencyColor(summaryStats.aggregates.collection_efficiency)}`}>
                      {summaryStats.aggregates.collection_efficiency.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Total Received</p>
                    <p className="text-lg font-semibold">{formatCurrency(summaryStats.aggregates.total_amount_received)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Posted</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(summaryStats.aggregates.total_amount_posted)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">Avg</p>
                    <p className="text-sm font-medium">{formatCurrency(summaryStats.aggregates.average_amount)}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">Max</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(summaryStats.aggregates.max_amount)}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">Min</p>
                    <p className="text-sm font-medium text-orange-600">{formatCurrency(summaryStats.aggregates.min_amount)}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  Period: {filters.start_date || summaryStats.date_range.start || 'All time'} - {filters.end_date || summaryStats.date_range.end || 'All time'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Type Distribution */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PieChart size={20} className="text-gray-500" />
                Payment Type Distribution
              </h2>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {summaryStats.breakdown_by_type.map((item, index) => (
                  <div key={item.payment_type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-gray-600 capitalize">{item.payment_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex space-x-3">
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                      <span className="text-gray-500 text-xs">({item.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Trend Chart */}
          {summaryStats.daily_trend.length > 0 && (
            <Card className="lg:col-span-2 border-0 shadow-sm">
              <CardHeader className="pb-3">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity size={20} className="text-gray-500" />
                  Daily Payment Trend
                </h2>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summaryStats.daily_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: any, name: string) => {
                          if (name === 'Amount') return formatCurrency(value);
                          return `${value} transactions`;
                        }}
                        contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="total"
                        name="Amount"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.2}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="count"
                        name="Transactions"
                        fill="#82ca9d"
                        radius={[4, 4, 0, 0]}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* My Payment Trend Chart */}
      {trendData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-gray-500" />
              My Collection Trend
            </h2>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
              <h2 className="text-lg font-semibold text-gray-900">My Recent Collections</h2>
              <div className="text-sm text-gray-500">
                {data && data.count > 0 ? (
                  <>
                    Showing {(filters.page - 1) * filters.page_size + 1} - {Math.min(filters.page * filters.page_size, data.count)} of {data.count.toLocaleString()}
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
              <div className="text-gray-600">Loading your collections...</div>
            </div>
          ) : data && data.results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-gray-400 mb-2">
                <Receipt size={48} className="mx-auto" />
              </div>
              <div className="text-gray-600 font-medium">No collections found</div>
              <div className="text-sm text-gray-400 mt-1">Try adjusting your filters or date range</div>
            </div>
          ) : (
            <GenericTable
              data={data?.results || []}
              columns={columns}
              rowKey={(row: RepaymentRecord) => row.id}
              selectionMode="none"
              virtualized={true}
              pagination={{
                totalCount: data?.count || 0,
                currentPage: filters.page,
                pageSize: filters.page_size,
                onPageChange: handlePageChange,
                onPageSizeChange: handlePageSizeChange,
                hasNextPage: data ? filters.page * filters.page_size < data.count : false,
                hasPreviousPage: filters.page > 1,
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
            <span>Filter My Collections</span>
            {activeFilterCount > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>
        }
        size="lg"
        closeOnBackdropClick={true}
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

      {/* Payment Details Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPayment(null);
        }}
        title="Payment Details"
        size="xl"
        isLoading={isLoadingPayment}
        closeOnBackdropClick={true}
      >
        {selectedPayment && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Status Banner */}
            <div className={`p-4 rounded-lg flex items-center justify-between ${
              selectedPayment.status === 1 ? 'bg-green-50 border border-green-200' :
              selectedPayment.status === 2 ? 'bg-yellow-50 border border-yellow-200' :
              selectedPayment.status === 3 ? 'bg-red-50 border border-red-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center space-x-3">
                {selectedPayment.status === 1 ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                 selectedPayment.status === 2 ? <AlertCircle className="h-5 w-5 text-yellow-600" /> :
                 selectedPayment.status === 3 ? <AlertCircle className="h-5 w-5 text-red-600" /> :
                 <Clock className="h-5 w-5 text-gray-600" />}
                <div>
                  <p className="font-medium">
                    Status: {selectedPayment.status_display}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedPayment.status === 1 ? 'Payment completed successfully' :
                     selectedPayment.status === 2 ? 'Partial payment recorded' :
                     selectedPayment.status === 3 ? 'Payment failed' :
                     'Payment pending processing'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Payment Type</p>
                <span className={`px-3 py-1 text-sm rounded-full ${getPaymentTypeColor(selectedPayment.payment_type)}`}>
                  {selectedPayment.payment_type_display}
                </span>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column - Payment Details (2/3) */}
              <div className="lg:col-span-2 space-y-4">
                {/* Amount Card */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <h3 className="text-base font-semibold">Amount Details</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Amount Posted</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(selectedPayment.amount_posted)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Amount Received</p>
                        <p className="text-xl font-semibold">{formatCurrency(selectedPayment.amount_received)}</p>
                      </div>
                      {parseFloat(selectedPayment.amount_remained) > 0 && (
                        <div className="bg-yellow-50 p-3 rounded-lg col-span-2">
                          <p className="text-xs text-yellow-600 mb-1">Remaining Amount</p>
                          <p className="text-xl font-semibold text-yellow-600">{formatCurrency(selectedPayment.amount_remained)}</p>
                        </div>
                      )}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Net Payment</p>
                        <p className="text-xl font-semibold">{formatCurrency(selectedPayment.net_payment)}</p>
                      </div>
                    </div>
                    
                    {selectedPayment.repayment_summary && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Payment Efficiency</span>
                          <span className={`font-medium ${getEfficiencyColor(selectedPayment.repayment_summary.payment_efficiency)}`}>
                            {selectedPayment.repayment_summary.payment_efficiency.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${
                              selectedPayment.repayment_summary.payment_efficiency >= 90 ? 'bg-green-600' :
                              selectedPayment.repayment_summary.payment_efficiency >= 50 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(selectedPayment.repayment_summary.payment_efficiency, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Transaction Details */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <h3 className="text-base font-semibold">Transaction Details</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Transaction Date</p>
                        <p className="font-medium text-sm">{formatDateTime(selectedPayment.transaction_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Posted Date</p>
                        <p className="font-medium text-sm">{selectedPayment.posted_date ? formatDateTime(selectedPayment.posted_date) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Transaction Type</p>
                        <p className="font-medium text-sm">{selectedPayment.transaction_type_display}</p>
                        {selectedPayment.transaction_type_code && (
                          <p className="text-xs text-gray-500">{selectedPayment.transaction_type_code}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Payment Method</p>
                        <p className="font-medium text-sm">{selectedPayment.transaction_type_display}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Payment ID</p>
                        <div className="flex items-center space-x-1">
                          <p className="font-mono text-sm">{selectedPayment.payment_id || 'N/A'}</p>
                          {selectedPayment.payment_id && (
                            <button
                              onClick={() => handleCopyId(selectedPayment.payment_id)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy Payment ID"
                            >
                              <Copy size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Repayment ID</p>
                        <div className="flex items-center space-x-1">
                          <p className="font-mono text-sm">{selectedPayment.repayment_id}</p>
                          <button
                            onClick={() => handleCopyId(selectedPayment.repayment_id)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy Repayment ID"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {selectedPayment.extra_reason && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-600">Extra Reason</p>
                        <p className="text-sm bg-gray-50 p-3 rounded mt-1">{selectedPayment.extra_reason}</p>
                      </div>
                    )}

                    {selectedPayment.transaction_files && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-600">Transaction Files</p>
                        <a 
                          href={selectedPayment.transaction_files}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center mt-1"
                        >
                          <FileText size={16} className="mr-2" />
                          View Attachment
                          <ExternalLink size={14} className="ml-1" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Discount Details (if applicable) */}
                {selectedPayment.is_discount && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <h3 className="text-base font-semibold text-purple-600">Discount Breakdown</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tracking Amount</span>
                          <span className="font-medium">{formatCurrency(selectedPayment.discount_tracking_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Maintenance Amount</span>
                          <span className="font-medium">{formatCurrency(selectedPayment.discount_maintenance_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Interest Amount</span>
                          <span className="font-medium">{formatCurrency(selectedPayment.discount_interest_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Penalty Amount</span>
                          <span className="font-medium">{formatCurrency(selectedPayment.discount_penalty_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                          <span className="font-medium">Total Discount</span>
                          <span className="font-bold text-purple-600">{formatCurrency(selectedPayment.net_payment)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Customer & Loan Info (1/3) */}
              <div className="space-y-4">
                {/* Customer Information */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <User size={16} className="text-gray-500" />
                      Customer
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600">Name</p>
                      <p className="font-medium text-sm">{selectedPayment.customer_name || 'N/A'}</p>
                    </div>

                    {selectedPayment.phone_numbers && selectedPayment.phone_numbers.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600">Phone Numbers</p>
                        {selectedPayment.phone_numbers.map((phone, index) => (
                          <p key={index} className="font-medium text-sm flex items-center gap-1">
                            <Phone size={14} className="text-gray-400" />
                            {phone}
                          </p>
                        ))}
                      </div>
                    )}

                    {selectedPayment.registration_numbers && selectedPayment.registration_numbers.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600">Registration Numbers</p>
                        {selectedPayment.registration_numbers.map((reg, index) => (
                          <p key={index} className="font-mono text-sm">{reg}</p>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600">Case Info</p>
                      <p className="font-medium text-sm">{selectedPayment.case_prefix || 'N/A'} - #{selectedPayment.case_id}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Loan Information */}
                {selectedPayment.main_loan_details ? (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <Building2 size={16} className="text-gray-500" />
                        Associated Loan
                      </h3>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600">Loan ID</p>
                        <Link 
                          href={`/loans/${selectedPayment.main_loan_details.loan_id}`}
                          target="_blank"
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                        >
                          {selectedPayment.main_loan_details.loan_id}
                          <ExternalLink size={14} className="ml-1" />
                        </Link>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Outstanding Balance</p>
                        <p className="font-medium text-sm text-orange-600">
                          {formatCurrency(selectedPayment.main_loan_details.total_outstanding)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Assigned Officer</p>
                        <p className="font-medium text-sm">{selectedPayment.main_loan_details.current_assigned_officer || 'Unassigned'}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="py-4">
                      <p className="text-gray-500 text-sm text-center">No linked loan found</p>
                    </CardContent>
                  </Card>
                )}

                {/* Timestamps */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Clock size={16} className="text-gray-500" />
                      Timeline
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">First Seen</p>
                      <p className="text-sm">{formatDateTime(selectedPayment.first_seen_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Updated</p>
                      <p className="text-sm">{formatDateTime(selectedPayment.last_updated_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Synced</p>
                      <p className="text-sm">{formatDateTime(selectedPayment.sync_date)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Raw Records (if any) */}
                {selectedPayment.raw_records_preview && selectedPayment.raw_records_preview.count > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <FileText size={16} className="text-gray-500" />
                        Raw Records
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">
                        {selectedPayment.raw_records_preview.count} raw record(s) available
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        <FileText size={14} className="mr-2" />
                        View Raw Data
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                handleViewLoan(selectedPayment.loan_id);
              }}>
                <ExternalLink size={14} className="mr-2" />
                View Loan
              </Button>
              <Button size="sm" onClick={() => {
                setIsPaymentModalOpen(false);
                setSelectedPayment(null);
              }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}