// app/payment-reminders/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api';
import { 
  Bell, Calendar, Clock, DollarSign, Filter, 
  Search, RefreshCw, Eye, CheckCircle, XCircle,
  AlertCircle, User, Phone, Mail, Edit, Trash2,
  ChevronLeft, ChevronRight, Download, AlertTriangle,
  CheckSquare, X, Save, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import GenericTable from '@/components/ui/cTable';
import PaymentReminderDetailsModal from '@/components/payment-reminders/PaymentReminderDetailsModal';
import MarkPaidModal from '@/components/payment-reminders/MarkPaidModal';
import RescheduleModal from '@/components/payment-reminders/RescheduleModal';
import { usePermissions } from '@/context/permission-context'; // <-- ADDED

interface PaymentReminder {
  id: string;
  call_log: string;
  main_loan: string;
  installment: string | null;
  officer: number;
  officer_name: string;
  promised_amount: string;
  promised_date: string;
  payment_method: string;
  payment_method_display: string;
  payment_reference: string | null;
  status: 'pending' | 'paid' | 'cancelled' | 'rescheduled' | 'overdue';
  status_display: string;
  days_until_due: number;
  is_overdue: boolean;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  follow_up_call_required: boolean;
  actual_payment_date: string | null;
  actual_paid_amount: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FilterParams {
  status?: string;
  loan_id?: string;
  start_date?: string;
  end_date?: string;
  officer_id?: string;
  page: number;
  page_size: number;
}

interface PendingRemindersResponse {
  total_pending: number;
  total_promised_amount: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: PaymentReminder[];
}

interface OverdueRemindersResponse {
  total_overdue: number;
  total_overdue_amount: number;
  reminders: PaymentReminder[];
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
  { value: 'rescheduled', label: 'Rescheduled', color: 'bg-blue-100 text-blue-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
];

const PAYMENT_METHODS = [
  { value: 'mpesa', label: 'M-PESA' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function PaymentRemindersPage() {
  const router = useRouter();
  const { hasAccess } = usePermissions(); // <-- ADDED

  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [pendingData, setPendingData] = useState<PendingRemindersResponse | null>(null);
  const [overdueData, setOverdueData] = useState<OverdueRemindersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<PaymentReminder | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    promised_amount: '',
    promised_date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    page_size: 20,
    status: 'pending',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  // Permission shortcuts
  const canView = hasAccess('view_paymentreminder');
  const canChange = hasAccess('change_paymentreminder');
  const canDelete = hasAccess('delete_paymentreminder');

  useEffect(() => {
    fetchReminders();
    fetchPendingStats();
    fetchOverdueStats();
  }, [filters.page, filters.page_size, filters.status, filters.loan_id, filters.start_date, filters.end_date, filters.officer_id]);

  const fetchReminders = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.loan_id) queryParams.append('loan_id', filters.loan_id);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);
      if (filters.officer_id) queryParams.append('officer_id', filters.officer_id);
      queryParams.append('page', String(filters.page));
      queryParams.append('page_size', String(filters.page_size));

      const response = await client.get(`/payment-reminders/?${queryParams.toString()}`);
      setReminders(response.data?.results || []);
      setTotalCount(response.data?.count || 0);
    } catch (error) {
      console.error('Error fetching payment reminders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingStats = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/payment-reminders/pending/?page_size=5');
      setPendingData(response.data);
    } catch (error) {
      console.error('Error fetching pending reminders:', error);
    }
  };

  const fetchOverdueStats = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/payment-reminders/overdue/');
      setOverdueData(response.data);
    } catch (error) {
      console.error('Error fetching overdue reminders:', error);
    }
  };

  const handleViewDetails = async (reminder: PaymentReminder) => {
    if (!canView) return; // Guard
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/payment-reminders/${reminder.id}/`);
      setSelectedReminder(response.data);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching reminder details:', error);
    }
  };

  const handleMarkPaid = (reminder: PaymentReminder) => {
    if (!canChange) return;
    setSelectedReminder(reminder);
    setIsMarkPaidModalOpen(true);
  };

  const handleReschedule = (reminder: PaymentReminder) => {
    if (!canChange) return;
    setSelectedReminder(reminder);
    setIsRescheduleModalOpen(true);
  };

  const handleEdit = (reminder: PaymentReminder) => {
    if (!canChange) return;
    setSelectedReminder(reminder);
    setEditFormData({
      promised_amount: reminder.promised_amount,
      promised_date: reminder.promised_date.split('T')[0],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedReminder) return;
    
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.put(`/payment-reminders/${selectedReminder.id}/`, {
        promised_amount: Number(editFormData.promised_amount),
        promised_date: new Date(editFormData.promised_date).toISOString(),
      });
      
      setIsEditModalOpen(false);
      fetchReminders();
      fetchPendingStats();
      fetchOverdueStats();
    } catch (error) {
      console.error('Error updating reminder:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkNotified = async (reminder: PaymentReminder) => {
    if (!canChange) return;
    try {
      const client = apiClient.getClient();
      await client.post(`/payment-reminders/${reminder.id}/mark_notified/`);
      fetchReminders();
      fetchPendingStats();
      fetchOverdueStats();
    } catch (error) {
      console.error('Error marking reminder as notified:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedReminder || !canDelete) return;
    
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.delete(`/payment-reminders/${selectedReminder.id}/`);
      
      setIsDeleteModalOpen(false);
      setSelectedReminder(null);
      fetchReminders();
      fetchPendingStats();
      fetchOverdueStats();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaidSuccess = () => {
    fetchReminders();
    fetchPendingStats();
    fetchOverdueStats();
  };

  const handleRescheduleSuccess = () => {
    fetchReminders();
    fetchPendingStats();
    fetchOverdueStats();
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20,
      status: 'pending',
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      loan_id: undefined,
      officer_id: undefined,
    });
  };

  const formatCurrency = (value: string) => {
    return `KSh ${parseFloat(value).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      id: 'customer_info',
      label: 'Customer',
      accessor: (row: PaymentReminder) => row.main_loan,
      Cell: (value: string, row: PaymentReminder) => (
        <div>
          {canView ? (
            <button
              onClick={() => handleViewDetails(row)}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              {row.main_loan}
            </button>
          ) : (
            <span className="font-medium">{row.main_loan}</span>
          )}
          <div className="text-xs text-gray-500 mt-1">
            Loan: {row.main_loan.substring(0, 8)}...
          </div>
        </div>
      ),
      width: 180,
      filter: {
        type: 'text' as const,
        placeholder: 'Search loan ID...'
      }
    },
    {
      id: 'promised_amount',
      label: 'Amount',
      accessor: (row: PaymentReminder) => row.promised_amount,
      Cell: (value: string) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
      width: 120,
    },
    {
      id: 'promised_date',
      label: 'Due Date',
      accessor: (row: PaymentReminder) => row.promised_date,
      Cell: (value: string, row: PaymentReminder) => (
        <div>
          <div className={row.is_overdue ? 'text-red-600 font-medium' : ''}>
            {formatDate(value)}
          </div>
          <div className="text-xs text-gray-500">
            {row.days_until_due > 0 
              ? `${row.days_until_due} days left` 
              : row.days_until_due === 0 
                ? 'Due today' 
                : `${Math.abs(row.days_until_due)} days overdue`}
          </div>
        </div>
      ),
      width: 130,
    },
    {
      id: 'payment_method',
      label: 'Method',
      accessor: (row: PaymentReminder) => row.payment_method_display,
      width: 100,
    },
    {
      id: 'officer_name',
      label: 'Officer',
      accessor: (row: PaymentReminder) => row.officer_name,
      width: 120,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: PaymentReminder) => row.status,
      Cell: (value: string, row: PaymentReminder) => (
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}>
          {row.status_display}
          {row.reminder_sent && (
            <span className="ml-1 text-xs" title="Reminder sent">✓</span>
          )}
        </span>
      ),
      width: 100,
      filter: {
        type: 'choices' as const,
        choices: STATUS_OPTIONS.map(opt => opt.value),
        placeholder: 'Filter by status'
      }
    },
    {
      id: 'follow_up',
      label: 'Follow-up',
      accessor: (row: PaymentReminder) => row.follow_up_call_required,
      Cell: (value: boolean) => value ? (
        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
          Required
        </span>
      ) : (
        <span className="text-gray-400 text-xs">No</span>
      ),
      width: 100,
    },
    {
      id: 'created_at',
      label: 'Created',
      accessor: (row: PaymentReminder) => formatDate(row.created_at),
      width: 100,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: PaymentReminder) => row,
      Cell: (value: PaymentReminder) => (
        <div className="flex space-x-2">
          {/* View details – requires view permission */}
          {canView && (
            <button
              onClick={() => handleViewDetails(value)}
              className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
              title="View details"
            >
              <Eye size={16} />
            </button>
          )}
          {/* Change actions – require change permission */}
          {canChange && value.status === 'pending' && (
            <>
              <button
                onClick={() => handleMarkPaid(value)}
                className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
                title="Mark as paid"
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={() => handleReschedule(value)}
                className="text-yellow-600 hover:text-yellow-700 p-1 rounded hover:bg-yellow-50"
                title="Reschedule"
              >
                <Clock size={16} />
              </button>
              <button
                onClick={() => handleEdit(value)}
                className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                title="Edit"
              >
                <Edit size={16} />
              </button>
            </>
          )}
          {canChange && !value.reminder_sent && value.status === 'pending' && (
            <button
              onClick={() => handleMarkNotified(value)}
              className="text-purple-600 hover:text-purple-700 p-1 rounded hover:bg-purple-50"
              title="Mark as notified"
            >
              <Bell size={16} />
            </button>
          )}
          {/* Delete – requires delete permission */}
          {canDelete && (
            <button
              onClick={() => {
                setSelectedReminder(value);
                setIsDeleteModalOpen(true);
              }}
              className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
      width: 150,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Reminders</h1>
          <p className="text-gray-600 mt-2">Track and manage customer payment promises</p>
        </div>
        <div className="flex space-x-3">
          {/* Filter and clear buttons – no permission needed (UI only) */}
          <Button variant="outline" onClick={() => setIsFilterModalOpen(true)}>
            <Filter size={20} className="mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={resetFilters}>
            <X size={20} className="mr-2" />
            Clear
          </Button>
          <Button variant="outline" onClick={() => {
            fetchReminders();
            fetchPendingStats();
            fetchOverdueStats();
          }}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards – informational, no permission needed */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Reminders</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-yellow-100 p-3 mr-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{pendingData?.total_pending || 0}</p>
                <p className="text-xs text-gray-500">
                  Total: {formatCurrency(String(pendingData?.total_promised_amount || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-red-100 p-3 mr-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold">{overdueData?.total_overdue || 0}</p>
                <p className="text-xs text-gray-500">
                  Amount: {formatCurrency(String(overdueData?.total_overdue_amount || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">
                  {totalCount - (pendingData?.total_pending || 0) - (overdueData?.total_overdue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Reminders Preview */}
        {pendingData && pendingData.results.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent Pending Reminders</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingData.results.slice(0, 3).map((reminder) => (
                  <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{formatCurrency(reminder.promised_amount)}</p>
                      <p className="text-xs text-gray-500">Due: {formatDate(reminder.promised_date)}</p>
                    </div>
                    {canView && (
                      <Button size="sm" variant="outline" onClick={() => handleViewDetails(reminder)}>
                        <Eye size={14} className="mr-2" />
                        View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue Reminders Preview */}
        {overdueData && overdueData.reminders.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-red-600">Overdue Reminders</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, status: 'overdue' }))}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overdueData.reminders.slice(0, 3).map((reminder) => (
                  <div key={reminder.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium">{formatCurrency(reminder.promised_amount)}</p>
                      <p className="text-xs text-red-600">Overdue by {Math.abs(reminder.days_until_due)} days</p>
                    </div>
                    {canView && (
                      <Button size="sm" variant="outline" onClick={() => handleViewDetails(reminder)}>
                        <Eye size={14} className="mr-2" />
                        View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Active Filters Display */}
      {(filters.status || filters.loan_id || filters.officer_id) && (
        <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Active Filters:</span>
          {filters.status && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
              Status: {STATUS_OPTIONS.find(s => s.value === filters.status)?.label || filters.status}
              <button onClick={() => setFilters(prev => ({ ...prev, status: undefined }))} className="ml-2">
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
          {filters.officer_id && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
              Officer: {filters.officer_id}
              <button onClick={() => setFilters(prev => ({ ...prev, officer_id: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
          {(filters.start_date || filters.end_date) && (
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm flex items-center">
              {filters.start_date} to {filters.end_date}
              <button onClick={() => setFilters(prev => ({ ...prev, start_date: undefined, end_date: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Reminders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Payment Reminders</h2>
            <div className="text-sm text-gray-600">
              Showing {((filters.page - 1) * filters.page_size) + 1} - {Math.min(filters.page * filters.page_size, totalCount)} of {totalCount}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-600">Loading reminders...</div>
            </div>
          ) : (
            <GenericTable
              data={reminders}
              columns={columns}
              rowKey={(row: PaymentReminder) => row.id}
              selectionMode="none"
              virtualized={true}
       

              pagination={{
                totalCount,
                currentPage: filters.page,
                pageSize: filters.page_size,
                onPageChange: handlePageChange,
                onPageSizeChange: (newSize) => {
                  setFilters(prev => ({ ...prev, page_size: newSize, page: 1 }));
                },
                hasNextPage: filters.page * filters.page_size < totalCount,
                hasPreviousPage: filters.page > 1,
                serverSide: true
              }}
              pageSizeOptions={[20, 50, 100, 500, 1000]} // optional, matches default

            />
          )}
        </CardContent>
      </Card>

      {/* Filter Modal – no permission needed */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Payment Reminders"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(option => (
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
              Officer ID
            </label>
            <input
              type="text"
              value={filters.officer_id || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, officer_id: e.target.value || undefined }))}
              placeholder="Enter officer ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

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

      {/* Details Modal */}
      {selectedReminder && (
        <PaymentReminderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedReminder(null);
          }}
          reminder={selectedReminder}
          onMarkPaid={() => {
            setIsDetailsModalOpen(false);
            handleMarkPaid(selectedReminder);
          }}
          onReschedule={() => {
            setIsDetailsModalOpen(false);
            handleReschedule(selectedReminder);
          }}
          onEdit={() => {
            setIsDetailsModalOpen(false);
            handleEdit(selectedReminder);
          }}
        />
      )}

      {/* Mark Paid Modal */}
      {selectedReminder && (
        <MarkPaidModal
          isOpen={isMarkPaidModalOpen}
          onClose={() => {
            setIsMarkPaidModalOpen(false);
            setSelectedReminder(null);
          }}
          reminder={selectedReminder}
          onSuccess={handleMarkPaidSuccess}
        />
      )}

      {/* Reschedule Modal */}
      {selectedReminder && (
        <RescheduleModal
          isOpen={isRescheduleModalOpen}
          onClose={() => {
            setIsRescheduleModalOpen(false);
            setSelectedReminder(null);
          }}
          reminder={selectedReminder}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedReminder(null);
        }}
        title="Edit Payment Reminder"
        size="sm"
        isLoading={isSubmitting}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Promised Amount (KSh)
            </label>
            <input
              type="number"
              value={editFormData.promised_amount}
              onChange={(e) => setEditFormData(prev => ({ ...prev, promised_amount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Promised Date
            </label>
            <input
              type="date"
              value={editFormData.promised_date}
              onChange={(e) => setEditFormData(prev => ({ ...prev, promised_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              <Save size={16} className="mr-2" />
              Update
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedReminder(null);
        }}
        title="Delete Payment Reminder"
        size="sm"
        isLoading={isSubmitting}
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Reminder</h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete this payment reminder? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}