// app/analytics/admin/escalation-management/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { usePermissions } from '@/context/permission-context';
import { ActionGuard } from '@/components/auth/action-guard';
import GenericTable from '@/components/ui/cTable';
import Link from 'next/link';

import {
  AlertTriangle,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Download,
  Filter,
  Eye,
  Users,
  Activity,
  Zap,
  Loader2,
  Info,
  ChevronDown,
  RefreshCw,
  Search,
  FileText,
  FileSpreadsheet,
  DollarSign,
  ExternalLink,
  Flag,
  Send,
  FileCheck,
  FileX,
  UserCheck,
  MessageSquare,
  History,
  Plus,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  Gavel,
  Scale,
  Car,
  Building2,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Check,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Printer,
  Share2,
  Bookmark,
  Star,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Settings,
  LogOut,
  User,
  Bell,
  Home,
  Briefcase,
  Folder,
  LayoutDashboard,
  GitCompare,
  Target,
  Gauge,
  Sparkles,
  ShieldAlert,
  Ban,
  TrendingUp,
  ClipboardList,
  Send as SendIcon
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============================================================================
// TYPES
// ============================================================================

interface EscalatedLoan {
  id: string;
  loan_id: string;
  customer_name: string;
  phone_number: string;
  registration_number: string;
  cumulative_balance: number;
  days_overdue: number;
  to_repossess: boolean;
  repossession_status: string;
  collection_condition: string;
  assigned_officer: string | null;
  escalation_date: string | null;
  is_auto_escalated: boolean;
}

interface EscalationRequest {
  id: string;
  loan_id: string;
  customer_name: string;
  escalation_type: string;
  to_repossess: boolean;
  new_repossession_status: string | null;
  new_collection_condition: string | null;
  reason: string;
  reason_details: string;
  status: string;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  executed_by: string | null;
  executed_at: string | null;
}

interface EscalationStats {
  total_escalated: number;
  marked_for_repossession: number;
  in_progress: number;
  repossessed: number;
  released: number;
  court_ordered: number;
  total_cumulative_balance: number;
  avg_days_overdue: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ESCALATION_REASONS = [
  { value: 'days_overdue', label: 'Days Overdue (21+ days)' },
  { value: 'customer_unreachable', label: 'Customer Unreachable' },
  { value: 'payment_default', label: 'Multiple Payment Defaults' },
  { value: 'asset_risk', label: 'Asset at Risk' },
  { value: 'customer_request', label: 'Customer Requested Escalation' },
  { value: 'management_directive', label: 'Management Directive' },
  { value: 'legal_action', label: 'Legal Action Required' },
  { value: 'breach_of_contract', label: 'Breach of Contract Terms' },
];

const COLLECTION_CONDITIONS = [
  { value: 'collectable', label: 'Collectable (Default)', color: 'bg-green-100 text-green-800' },
  { value: 'in_yard', label: 'In the Yard', color: 'bg-blue-100 text-blue-800' },
  { value: 'police_case', label: 'Police Case', color: 'bg-red-100 text-red-800' },
  { value: 'law_court', label: 'Law Court', color: 'bg-purple-100 text-purple-800' },
  { value: 'in_auction', label: 'In Auctioneer', color: 'bg-orange-100 text-orange-800' },
  { value: 'third_party', label: 'Third Party Collection', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'restructured', label: 'Restructured Payment Plan', color: 'bg-teal-100 text-teal-800' },
  { value: 'written_off', label: 'Written Off', color: 'bg-gray-100 text-gray-800' },
  { value: 'settled', label: 'Settled', color: 'bg-emerald-100 text-emerald-800' },
];

const REPOSSESSION_STATUSES = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
  { value: 'marked', label: 'Marked for Repossession', color: 'bg-orange-100 text-orange-800' },
  { value: 'in_progress', label: 'Repossession in Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'repossessed', label: 'Repossessed', color: 'bg-green-100 text-green-800' },
  { value: 'released', label: 'Released (Customer Paid)', color: 'bg-purple-100 text-purple-800' },
  { value: 'court_ordered', label: 'Court Ordered', color: 'bg-red-100 text-red-800' },
  { value: 'disputed', label: 'Disputed', color: 'bg-yellow-100 text-yellow-800' },
];

const REPOSSESSION_STATUSES_FOR_ESCALATION = [
  { value: 'marked', label: 'Mark for Repossession', icon: Gavel, color: 'bg-red-100 text-red-700', description: 'Initiate repossession process' },
  { value: 'in_progress', label: 'Repossession in Progress', icon: Car, color: 'bg-orange-100 text-orange-700', description: 'Repossession is currently underway' },
  { value: 'repossessed', label: 'Repossessed', icon: CheckCircle, color: 'bg-green-100 text-green-700', description: 'Asset successfully repossessed' },
  { value: 'court_ordered', label: 'Court Ordered', icon: Scale, color: 'bg-purple-100 text-purple-700', description: 'Court has ordered repossession' },
  { value: 'disputed', label: 'Disputed', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-700', description: 'Customer disputes the escalation' },
  { value: 'released', label: 'Released', icon: Ban, color: 'bg-gray-100 text-gray-700', description: 'Released from repossession (customer paid)' },
];

const COLLECTION_CONDITIONS_FOR_ESCALATION = [
  { value: 'in_yard', label: 'In the Yard', icon: Building2, color: 'bg-blue-100 text-blue-700', description: 'Asset in storage yard' },
  { value: 'police_case', label: 'Police Case', icon: ShieldAlert, color: 'bg-red-100 text-red-700', description: 'Police involved' },
  { value: 'law_court', label: 'Law Court', icon: Scale, color: 'bg-purple-100 text-purple-700', description: 'Legal proceedings' },
  { value: 'in_auction', label: 'In Auction', icon: Gavel, color: 'bg-orange-100 text-orange-700', description: 'Asset in auction' },
  { value: 'third_party', label: 'Third Party', icon: Users, color: 'bg-indigo-100 text-indigo-700', description: 'Third party collection' },
  { value: 'restructured', label: 'Restructured', icon: TrendingUp, color: 'bg-teal-100 text-teal-700', description: 'Payment plan restructured' },
  { value: 'written_off', label: 'Written Off', icon: XCircle, color: 'bg-gray-100 text-gray-700', description: 'Loan written off' },
  { value: 'settled', label: 'Settled', icon: CheckCircle, color: 'bg-green-100 text-green-700', description: 'Loan settled' },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    approved: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    executed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle },
  };
  
  const defaultConfig = { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle };
  const { bg, text, icon: Icon } = config[status] || defaultConfig;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon size={12} className="mr-1" />
      {status.toUpperCase()}
    </span>
  );
};

