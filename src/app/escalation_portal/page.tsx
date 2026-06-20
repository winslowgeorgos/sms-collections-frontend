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
  UserCheck, FileText, History, ArrowRight, Ban, Shield, ThumbsUp, ThumbsDown,
  GitBranch, Tag, ArrowUpCircle, Warehouse, MapPin, Phone, User,
  Building2, Car, Gavel, ExternalLink
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import { usePermissions } from '@/context/permission-context';
import BulkReassignModal from '@/components/loans/BulkReassignModal';
import { Badge } from '@/components/ui/badge';

// Types
interface YardLocation {
  id: number;
  name: string;
  location: string;
  contact_phone: string | null;
  contact_person: string | null;
  notes: string | null;
  is_active: boolean;
}

interface EscalationRequest {
  id: string;
  loan_id: string;
  customer_name: string;
  first_default_installment_id: number | null;
  first_default_days_overdue: number;
  escalation_type: 'repossess' | 'collection_condition' | 'both';
  to_repossess: boolean;
  new_collection_condition: string | null;
  new_repossession_status: string | null;
  new_collection_condition_display: string | null;
  new_repossession_status_display: string | null;
  reason: string;
  reason_details: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'executed';
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  executed_by: string | null;
  executed_at: string | null;
  yard_location: YardLocation | string | null;
  yard_notes: string | null;
  yard_display: string | null;
  loan_info?: {
    current_repossession_status: string;
    current_repossession_status_display: string;
    current_collection_condition: string;
    current_collection_condition_display: string;
    to_repossess: boolean;
    current_yard_location: string | null;
    current_yard_notes: string | null;
  };
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
    in_yard_count: number;
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
  yard_distribution: Array<{
    yard_name: string;
    count: number;
    total_outstanding: number;
  }>;
}

interface EscalationRequestsResponse {
  count: number;
  results: EscalationRequest[];
}

// Collection conditions with icons
const COLLECTION_CONDITIONS = [
  { value: 'collectable', label: 'Collectable (Default)', color: 'green' },
  { value: 'in_yard', label: 'In the Yard', color: 'blue' },
  { value: 'police_case', label: 'Police Case', color: 'red' },
  { value: 'law_court', label: 'Law Court', color: 'purple' },
  { value: 'in_auction', label: 'In Auctioneer', color: 'amber' },
  { value: 'third_party', label: 'Third Party Collection', color: 'indigo' },
  { value: 'restructured', label: 'Restructured Payment Plan', color: 'teal' },
  { value: 'written_off', label: 'Written Off', color: 'gray' },
  { value: 'settled', label: 'Settled', color: 'emerald' },
];

// Status badge configuration
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

// Repossession status color mapping
const getRepossessionStatusColor = (status: string) => {
  switch (status) {
    case 'not_started':
      return 'text-gray-500';
    case 'marked':
      return 'text-orange-500';
    case 'in_progress':
      return 'text-blue-500';
    case 'repossessed':
      return 'text-green-600';
    case 'released':
      return 'text-purple-500';
    case 'court_ordered':
      return 'text-red-600';
    case 'disputed':
      return 'text-yellow-600';
    default:
      return 'text-gray-500';
  }
};

// Escalation type label formatter
const getEscalationTypeLabel = (request: EscalationRequest) => {
  const parts = [];
  if (request.new_repossession_status) {
    parts.push(`Repossession → ${request.new_repossession_status_display || request.new_repossession_status}`);
  }
  if (request.new_collection_condition) {
    parts.push(`Condition → ${request.new_collection_condition_display || request.new_collection_condition}`);
  }
  return parts.length > 0 ? parts.join(' & ') : 'No changes specified';
};

// Get collection condition color
const getCollectionConditionColor = (condition: string) => {
  const found = COLLECTION_CONDITIONS.find(c => c.value === condition);
  return found?.color || 'gray';
};

// Get collection condition badge
const getCollectionConditionBadge = (condition: string | null) => {
  if (!condition) return null;
  const found = COLLECTION_CONDITIONS.find(c => c.value === condition);
  const colorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    teal: 'bg-teal-100 text-teal-800 border-teal-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return (
    <Badge className={`${colorMap[found?.color || 'gray']} gap-1`}>
      {found?.label || condition}
    </Badge>
  );
};

// Helper to get yard display name (handles both string and object)
const getYardDisplayName = (yard: YardLocation | string | null): string | null => {
  if (!yard) return null;
  if (typeof yard === 'string') return yard;
  if (typeof yard === 'object' && yard !== null && 'name' in yard) {
    return yard.name + (yard.location ? ` - ${yard.location}` : '');
  }
  return null;
};

