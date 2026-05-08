// app/loan-processor/assigned/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { AssignedLoan, AssignmentMetrics } from '@/types/index';
import { 
  Search, Filter, UserPlus, Download, RefreshCw,
  Users, DollarSign, TrendingUp, Eye, UserCheck,
  CheckCircle, XCircle, AlertCircle, Calendar,
  UserMinus, History, CheckSquare, ArrowLeftRight
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import BulkReassignModal from '@/components/loans/BulkReassignModal';
import ReassignmentHistoryModal from '@/components/loans/ReassignmentHistoryModal';
import { usePermissions } from '@/context/permission-context';

interface AssignedLoanFilters {
  officer_id?: string;
  officer_username?: string;
  loan_id?: string;
  customer_name?: string;
  phone_number?: string;
  registration_number?: string;
  identity_num?: string;
  status?: string;
  is_active?: boolean;
  is_overdue?: boolean;
  current_month_only?: boolean;
  assigned_only?: boolean;
  unassigned_only?: boolean;
  total_amount_min?: string;
  total_amount_max?: string;
  outstanding_min?: string;
  outstanding_max?: string;
  disburse_date_after?: string;
  disburse_date_before?: string;
  due_date_after?: string;
  due_date_before?: string;
  ordering?: string;
  page: number;
  page_size: number;
  search?: string;
}

interface AssignedLoansResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  assignment_metrics: AssignmentMetrics;
  assigned_loans: AssignedLoan[];
}

