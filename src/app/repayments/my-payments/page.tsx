// app/payments/my-payments/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
  Link as LinkIcon, Download
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
  results: Array<{
    id: string;
    repayment_id: string;
    loan_id: string;
    payment_id: string;
    customer_name: string;
    phone_numbers: string[];
    amount_posted: string;
    amount_received: string;
    amount_remained: string;
    transaction_date: string;
    payment_type: string;
    payment_type_display: string;
    is_recorded: number;
    is_discount: boolean;
    status_display: string;
    case_prefix: string;
    case_id: number;
    formatted_amount: string;
  }>;
}

interface PaymentDetail {
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
  transaction_date: string;
  posted_date: string | null;
  created_date: string | null;
  payment_type: string;
  payment_type_display: string;
  is_recorded: number;
  is_discount: boolean;
  is_early_repay: boolean;
  is_pre_payment: boolean;
  status: number;
  status_display: string;
  transaction_type: number;
  transaction_type_display: string;
  transaction_type_code: string;
  extra_reason: string;
  transaction_files: string;
  user_name: string;
  user_id: string;
  case_prefix: string;
  case_id: number;
  discount_tracking_amount: number;
  discount_maintenance_amount: number;
  discount_interest_amount: number;
  discount_penalty_amount: number;
  discount_other_amount: number;
  payment_success_rate: number;
  formatted_amount: string;
  formatted_date: string;
  first_seen_at: string;
  last_updated_at: string;
  sync_date: string;
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

interface FilterParams {
  start_date?: string;
  end_date?: string;
  payment_type?: string;
  is_recorded?: string;
  loan_id?: string;
  page: number;
  page_size: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const PAYMENT_TYPE_OPTIONS = [
  { value: 'reconciled', label: 'Reconciled Payment' },
  { value: 'pre_payment', label: 'Pre-payment/Unreconciled' },
  { value: 'discount', label: 'Discount Adjustment' },
];

const RECORDED_TYPE_OPTIONS = [
  { value: '1', label: 'Reconciled (isRecorded=1)' },
  { value: '2', label: 'Pre-payment (isRecorded=2)' },
];

export default function MyPaymentsPage() {
  const router = useRouter();
  const [data, setData] = useState<MyPaymentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [trendData, setTrendData] = useState<PaymentTrend[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    page_size: 20,
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchMyPayments();
    fetchPaymentTrend();
    fetchSummaryStats();
  }, [
    page, pageSize, filters.start_date, filters.end_date,
    filters.payment_type, filters.is_recorded, filters.loan_id
  ]);

  const buildQueryParams = () => {
    const queryParams = new URLSearchParams();
    
    if (filters.start_date) queryParams.append('start_date', filters.start_date);
    if (filters.end_date) queryParams.append('end_date', filters.end_date);
    if (filters.payment_type) queryParams.append('payment_type', filters.payment_type);
    if (filters.is_recorded) queryParams.append('is_recorded', filters.is_recorded);
    if (filters.loan_id) queryParams.append('loan_id', filters.loan_id);
    queryParams.append('page', String(page));
    queryParams.append('page_size', String(pageSize));

    return queryParams;
  };

  const buildSummaryQueryParams = () => {
    const queryParams = new URLSearchParams();
    
    if (filters.start_date) queryParams.append('start_date', filters.start_date);
    if (filters.end_date) queryParams.append('end_date', filters.end_date);
    if (filters.payment_type) queryParams.append('payment_type', filters.payment_type);
    if (filters.is_recorded) queryParams.append('is_recorded', filters.is_recorded);
    if (filters.loan_id) queryParams.append('loan_id', filters.loan_id);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20,
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      payment_type: undefined,
      is_recorded: undefined,
      loan_id: undefined,
    });
    setPage(1);
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'reconciled': return 'bg-green-100 text-green-800';
      case 'pre_payment': return 'bg-yellow-100 text-yellow-800';
      case 'discount': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 1: return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 2: return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 0: return <Clock className="h-5 w-5 text-gray-500" />;
      case 3: return <X className="h-5 w-5 text-red-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Prepare data for pie chart
  const getPieChartData = () => {
    if (!summaryStats) return [];
    
    // Group by payment type
    const typeMap = new Map();
    summaryStats.breakdown_by_type.forEach(item => {
      const key = item.payment_type;
      if (!typeMap.has(key)) {
        typeMap.set(key, { name: key, value: 0 });
      }
      typeMap.get(key).value += item.total;
    });
    
    return Array.from(typeMap.values());
  };