// Helper to get yard location string (handles both string and object)
const getYardLocation = (yard: YardLocation | string | null): string | null => {
  if (!yard) return null;
  if (typeof yard === 'string') return yard;
  if (typeof yard === 'object' && yard !== null && 'location' in yard) {
    return yard.location;
  }
  return null;
};

// Helper to get yard contact person (handles object case)
const getYardContactPerson = (yard: YardLocation | string | null): string | null => {
  if (!yard) return null;
  if (typeof yard === 'object' && yard !== null && 'contact_person' in yard) {
    return yard.contact_person;
  }
  return null;
};

// Helper to get yard contact phone (handles object case)
const getYardContactPhone = (yard: YardLocation | string | null): string | null => {
  if (!yard) return null;
  if (typeof yard === 'object' && yard !== null && 'contact_phone' in yard) {
    return yard.contact_phone;
  }
  return null;
};

// Helper to get yard notes (handles object case)
const getYardNotes = (yard: YardLocation | string | null): string | null => {
  if (!yard) return null;
  if (typeof yard === 'object' && yard !== null && 'notes' in yard) {
    return yard.notes;
  }
  return null;
};

// Check if yard is an object with full details
const isYardObject = (yard: any): yard is YardLocation => {
  return yard && typeof yard === 'object' && 'name' in yard && 'location' in yard;
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  // Create request form state
  const [createForm, setCreateForm] = useState({
    loan_id: '',
    reason: '',
    reason_details: '',
    new_repossession_status: '',
    new_collection_condition: '',
    request_notes: '',
    to_repossess: false,
    yard_location_id: undefined as number | undefined,
    yard_notes: '',
  });

  // Yard locations for dropdown
  const [yardLocations, setYardLocations] = useState<YardLocation[]>([]);
  const [showYardFields, setShowYardFields] = useState(false);

  useEffect(() => {
    fetchEscalationRequests();
    fetchEscalationAnalytics();
    fetchYardLocations();
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

  const fetchYardLocations = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/yard-locations/?is_active=true');
      setYardLocations(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching yard locations:', error);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      const client = apiClient.getClient();
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

  const handleCreateRequest = async () => {
    try {
      const client = apiClient.getClient();
      const payload: any = {
        loan_id: createForm.loan_id,
        reason: createForm.reason,
        reason_details: createForm.reason_details,
        to_repossess: createForm.to_repossess || Boolean(createForm.new_repossession_status),
        new_repossession_status: createForm.new_repossession_status || null,
        new_collection_condition: createForm.new_collection_condition || null,
        request_notes: createForm.request_notes,
        supporting_documents: []
      };

      // Add yard fields if collection condition is IN_YARD
      if (createForm.new_collection_condition === 'in_yard') {
        if (!createForm.yard_location_id) {
          alert('Please select a yard location when setting collection condition to "In the Yard"');
          return;
        }
        payload.yard_location_id = createForm.yard_location_id;
        payload.yard_notes = createForm.yard_notes || '';
      }

      const response = await client.post('/loan-processor/escalation/request/', payload);
      
      if (response.data.success) {
        alert('Escalation request created successfully!');
        setIsCreateModalOpen(false);
        setCreateForm({
          loan_id: '',
          reason: '',
          reason_details: '',
          new_repossession_status: '',
          new_collection_condition: '',
          request_notes: '',
          to_repossess: false,
          yard_location_id: undefined,
          yard_notes: '',
        });
        setShowYardFields(false);
        await fetchEscalationRequests();
        await fetchEscalationAnalytics();
      } else {
        alert(response.data.error || 'Failed to create escalation request');
      }
    } catch (error: any) {
      console.error('Error creating request:', error);
      alert(error.response?.data?.error || 'Failed to create request. Please try again.');
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

  // Render yard info - handles both string and object
  const renderYardInfo = (request: EscalationRequest) => {
    if (!request.yard_location) return null;
    
    const yardName = getYardDisplayName(request.yard_location);
    const yardLocation = getYardLocation(request.yard_location);
    const yardNotes = request.yard_notes || getYardNotes(request.yard_location);
    const isObject = isYardObject(request.yard_location);
    
    return (
      <div className="text-xs text-blue-600 mt-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <Warehouse size={12} />
          <span className="font-medium">{yardName || 'Yard'}</span>
        </div>
        {isObject && yardLocation && (
          <div className="flex items-center gap-1 text-gray-500 pl-5">
            <MapPin size={10} />
            <span>{yardLocation}</span>
          </div>
        )}
        {yardNotes && (
          <div className="text-gray-400 truncate max-w-[150px] pl-5 text-[10px]">
            {yardNotes}
          </div>
        )}
      </div>
    );
  };

  // Render detailed yard info for modal
  const renderDetailedYardInfo = (request: EscalationRequest) => {
    if (!request.yard_location) return null;
    
    const yardName = getYardDisplayName(request.yard_location);
    const yardLocation = getYardLocation(request.yard_location);
    const contactPerson = getYardContactPerson(request.yard_location);
    const contactPhone = getYardContactPhone(request.yard_location);
    const yardNotes = request.yard_notes || getYardNotes(request.yard_location);
    const isObject = isYardObject(request.yard_location);
    
    return (
      <div className="col-span-2">
        <p className="text-sm text-gray-500">Yard Location</p>
        <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
          <div className="flex items-center gap-2 text-blue-800 font-medium">
            <Warehouse size={16} />
            {yardName || 'Unknown Yard'}
          </div>
          {isObject && yardLocation && (
            <div className="text-sm text-blue-600 pl-6 flex items-center gap-1">
              <MapPin size={14} />
              {yardLocation}
            </div>
          )}
          {isObject && contactPerson && (
            <div className="text-sm text-blue-600 pl-6 flex items-center gap-1">
              <User size={14} />
              {contactPerson}
            </div>
          )}
          {isObject && contactPhone && (
            <div className="text-sm text-blue-600 pl-6 flex items-center gap-1">
              <Phone size={14} />
              {contactPhone}
            </div>
          )}
          {yardNotes && (
            <div className="text-sm text-blue-600 pl-6 mt-1 border-t border-blue-100 pt-1">
              <strong>Notes:</strong> {yardNotes}
            </div>
          )}
          {!isObject && (
            <div className="text-sm text-gray-500 pl-6 mt-1">
              <span className="text-xs">(Basic yard information - full details not available)</span>
            </div>
          )}
        </div>
      </div>
    );
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
      width: 180,
    },
    {
      id: 'escalation_type',
      label: 'Requested Changes',
      accessor: (row: EscalationRequest) => getEscalationTypeLabel(row),
      Cell: (value: string, row: EscalationRequest) => (
        <div className="space-y-1">
          <span className="text-sm">{value}</span>
          {row.new_repossession_status && (
            <div className={`text-xs font-medium ${getRepossessionStatusColor(row.new_repossession_status)}`}>
              <ArrowUpCircle size={12} className="inline mr-1" />
              Target: {row.new_repossession_status_display || row.new_repossession_status}
            </div>
          )}
          {row.new_collection_condition && (
            <div className="text-xs">
              {getCollectionConditionBadge(row.new_collection_condition)}
            </div>
          )}
          {renderYardInfo(row)}
          {row.loan_info && row.loan_info.current_repossession_status && (
            <div className="text-xs text-gray-500">
              Current: {row.loan_info.current_repossession_status_display || row.loan_info.current_repossession_status}
            </div>
          )}
        </div>
      ),
      width: 260,
    },
    {
      id: 'first_default_info',
      label: 'Default Info',
      accessor: (row: EscalationRequest) => ({
        installment: row.first_default_installment_id,
        days: row.first_default_days_overdue
      }),
      Cell: (value: { installment: number | null; days: number }) => (
        <div>
          <div className="text-sm">Installment #{value.installment || 'N/A'}</div>
          <div className={`text-xs font-medium ${value.days > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {value.days > 0 ? `${value.days} days overdue` : 'Not overdue'}
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
      width: 160,
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
      width: 140,
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
          {/* {canApprove && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <FileText size={20} className="mr-2" />
              New Request
            </Button>
          )} */}
          {/* <Button variant="outline" onClick={openFilterModal}>
            <Filter size={20} className="mr-2" />
            Filters
          </Button> */}
          <Button variant="outline" onClick={fetchEscalationRequests}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {isAnalyticsLoading ? '...' : analytics?.escalation_requests.pending || 0}
                </p>
              </div>
              <Clock size={32} className="text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-blue-600">
                  {isAnalyticsLoading ? '...' : analytics?.escalation_requests.approved || 0}
                </p>
              </div>
              <CheckCircle size={32} className="text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Executed (30 days)</p>
                <p className="text-2xl font-bold text-green-600">
                  {isAnalyticsLoading ? '...' : analytics?.escalation_requests.executed_last_30_days || 0}
                </p>
              </div>
              <TrendingUp size={32} className="text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Repossessed</p>
                <p className="text-2xl font-bold text-purple-600">
                  {isAnalyticsLoading ? '...' : analytics?.summary.total_repossessed || 0}
                </p>
              </div>
              <Shield size={32} className="text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Yard</p>
                <p className="text-2xl font-bold text-blue-600">
                  {isAnalyticsLoading ? '...' : analytics?.summary.in_yard_count || 0}
                </p>
              </div>
              <Warehouse size={32} className="text-blue-500" />
            </div>
          </CardContent>
        </Card>
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
              pageSizeOptions={[20, 50, 100, 500, 1000]}
              virtualized={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Request Modal - Same as before with yard fields */}
      {/* ... (Create Request Modal code remains the same) ... */}

      {/* Advanced Filters Modal - Same as before */}
      {/* ... (Advanced Filters Modal code remains the same) ... */}

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
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
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
                  <p className="font-medium">#{selectedRequest.first_default_installment_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Days Overdue</p>
                  <p className={`font-medium ${selectedRequest.first_default_days_overdue > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {selectedRequest.first_default_days_overdue > 0 ? `${selectedRequest.first_default_days_overdue} days` : 'Not overdue'}
                  </p>
                </div>
                {selectedRequest.loan_info && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Current Repossession Status</p>
                      <p className={`font-medium ${getRepossessionStatusColor(selectedRequest.loan_info.current_repossession_status)}`}>
                        {selectedRequest.loan_info.current_repossession_status_display || selectedRequest.loan_info.current_repossession_status}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current Collection Condition</p>
                      <p className="font-medium">
                        {getCollectionConditionBadge(selectedRequest.loan_info.current_collection_condition)}
                      </p>
                    </div>
                    {selectedRequest.loan_info.current_yard_location && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Current Yard</p>
                        <p className="font-medium text-blue-600 flex items-center gap-2">
                          <Warehouse size={16} />
                          {selectedRequest.loan_info.current_yard_location}
                        </p>
                        {selectedRequest.loan_info.current_yard_notes && (
                          <p className="text-sm text-gray-500 mt-1">{selectedRequest.loan_info.current_yard_notes}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
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
                  <p className="font-medium">{getEscalationTypeLabel(selectedRequest)}</p>
                </div>
                {selectedRequest.new_repossession_status && (
                  <div>
                    <p className="text-sm text-gray-500">Target Repossession Status</p>
                    <p className={`font-medium ${getRepossessionStatusColor(selectedRequest.new_repossession_status)}`}>
                      {selectedRequest.new_repossession_status_display || selectedRequest.new_repossession_status}
                    </p>
                  </div>
                )}
                {selectedRequest.new_collection_condition && (
                  <div>
                    <p className="text-sm text-gray-500">New Collection Condition</p>
                    <p className="font-medium">
                      {getCollectionConditionBadge(selectedRequest.new_collection_condition)}
                    </p>
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
                {/* Yard Details - handles both string and object */}
                {selectedRequest.yard_location && renderDetailedYardInfo(selectedRequest)}
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

      {/* Approve Modal - Update to show yard info */}
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
          {selectedRequest?.new_repossession_status && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Status Change:</strong> Will transition to{' '}
                <span className="font-medium">{selectedRequest.new_repossession_status_display || selectedRequest.new_repossession_status}</span>
              </p>
            </div>
          )}
          {selectedRequest?.new_collection_condition && (
            <div className="bg-purple-50 p-3 rounded-md">
              <p className="text-sm text-purple-800">
                <strong>Condition Change:</strong> Will update to{' '}
                <span className="font-medium">{selectedRequest.new_collection_condition_display || selectedRequest.new_collection_condition}</span>
              </p>
            </div>
          )}
          {selectedRequest?.yard_location && (
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <p className="text-sm text-blue-800 flex items-center gap-2">
                <Warehouse size={16} />
                <strong>Yard:</strong> {getYardDisplayName(selectedRequest.yard_location)}
              </p>
              {selectedRequest.yard_notes && (
                <p className="text-xs text-blue-600 mt-1">Notes: {selectedRequest.yard_notes}</p>
              )}
            </div>
          )}
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

      {/* Reject Modal - Same as before */}
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