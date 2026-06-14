// app/loan-processor/escalation-requests/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api';
import { 
  Search, Filter, RefreshCw, CheckCircle, XCircle, Clock, 
  AlertTriangle, Users, TrendingUp, DollarSign, Eye, 
  UserCheck, FileText, History, ArrowRight, Ban, Shield, ThumbsUp, ThumbsDown
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import { usePermissions } from '@/context/permission-context';
import BulkReassignModal from '@/components/loans/BulkReassignModal';

// Types
interface EscalationRequest {
  id: string;
  loan_id: string;
  customer_name: string;
  first_default_installment_id: number;
  first_default_days_overdue: number;
  escalation_type: 'repossess' | 'collection_condition' | 'both';
  to_repossess: boolean;
  new_collection_condition: string | null;
  reason: string;
  reason_details: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'executed';
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  executed_by: string | null;
  executed_at: string | null;
}

interface EscalationRequestFilters {
  status?: string;
  requested_by?: string;
  reviewed_by?: string;
  start_date?: string;
  end_date?: string;
  loan_id?: string;
  customer_name?: string;
  page: number;
  page_size: number;
}

interface EscalationAnalytics {
  summary: {
    total_escalated_loans: number;
    total_repossessed: number;
    auto_escalated_last_30_days: number;
    total_cumulative_balance_defaulted: number;
  };
  overdue_distribution: {
    '21-30 days': number;
    '31-60 days': number;
    '61-90 days': number;
    '90+ days': number;
    total_cumulative_balance: number;
  };
  by_collection_condition: Array<{
    condition: string;
    count: number;
    total_outstanding: number;
  }>;
  by_repossession_status: Array<{
    status: string;
    count: number;
    total_outstanding: number;
  }>;
  escalation_requests: {
    pending: number;
    approved: number;
    executed_last_30_days: number;
  };
  by_reason: Array<{
    reason: string;
    count: number;
  }>;
}

interface EscalationRequestsResponse {
  count: number;
  results: EscalationRequest[];
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending Approval' };
    case 'approved':
      return { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, label: 'Approved' };
    case 'rejected':
      return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Rejected' };
    case 'cancelled':
      return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Ban, label: 'Cancelled' };
    case 'executed':
      return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Executed' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, label: status };
  }
};

const getEscalationTypeLabel = (type: string, toRepossess: boolean, newCondition: string | null) => {
  if (type === 'both') return 'Repossession + Condition';
  if (type === 'repossess') return 'Repossession Only';
  if (type === 'collection_condition') return `Condition: ${newCondition?.replace(/_/g, ' ') || 'Change'}`;
  return type;
};