export default function AssignedLoansPage() {
  const router = useRouter();
  const { hasAccess } = usePermissions();

  const [data, setData] = useState<AssignedLoansResponse>({
    total_pages: 0,
    page: 0,
    page_size: 0,
    count: 0,
    assignment_metrics: {
      total_assigned_loans: 0,
      total_assigned_cumulative_balance: 0,
      average_assigned_balance: 0
    },
    assigned_loans: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AssignedLoanFilters>({
    page: 1,
    page_size: 400,
    officer_id: undefined,
    officer_username: undefined,
    loan_id: undefined,
    customer_name: undefined,
    phone_number: undefined,
    registration_number: undefined,
    identity_num: undefined,
    status: undefined,
    is_active: undefined,
    is_overdue: undefined,
    current_month_only: false,
    assigned_only: true, // Default to assigned only for this page
    unassigned_only: undefined,
    total_amount_min: undefined,
    total_amount_max: undefined,
    outstanding_min: undefined,
    outstanding_max: undefined,
    disburse_date_after: undefined,
    disburse_date_before: undefined,
    due_date_after: undefined,
    due_date_before: undefined,
    ordering: '-disburse_time',
    search: undefined
  });
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);
  const [isBulkReassignModalOpen, setIsBulkReassignModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedLoanForHistory, setSelectedLoanForHistory] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<AssignedLoanFilters>({ ...filters });

  useEffect(() => {
    fetchAssignedLoans();
  }, [
    filters.page,
    filters.page_size,
    filters.officer_id,
    filters.officer_username,
    filters.loan_id,
    filters.customer_name,
    filters.phone_number,
    filters.registration_number,
    filters.identity_num,
    filters.status,
    filters.is_active,
    filters.is_overdue,
    filters.current_month_only,
    filters.assigned_only,
    filters.unassigned_only,
    filters.total_amount_min,
    filters.total_amount_max,
    filters.outstanding_min,
    filters.outstanding_max,
    filters.disburse_date_after,
    filters.disburse_date_before,
    filters.due_date_after,
    filters.due_date_before,
    filters.ordering,
    filters.search
  ]);

  const fetchAssignedLoans = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const queryParams = new URLSearchParams();
      
      // Add all filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const response = await client.get(`/loan-processor/assigned-loans/?${queryParams.toString()}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching assigned loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AssignedLoanFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 400,
      officer_id: undefined,
      officer_username: undefined,
      loan_id: undefined,
      customer_name: undefined,
      phone_number: undefined,
      registration_number: undefined,
      identity_num: undefined,
      status: undefined,
      is_active: undefined,
      is_overdue: undefined,
      current_month_only: false,
      assigned_only: true,
      unassigned_only: undefined,
      total_amount_min: undefined,
      total_amount_max: undefined,
      outstanding_min: undefined,
      outstanding_max: undefined,
      disburse_date_after: undefined,
      disburse_date_before: undefined,
      due_date_after: undefined,
      due_date_before: undefined,
      ordering: '-disburse_time',
      search: undefined
    });
    setTempFilters({
      page: 1,
      page_size: 400,
      ordering: '-disburse_time',
      current_month_only: false,
      assigned_only: true
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleViewLoanDetails = (loanId: string) => {
    if (hasAccess('can_view_loandetails')) {
      window.open(`/loans/${loanId}`, '_blank');
    }
  };

  const handleReassignLoan = (loanId: string) => {
    if (hasAccess('can_reassign_loans')) {
      setSelectedLoans([loanId]);
      setIsBulkReassignModalOpen(true);
    }
  };

  const handleViewReassignmentHistory = (loanId: string) => {
    setSelectedLoanForHistory(loanId);
    setIsHistoryModalOpen(true);
  };

  const handleBulkReassign = async (
    targetOfficerUsername: string, 
    reason: string, 
    skipErrors: boolean,
    updateInstallments: boolean
  ) => {
    try {
      const client = apiClient.getClient();
      
      // Prepare request payload
      const payload: any = {
        target_officer_username: targetOfficerUsername,
        loan_ids: selectedLoans,
        reason: reason,
        skip_errors: skipErrors,
        update_installments: updateInstallments
      };

      // If all selected loans are from the same current officer, add source filter
      if (selectedLoans.length > 0) {
        const selectedLoanObjects = data.assigned_loans.filter(
          loan => selectedLoans.includes(loan.loan_id)
        );
        
        const uniqueOfficers = new Set(
          selectedLoanObjects.map(loan => loan.current_assigned_officer_details?.username)
        );
        
        if (uniqueOfficers.size === 1 && uniqueOfficers.values().next().value) {
          payload.source_officer_username = uniqueOfficers.values().next().value;
        }
      }
      
      const response = await client.post('/loan-processor/reassign-bulk-loans/', payload);
      
      await fetchAssignedLoans();
      setSelectedLoans([]);
      setIsBulkReassignModalOpen(false);
      
      // Show success message with details
      const summary = response.data.summary;
      alert(
        `Reassignment completed!\n\n` +
        `Successfully reassigned: ${summary.successful_reassignments} loans\n` +
        `Failed: ${summary.failed_reassignments} loans\n` +
        `Already assigned to target: ${summary.already_assigned_to_target} loans\n` +
        `Total cumulative balance reassigned: KSh ${summary.total_cumulative_balance_reassigned?.toLocaleString() || 0}`
      );
    } catch (error) {
      console.error('Error in bulk reassignment:', error);
      alert('Failed to reassign loans. Please try again.');
    }
  };

  const handleSingleReassign = async (
    loanId: string,
    targetOfficerUsername: string,
    reason: string,
    updateInstallments: boolean
  ) => {
    try {
      const client = apiClient.getClient();
      const response = await client.post('/loan-processor/reassign-loan/', {
        loan_id: loanId,
        new_officer_username: targetOfficerUsername,
        reason: reason,
        update_installments: updateInstallments
      });
      
      await fetchAssignedLoans();
      
      // Show success message
      alert(
        `Loan successfully reassigned!\n\n` +
        `From: ${response.data.reassignment_details.previous_officer?.username || 'unassigned'}\n` +
        `To: ${response.data.reassignment_details.new_officer.username}\n` +
        `Installments updated: ${response.data.reassignment_details.installments_updated}`
      );
    } catch (error) {
      console.error('Error in single reassignment:', error);
      alert('Failed to reassign loan. Please try again.');
    }
  };

  const handleSort = (columnId: string) => {
    let ordering = filters.ordering || '';
    
    if (ordering === columnId) {
      ordering = `-${columnId}`;
    } else if (ordering === `-${columnId}`) {
      ordering = '';
    } else {
      ordering = columnId;
    }
    
    handleFilterChange('ordering', ordering || undefined);
  };

  const openFilterModal = () => {
    setTempFilters({ ...filters });
    setIsFilterModalOpen(true);
  };

  const applyAdvancedFilters = () => {
    setFilters({ ...tempFilters, page: 1 });
    setIsFilterModalOpen(false);
  };

  const canReassign = hasAccess('can_reassign_loans');
  const canView = hasAccess('can_view_loandetails');
  const canViewHistory = hasAccess('can_view_assignment_history');

  const columns = [
    {
      id: 'loan_id',
      label: 'Loan ID',
      accessor: (row: AssignedLoan) => row.loan_id,
      Cell: (value: string, row: AssignedLoan) => (
        <button
          onClick={() => handleViewLoanDetails(row.loan_id)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm"
          disabled={!canView}
        >
          {value}
        </button>
      ),
      width: 140,
      sortable: true,
    },
    {
      id: 'customer_name',
      label: 'Customer Name',
      accessor: (row: AssignedLoan) => row.customer_name,
      width: 220,
      sortable: true,
    },
    {
      id: 'phone_number',
      label: 'Phone',
      accessor: (row: AssignedLoan) => row.phone_number,
      width: 120,
    },
    {
      id: 'total_amount',
      label: 'Total Amount',
      accessor: (row: AssignedLoan) => row.total_amount,
      Cell: (value: string) => (
        <span className="font-medium">KSh {parseFloat(value).toLocaleString()}</span>
      ),
      width: 130,
      sortable: true,
    },
    {
      id: 'total_outstanding',
      label: 'Outstanding',
      accessor: (row: AssignedLoan) => row.total_outstanding,
      Cell: (value: string, row: AssignedLoan) => {
        const outstanding = parseFloat(value);
        const total = parseFloat(row.total_amount);
        const percentage = total > 0 ? (outstanding / total) * 100 : 0;
        
        return (
          <div>
            <span className={outstanding > 0 ? 'text-gray-600 font-medium' : 'text-gray-600'}>
              KSh {outstanding.toLocaleString()}
            </span>
            {outstanding > 0 && (
              <span className="text-xs text-gray-500 ml-1">
                ({percentage.toFixed(1)}%)
              </span>
            )}
          </div>
        );
      },
      width: 140,
      sortable: true,
    },
    {
      id: 'due_date',
      label: 'Due Date',
      accessor: (row: AssignedLoan) => row.due_date,
      Cell: (value: string) => {
        const dueDate = new Date(value);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let colorClass = 'text-gray-600';
        if (daysUntilDue < 0) colorClass = 'text-gray-600 font-medium';
        else if (daysUntilDue <= 7) colorClass = 'text-gray-600';
        
        return (
          <div className={colorClass}>
            {dueDate.toLocaleDateString()}
            <span className="text-xs block">
              {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
            </span>
          </div>
        );
      },
      width: 130,
      sortable: true,
    },
    {
      id: 'current_month_installment_due_date',
      label: 'Active Installment Due Date',
      accessor: (row: AssignedLoan) => row.current_month_installment_due_date,
      Cell: (value: string) => {
        const dueDate = new Date(value);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let colorClass = 'text-gray-600';
        if (daysUntilDue < 0) colorClass = 'text-gray-600 font-medium';
        else if (daysUntilDue <= 7) colorClass = 'text-gray-600';
        
        return (
          <div className={colorClass}>
            {dueDate.toLocaleDateString()}
            <span className="text-xs block">
              {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
            </span>
          </div>
        );
      },
      width: 130,
      sortable: true,
    },
    {
      id: 'current_assigned_officer_details',
      label: 'Assigned To',
      accessor: (row: AssignedLoan) => row.current_assigned_officer_details,
      Cell: (value: any) => {
        if (!value) return <span className="text-gray-400">Unknown</span>;
        return (
          <div className="flex items-center">
            <UserCheck size={14} className="text-green-600 mr-1" />
            <span className="font-medium">{value.full_name || value.username}</span>
          </div>
        );
      },
      width: 150,
      sortable: true,
    },
    {
      id: 'assigned_at',
      label: 'Assigned Since',
      accessor: (row: AssignedLoan) => {
        const date = new Date(row.assigned_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return {
          date: date.toLocaleDateString(),
          days: daysDiff
        };
      },
      Cell: (value: any) => (
        <div>
          <div>{value.date}</div>
          <div className="text-xs text-gray-500">{value.days} days</div>
        </div>
      ),
      width: 130,
      sortable: true,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: AssignedLoan) => row.status,
      Cell: (value: number, row: AssignedLoan) => {
        const isOverdue = row.is_overdue_status;
        const hasOutstanding = parseFloat(row.total_outstanding) > 0;
        
        if (hasOutstanding && isOverdue) {
          return (
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center w-fit">
              <AlertCircle size={12} className="mr-1" />
              Overdue
            </span>
          );
        } else if (hasOutstanding) {
          return (
            <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 flex items-center w-fit">
              <Calendar size={12} className="mr-1" />
              Current
            </span>
          );
        } else {
          return (
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center w-fit">
              <CheckCircle size={12} className="mr-1" />
              Paid
            </span>
          );
        }
      },
      width: 100,
      sortable: true,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: AssignedLoan) => row,
      Cell: (value: AssignedLoan) => (
        <div className="flex space-x-2">
          {canView && (
            <button
              onClick={() => handleViewLoanDetails(value.loan_id)}
              className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
              title="View loan details"
            >
              <Eye size={16} />
            </button>
          )}
          
          {canReassign && (
            <button
              onClick={() => handleReassignLoan(value.loan_id)}
              className="text-orange-600 hover:text-orange-700 transition-colors p-1 rounded hover:bg-orange-50"
              title="Reassign loan to another officer"
            >
              <UserMinus size={16} />
            </button>
          )}
          
          {canViewHistory && (
            <button
              onClick={() => handleViewReassignmentHistory(value.loan_id)}
              className="text-purple-600 hover:text-purple-700 transition-colors p-1 rounded hover:bg-purple-50"
              title="View reassignment history"
            >
              <History size={16} />
            </button>
          )}
        </div>
      ),
      width: 120,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assigned Loans</h1>
          <p className="text-gray-600 mt-2">Loans currently assigned to collection officers</p>
        </div>
        <div className="flex space-x-3">
          {canReassign && (
            <Button 
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                if (selectedLoans.length === 0) {
                  alert('Please select at least one loan to reassign');
                  return;
                }
                setIsBulkReassignModalOpen(true);
              }}
              disabled={selectedLoans.length === 0}
            >
              <ArrowLeftRight size={20} className="mr-2" />
              Bulk Reassign ({selectedLoans.length})
            </Button>
          )}
          
          <Button variant="outline" onClick={openFilterModal}>
            <Filter size={20} className="mr-2" />
            Advanced Filters
          </Button>
          
          <Button variant="outline" onClick={fetchAssignedLoans}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Assignment Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assigned</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.assignment_metrics.total_assigned_loans?.toLocaleString() ?? '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-purple-100 p-3 mr-4">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Cumulative Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  KSh {data.assignment_metrics.total_assigned_cumulative_balance?.toLocaleString() ?? '0'}
                </p>
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
                <p className="text-sm font-medium text-gray-600">Average Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  KSh {data.assignment_metrics.average_assigned_balance?.toLocaleString() ?? '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-orange-100 p-3 mr-4">
                <UserCheck className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Officers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(data.assigned_loans.map(l => l.current_assigned_officer_details?.username).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
        <Button
          size="sm"
          onClick={() => handleFilterChange('is_overdue', filters.is_overdue === true ? undefined : true)}
          className={filters.is_overdue === true ? "bg-red-600 hover:bg-red-700 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}
        >
          <AlertCircle size={16} className="mr-1" />
          Overdue Only
        </Button>
        <Button
          size="sm"
          onClick={() => handleFilterChange('current_month_only', !filters.current_month_only)}
          className={filters.current_month_only ? "bg-green-600 hover:bg-green-700 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}
        >
          <Calendar size={16} className="mr-1" />
          Current Month
        </Button>
        {(Object.keys(filters).some(key => 
          filters[key as keyof AssignedLoanFilters] !== undefined && 
          filters[key as keyof AssignedLoanFilters] !== '' && 
          key !== 'page' && 
          key !== 'page_size' && 
          key !== 'ordering' &&
          key !== 'assigned_only'
        )) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by customer name, loan ID, phone number, registration number, or identity number..."
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">Assigned Loans List</h2>
            <div className="text-sm text-gray-600">
              Showing {data.assigned_loans.length} of {data.assignment_metrics.total_assigned_loans ?? 0} assigned loans
              {selectedLoans.length > 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  ({selectedLoans.length} selected for reassignment)
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading assigned loans...</div>
            </div>
          ) : (
            <GenericTable
              data={data.assigned_loans}
              columns={columns}
              rowKey={(row: AssignedLoan) => row.id}
              selectionMode={canReassign ? "multiple" : "none"}
              onSelectionChange={(selectedRows) => {
                if (canReassign) {
                  setSelectedLoans(selectedRows.map((row: AssignedLoan) => row.loan_id));
                }
              }}
              pagination={{
                totalCount: data.count,
                currentPage: data.page,
                pageSize: data.page_size,
                onPageChange: handlePageChange,
                hasNextPage: data.page < data.total_pages,
                hasPreviousPage: data.page > 1,
                serverSide: true
              }}
              virtualized={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Advanced Filters Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Advanced Filters"
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {/* Basic Info Filters */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Officer ID
                </label>
                <input
                  type="text"
                  value={tempFilters.officer_id || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, officer_id: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter officer ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Officer Username
                </label>
                <input
                  type="text"
                  value={tempFilters.officer_username || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, officer_username: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan ID
                </label>
                <input
                  type="text"
                  value={tempFilters.loan_id || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, loan_id: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter loan ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={tempFilters.registration_number || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, registration_number: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter registration number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identity Number
                </label>
                <input
                  type="text"
                  value={tempFilters.identity_num || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, identity_num: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter ID number"
                />
              </div>
            </div>
          </div>

          {/* Status Filters */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={tempFilters.status || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="paid">Paid</option>
                  <option value="defaulted">Defaulted</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overdue Status
                </label>
                <select
                  value={tempFilters.is_overdue === undefined ? '' : String(tempFilters.is_overdue)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTempFilters(prev => ({ 
                      ...prev, 
                      is_overdue: value === '' ? undefined : value === 'true'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Loans</option>
                  <option value="true">Overdue Only</option>
                  <option value="false">Not Overdue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Active Status
                </label>
                <select
                  value={tempFilters.is_active === undefined ? '' : String(tempFilters.is_active)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTempFilters(prev => ({ 
                      ...prev, 
                      is_active: value === '' ? undefined : value === 'true'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Amount Filters */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Amount Ranges</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount Min
                </label>
                <input
                  type="number"
                  value={tempFilters.total_amount_min || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, total_amount_min: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Min amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount Max
                </label>
                <input
                  type="number"
                  value={tempFilters.total_amount_max || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, total_amount_max: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Max amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outstanding Min
                </label>
                <input
                  type="number"
                  value={tempFilters.outstanding_min || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, outstanding_min: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Min outstanding"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outstanding Max
                </label>
                <input
                  type="number"
                  value={tempFilters.outstanding_max || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, outstanding_max: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Max outstanding"
                />
              </div>
            </div>
          </div>

          {/* Date Filters */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Date Ranges</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disburse Date After
                </label>
                <input
                  type="date"
                  value={tempFilters.disburse_date_after || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, disburse_date_after: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disburse Date Before
                </label>
                <input
                  type="date"
                  value={tempFilters.disburse_date_before || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, disburse_date_before: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date After
                </label>
                <input
                  type="date"
                  value={tempFilters.due_date_after || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, due_date_after: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date Before
                </label>
                <input
                  type="date"
                  value={tempFilters.due_date_before || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, due_date_before: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Sorting */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Sorting</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order By
              </label>
              <select
                value={tempFilters.ordering || '-disburse_time'}
                onChange={(e) => setTempFilters(prev => ({ ...prev, ordering: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="-disburse_time">Disburse Time (Newest first)</option>
                <option value="disburse_time">Disburse Time (Oldest first)</option>
                <option value="-due_date">Due Date (Latest first)</option>
                <option value="due_date">Due Date (Earliest first)</option>
                <option value="-total_amount">Total Amount (Highest first)</option>
                <option value="total_amount">Total Amount (Lowest first)</option>
                <option value="-total_outstanding">Outstanding (Highest first)</option>
                <option value="total_outstanding">Outstanding (Lowest first)</option>
                <option value="customer_name">Customer Name (A-Z)</option>
                <option value="-customer_name">Customer Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t mt-4">
          <Button variant="outline" onClick={() => {
            setTempFilters({ ...filters });
            setIsFilterModalOpen(false);
          }}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => {
            setTempFilters({
              page: 1,
              page_size: 400,
              ordering: '-disburse_time',
              current_month_only: false,
              assigned_only: true
            });
          }}>
            Reset
          </Button>
          <Button onClick={applyAdvancedFilters} className="bg-blue-600 hover:bg-blue-700">
            Apply Filters
          </Button>
        </div>
      </Modal>

      {/* Bulk Reassign Modal */}
      <BulkReassignModal
        isOpen={isBulkReassignModalOpen}
        onClose={() => {
          setIsBulkReassignModalOpen(false);
          setSelectedLoans([]);
        }}
        onReassign={handleBulkReassign}
        onSingleReassign={handleSingleReassign}
        selectedCount={selectedLoans.length}
        selectedLoans={selectedLoans}
        currentOfficers={Array.from(new Set(
          data.assigned_loans
            .filter(loan => selectedLoans.includes(loan.loan_id))
            .map(loan => loan.current_assigned_officer_details?.username)
            .filter(Boolean)
        ))}
      />

      {/* Reassignment History Modal */}
      <ReassignmentHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedLoanForHistory(null);
        }}
        loanId={selectedLoanForHistory}
      />
    </div>
  );
}