const RepossessionStatusBadge = ({ status }: { status: string }) => {
  const found = REPOSSESSION_STATUSES.find(s => s.value === status);
  const color = found?.color || 'bg-gray-100 text-gray-800';
  const label = found?.label || status;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
};

const CollectionConditionBadge = ({ condition }: { condition: string }) => {
  const found = COLLECTION_CONDITIONS.find(c => c.value === condition);
  const color = found?.color || 'bg-gray-100 text-gray-800';
  const label = found?.label || condition;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EscalationManagementPage() {
  const { hasAccess } = usePermissions();
  
  // State
  const [escalatedLoans, setEscalatedLoans] = useState<EscalatedLoan[]>([]);
  const [escalationRequests, setEscalationRequests] = useState<EscalationRequest[]>([]);
  const [stats, setStats] = useState<EscalationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('escalated');
  const [selectedLoan, setSelectedLoan] = useState<EscalatedLoan | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<EscalationRequest | null>(null);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [isRequestDetailModalOpen, setIsRequestDetailModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  
  // Filters
  const [filters, setFilters] = useState({
    officer_id: '',
    collection_condition: '',
    repossession_status: '',
    min_days_overdue: '',
    max_days_overdue: '',
    min_balance: '',
    max_balance: '',
    auto_escalated: '',
    to_repossess: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1
  });
  
  // Escalation form data
  const [escalationForm, setEscalationForm] = useState({
    loan_id: '',
    escalation_type: 'repossess' as 'repossess' | 'collection' | 'both',
    to_repossess: true,
    new_repossession_status: '',
    new_collection_condition: '',
    reason: '',
    reason_details: '',
    request_notes: '',
    supporting_documents: [] as string[]
  });
  
  // Review form data
  const [reviewForm, setReviewForm] = useState({
    review_notes: ''
  });
  
  // Cancel form data
  const [cancelForm, setCancelForm] = useState({
    reason: ''
  });
  
  // Escalation form errors
  const [escalationErrors, setEscalationErrors] = useState<Record<string, string>>({});
  
  // ============================================================================
  // API CALLS
  // ============================================================================
  
  const fetchEscalatedLoans = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const params = new URLSearchParams();
      
      if (filters.officer_id) params.append('officer_id', filters.officer_id);
      if (filters.collection_condition) params.append('collection_condition', filters.collection_condition);
      if (filters.repossession_status) params.append('repossession_status', filters.repossession_status);
      if (filters.min_days_overdue) params.append('min_days_overdue', filters.min_days_overdue);
      if (filters.max_days_overdue) params.append('max_days_overdue', filters.max_days_overdue);
      if (filters.min_balance) params.append('min_balance', filters.min_balance);
      if (filters.max_balance) params.append('max_balance', filters.max_balance);
      if (filters.auto_escalated) params.append('auto_escalated', filters.auto_escalated);
      if (filters.to_repossess) params.append('to_repossess', filters.to_repossess);
      if (filters.search) params.append('search', filters.search);
      
      params.append('page', pagination.page.toString());
      params.append('page_size', pagination.page_size.toString());
      
      const response = await client.get(`/loan-processor/escalation/escalated-loans/?${params.toString()}`);
      
      setEscalatedLoans(response.data.loans || []);
      setStats(response.data.summary || null);
      setPagination(prev => ({
        ...prev,
        total: response.data.total_count || 0,
        total_pages: response.data.total_pages || 1
      }));
    } catch (error) {
      console.error('Error fetching escalated loans:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.page, pagination.page_size]);
  
  const fetchEscalationRequests = useCallback(async () => {
    try {
      const client = apiClient.getClient();
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      params.append('limit', '100');
      
      const response = await client.get(`/loan-processor/escalation/requests/?${params.toString()}`);
      setEscalationRequests(response.data.results || []);
    } catch (error) {
      console.error('Error fetching escalation requests:', error);
    }
  }, [filters.search]);
  
  const createEscalationRequest = async () => {
    // Validate form
    const errors: Record<string, string> = {};
    if (!escalationForm.reason) {
      errors.reason = 'Please select a reason for escalation';
    }
    if (!escalationForm.reason_details) {
      errors.reason_details = 'Please provide details about the escalation reason';
    }
    if (escalationForm.escalation_type === 'repossess' || escalationForm.escalation_type === 'both') {
      if (!escalationForm.new_repossession_status) {
        errors.new_repossession_status = 'Please select a target repossession status';
      }
    }
    if (escalationForm.escalation_type === 'collection' || escalationForm.escalation_type === 'both') {
      if (!escalationForm.new_collection_condition) {
        errors.new_collection_condition = 'Please select a target collection condition';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setEscalationErrors(errors);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      
      const payload: any = {
        loan_id: escalationForm.loan_id,
        reason: escalationForm.reason,
        reason_details: escalationForm.reason_details,
        request_notes: escalationForm.request_notes,
        supporting_documents: escalationForm.supporting_documents
      };
      
      if (escalationForm.escalation_type === 'repossess' || escalationForm.escalation_type === 'both') {
        payload.new_repossession_status = escalationForm.new_repossession_status;
        payload.to_repossess = true;
      }
      
      if (escalationForm.escalation_type === 'collection' || escalationForm.escalation_type === 'both') {
        payload.new_collection_condition = escalationForm.new_collection_condition;
      }
      
      await client.post('/loan-processor/escalation/request/', payload);
      
      alert('Escalation request created successfully');
      setIsEscalateModalOpen(false);
      resetEscalationForm();
      fetchEscalatedLoans();
      fetchEscalationRequests();
    } catch (error: any) {
      console.error('Error creating escalation request:', error);
      alert(error.response?.data?.error || 'Failed to create escalation request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const approveRequest = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.post(`/loan-processor/escalation/request/${selectedRequest.id}/approve/`, {
        review_notes: reviewForm.review_notes
      });
      alert('Escalation request approved');
      setIsApproveModalOpen(false);
      setReviewForm({ review_notes: '' });
      fetchEscalationRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(error.response?.data?.error || 'Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const rejectRequest = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.post(`/loan-processor/escalation/request/${selectedRequest.id}/reject/`, {
        review_notes: reviewForm.review_notes
      });
      alert('Escalation request rejected');
      setIsRejectModalOpen(false);
      setReviewForm({ review_notes: '' });
      fetchEscalationRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(error.response?.data?.error || 'Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const executeRequest = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.post(`/loan-processor/escalation/request/${selectedRequest.id}/execute/`);
      alert('Escalation request executed successfully');
      setIsExecuteModalOpen(false);
      fetchEscalationRequests();
      fetchEscalatedLoans();
    } catch (error: any) {
      console.error('Error executing request:', error);
      alert(error.response?.data?.error || 'Failed to execute request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const cancelRequest = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.post(`/loan-processor/escalation/request/${selectedRequest.id}/cancel/`, {
        reason: cancelForm.reason
      });
      alert('Escalation request cancelled');
      setIsCancelModalOpen(false);
      setCancelForm({ reason: '' });
      fetchEscalationRequests();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      alert(error.response?.data?.error || 'Failed to cancel request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const triggerAutoEscalate = async () => {
    if (!confirm('This will auto-escalate all loans that are 21+ days overdue. Continue?')) return;
    
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      const response = await client.post('/loan-processor/escalation/auto/');
      alert(response.data.message || 'Auto-escalation completed');
      fetchEscalatedLoans();
    } catch (error: any) {
      console.error('Error triggering auto-escalation:', error);
      alert(error.response?.data?.error || 'Failed to auto-escalate');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetEscalationForm = () => {
    setEscalationForm({
      loan_id: '',
      escalation_type: 'repossess',
      to_repossess: true,
      new_repossession_status: '',
      new_collection_condition: '',
      reason: '',
      reason_details: '',
      request_notes: '',
      supporting_documents: []
    });
    setEscalationErrors({});
  };
  
  const resetFilters = () => {
    setFilters({
      officer_id: '',
      collection_condition: '',
      repossession_status: '',
      min_days_overdue: '',
      max_days_overdue: '',
      min_balance: '',
      max_balance: '',
      auto_escalated: '',
      to_repossess: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  // Load data on mount and filter changes
  useEffect(() => {
    if (activeTab === 'escalated') {
      fetchEscalatedLoans();
    } else if (activeTab === 'requests') {
      fetchEscalationRequests();
    }
  }, [activeTab, filters, pagination.page, fetchEscalatedLoans, fetchEscalationRequests]);
  
  // Helper functions
  const formatCurrency = (value: number) => `KSh ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString();
  
  // Table columns for escalated loans
  const escalatedLoansColumns = [
    {
      id: 'loan_id',
      label: 'Loan ID',
      accessor: (row: EscalatedLoan) => row.loan_id,
      Cell: (value: string, row: EscalatedLoan) => (
        <Link href={`/loans/${row.loan_id}`} target="_blank" className="text-blue-600 hover:text-blue-800 font-mono text-sm">
          {value}
        </Link>
      ),
      width: 140,
    },
    {
      id: 'customer_name',
      label: 'Customer',
      accessor: (row: EscalatedLoan) => row.customer_name,
      Cell: (value: string, row: EscalatedLoan) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.phone_number}</div>
        </div>
      ),
      width: 200,
    },
    {
      id: 'cumulative_balance',
      label: 'Balance',
      accessor: (row: EscalatedLoan) => row.cumulative_balance,
      Cell: (value: number) => (
        <span className="font-semibold text-orange-600">{formatCurrency(value)}</span>
      ),
      width: 130,
      align: 'right' as const,
    },
    {
      id: 'days_overdue',
      label: 'Days Overdue',
      accessor: (row: EscalatedLoan) => row.days_overdue,
      Cell: (value: number) => {
        let color = '';
        if (value > 90) color = 'bg-red-100 text-red-800';
        else if (value > 60) color = 'bg-orange-100 text-orange-800';
        else if (value > 30) color = 'bg-yellow-100 text-yellow-800';
        else color = 'bg-green-100 text-green-800';
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
            {value} days
          </span>
        );
      },
      width: 110,
      align: 'center' as const,
    },
    {
      id: 'repossession_status',
      label: 'Repossession Status',
      accessor: (row: EscalatedLoan) => row.repossession_status,
      Cell: (value: string) => <RepossessionStatusBadge status={value} />,
      width: 160,
      align: 'center' as const,
    },
    {
      id: 'collection_condition',
      label: 'Collection Condition',
      accessor: (row: EscalatedLoan) => row.collection_condition,
      Cell: (value: string) => <CollectionConditionBadge condition={value} />,
      width: 160,
      align: 'center' as const,
    },
    {
      id: 'is_auto_escalated',
      label: 'Auto',
      accessor: (row: EscalatedLoan) => row.is_auto_escalated,
      Cell: (value: boolean) => (
        value ? (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Auto</span>
        ) : (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">Manual</span>
        )
      ),
      width: 80,
      align: 'center' as const,
    },
    {
      id: 'assigned_officer',
      label: 'Officer',
      accessor: (row: EscalatedLoan) => row.assigned_officer || 'Unassigned',
      width: 120,
      align: 'center' as const,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: EscalatedLoan) => row,
      Cell: (value: EscalatedLoan, row: EscalatedLoan) => (
        <div className="flex justify-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => window.open(`/loans/${row.loan_id}`, '_blank')}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-blue-600"
                >
                  <Eye size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>View loan details</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ActionGuard requirement="can_create_escalation_request" fallback={null}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setSelectedLoan(row);
                      resetEscalationForm();
                      setEscalationForm(prev => ({ ...prev, loan_id: row.loan_id }));
                      setIsEscalateModalOpen(true);
                    }}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-orange-600"
                  >
                    <Flag size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Escalate loan</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </ActionGuard>
        </div>
      ),
      width: 100,
      align: 'center' as const,
    },
  ];
  
  // Table columns for escalation requests
  const escalationRequestsColumns = [
    {
      id: 'id',
      label: 'Request ID',
      accessor: (row: EscalationRequest) => row.id.substring(0, 8),
      Cell: (value: string) => <span className="font-mono text-xs">{value}...</span>,
      width: 100,
    },
    {
      id: 'loan_id',
      label: 'Loan',
      accessor: (row: EscalationRequest) => row.loan_id,
      Cell: (value: string, row: EscalationRequest) => (
        <div>
          <div className="font-mono text-sm">{value}</div>
          <div className="text-xs text-gray-500">{row.customer_name}</div>
        </div>
      ),
      width: 160,
    },
    {
      id: 'escalation_type',
      label: 'Type',
      accessor: (row: EscalationRequest) => row.escalation_type,
      Cell: (value: string) => {
        if (value === 'both') return <span className="text-xs text-purple-600">Both</span>;
        if (value === 'repossess') return <span className="text-xs text-red-600">Repossession</span>;
        if (value === 'collection') return <span className="text-xs text-blue-600">Condition</span>;
        return <span className="text-xs">-</span>;
      },
      width: 100,
      align: 'center' as const,
    },
    {
      id: 'reason',
      label: 'Reason',
      accessor: (row: EscalationRequest) => row.reason,
      Cell: (value: string, row: EscalationRequest) => (
        <div>
          <div className="text-sm">{value}</div>
          {row.reason_details && (
            <div className="text-xs text-gray-500 truncate max-w-xs">{row.reason_details}</div>
          )}
        </div>
      ),
      width: 200,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: EscalationRequest) => row.status,
      Cell: (value: string) => <StatusBadge status={value} />,
      width: 100,
      align: 'center' as const,
    },
    {
      id: 'requested_by',
      label: 'Requested By',
      accessor: (row: EscalationRequest) => row.requested_by,
      width: 120,
    },
    {
      id: 'requested_at',
      label: 'Requested At',
      accessor: (row: EscalationRequest) => formatDate(row.requested_at),
      width: 110,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: EscalationRequest) => row,
      Cell: (value: EscalationRequest, row: EscalationRequest) => (
        <div className="flex justify-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setSelectedRequest(row);
                    setIsRequestDetailModalOpen(true);
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-blue-600"
                >
                  <Eye size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>View details</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {row.status === 'pending' && (
            <>
              <ActionGuard requirement="can_approve_escalations" fallback={null}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setSelectedRequest(row);
                          setReviewForm({ review_notes: '' });
                          setIsApproveModalOpen(true);
                        }}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-green-600"
                      >
                        <CheckCircle size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Approve</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setSelectedRequest(row);
                          setReviewForm({ review_notes: '' });
                          setIsRejectModalOpen(true);
                        }}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-red-600"
                      >
                        <XCircle size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Reject</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </ActionGuard>
              <ActionGuard requirement="can_cancel_escalation" fallback={null}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setSelectedRequest(row);
                          setCancelForm({ reason: '' });
                          setIsCancelModalOpen(true);
                        }}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </ActionGuard>
            </>
          )}
          
          {row.status === 'approved' && (
            <ActionGuard requirement="can_execute_escalations" fallback={null}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setSelectedRequest(row);
                        setIsExecuteModalOpen(true);
                      }}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-blue-600"
                    >
                      <Play size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Execute</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </ActionGuard>
          )}
        </div>
      ),
      width: 120,
      align: 'center' as const,
    },
  ];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escalation Management</h1>
          <p className="text-gray-600 mt-2">View and manage escalated loans, repossession requests, and collection conditions</p>
        </div>
        
        <div className="flex space-x-3">
          <ActionGuard requirement="can_trigger_auto_escalation" fallback={null}>
            <Button onClick={triggerAutoEscalate} variant="outline" disabled={isSubmitting}>
              <Zap size={16} className="mr-2" />
              Auto-Escalate (21+ days)
            </Button>
          </ActionGuard>
          <Button variant="outline" onClick={() => { resetFilters(); fetchEscalatedLoans(); }}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Escalated</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.total_escalated)}</p>
                </div>
                <div className="rounded-full bg-orange-100 p-3">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Marked for Repossession</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.marked_for_repossession)}</p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <Gavel className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.in_progress)}</p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Repossessed</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.repossessed)}</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Cumulative Balance</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.total_cumulative_balance)}</p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="escalated" className="flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>Escalated Loans</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center space-x-2">
            <Send size={16} />
            <span>Escalation Requests</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Escalated Loans Tab */}
        <TabsContent value="escalated" className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center">
                <Filter size={16} className="text-gray-500 mr-2" />
                <span className="font-medium">Filters</span>
                {Object.values(filters).some(v => v && v !== '') && (
                  <Badge variant="secondary" className="ml-2">Active</Badge>
                )}
              </div>
              {showFilters ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {showFilters && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm">Officer</Label>
                    <Input
                      placeholder="Officer username or ID"
                      value={filters.officer_id}
                      onChange={(e) => setFilters(prev => ({ ...prev, officer_id: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Collection Condition</Label>
                    <select
                      value={filters.collection_condition}
                      onChange={(e) => setFilters(prev => ({ ...prev, collection_condition: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All</option>
                      {COLLECTION_CONDITIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm">Repossession Status</Label>
                    <select
                      value={filters.repossession_status}
                      onChange={(e) => setFilters(prev => ({ ...prev, repossession_status: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All</option>
                      {REPOSSESSION_STATUSES.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm">Search</Label>
                    <Input
                      placeholder="Loan ID or Customer name"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm">Min Days Overdue</Label>
                    <Input
                      type="number"
                      placeholder="Min days"
                      value={filters.min_days_overdue}
                      onChange={(e) => setFilters(prev => ({ ...prev, min_days_overdue: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Max Days Overdue</Label>
                    <Input
                      type="number"
                      placeholder="Max days"
                      value={filters.max_days_overdue}
                      onChange={(e) => setFilters(prev => ({ ...prev, max_days_overdue: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Min Balance</Label>
                    <Input
                      type="number"
                      placeholder="Min balance"
                      value={filters.min_balance}
                      onChange={(e) => setFilters(prev => ({ ...prev, min_balance: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Max Balance</Label>
                    <Input
                      type="number"
                      placeholder="Max balance"
                      value={filters.max_balance}
                      onChange={(e) => setFilters(prev => ({ ...prev, max_balance: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Auto-Escalated</Label>
                    <select
                      value={filters.auto_escalated}
                      onChange={(e) => setFilters(prev => ({ ...prev, auto_escalated: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm">Marked for Repossession</Label>
                    <select
                      value={filters.to_repossess}
                      onChange={(e) => setFilters(prev => ({ ...prev, to_repossess: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div className="flex items-end space-x-2">
                    <Button onClick={() => { setPagination(prev => ({ ...prev, page: 1 })); fetchEscalatedLoans(); }} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      Apply Filters
                    </Button>
                    <Button onClick={resetFilters} variant="outline" className="flex-1">
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Escalated Loans Table */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Escalated Loans</h2>
                {selectedRowIds.size > 0 && (
                  <ActionGuard requirement="can_create_escalation_request" fallback={null}>
                    <Button 
                      onClick={() => {
                        const firstLoan = escalatedLoans.find(l => selectedRowIds.has(l.id));
                        if (firstLoan) {
                          setSelectedLoan(firstLoan);
                          resetEscalationForm();
                          setEscalationForm(prev => ({ ...prev, loan_id: firstLoan.loan_id }));
                          setIsEscalateModalOpen(true);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      <Flag size={14} className="mr-2" />
                      Escalate Selected ({selectedRowIds.size})
                    </Button>
                  </ActionGuard>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <GenericTable
                data={escalatedLoans}
                columns={escalatedLoansColumns}
                rowKey={(row: EscalatedLoan) => row.id}
                selectionMode="multiple"
                onSelectionChange={(selectedRows) => {
                  setSelectedRowIds(new Set(selectedRows.map((row: EscalatedLoan) => row.id)));
                }}
                virtualized={true}
                pagination={{
                  totalCount: pagination.total,
                  currentPage: pagination.page,
                  pageSize: pagination.page_size,
                  onPageChange: (newPage) => setPagination(prev => ({ ...prev, page: newPage as number })),
                  serverSide: true,
                  hasNextPage: pagination.page < pagination.total_pages,
                  hasPreviousPage: pagination.page > 1
                }}
                className="rounded-b-xl"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Escalation Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Escalation Requests</h2>
            </CardHeader>
            <CardContent className="p-0">
              <GenericTable
                data={escalationRequests}
                columns={escalationRequestsColumns}
                rowKey={(row: EscalationRequest) => row.id}
                virtualized={true}
                className="rounded-b-xl"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Create Escalation Modal */}
      <Modal
        isOpen={isEscalateModalOpen}
        onClose={() => {
          setIsEscalateModalOpen(false);
          setSelectedLoan(null);
          resetEscalationForm();
        }}
        title={`Escalate Loan: ${selectedLoan?.loan_id || escalationForm.loan_id} - ${selectedLoan?.customer_name || ''}`}
        size="xl"
      >
        <div className="space-y-6 max-h-[85vh] overflow-y-auto px-1">
          {/* Selected Loans Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <ClipboardList size={18} />
              <span className="font-medium">Selected Loan</span>
            </div>
            {selectedLoan && (
              <div className="text-sm text-blue-700">
                <div>Loan ID: {selectedLoan.loan_id}</div>
                <div>Customer: {selectedLoan.customer_name}</div>
                <div>Current Balance: {formatCurrency(selectedLoan.cumulative_balance)}</div>
                <div>Days Overdue: {selectedLoan.days_overdue} days</div>
              </div>
            )}
          </div>

          {/* Tabs for Escalation Type */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-4">
              <button
                className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
                  escalationForm.escalation_type === 'repossess'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setEscalationForm({...escalationForm, escalation_type: 'repossess', to_repossess: true, new_repossession_status: '', new_collection_condition: ''})}
              >
                <Gavel size={16} className="inline mr-2" />
                Repossession Status
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
                  escalationForm.escalation_type === 'collection'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setEscalationForm({...escalationForm, escalation_type: 'collection', to_repossess: false, new_repossession_status: '', new_collection_condition: ''})}
              >
                <ShieldAlert size={16} className="inline mr-2" />
                Collection Condition
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
                  escalationForm.escalation_type === 'both'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setEscalationForm({...escalationForm, escalation_type: 'both', to_repossess: true})}
              >
                <Flag size={16} className="inline mr-2" />
                Both
              </button>
            </nav>
          </div>

          {/* Repossession Status Change Section */}
          {(escalationForm.escalation_type === 'repossess' || escalationForm.escalation_type === 'both') && (
            <div>
              <Label className="flex items-center gap-2 mb-3 text-base font-semibold">
                <Gavel size={18} className="text-red-500" />
                Change Repossession Status
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {REPOSSESSION_STATUSES_FOR_ESCALATION.map((status) => {
                  const Icon = status.icon;
                  const isSelected = escalationForm.new_repossession_status === status.value;
                  return (
                    <div
                      key={status.value}
                      onClick={() => setEscalationForm({...escalationForm, new_repossession_status: status.value})}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${status.color}`}>
                          <Icon size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{status.label}</div>
                          <div className="text-xs text-gray-500 mt-1">{status.description}</div>
                        </div>
                        {isSelected && (
                          <div className="text-red-500">
                            <CheckCircle size={18} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {escalationErrors.new_repossession_status && (
                <p className="text-red-500 text-sm mt-2">{escalationErrors.new_repossession_status}</p>
              )}
            </div>
          )}

          {/* Collection Condition Change Section */}
          {(escalationForm.escalation_type === 'collection' || escalationForm.escalation_type === 'both') && (
            <div>
              <Label className="flex items-center gap-2 mb-3 text-base font-semibold">
                <ShieldAlert size={18} className="text-blue-500" />
                Change Collection Condition
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {COLLECTION_CONDITIONS_FOR_ESCALATION.map((condition) => {
                  const Icon = condition.icon;
                  const isSelected = escalationForm.new_collection_condition === condition.value;
                  return (
                    <div
                      key={condition.value}
                      onClick={() => setEscalationForm({...escalationForm, new_collection_condition: condition.value})}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${condition.color}`}>
                          <Icon size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{condition.label}</div>
                          <div className="text-xs text-gray-500 mt-1">{condition.description}</div>
                        </div>
                        {isSelected && (
                          <div className="text-blue-500">
                            <CheckCircle size={18} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {escalationErrors.new_collection_condition && (
                <p className="text-red-500 text-sm mt-2">{escalationErrors.new_collection_condition}</p>
              )}
            </div>
          )}

          {/* Escalation Reason */}
          <div>
            <Label className="flex items-center gap-2 mb-2 text-base font-semibold">
              <AlertTriangle size={18} className="text-amber-500" />
              Escalation Reason <span className="text-red-500">*</span>
            </Label>
            <Select
              value={escalationForm.reason}
              onValueChange={(value) => setEscalationForm({...escalationForm, reason: value})}
            >
              <SelectTrigger className={escalationErrors.reason ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select reason for escalation" />
              </SelectTrigger>
              <SelectContent>
                {ESCALATION_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {escalationErrors.reason && (
              <p className="text-red-500 text-sm mt-1">{escalationErrors.reason}</p>
            )}
          </div>

          {/* Reason Details */}
          <div>
            <Label className="flex items-center gap-2 mb-2 text-base font-semibold">
              <FileText size={18} className="text-amber-500" />
              Reason Details <span className="text-red-500">*</span>
            </Label>
            <textarea
              value={escalationForm.reason_details}
              onChange={(e) => setEscalationForm({...escalationForm, reason_details: e.target.value})}
              placeholder="Provide detailed explanation of why this escalation is needed..."
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${escalationErrors.reason_details ? 'border-red-500' : 'border-gray-300'}`}
            />
            {escalationErrors.reason_details && (
              <p className="text-red-500 text-sm mt-1">{escalationErrors.reason_details}</p>
            )}
          </div>

          {/* Request Notes */}
          <div>
            <Label className="flex items-center gap-2 mb-2 text-base font-semibold">
              <Info size={18} className="text-blue-500" />
              Additional Notes (Optional)
            </Label>
            <textarea
              value={escalationForm.request_notes}
              onChange={(e) => setEscalationForm({...escalationForm, request_notes: e.target.value})}
              placeholder="Any additional information that might help the approver..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
            />
          </div>

          {/* Summary Box */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Info size={18} className="text-blue-600" />
              <span className="font-semibold text-blue-800">Escalation Summary</span>
            </div>
            <div className="space-y-2 text-sm">
              {(escalationForm.escalation_type !== 'collection' && escalationForm.new_repossession_status) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">New Repossession Status:</span>
                  <span className="font-medium text-red-700">
                    {REPOSSESSION_STATUSES_FOR_ESCALATION.find(s => s.value === escalationForm.new_repossession_status)?.label}
                  </span>
                </div>
              )}
              {(escalationForm.escalation_type !== 'repossess' && escalationForm.new_collection_condition) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">New Collection Condition:</span>
                  <span className="font-medium text-blue-700">
                    {COLLECTION_CONDITIONS_FOR_ESCALATION.find(c => c.value === escalationForm.new_collection_condition)?.label}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Reason:</span>
                <span className="font-medium">{ESCALATION_REASONS.find(r => r.value === escalationForm.reason)?.label}</span>
              </div>
              <div className="border-t border-blue-200 pt-2 mt-2">
                <p className="text-xs text-blue-700">
                  This request will be sent for approval. Once approved, it will be executed automatically.
                  You will be notified when the status changes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t mt-4">
          <Button variant="outline" onClick={() => setIsEscalateModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={createEscalationRequest} 
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <SendIcon size={16} className="mr-2" />
                Submit Escalation Request
              </>
            )}
          </Button>
        </div>
      </Modal>
      
      {/* Request Detail Modal */}
      <Modal
        isOpen={isRequestDetailModalOpen}
        onClose={() => {
          setIsRequestDetailModalOpen(false);
          setSelectedRequest(null);
        }}
        title="Escalation Request Details"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500">Request ID</p>
                <p className="font-mono text-sm">{selectedRequest.id}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500">Status</p>
                <StatusBadge status={selectedRequest.status} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Loan ID</p>
                <p className="font-mono text-sm">{selectedRequest.loan_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-medium">{selectedRequest.customer_name}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Escalation Type</p>
                <p className="text-sm">
                  {selectedRequest.new_repossession_status && selectedRequest.new_collection_condition ? 'Both' :
                   selectedRequest.new_repossession_status ? 'Repossession' :
                   selectedRequest.new_collection_condition ? 'Collection Condition Change' : 'None'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reason</p>
                <p className="text-sm">{selectedRequest.reason}</p>
              </div>
            </div>
            
            {selectedRequest.new_repossession_status && (
              <div>
                <p className="text-xs text-gray-500">Target Repossession Status</p>
                <RepossessionStatusBadge status={selectedRequest.new_repossession_status} />
              </div>
            )}
            
            {selectedRequest.new_collection_condition && (
              <div>
                <p className="text-xs text-gray-500">Target Collection Condition</p>
                <CollectionConditionBadge condition={selectedRequest.new_collection_condition} />
              </div>
            )}
            
            {selectedRequest.reason_details && (
              <div>
                <p className="text-xs text-gray-500">Reason Details</p>
                <p className="text-sm bg-gray-50 p-2 rounded">{selectedRequest.reason_details}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Requested By</p>
                <p className="text-sm">{selectedRequest.requested_by}</p>
                <p className="text-xs text-gray-400">{formatDateTime(selectedRequest.requested_at)}</p>
              </div>
              {selectedRequest.reviewed_by && (
                <div>
                  <p className="text-xs text-gray-500">Reviewed By</p>
                  <p className="text-sm">{selectedRequest.reviewed_by}</p>
                  <p className="text-xs text-gray-400">{selectedRequest.reviewed_at ? formatDateTime(selectedRequest.reviewed_at) : 'N/A'}</p>
                </div>
              )}
            </div>
            
            {selectedRequest.review_notes && (
              <div>
                <p className="text-xs text-gray-500">Review Notes</p>
                <p className="text-sm bg-gray-50 p-2 rounded">{selectedRequest.review_notes}</p>
              </div>
            )}
            
            {selectedRequest.executed_by && (
              <div>
                <p className="text-xs text-gray-500">Executed By</p>
                <p className="text-sm">{selectedRequest.executed_by}</p>
                <p className="text-xs text-gray-400">{selectedRequest.executed_at ? formatDateTime(selectedRequest.executed_at) : 'N/A'}</p>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setIsRequestDetailModalOpen(false)}>Close</Button>
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
          setReviewForm({ review_notes: '' });
        }}
        title="Approve Escalation Request"
        size="md"
      >
        <div className="space-y-4">
          {selectedRequest && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm">Loan: <span className="font-medium">{selectedRequest.loan_id}</span></p>
              <p className="text-sm mt-1">Reason: <span className="font-medium">{selectedRequest.reason}</span></p>
            </div>
          )}
          
          <div>
            <Label className="text-sm font-semibold">Review Notes (Optional)</Label>
            <Textarea
              value={reviewForm.review_notes}
              onChange={(e) => setReviewForm(prev => ({ ...prev, review_notes: e.target.value }))}
              placeholder="Add any notes about your decision..."
              rows={3}
              className="mt-1"
            />
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle size={16} className="text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                Approving this request will mark it as approved. It will need to be executed separately.
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>Cancel</Button>
            <Button onClick={approveRequest} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />}
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
          setReviewForm({ review_notes: '' });
        }}
        title="Reject Escalation Request"
        size="md"
      >
        <div className="space-y-4">
          {selectedRequest && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm">Loan: <span className="font-medium">{selectedRequest.loan_id}</span></p>
              <p className="text-sm mt-1">Reason: <span className="font-medium">{selectedRequest.reason}</span></p>
            </div>
          )}
          
          <div>
            <Label className="text-sm font-semibold">Rejection Reason</Label>
            <Textarea
              value={reviewForm.review_notes}
              onChange={(e) => setReviewForm(prev => ({ ...prev, review_notes: e.target.value }))}
              placeholder="Explain why this request is being rejected..."
              rows={3}
              className="mt-1"
              required
            />
          </div>
          
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <XCircle size={16} className="text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                Rejecting this request will close it. The requester can create a new request if needed.
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button onClick={rejectRequest} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <XCircle size={16} className="mr-2" />}
              Reject Request
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Execute Modal */}
      <Modal
        isOpen={isExecuteModalOpen}
        onClose={() => {
          setIsExecuteModalOpen(false);
          setSelectedRequest(null);
        }}
        title="Execute Escalation Request"
        size="md"
      >
        <div className="space-y-4">
          {selectedRequest && (
            <>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm">Loan: <span className="font-medium">{selectedRequest.loan_id}</span></p>
                <p className="text-sm mt-1">Reason: <span className="font-medium">{selectedRequest.reason}</span></p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Play size={16} className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    This will apply the following changes:
                    {selectedRequest.new_repossession_status && (
                      <li className="ml-4">✓ Change repossession status to {selectedRequest.new_repossession_status}</li>
                    )}
                    {selectedRequest.new_collection_condition && (
                      <li className="ml-4">✓ Change collection condition to {selectedRequest.new_collection_condition}</li>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    This action cannot be undone. Make sure you have reviewed the request thoroughly.
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsExecuteModalOpen(false)}>Cancel</Button>
            <Button onClick={executeRequest} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Play size={16} className="mr-2" />}
              Execute Request
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Cancel Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedRequest(null);
          setCancelForm({ reason: '' });
        }}
        title="Cancel Escalation Request"
        size="md"
      >
        <div className="space-y-4">
          {selectedRequest && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm">Loan: <span className="font-medium">{selectedRequest.loan_id}</span></p>
              <p className="text-sm mt-1">Reason: <span className="font-medium">{selectedRequest.reason}</span></p>
            </div>
          )}
          
          <div>
            <Label className="text-sm font-semibold">Cancellation Reason</Label>
            <Textarea
              value={cancelForm.reason}
              onChange={(e) => setCancelForm(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Why is this request being cancelled?"
              rows={3}
              className="mt-1"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>Cancel</Button>
            <Button onClick={cancelRequest} disabled={isSubmitting} className="bg-gray-600 hover:bg-gray-700">
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <X size={16} className="mr-2" />}
              Cancel Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}