export default function EscalationRequestsPage() {
  const { hasAccess } = usePermissions();
  const canApprove = hasAccess('can_approve_escalations') || hasAccess('is_admin');
  const canExecute = hasAccess('can_execute_escalations') || hasAccess('is_admin');
  const canViewAll = hasAccess('is_admin') || hasAccess('can_view_all_escalations');

  const [requests, setRequests] = useState<EscalationRequest[]>([]);
  const [analytics, setAnalytics] = useState<EscalationAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EscalationRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [pendingReassignLoanId, setPendingReassignLoanId] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<EscalationRequestFilters>({
    page: 1,
    page_size: 20,
    status: undefined,
    requested_by: undefined,
    reviewed_by: undefined,
    start_date: undefined,
    end_date: undefined,
    loan_id: undefined,
    customer_name: undefined
  });
  const [tempFilters, setTempFilters] = useState<EscalationRequestFilters>({ ...filters });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchEscalationRequests();
    fetchEscalationAnalytics();
  }, [
    filters.page,
    filters.page_size,
    filters.status,
    filters.requested_by,
    filters.reviewed_by,
    filters.start_date,
    filters.end_date,
    filters.loan_id,
    filters.customer_name
  ]);

  const fetchEscalationRequests = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      // Correct endpoint - matches your views.py
      const response = await client.get<EscalationRequestsResponse>(
        `/loan-processor/escalation/requests/?${queryParams.toString()}`
      );
      setRequests(response.data.results);
      setTotalCount(response.data.count);
      setTotalPages(Math.ceil(response.data.count / filters.page_size));
    } catch (error) {
      console.error('Error fetching escalation requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEscalationAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      const client = apiClient.getClient();
      // Correct endpoint - matches your views.py
      const response = await client.get<EscalationAnalytics>(
        '/loan-processor/escalation/analytics/'
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching escalation analytics:', error);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      const client = apiClient.getClient();
      // Correct endpoint - matches your @action(detail=True, methods=['post'], url_path='escalation/approve')
      await client.post(`/loan-processor/${selectedRequest.id}/escalation/approve/`, {
        review_notes: reviewNotes
      });
      
      await fetchEscalationRequests();
      await fetchEscalationAnalytics();
      
      setIsApproveModalOpen(false);
      setReviewNotes('');
      setSelectedRequest(null);
      
      alert('Escalation request approved successfully!');
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(error.response?.data?.error || 'Failed to approve request. Please try again.');
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      const client = apiClient.getClient();
      // Correct endpoint - matches your @action(detail=True, methods=['post'], url_path='escalation/reject')
      await client.post(`/loan-processor/${selectedRequest.id}/escalation/reject/`, {
        review_notes: reviewNotes
      });
      
      await fetchEscalationRequests();
      await fetchEscalationAnalytics();
      
      setIsRejectModalOpen(false);
      setReviewNotes('');
      setSelectedRequest(null);
      
      alert('Escalation request rejected.');
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(error.response?.data?.error || 'Failed to reject request. Please try again.');
    }
  };

  const handleExecuteRequest = async (request: EscalationRequest, showReassignPrompt: boolean = true) => {
    try {
      const client = apiClient.getClient();
      // Correct endpoint - matches your @action(detail=True, methods=['post'], url_path='escalation/execute')
      const response = await client.post(`/loan-processor/${request.id}/escalation/execute/`);
      
      await fetchEscalationRequests();
      await fetchEscalationAnalytics();
      
      alert(`Escalation request executed successfully! ${response.data.message || ''}`);
      
      if (showReassignPrompt && (request.to_repossess || request.new_collection_condition)) {
        const shouldReassign = window.confirm(
          'Escalation executed successfully!\n\nWould you like to reassign this loan to a different collection officer?'
        );
        
        if (shouldReassign) {
          setPendingReassignLoanId(request.loan_id);
          setIsReassignModalOpen(true);
        }
      }
      
      setIsDetailsModalOpen(false);
      setSelectedRequest(null);
    } catch (error: any) {
      console.error('Error executing request:', error);
      alert(error.response?.data?.error || 'Failed to execute request. Please try again.');
    }
  };

  const handleViewDetails = (request: EscalationRequest) => {
    setSelectedRequest(request);
    setIsDetailsModalOpen(true);
  };

  const handleFilterChange = (key: keyof EscalationRequestFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20,
      status: undefined,
      requested_by: undefined,
      reviewed_by: undefined,
      start_date: undefined,
      end_date: undefined,
      loan_id: undefined,
      customer_name: undefined
    });
    setTempFilters({
      page: 1,
      page_size: 20,
      status: undefined,
      requested_by: undefined,
      reviewed_by: undefined,
      start_date: undefined,
      end_date: undefined,
      loan_id: undefined,
      customer_name: undefined
    });
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

  const columns = [
    {
      id: 'loan_id',
      label: 'Loan ID',
      accessor: (row: EscalationRequest) => row.loan_id,
      Cell: (value: string) => (
        <span className="font-mono text-sm font-medium text-gray-900">{value}</span>
      ),
      width: 140,
    },
    {
      id: 'customer_name',
      label: 'Customer',
      accessor: (row: EscalationRequest) => row.customer_name,
      width: 200,
    },
    {
      id: 'escalation_type',
      label: 'Type',
      accessor: (row: EscalationRequest) => getEscalationTypeLabel(row.escalation_type, row.to_repossess, row.new_collection_condition),
      Cell: (value: string, row: EscalationRequest) => (
        <div>
          <span className="text-sm">{value}</span>
          {row.new_collection_condition && (
            <div className="text-xs text-gray-500 mt-0.5">
              Condition: {row.new_collection_condition?.replace(/_/g, ' ')}
            </div>
          )}
          {row.to_repossess && (
            <div className="text-xs text-orange-600 font-medium mt-0.5">
              Mark for Repossession
            </div>
          )}
        </div>
      ),
      width: 180,
    },
    {
      id: 'first_default_info',
      label: 'Default Info',
      accessor: (row: EscalationRequest) => ({
        installment: row.first_default_installment_id,
        days: row.first_default_days_overdue
      }),
      Cell: (value: { installment: number; days: number }) => (
        <div>
          <div className="text-sm">Installment #{value.installment}</div>
          <div className="text-xs text-red-600 font-medium">
            {value.days} days overdue
          </div>
        </div>
      ),
      width: 120,
    },
    {
      id: 'reason',
      label: 'Reason',
      accessor: (row: EscalationRequest) => row.reason,
      Cell: (value: string, row: EscalationRequest) => (
        <div>
          <span className="text-sm capitalize">{value?.replace(/_/g, ' ')}</span>
          {row.reason_details && (
            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
              {row.reason_details}
            </div>
          )}
        </div>
      ),
      width: 180,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: EscalationRequest) => row.status,
      Cell: (value: string) => {
        const badge = getStatusBadge(value);
        const Icon = badge.icon;
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
            <Icon size={12} className="mr-1" />
            {badge.label}
          </span>
        );
      },
      width: 120,
    },
    {
      id: 'requested_by',
      label: 'Requested By',
      accessor: (row: EscalationRequest) => row.requested_by,
      width: 120,
    },
    {
      id: 'requested_at',
      label: 'Requested',
      accessor: (row: EscalationRequest) => new Date(row.requested_at).toLocaleDateString(),
      width: 110,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: EscalationRequest) => row,
      Cell: (value: EscalationRequest) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewDetails(value)}
            className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
            title="View details"
          >
            <Eye size={16} />
          </button>
          
          {value.status === 'pending' && canApprove && (
            <>
              <button
                onClick={() => {
                  setSelectedRequest(value);
                  setReviewNotes('');
                  setIsApproveModalOpen(true);
                }}
                className="text-green-600 hover:text-green-700 transition-colors p-1 rounded hover:bg-green-50"
                title="Approve"
              >
                <ThumbsUp size={16} />
              </button>
              <button
                onClick={() => {
                  setSelectedRequest(value);
                  setReviewNotes('');
                  setIsRejectModalOpen(true);
                }}
                className="text-red-600 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                title="Reject"
              >
                <ThumbsDown size={16} />
              </button>
            </>
          )}
          
          {value.status === 'approved' && canExecute && (
            <button
              onClick={() => handleExecuteRequest(value, true)}
              className="text-purple-600 hover:text-purple-700 transition-colors p-1 rounded hover:bg-purple-50"
              title="Execute"
            >
              <CheckCircle size={16} />
            </button>
          )}
        </div>
      ),
      width: 120,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escalation Requests</h1>
          <p className="text-gray-600 mt-2">
            Manage loan escalation and repossession requests with maker-checker workflow
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={openFilterModal}>
            <Filter size={20} className="mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={fetchEscalationRequests}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by loan ID or customer name..."
          value={filters.loan_id || filters.customer_name || ''}
          onChange={(e) => {
            const value = e.target.value;
            handleFilterChange('loan_id', value);
            handleFilterChange('customer_name', value);
          }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      {/* Status Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <Button
          size="sm"
          onClick={() => handleFilterChange('status', filters.status === 'pending' ? undefined : 'pending')}
          className={filters.status === 'pending' ? "bg-yellow-600 hover:bg-yellow-700 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}
        >
          <Clock size={14} className="mr-1" />
          Pending
        </Button>
        <Button
          size="sm"
          onClick={() => handleFilterChange('status', filters.status === 'approved' ? undefined : 'approved')}
          className={filters.status === 'approved' ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}
        >
          <CheckCircle size={14} className="mr-1" />
          Approved
        </Button>
        <Button
          size="sm"
          onClick={() => handleFilterChange('status', filters.status === 'executed' ? undefined : 'executed')}
          className={filters.status === 'executed' ? "bg-green-600 hover:bg-green-700 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}
        >
          <CheckCircle size={14} className="mr-1" />
          Executed
        </Button>
        <Button
          size="sm"
          onClick={() => handleFilterChange('status', filters.status === 'rejected' ? undefined : 'rejected')}
          className={filters.status === 'rejected' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}
        >
          <XCircle size={14} className="mr-1" />
          Rejected
        </Button>
        
        {(filters.status || filters.requested_by || filters.start_date || filters.end_date) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">Escalation Requests</h2>
            <div className="text-sm text-gray-600">
              Showing {requests.length} of {totalCount} requests
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading escalation requests...</div>
            </div>
          ) : (
            <GenericTable
              data={requests}
              columns={columns}
              rowKey={(row: EscalationRequest) => row.id}
              pagination={{
                totalCount: totalCount,
                currentPage: filters.page,
                pageSize: filters.page_size,
                onPageChange: handlePageChange,
                hasNextPage: filters.page < totalPages,
                hasPreviousPage: filters.page > 1,
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
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Basic Filters</h3>
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
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="executed">Executed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested By
                </label>
                <input
                  type="text"
                  value={tempFilters.requested_by || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, requested_by: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reviewed By
                </label>
                <input
                  type="text"
                  value={tempFilters.reviewed_by || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, reviewed_by: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Username"
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
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Date Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={tempFilters.start_date || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, start_date: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={tempFilters.end_date || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, end_date: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
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
          <Button variant="outline" onClick={resetFilters}>
            Reset All
          </Button>
          <Button onClick={applyAdvancedFilters} className="bg-blue-600 hover:bg-blue-700">
            Apply Filters
          </Button>
        </div>
      </Modal>

      {/* Request Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRequest(null);
        }}
        title="Escalation Request Details"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className={`p-4 rounded-lg ${getStatusBadge(selectedRequest.status).bg}`}>
              <div className="flex items-center">
                {React.createElement(getStatusBadge(selectedRequest.status).icon, { 
                  size: 24, 
                  className: `mr-3 ${getStatusBadge(selectedRequest.status).text}` 
                })}
                <div>
                  <h3 className={`font-semibold ${getStatusBadge(selectedRequest.status).text}`}>
                    {getStatusBadge(selectedRequest.status).label}
                  </h3>
                  {selectedRequest.review_notes && (
                    <p className="text-sm mt-1 text-gray-700">
                      <strong>Review Notes:</strong> {selectedRequest.review_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                <FileText size={18} className="mr-2" />
                Loan Information
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Loan ID</p>
                  <p className="font-medium">{selectedRequest.loan_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer Name</p>
                  <p className="font-medium">{selectedRequest.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">First Default Installment</p>
                  <p className="font-medium">#{selectedRequest.first_default_installment_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Days Overdue</p>
                  <p className="font-medium text-red-600">{selectedRequest.first_default_days_overdue} days</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                <AlertTriangle size={18} className="mr-2" />
                Escalation Details
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">
                    {getEscalationTypeLabel(selectedRequest.escalation_type, selectedRequest.to_repossess, selectedRequest.new_collection_condition)}
                  </p>
                </div>
                {selectedRequest.to_repossess && (
                  <div>
                    <p className="text-sm text-gray-500">Repossession</p>
                    <p className="font-medium text-orange-600">Mark for Repossession</p>
                  </div>
                )}
                {selectedRequest.new_collection_condition && (
                  <div>
                    <p className="text-sm text-gray-500">New Collection Condition</p>
                    <p className="font-medium capitalize">{selectedRequest.new_collection_condition.replace(/_/g, ' ')}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Reason</p>
                  <p className="font-medium capitalize">{selectedRequest.reason?.replace(/_/g, ' ')}</p>
                </div>
                {selectedRequest.reason_details && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Reason Details</p>
                    <p className="text-sm">{selectedRequest.reason_details}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                <History size={18} className="mr-2" />
                Request History
              </h3>
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Requested By</span>
                  <span className="font-medium">{selectedRequest.requested_by}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Requested At</span>
                  <span className="font-medium">{new Date(selectedRequest.requested_at).toLocaleString()}</span>
                </div>
                {selectedRequest.reviewed_by && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Reviewed By</span>
                      <span className="font-medium">{selectedRequest.reviewed_by}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Reviewed At</span>
                      <span className="font-medium">{new Date(selectedRequest.reviewed_at!).toLocaleString()}</span>
                    </div>
                  </>
                )}
                {selectedRequest.executed_by && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Executed By</span>
                      <span className="font-medium">{selectedRequest.executed_by}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Executed At</span>
                      <span className="font-medium">{new Date(selectedRequest.executed_at!).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
              
              {selectedRequest.status === 'pending' && canApprove && (
                <>
                  <Button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setReviewNotes('');
                      setIsApproveModalOpen(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ThumbsUp size={16} className="mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setReviewNotes('');
                      setIsRejectModalOpen(true);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <ThumbsDown size={16} className="mr-2" />
                    Reject
                  </Button>
                </>
              )}
              
              {selectedRequest.status === 'approved' && canExecute && (
                <Button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleExecuteRequest(selectedRequest, true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Execute
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setSelectedRequest(null);
          setReviewNotes('');
        }}
        title="Approve Escalation Request"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to approve this escalation request for loan <strong>{selectedRequest?.loan_id}</strong>?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Review Notes (Optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes about this approval..."
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => {
              setIsApproveModalOpen(false);
              setReviewNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleApproveRequest} className="bg-green-600 hover:bg-green-700">
              Approve Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setSelectedRequest(null);
          setReviewNotes('');
        }}
        title="Reject Escalation Request"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to reject this escalation request for loan <strong>{selectedRequest?.loan_id}</strong>?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please provide a reason for rejection..."
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => {
              setIsRejectModalOpen(false);
              setReviewNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleRejectRequest} className="bg-red-600 hover:bg-red-700">
              Reject Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reassignment Modal (after execution) */}
      {pendingReassignLoanId && (
        <BulkReassignModal
          isOpen={isReassignModalOpen}
          onClose={() => {
            setIsReassignModalOpen(false);
            setPendingReassignLoanId(null);
          }}
          onReassign={async (targetOfficerUsername, reason, skipErrors, updateInstallments) => {
            try {
              const client = apiClient.getClient();
              await client.post('/loan-processor/reassign-loan/', {
                loan_id: pendingReassignLoanId,
                new_officer_username: targetOfficerUsername,
                reason: reason || 'Reassignment after escalation execution',
                update_installments: updateInstallments
              });
              alert('Loan reassigned successfully!');
              setIsReassignModalOpen(false);
              setPendingReassignLoanId(null);
            } catch (error) {
              console.error('Error reassigning loan:', error);
              alert('Failed to reassign loan. Please try again.');
            }
          }}
          onSingleReassign={async (loanId, targetOfficerUsername, reason, updateInstallments) => {
            try {
              const client = apiClient.getClient();
              await client.post('/loan-processor/reassign-loan/', {
                loan_id: loanId,
                new_officer_username: targetOfficerUsername,
                reason: reason || 'Reassignment after escalation execution',
                update_installments: updateInstallments
              });
              alert('Loan reassigned successfully!');
              setIsReassignModalOpen(false);
              setPendingReassignLoanId(null);
            } catch (error) {
              console.error('Error reassigning loan:', error);
              alert('Failed to reassign loan. Please try again.');
            }
          }}
          selectedCount={1}
          selectedLoans={[pendingReassignLoanId]}
          currentOfficers={[]}
        />
      )}
    </div>
  );
}