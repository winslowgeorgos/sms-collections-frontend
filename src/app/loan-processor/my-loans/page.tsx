// app/loan-processor/my-loans/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api';
import { MyLoan } from '@/types/index';
import { 
  RefreshCw, Eye, AlertCircle, 
  CheckCircle, Calendar, Phone, X,
  SlidersHorizontal, Filter, Clock, PhoneCall,
  CalendarRange, TrendingUp, DollarSign, Users,
  Info, Plus, Minus, CalendarDays, Gavel, 
  ShieldAlert, Car, Scale, Ban, Briefcase,
  FileText, Flag, AlertTriangle, Send, 
  UserCheck, Building, Home, ClipboardList
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface MyLoansResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: MyLoan[];
}

interface FilterState {
  loan_id?: string;
  customer_name?: string;
  phone_number?: string;
  registration_number?: string;
  identity_num?: string;
  status?: string;
  is_overdue?: string;
  total_amount_min?: string;
  total_amount_max?: string;
  outstanding_min?: string;
  outstanding_max?: string;
  assigned_after?: string;
  assigned_before?: string;
  due_date_after?: string;
  due_date_before?: string;
  disburse_date_after?: string;
  disburse_date_before?: string;
  current_month_only?: string;
  call_log_created_after?: string;
  call_log_created_before?: string;
  without_call_log_created_after?: string;
  without_call_log_created_before?: string;
  current_installment_due_date_start?: string;
  current_installment_due_date_end?: string;
  cumulative_balance_gt_zero?: string;
  actual_repossessed?: string;
  auto_escalated_after?: string;
  auto_escalated_before?: string;
  auto_escalated_has?: string;
  collection_condition?: string;
  collection_condition_not?: string;
  repossession_completed_after?: string;
  repossession_completed_before?: string;
  repossession_completed_has?: string;
  repossession_marked_after?: string;
  repossession_marked_before?: string;
  repossession_marked_has?: string;
  repossession_status?: string;
  repossession_status_not?: string;
  to_repossess?: string;
  ordering?: string;
  page_size?: string;
}

// Escalation Request Interface
interface EscalationRequest {
  loan_id: string;
  installment_id?: number;
  to_repossess: boolean;
  new_collection_condition?: string;
  reason: string;
  reason_details: string;
  request_notes: string;
  supporting_documents?: string[];
}

// Escalation Reasons (from models.py)
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

// Collection condition options based on models.py
const COLLECTION_CONDITIONS = [
  { value: 'collectable', label: 'Collectable (Default)' },
  { value: 'in_yard', label: 'In the Yard' },
  { value: 'police_case', label: 'Police Case' },
  { value: 'law_court', label: 'Law Court' },
  { value: 'in_auction', label: 'In Auctioneer' },
  { value: 'third_party', label: 'Third Party Collection' },
  { value: 'restructured', label: 'Restructured Payment Plan' },
  { value: 'written_off', label: 'Written Off' },
  { value: 'settled', label: 'Settled' },
];

// Repossession status options
const REPOSSESSION_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'marked', label: 'Marked for Repossession' },
  { value: 'in_progress', label: 'Repossession in Progress' },
  { value: 'repossessed', label: 'Repossessed' },
  { value: 'released', label: 'Released (Customer Paid)' },
  { value: 'court_ordered', label: 'Court Ordered' },
  { value: 'disputed', label: 'Disputed' },
];