  const columns = [
    {
      id: 'transaction_date',
      label: 'Date & Time',
      accessor: (row: any) => row.transaction_date,
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
      label: 'Customer / Loan',
      accessor: (row: any) => row.customer_name,
      Cell: (value: string, row: any) => (
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
    },
    {
      id: 'amount',
      label: 'Amount',
      accessor: (row: any) => parseAmount(row.amount_posted),
      Cell: (value: number, row: any) => (
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
      accessor: (row: any) => row.payment_type,
      Cell: (value: string, row: any) => (
        <div>
          <span className={`px-2 py-1 text-xs rounded-full ${getPaymentTypeColor(value)}`}>
            {row.payment_type_display}
          </span>
          {row.is_discount && (
            <div className="text-xs text-purple-600 mt-1">Discount</div>
          )}
        </div>
      ),
      width: 120,
    },
    {
      id: 'payment_id',
      label: 'Payment ID',
      accessor: (row: any) => row.payment_id,
      Cell: (value: string, row: any) => (
        <div className="flex items-center space-x-1">
          <span className="font-mono text-xs truncate max-w-[80px]" title={value}>
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
      width: 100,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: any) => row,
      Cell: (value: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewPayment(value.id)}
            className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
            title="View payment details"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => handleViewLoan(value.loan_id)}
            className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
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
          <h1 className="text-3xl font-bold text-gray-900">My Collected Payments</h1>
          <p className="text-gray-600 mt-2">Track payments you've collected from assigned loans</p>
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
          <Button variant="outline" onClick={fetchMyPayments}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.payment_type || filters.is_recorded || filters.loan_id) && (
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
          {filters.start_date && filters.end_date && (
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm flex items-center">
              {new Date(filters.start_date).toLocaleDateString()} - {new Date(filters.end_date).toLocaleDateString()}
              <button onClick={() => setFilters(prev => ({ ...prev, start_date: undefined, end_date: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-green-100 p-3 mr-4">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Collected</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.total_collected)}</p>
                  <p className="text-xs text-gray-500">{formatNumber(data.summary.total_transactions)} transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-3 mr-4">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reconciled</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.reconciled_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-yellow-100 p-3 mr-4">
                  <Wallet className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pre-payments</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.pre_payment_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-purple-100 p-3 mr-4">
                  <TrendingDown className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Discounts</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.discount_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-indigo-100 p-3 mr-4">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Collection Rate</p>
                  <p className="text-2xl font-bold">{formatPercent(data.summary.collection_rate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-orange-100 p-3 mr-4">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assigned Loans</p>
                  <p className="text-2xl font-bold">{formatNumber(data.summary.assigned_loans)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-pink-100 p-3 mr-4">
                  <CreditCard className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Payment</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.average_payment)}</p>
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
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Overall Statistics</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Repayments</p>
                    <p className="text-2xl font-bold">{formatNumber(summaryStats.aggregates.total_repayments)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Collection Efficiency</p>
                    <p className="text-2xl font-bold text-green-600">
                      {summaryStats.aggregates.collection_efficiency.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount Received</p>
                    <p className="text-lg font-semibold">{formatCurrency(summaryStats.aggregates.total_amount_received)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount Posted</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(summaryStats.aggregates.total_amount_posted)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Average</p>
                    <p className="font-medium">{formatCurrency(summaryStats.aggregates.average_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Max</p>
                    <p className="font-medium text-green-600">{formatCurrency(summaryStats.aggregates.max_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Min</p>
                    <p className="font-medium text-orange-600">{formatCurrency(summaryStats.aggregates.min_amount)}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  Period: {filters.start_date || summaryStats.date_range.start || 'All time'} - {filters.end_date || summaryStats.date_range.end || 'All time'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Type Distribution */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Payment Type Distribution</h2>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={(entry) => entry.name}
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {summaryStats.breakdown_by_type
                  .filter((item, index, self) => 
                    index === self.findIndex(t => t.payment_type === item.payment_type)
                  )
                  .map((item, index) => (
                  <div key={item.payment_type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-gray-600 capitalize">{item.payment_type}</span>
                    </div>
                    <div className="flex space-x-4">
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                      <span className="text-gray-500">({item.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-xl font-semibold">Daily Payment Trend</h2>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summaryStats.daily_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'total') return formatCurrency(value);
                        return value;
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="total"
                      name="Amount"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="count"
                      name="Transactions"
                      fill="#82ca9d"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Trend Chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">My Payment Trend</h2>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Recent Collections</h2>
            <div className="text-sm text-gray-600">
              {data && (
                <>Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.count)} of {data.count}</>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-600">Loading your payments...</div>
            </div>
          ) : data && (
            <GenericTable
              data={data.results}
              columns={columns}
              rowKey={(row: any) => row.id}
              selectionMode="none"
              virtualized={true}

              pagination={{
                totalCount: data.count,
                currentPage: page,
                pageSize: pageSize,
                onPageChange: (newPage) => setPage(newPage),
                onPageSizeChange: (newSize) => {
                  setPage(1);
                  setPageSize(newSize);
                },
                hasNextPage: page * pageSize < data.count,
                hasPreviousPage: page > 1,
                serverSide: true
              }}
              pageSizeOptions={[20, 50, 100, 500, 1000]} // optional, matches default
            />
          )}
        </CardContent>
      </Card>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter My Payments"
        size="md"
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

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsFilterModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setPage(1);
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
        size="lg"
        isLoading={isLoadingPayment}
      >
        {selectedPayment && (
          <div className="space-y-4">
            {/* Status Banner */}
            <div className={`p-4 rounded-lg flex items-center justify-between ${
              selectedPayment.status === 1 ? 'bg-green-50' :
              selectedPayment.status === 2 ? 'bg-yellow-50' :
              selectedPayment.status === 3 ? 'bg-red-50' :
              'bg-gray-50'
            }`}>
              <div className="flex items-center space-x-3">
                {getStatusIcon(selectedPayment.status)}
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
            <div className="grid grid-cols-3 gap-4">
              {/* Left Column - Payment Details */}
              <div className="col-span-2 space-y-4">
                {/* Amount Card */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Amount Details</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Amount Posted</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedPayment.amount_posted)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Amount Received</p>
                        <p className="text-xl font-semibold">{formatCurrency(selectedPayment.amount_received)}</p>
                      </div>
                      {parseFloat(selectedPayment.amount_remained) > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Remaining Amount</p>
                          <p className="text-xl font-semibold text-yellow-600">{formatCurrency(selectedPayment.amount_remained)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Net Payment</p>
                        <p className="text-xl font-semibold">{formatCurrency(selectedPayment.net_payment)}</p>
                      </div>
                    </div>
                    
                    {selectedPayment.repayment_summary && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Payment Efficiency</span>
                          <span className="font-medium">{selectedPayment.repayment_summary.payment_efficiency.toFixed(1)}%</span>
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
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Transaction Details</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Transaction Date</p>
                          <p className="font-medium">{formatDateTime(selectedPayment.transaction_date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Posted Date</p>
                          <p className="font-medium">{selectedPayment.posted_date ? formatDateTime(selectedPayment.posted_date) : 'N/A'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Transaction Type</p>
                          <p className="font-medium">{selectedPayment.transaction_type_display}</p>
                          <p className="text-xs text-gray-500">{selectedPayment.transaction_type_code}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Payment Method</p>
                          <p className="font-medium">{selectedPayment.transaction_type_display}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Payment ID</p>
                          <div className="flex items-center space-x-2">
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
                          <p className="text-sm text-gray-600">Repayment ID</p>
                          <div className="flex items-center space-x-2">
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
                        <div>
                          <p className="text-sm text-gray-600">Extra Reason</p>
                          <p className="text-sm bg-gray-50 p-3 rounded mt-1">{selectedPayment.extra_reason}</p>
                        </div>
                      )}

                      {selectedPayment.transaction_files && (
                        <div>
                          <p className="text-sm text-gray-600">Transaction Files</p>
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
                    </div>
                  </CardContent>
                </Card>

                {/* Discount Details (if applicable) */}
                {selectedPayment.is_discount && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Discount Breakdown</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tracking Amount</span>
                          <span className="font-medium">{formatCurrency(selectedPayment.discount_tracking_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Maintenance Amount</span>
                          <span className="font-medium">{formatCurrency(selectedPayment.discount_maintenance_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Interest Amount</span>
                          <span className="font-medium">{formatCurrency(selectedPayment.discount_interest_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Penalty Amount</span>
                          <span className="font-medium">{formatCurrency(selectedPayment.discount_penalty_amount)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="font-medium">Total Discount</span>
                          <span className="font-bold text-purple-600">{formatCurrency(selectedPayment.net_payment)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Customer & Loan Info */}
              <div className="space-y-4">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Customer</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium flex items-center">
                          <User size={16} className="mr-2 text-gray-400" />
                          {selectedPayment.customer_name || 'N/A'}
                        </p>
                      </div>

                      {selectedPayment.phone_numbers && selectedPayment.phone_numbers.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600">Phone Numbers</p>
                          {selectedPayment.phone_numbers.map((phone, index) => (
                            <p key={index} className="font-medium flex items-center">
                              <Phone size={16} className="mr-2 text-gray-400" />
                              {phone}
                            </p>
                          ))}
                        </div>
                      )}

                      {selectedPayment.registration_numbers && selectedPayment.registration_numbers.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600">Registration Numbers</p>
                          {selectedPayment.registration_numbers.map((reg, index) => (
                            <p key={index} className="font-mono text-sm">
                              {reg}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-sm text-gray-600">Case Info</p>
                        <p className="font-medium">{selectedPayment.case_prefix || 'N/A'} - {selectedPayment.case_id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Loan Information */}
                {selectedPayment.main_loan_details ? (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Associated Loan</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Loan ID</p>
                          <Link 
                            href={`/loans/${selectedPayment.main_loan_details.loan_id}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                          >
                            {selectedPayment.main_loan_details.loan_id}
                            <ExternalLink size={14} className="ml-1" />
                          </Link>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Outstanding Balance</p>
                          <p className="font-medium text-orange-600">
                            {formatCurrency(selectedPayment.main_loan_details.total_outstanding)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Assigned Officer</p>
                          <p className="font-medium">{selectedPayment.main_loan_details.current_assigned_officer || 'Unassigned'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-gray-500 text-center">No linked loan found</p>
                    </CardContent>
                  </Card>
                )}

                {/* Timestamps */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Timeline</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
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
                    </div>
                  </CardContent>
                </Card>

                {/* Raw Records (if any) */}
                {selectedPayment.raw_records_preview && selectedPayment.raw_records_preview.count > 0 && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Raw Records</h3>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">
                        {selectedPayment.raw_records_preview.count} raw record(s) available
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        <FileText size={16} className="mr-2" />
                        View Raw Data
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer size={16} className="mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={() => {
                handleViewLoan(selectedPayment.loan_id);
              }}>
                <ExternalLink size={16} className="mr-2" />
                View Loan
              </Button>
              <Button onClick={() => {
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