export default function MyLoansPage() {
  const router = useRouter();
  const [data, setData] = useState<MyLoansResponse>({
    count: 0,
    page: 1,
    page_size: 500,
    total_pages: 1,
    results: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);
  
  // Escalation Modal State
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [isSubmittingEscalation, setIsSubmittingEscalation] = useState(false);
  const [escalationForm, setEscalationForm] = useState<EscalationRequest>({
    loan_id: '',
    to_repossess: false,
    reason: '',
    reason_details: '',
    request_notes: '',
    supporting_documents: [],
  });
  const [escalationErrors, setEscalationErrors] = useState<Record<string, string>>({});
  
  // ============ SET DEFAULT FILTERS HERE ============
  const [filters, setFilters] = useState<FilterState>({
    cumulative_balance_gt_zero: 'true'
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filter state
  const [advancedFilters, setAdvancedFilters] = useState({
    loan_id: '',
    customer_name: '',
    phone_number: '',
    registration_number: '',
    identity_num: '',
    status: null as string | null,
    is_overdue: null as string | null,
    total_amount_min: '',
    total_amount_max: '',
    outstanding_min: '',
    outstanding_max: '',
    assigned_after: '',
    assigned_before: '',
    due_date_after: '',
    due_date_before: '',
    disburse_date_after: '',
    disburse_date_before: '',
    current_month_only: null as string | null,
    call_log_created_after: '',
    call_log_created_before: '',
    without_call_log_created_after: '',
    without_call_log_created_before: '',
    current_installment_due_date_start: '',
    current_installment_due_date_end: '',
    cumulative_balance_gt_zero: 'true',
    actual_repossessed: null as string | null,
    auto_escalated_after: '',
    auto_escalated_before: '',
    auto_escalated_has: null as string | null,
    collection_condition: '',
    collection_condition_not: '',
    repossession_completed_after: '',
    repossession_completed_before: '',
    repossession_completed_has: null as string | null,
    repossession_marked_after: '',
    repossession_marked_before: '',
    repossession_marked_has: null as string | null,
    repossession_status: '',
    repossession_status_not: '',
    to_repossess: null as string | null,
    ordering: '-disburse_time',
  });

  const fetchMyLoans = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '500'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && value !== undefined) {
          params.append(key, value.toString());
        }
      });
      
      const url = `/loans/my_loans/?${params.toString()}`;
      const response = await client.get(url);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching my loans:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, filters]);

  useEffect(() => {
    fetchMyLoans();
  }, [fetchMyLoans]);

  const handleViewLoanDetails = (loanId: string) => {
    window.open(`/loans/${loanId}`, '_blank');
  };

  const handleOpenEscalationModal = (loanId?: string) => {
    if (selectedLoans.length === 0 && !loanId) {
      alert('Please select at least one loan to escalate');
      return;
    }
    
    // Reset form
    setEscalationForm({
      loan_id: loanId || (selectedLoans.length === 1 ? selectedLoans[0] : ''),
      installment_id: undefined,
      to_repossess: false,
      reason: '',
      reason_details: '',
      request_notes: '',
      supporting_documents: [],
    });
    setEscalationErrors({});
    setIsEscalationModalOpen(true);
  };

  const handleSubmitEscalation = async () => {
    // Validate form
    const errors: Record<string, string> = {};
    if (!escalationForm.reason) {
      errors.reason = 'Please select a reason for escalation';
    }
    if (!escalationForm.reason_details) {
      errors.reason_details = 'Please provide details about the escalation reason';
    }
    
    if (Object.keys(errors).length > 0) {
      setEscalationErrors(errors);
      return;
    }
    
    setIsSubmittingEscalation(true);
    
    try {
      const client = apiClient.getClient();
      
      // If multiple loans selected, send bulk escalation requests
      const loansToEscalate = escalationForm.loan_id 
        ? [escalationForm.loan_id] 
        : selectedLoans;
      
      const results = [];
      let successCount = 0;
      let failCount = 0;
      
      for (const loanId of loansToEscalate) {
        try {
          const payload = {
            loan_id: loanId,
            to_repossess: escalationForm.to_repossess,
            new_collection_condition: escalationForm.new_collection_condition,
            reason: escalationForm.reason,
            reason_details: escalationForm.reason_details,
            request_notes: escalationForm.request_notes,
            supporting_documents: escalationForm.supporting_documents,
          };
          
          const response = await client.post('/loan-processor/escalation/request/', payload);
          results.push({ loanId, success: true, data: response.data });
          successCount++;
        } catch (error: any) {
          results.push({ loanId, success: false, error: error.response?.data?.error || error.message });
          failCount++;
        }
      }
      
      setIsEscalationModalOpen(false);
      setSelectedLoans([]);
      
      // Show summary
      if (successCount > 0) {
        alert(
          `Escalation request${successCount > 1 ? 's' : ''} submitted successfully!\n\n` +
          `Successful: ${successCount}\n` +
          `Failed: ${failCount}\n\n` +
          `Your request${successCount > 1 ? 's have' : ' has'} been sent for approval.`
        );
        await fetchMyLoans();
      } else {
        alert(`Failed to submit escalation request. Please try again.`);
      }
      
    } catch (error) {
      console.error('Error submitting escalation:', error);
      alert('Failed to submit escalation request. Please try again.');
    } finally {
      setIsSubmittingEscalation(false);
    }
  };

  const handleServerFilterChange = (newFilters: Record<string, any>) => {
    const apiFilters: FilterState = {};
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (!value || value === '' || (typeof value === 'object' && Object.keys(value).length === 0)) return;
      
      if (key === 'total_amount' && typeof value === 'object') {
        if (value.min) apiFilters.total_amount_min = value.min;
        if (value.max) apiFilters.total_amount_max = value.max;
      } 
      else if (key === 'total_outstanding' && typeof value === 'object') {
        if (value.min) apiFilters.outstanding_min = value.min;
        if (value.max) apiFilters.outstanding_max = value.max;
      }
      else if (key === 'due_date' && typeof value === 'object') {
        if (value.start) apiFilters.due_date_after = value.start;
        if (value.end) apiFilters.due_date_before = value.end;
      }
      else if (key === 'assigned_at' && typeof value === 'object') {
        if (value.start) apiFilters.assigned_after = value.start;
        if (value.end) apiFilters.assigned_before = value.end;
      }
      else if (key === 'status') {
        if (value === 'Overdue') apiFilters.is_overdue = 'true';
        else if (value === 'Current') apiFilters.is_overdue = 'false';
        else if (value === 'Paid') {
          apiFilters.outstanding_min = '0';
          apiFilters.outstanding_max = '0';
        }
      }
      else {
        apiFilters[key as keyof FilterState] = value;
      }
    });
    
    setFilters(apiFilters);
    setPage(1);
  };

  const handleServerSearchChange = (search: string) => {
    setSearchTerm(search);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ cumulative_balance_gt_zero: 'true' });
    setSearchTerm('');
    setPage(1);
    setAdvancedFilters({
      loan_id: '',
      customer_name: '',
      phone_number: '',
      registration_number: '',
      identity_num: '',
      status: null,
      is_overdue: null,
      total_amount_min: '',
      total_amount_max: '',
      outstanding_min: '',
      outstanding_max: '',
      assigned_after: '',
      assigned_before: '',
      due_date_after: '',
      due_date_before: '',
      disburse_date_after: '',
      disburse_date_before: '',
      current_month_only: null,
      call_log_created_after: '',
      call_log_created_before: '',
      without_call_log_created_after: '',
      without_call_log_created_before: '',
      current_installment_due_date_start: '',
      current_installment_due_date_end: '',
      cumulative_balance_gt_zero: 'true',
      actual_repossessed: null,
      auto_escalated_after: '',
      auto_escalated_before: '',
      auto_escalated_has: null,
      collection_condition: '',
      collection_condition_not: '',
      repossession_completed_after: '',
      repossession_completed_before: '',
      repossession_completed_has: null,
      repossession_marked_after: '',
      repossession_marked_before: '',
      repossession_marked_has: null,
      repossession_status: '',
      repossession_status_not: '',
      to_repossess: null,
      ordering: '-disburse_time',
    });
    setSelectedLoans([]);
  };

  const applyAdvancedFilters = () => {
    const newFilters: FilterState = {};
    
    Object.entries(advancedFilters).forEach(([key, value]) => {
      if (!value || value === '' || value === null) return;
      
      if (key === 'status') {
        if (value === 'Overdue') newFilters.is_overdue = 'true';
        else if (value === 'Current') newFilters.is_overdue = 'false';
        else if (value === 'Paid') {
          newFilters.outstanding_min = '0';
          newFilters.outstanding_max = '0';
        }
      } 
      else if (key === 'current_month_only' && value === 'true') {
        newFilters.current_month_only = 'true';
      }
      else if (key === 'ordering') {
        newFilters.ordering = value;
      }
      else {
        newFilters[key as keyof FilterState] = value;
      }
    });
    
    setFilters(newFilters);
    setPage(1);
    setShowAdvancedFilters(false);
  };

  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      loan_id: '',
      customer_name: '',
      phone_number: '',
      registration_number: '',
      identity_num: '',
      status: null,
      is_overdue: null,
      total_amount_min: '',
      total_amount_max: '',
      outstanding_min: '',
      outstanding_max: '',
      assigned_after: '',
      assigned_before: '',
      due_date_after: '',
      due_date_before: '',
      disburse_date_after: '',
      disburse_date_before: '',
      current_month_only: null,
      call_log_created_after: '',
      call_log_created_before: '',
      without_call_log_created_after: '',
      without_call_log_created_before: '',
      current_installment_due_date_start: '',
      current_installment_due_date_end: '',
      cumulative_balance_gt_zero: 'true',
      actual_repossessed: null,
      auto_escalated_after: '',
      auto_escalated_before: '',
      auto_escalated_has: null,
      collection_condition: '',
      collection_condition_not: '',
      repossession_completed_after: '',
      repossession_completed_before: '',
      repossession_completed_has: null,
      repossession_marked_after: '',
      repossession_marked_before: '',
      repossession_marked_has: null,
      repossession_status: '',
      repossession_status_not: '',
      to_repossess: null,
      ordering: '-disburse_time',
    });
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== '').length + (searchTerm ? 1 : 0);

  const columns = [
    {
      id: 'loan_id',
      label: 'Loan ID',
      accessor: (row: MyLoan) => row.loan_id,
      Cell: (value: string, row: MyLoan) => (
        <button
          onClick={() => handleViewLoanDetails(row.loan_id)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm transition-colors"
        >
          {value}
        </button>
      ),
      width: 140,
      filter: { type: 'text' as const, placeholder: 'Search loan ID...' }
    },
    {
      id: 'customer_name',
      label: 'Customer Name',
      accessor: (row: MyLoan) => row.customer_name,
      width: 220,
      filter: { type: 'text' as const, placeholder: 'Search customer...' }
    },
    {
      id: 'phone_number',
      label: 'Phone',
      accessor: (row: MyLoan) => row.phone_number,
      width: 120,
      filter: { type: 'text' as const, placeholder: 'Search phone...' }
    },
    {
      id: 'registration_number',
      label: 'Registration',
      accessor: (row: MyLoan) => row.registration_number || '-',
      width: 120,
      filter: { type: 'text' as const, placeholder: 'Search reg number...' }
    },
    {
      id: 'total_amount',
      label: 'Total Amount',
      accessor: (row: MyLoan) => row.total_amount,
      Cell: (value: string) => (
        <span className="font-medium text-gray-900">KSh {parseFloat(value).toLocaleString()}</span>
      ),
      width: 130,
      filter: { type: 'number_range' as const, placeholder: 'Amount' }
    },
    {
      id: 'current_month_total_due',
      label: 'Outstanding Cumulative',
      accessor: (row: MyLoan) => row.current_month_total_due,
      Cell: (value: string, row: MyLoan) => {
        const outstanding = parseFloat(value);
        return (
          <span className={outstanding > 0 ? 'text-amber-700 font-medium' : 'text-green-700'}>
            KSh {outstanding.toLocaleString()}
          </span>
        );
      },
      width: 140,
      filter: { type: 'number_range' as const, placeholder: 'Outstanding' }
    },
    {
      id: 'current_month_installment_due_date',
      label: 'Current Month Due',
      accessor: (row: MyLoan) => row.current_month_installment_due_date,
      Cell: (value: string) => {
        if (!value) return <span className="text-gray-400">No current month</span>;
        const dueDate = new Date(value);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let colorClass = 'text-gray-600';
        let bgClass = '';
        
        return (
          <div className={`px-2 py-1 rounded-md ${bgClass} ${colorClass} font-medium`}>
            {dueDate.toLocaleDateString()}
            <span className="text-xs block mt-0.5">
              {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
            </span>
          </div>
        );
      },
      width: 130,
      filter: { type: 'date_range' as const, placeholder: 'Due date' }
    },
    {
      id: 'collection_condition',
      label: 'Collection Condition',
      accessor: (row: MyLoan) => row.collection_condition_display || 'Collectable',
      Cell: (value: string) => {
        let variant: 'outline' | 'secondary' | 'warning' | 'error' | 'success' = 'secondary';
        if (value.includes('Yard') || value.includes('Auction')) variant = 'warning';
        if (value.includes('Police') || value.includes('Court')) variant = 'error';
        if (value.includes('Settled') || value.includes('Written Off')) variant='outline';
        return <Badge variant={variant}>{value}</Badge>;
      },
      width: 160,
    },
    {
      id: 'to_repossess',
      label: 'Repossession',
      accessor: (row: MyLoan) => row.to_repossess,
      Cell: (value: boolean) => (
        value ? (
          <Badge variant="error" className="gap-1">
            <Gavel size={12} /> Marked
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle size={12} /> Not Marked
          </Badge>
        )
      ),
      width: 120,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: MyLoan) => {
        const isOverdue = row.current_month_installment_due_date ? new Date(row.current_month_installment_due_date) < new Date() && parseFloat(row.current_month_total_due) > 0 && row.has_current_month_installment === true : false;
        const hasOutstanding = parseFloat(row.current_month_total_due) > 0;
        if (row.has_current_month_installment === false) return 'Undue';
        if (hasOutstanding && isOverdue) return 'Overdue';
        if (hasOutstanding) return 'Current';
        return 'Paid';
      },
      Cell: (value: string, row: MyLoan) => {
        const isOverdue = row.current_month_installment_due_date ? new Date(row.current_month_installment_due_date) < new Date() && parseFloat(row.current_month_total_due) > 0 && row.has_current_month_installment === true : false;
        const hasOutstanding = parseFloat(row.current_month_total_due) > 0;
        if(row.has_current_month_installment === false) {
          return (
            <Badge variant="secondary" className="gap-1">
              <Calendar size={12} /> Undue
            </Badge>
          );
        }
        else if (hasOutstanding && isOverdue) {
          return (
            <Badge variant="error" className="gap-1">
              <AlertCircle size={12} /> Overdue
            </Badge>
          );
        } else if (hasOutstanding) {
          return (
            <Badge variant="warning" className="bg-amber-100 text-amber-800 hover:bg-amber-200 gap-1">
              <Calendar size={12} /> Current
            </Badge>
          );
        } else {
          return (
            <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200 gap-1">
              <CheckCircle size={12} /> Paid
            </Badge>
          );
        }
      },
      width: 100,
      filter: {
        type: 'choices' as const,
        choices: ['Overdue', 'Current', 'Paid', 'Undue'],
        placeholder: 'Status'
      }
    },
    {
      id: 'assigned_by_details',
      label: 'Assigned By',
      accessor: (row: MyLoan) => row.assigned_by_details?.username || 'System',
      Cell: (value: string, row: MyLoan) => (
        <span className="text-gray-600">{row.assigned_by_details?.username || 'System'}</span>
      ),
      width: 120,
    },
    {
      id: 'assigned_at',
      label: 'Assigned On',
      accessor: (row: MyLoan) => new Date(row.assigned_at).toLocaleDateString(),
      width: 110,
      filter: { type: 'date_range' as const, placeholder: 'Assigned date' }
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: MyLoan) => row,
      Cell: (value: MyLoan, row: MyLoan) => (
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleViewLoanDetails(row.loan_id)}
                  className="text-blue-600 hover:text-blue-800 transition-colors p-1.5 rounded-full hover:bg-blue-50"
                >
                  <Eye size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>View loan details</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push(`/call-logs/new?loan=${row.loan_id}`)}
                  className="text-green-600 hover:text-green-800 transition-colors p-1.5 rounded-full hover:bg-green-50"
                >
                  <Phone size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Log a call</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleOpenEscalationModal(row.loan_id)}
                  className="text-red-600 hover:text-red-800 transition-colors p-1.5 rounded-full hover:bg-red-50"
                >
                  <Flag size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Escalate loan</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      width: 120,
    },
  ];

  const totalOutstanding = data.results.reduce((sum, loan) => sum + parseFloat(loan.current_month_total_due || '0'), 0);
  const totalAmount = data.results.reduce((sum, loan) => sum + parseFloat(loan.total_amount || '0'), 0);
  const collectedAmount = totalAmount - totalOutstanding;
  const collectionRate = totalAmount === 0 ? 0 : (collectedAmount / totalAmount) * 100;
  const overdueLoans = data.results.filter(loan => loan.is_overdue_status && parseFloat(loan.total_outstanding || '0') > 0).length;
  const paidLoans = data.results.filter(loan => parseFloat(loan.total_outstanding || '0') === 0).length;
  const repossessedLoans = data.results.filter(loan => loan.actual_repossessed === true).length;
  const escalatedLoans = data.results.filter(loan => loan.auto_escalated_at !== null).length;

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            My Assigned Loans
          </h1>
          <p className="text-gray-600 mt-1">Track and manage loans assigned to you for collection</p>
        </div>
        <div className="flex space-x-3">
          {selectedLoans.length > 0 && (
            <Button 
              onClick={() => handleOpenEscalationModal()}
              className="bg-red-600 hover:bg-red-700 shadow-sm hover:shadow transition-all"
            >
              <Flag size={18} className="mr-2" />
              Escalate Selected ({selectedLoans.length})
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowAdvancedFilters(true)}
            className="relative shadow-sm hover:shadow transition-all"
          >
            <SlidersHorizontal size={18} className="mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={fetchMyLoans} className="shadow-sm hover:shadow transition-all">
            <RefreshCw size={18} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Assigned Loans</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{data.count}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

 
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Repossessed</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{repossessedLoans}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Gavel className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Escalated</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{escalatedLoans}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Flag className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escalation Modal */}
      <Modal
        isOpen={isEscalationModalOpen}
        onClose={() => setIsEscalationModalOpen(false)}
        title="Escalate Loan(s)"
        size="lg"
      >
        <div className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
          {/* Selected Loans Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <ClipboardList size={18} />
              <span className="font-medium">Selected Loans</span>
            </div>
            <div className="text-sm text-blue-700">
              {escalationForm.loan_id 
                ? `Loan ID: ${escalationForm.loan_id}`
                : `${selectedLoans.length} loan(s) selected for escalation`}
            </div>
            {selectedLoans.length > 1 && !escalationForm.loan_id && (
              <div className="text-xs text-blue-600 mt-1">
                {selectedLoans.slice(0, 3).join(', ')}
                {selectedLoans.length > 3 && ` +${selectedLoans.length - 3} more`}
              </div>
            )}
          </div>

          {/* Repossession Option */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Gavel size={16} />
              Repossession Request
            </Label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={!escalationForm.to_repossess}
                  onChange={() => setEscalationForm({...escalationForm, to_repossess: false})}
                  className="w-4 h-4 text-blue-600"
                />
                <span>No</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={escalationForm.to_repossess}
                  onChange={() => setEscalationForm({...escalationForm, to_repossess: true})}
                  className="w-4 h-4 text-red-600"
                />
                <span className="text-red-600">Yes - Mark for Repossession</span>
              </label>
            </div>
          </div>

          {/* Collection Condition Change */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <ShieldAlert size={16} />
              Change Collection Condition (Optional)
            </Label>
            <Select
              value={escalationForm.new_collection_condition}
              onValueChange={(value) => setEscalationForm({...escalationForm, new_collection_condition: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new collection condition (optional)" />
              </SelectTrigger>
              <SelectContent>
                {COLLECTION_CONDITIONS.map(condition => (
                  <SelectItem key={condition.value} value={condition.value}>
                    {condition.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Escalation Reason */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} />
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
            <Label className="flex items-center gap-2 mb-2">
              <FileText size={16} />
              Reason Details <span className="text-red-500">*</span>
            </Label>
            <textarea
              value={escalationForm.reason_details}
              onChange={(e) => setEscalationForm({...escalationForm, reason_details: e.target.value})}
              placeholder="Provide detailed explanation of why this loan needs escalation..."
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${escalationErrors.reason_details ? 'border-red-500' : 'border-gray-300'}`}
            />
            {escalationErrors.reason_details && (
              <p className="text-red-500 text-sm mt-1">{escalationErrors.reason_details}</p>
            )}
          </div>

          {/* Request Notes */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Info size={16} />
              Additional Notes (Optional)
            </Label>
            <textarea
              value={escalationForm.request_notes}
              onChange={(e) => setEscalationForm({...escalationForm, request_notes: e.target.value})}
              placeholder="Any additional information that might help the approver..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
            />
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800 flex items-start gap-2">
              <Info size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                Escalation requests require approval from a manager or admin. 
                Once approved, the request will be executed automatically.
                {escalationForm.to_repossess && " Marking for repossession will trigger the repossession process."}
              </span>
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t mt-4">
          <Button variant="outline" onClick={() => setIsEscalationModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitEscalation} 
            disabled={isSubmittingEscalation}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmittingEscalation ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Submit Escalation Request
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">Advanced Filters</h2>
                <Badge variant="secondary" className="ml-2">Enhanced</Badge>
              </div>
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <Info size={18} className="text-blue-500" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="loan_id">Loan ID</Label>
                    <Input
                      id="loan_id"
                      placeholder="Search by loan ID"
                      value={advancedFilters.loan_id}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, loan_id: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_name">Customer Name</Label>
                    <Input
                      id="customer_name"
                      placeholder="Search by customer name"
                      value={advancedFilters.customer_name}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, customer_name: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      placeholder="Search by phone number"
                      value={advancedFilters.phone_number}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, phone_number: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="registration_number">Registration Number</Label>
                    <Input
                      id="registration_number"
                      placeholder="Search by registration number"
                      value={advancedFilters.registration_number}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, registration_number: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="identity_num">ID Number</Label>
                    <Input
                      id="identity_num"
                      placeholder="Search by ID number"
                      value={advancedFilters.identity_num}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, identity_num: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
              </section>

              {/* Status & Flags */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <AlertCircle size={18} className="text-amber-500" />
                  Status & Flags
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="status">Loan Status</Label>
                    <Select
                      value={advancedFilters.status || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, status: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                        <SelectItem value="Current">Current</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Undue">Undue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="current_month_only">Current Month Only</Label>
                    <Select
                      value={advancedFilters.current_month_only || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, current_month_only: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Loans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Only Current Month Installment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cumulative_balance_gt_zero">Active Loans (Balance &gt; 0)</Label>
                    <Select
                      value={advancedFilters.cumulative_balance_gt_zero || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, cumulative_balance_gt_zero: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes (Active Loans Only)</SelectItem>
                        <SelectItem value="false">No (Show All)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Default: Active loans with balance &gt; 0</p>
                  </div>
                </div>
              </section>

              {/* Escalation & Repossession Filters */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <Gavel size={18} className="text-red-500" />
                  Repossession & Escalation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="to_repossess">Marked for Repossession</Label>
                    <Select
                      value={advancedFilters.to_repossess || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, to_repossess: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="actual_repossessed">Actually Repossessed</Label>
                    <Select
                      value={advancedFilters.actual_repossessed || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, actual_repossessed: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="repossession_status">Repossession Status</Label>
                    <Select
                      value={advancedFilters.repossession_status || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, repossession_status: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        {REPOSSESSION_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="repossession_status_not">Exclude Repossession Status</Label>
                    <Select
                      value={advancedFilters.repossession_status_not || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, repossession_status_not: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {REPOSSESSION_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            Exclude {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="repossession_marked_has">Has Repossession Mark Date</Label>
                    <Select
                      value={advancedFilters.repossession_marked_has || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, repossession_marked_has: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="repossession_completed_has">Has Repossession Completion Date</Label>
                    <Select
                      value={advancedFilters.repossession_completed_has || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, repossession_completed_has: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="repossession_marked_after">Repossession Marked After</Label>
                    <Input
                      type="date"
                      id="repossession_marked_after"
                      value={advancedFilters.repossession_marked_after}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, repossession_marked_after: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="repossession_marked_before">Repossession Marked Before</Label>
                    <Input
                      type="date"
                      id="repossession_marked_before"
                      value={advancedFilters.repossession_marked_before}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, repossession_marked_before: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="repossession_completed_after">Repossession Completed After</Label>
                    <Input
                      type="date"
                      id="repossession_completed_after"
                      value={advancedFilters.repossession_completed_after}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, repossession_completed_after: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="repossession_completed_before">Repossession Completed Before</Label>
                    <Input
                      type="date"
                      id="repossession_completed_before"
                      value={advancedFilters.repossession_completed_before}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, repossession_completed_before: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
              </section>

              {/* Collection Condition Filters */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <ShieldAlert size={18} className="text-purple-500" />
                  Collection Condition
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="collection_condition">Collection Condition</Label>
                    <Select
                      value={advancedFilters.collection_condition || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, collection_condition: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Conditions" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLECTION_CONDITIONS.map(condition => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="collection_condition_not">Exclude Collection Condition</Label>
                    <Select
                      value={advancedFilters.collection_condition_not || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, collection_condition_not: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLECTION_CONDITIONS.map(condition => (
                          <SelectItem key={condition.value} value={condition.value}>
                            Exclude {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Auto Escalation Filters */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <Clock size={18} className="text-orange-500" />
                  Auto Escalation (21+ Days Overdue)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="auto_escalated_has">Has Auto Escalation</Label>
                    <Select
                      value={advancedFilters.auto_escalated_has || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, auto_escalated_has: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="auto_escalated_after">Auto Escalated After</Label>
                    <Input
                      type="date"
                      id="auto_escalated_after"
                      value={advancedFilters.auto_escalated_after}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, auto_escalated_after: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="auto_escalated_before">Auto Escalated Before</Label>
                    <Input
                      type="date"
                      id="auto_escalated_before"
                      value={advancedFilters.auto_escalated_before}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, auto_escalated_before: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
              </section>

              {/* Amount Filters */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <DollarSign size={18} className="text-green-500" />
                  Amount Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Total Amount Range (KSh)</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={advancedFilters.total_amount_min}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, total_amount_min: e.target.value})}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={advancedFilters.total_amount_max}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, total_amount_max: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Outstanding Amount Range (KSh)</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={advancedFilters.outstanding_min}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, outstanding_min: e.target.value})}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={advancedFilters.outstanding_max}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, outstanding_max: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Date Filters */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <CalendarRange size={18} className="text-purple-500" />
                  Date Ranges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>Due Date</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input type="date" placeholder="From" value={advancedFilters.due_date_after} onChange={(e) => setAdvancedFilters({...advancedFilters, due_date_after: e.target.value})} />
                      <Input type="date" placeholder="To" value={advancedFilters.due_date_before} onChange={(e) => setAdvancedFilters({...advancedFilters, due_date_before: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <Label>Disbursement Date</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input type="date" placeholder="From" value={advancedFilters.disburse_date_after} onChange={(e) => setAdvancedFilters({...advancedFilters, disburse_date_after: e.target.value})} />
                      <Input type="date" placeholder="To" value={advancedFilters.disburse_date_before} onChange={(e) => setAdvancedFilters({...advancedFilters, disburse_date_before: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <Label>Assignment Date</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input type="date" placeholder="From" value={advancedFilters.assigned_after} onChange={(e) => setAdvancedFilters({...advancedFilters, assigned_after: e.target.value})} />
                      <Input type="date" placeholder="To" value={advancedFilters.assigned_before} onChange={(e) => setAdvancedFilters({...advancedFilters, assigned_before: e.target.value})} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Call Log Filters */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <PhoneCall size={18} className="text-indigo-500" />
                  Call Log Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Plus size={14} /> Loans WITH call log created between
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={advancedFilters.call_log_created_after}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, call_log_created_after: e.target.value})}
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={advancedFilters.call_log_created_before}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, call_log_created_before: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Minus size={14} /> Loans WITHOUT call log created between
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={advancedFilters.without_call_log_created_after}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, without_call_log_created_after: e.target.value})}
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={advancedFilters.without_call_log_created_before}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, without_call_log_created_before: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Current Installment Due Date (Month-Day) */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <CalendarDays size={18} className="text-teal-500" />
                  Current Installment Due Date (Month-Day only)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Start (DD/MM)</Label>
                    <Input
                      placeholder="e.g., 01/12"
                      value={advancedFilters.current_installment_due_date_start}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, current_installment_due_date_start: e.target.value})}
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Example: 01/12 for 1st December</p>
                  </div>
                  <div>
                    <Label>End (DD/MM)</Label>
                    <Input
                      placeholder="e.g., 10/12"
                      value={advancedFilters.current_installment_due_date_end}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, current_installment_due_date_end: e.target.value})}
                      className="font-mono"
                    />
                  </div>
                </div>
              </section>

              {/* Sort Order */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-gray-500" />
                  Sort Order
                </h3>
                <div className="max-w-md">
                  <Select
                    value={advancedFilters.ordering}
                    onValueChange={(value) => setAdvancedFilters({...advancedFilters, ordering: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-disburse_time">Newest First</SelectItem>
                      <SelectItem value="disburse_time">Oldest First</SelectItem>
                      <SelectItem value="-due_date">Due Date (Newest First)</SelectItem>
                      <SelectItem value="due_date">Due Date (Oldest First)</SelectItem>
                      <SelectItem value="-total_amount">Amount (Highest First)</SelectItem>
                      <SelectItem value="total_amount">Amount (Lowest First)</SelectItem>
                      <SelectItem value="-total_outstanding">Outstanding (Highest First)</SelectItem>
                      <SelectItem value="total_outstanding">Outstanding (Lowest First)</SelectItem>
                      <SelectItem value="-assigned_at">Recently Assigned</SelectItem>
                      <SelectItem value="assigned_at">Oldest Assigned</SelectItem>
                      <SelectItem value="-to_repossess">Repossession Marked First</SelectItem>
                      <SelectItem value="-auto_escalated_at">Auto Escalated First</SelectItem>
                      <SelectItem value="-collection_condition">Collection Condition (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => { resetAdvancedFilters(); applyAdvancedFilters(); }} className="hover:bg-gray-100">
                Reset All
              </Button>
              <Button variant="outline" onClick={() => setShowAdvancedFilters(false)}>
                Cancel
              </Button>
              <Button onClick={applyAdvancedFilters} className="bg-blue-600 hover:bg-blue-700">
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl shadow-sm border">
          <span className="text-sm text-gray-600 font-medium flex items-center gap-1">
            <Filter size={14} /> Active filters:
          </span>
          
          {searchTerm && (
            <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1">
              Search: {searchTerm}
              <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-red-600">
                <X size={12} />
              </button>
            </Badge>
          )}
          
          {Object.entries(filters).map(([key, value]) => {
            if (!value || value === '') return null;
            
            let label = key.replace(/_/g, ' ').replace(/(min|max|after|before)/g, (m) => ` ${m}`);
            if (key === 'call_log_created_after') label = 'Call log after';
            if (key === 'call_log_created_before') label = 'Call log before';
            if (key === 'without_call_log_created_after') label = 'No call log after';
            if (key === 'without_call_log_created_before') label = 'No call log before';
            if (key === 'current_installment_due_date_start') label = 'Due date start (MM-DD)';
            if (key === 'current_installment_due_date_end') label = 'Due date end (MM-DD)';
            if (key === 'cumulative_balance_gt_zero') label = 'Active Loans Only';
            if (key === 'actual_repossessed') label = 'Actually Repossessed';
            if (key === 'auto_escalated_after') label = 'Auto escalated after';
            if (key === 'auto_escalated_before') label = 'Auto escalated before';
            if (key === 'auto_escalated_has') label = 'Has Auto Escalation';
            if (key === 'collection_condition') label = 'Collection Condition';
            if (key === 'collection_condition_not') label = 'Exclude Collection';
            if (key === 'repossession_completed_after') label = 'Repossession completed after';
            if (key === 'repossession_completed_before') label = 'Repossession completed before';
            if (key === 'repossession_completed_has') label = 'Has Completion Date';
            if (key === 'repossession_marked_after') label = 'Repossession marked after';
            if (key === 'repossession_marked_before') label = 'Repossession marked before';
            if (key === 'repossession_marked_has') label = 'Has Mark Date';
            if (key === 'repossession_status') label = 'Repossession Status';
            if (key === 'repossession_status_not') label = 'Exclude Repossession';
            if (key === 'to_repossess') label = 'Marked for Repossession';
            
            let displayValue = value;
            if (key === 'is_overdue') displayValue = value === 'true' ? 'Overdue' : 'Not Overdue';
            if (key === 'current_month_only') displayValue = 'Yes';
            if (key === 'to_repossess') displayValue = value === 'true' ? 'Yes' : 'No';
            if (key === 'actual_repossessed') displayValue = value === 'true' ? 'Yes' : 'No';
            if (key === 'cumulative_balance_gt_zero') displayValue = value === 'true' ? 'Active Only' : 'All Loans';
            if (key === 'auto_escalated_has') displayValue = value === 'true' ? 'Yes' : 'No';
            if (key === 'repossession_marked_has') displayValue = value === 'true' ? 'Yes' : 'No';
            if (key === 'repossession_completed_has') displayValue = value === 'true' ? 'Yes' : 'No';
            
            if (key === 'collection_condition' && value) {
              const found = COLLECTION_CONDITIONS.find(c => c.value === value);
              if (found) displayValue = found.label;
            }
            
            if (key === 'repossession_status' && value && !value.includes(',')) {
              const found = REPOSSESSION_STATUSES.find(s => s.value === value);
              if (found) displayValue = found.label;
            }
            
            const isDefaultFilter = key === 'cumulative_balance_gt_zero' && value === 'true';
            
            return (
              <Badge 
                key={key} 
                variant="outline" 
                className={`gap-1 pl-2 pr-1 py-1 ${isDefaultFilter ? 'bg-green-50 text-green-800 border-green-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}
              >
                {label}: {displayValue}
                <button
                  onClick={() => {
                    setFilters(prev => {
                      const newFilters = { ...prev };
                      delete newFilters[key as keyof FilterState];
                      return newFilters;
                    });
                  }}
                  className="ml-1 hover:text-red-600"
                >
                  <X size={12} />
                </button>
              </Badge>
            );
          })}
          
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 ml-auto underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Loans Table */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-800">Loan Assignments</h2>
            <div className="flex items-center gap-3">
              {selectedLoans.length > 0 && (
                <Badge variant="modern" className="bg-blue-100 text-blue-800">
                  {selectedLoans.length} selected
                </Badge>
              )}
              {isLoading && <RefreshCw size={18} className="animate-spin text-gray-400" />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <GenericTable
            data={data.results}
            columns={columns}
            rowKey={(row: MyLoan) => row.id}
            selectionMode="multiple"
            onSelectionChange={(selectedRows) => {
              setSelectedLoans(selectedRows.map((row: MyLoan) => row.loan_id));
            }}
            virtualized={true}
            pagination={{
              totalCount: data.count,
              currentPage: data.page,
              pageSize: data.page_size,
              onPageChange: (newPage) => setPage(newPage as number),
              serverSide: true,
              hasNextPage: data.page < data.total_pages,
              hasPreviousPage: data.page > 1
            }}
            serverSideSearch={searchTerm}
            onServerSearchChange={handleServerSearchChange}
            serverSideFilters={filters}
            onServerFilterChange={handleServerFilterChange}
            wrapText={true}
            className="rounded-b-xl"
          />
        </CardContent>
      </Card>
    </div>
  );
}