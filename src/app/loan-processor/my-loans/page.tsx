// app/loans/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { Loan } from '@/types/index';
import { 
  Plus, Edit, Trash2, Search, Filter, UserPlus, Download, 
  AlertCircle, Calendar, DollarSign, Users, TrendingUp,
  Eye, CheckCircle, XCircle, Clock, RefreshCw, Gavel,
  ShieldAlert, Car, Scale, Ban, Briefcase, FileText, Flag,
  AlertTriangle, Building2, Hammer, Handshake, XCircle as XCircleIcon,
  CheckCircle2, Warehouse, MapPin, Phone, User, Clipboard,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import Link from 'next/link';
import { ActionGuard } from '@/components/auth/action-guard';
import { Badge } from '@/components/ui/badge';

interface LoanFilters {
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
  cumulative_balance_gt_zero?: boolean;
  actual_repossessed?: boolean;
  auto_escalated_after?: string;
  auto_escalated_before?: string;
  auto_escalated_has?: boolean;
  collection_condition?: string;
  collection_condition_not?: string;
  repossession_completed_after?: string;
  repossession_completed_before?: string;
  repossession_completed_has?: boolean;
  repossession_marked_after?: string;
  repossession_marked_before?: string;
  repossession_marked_has?: boolean;
  repossession_status?: string;
  repossession_status_not?: string;
  to_repossess?: boolean;
  ordering?: string;
  page: number;
  page_size: number;
  search?: string;
}

interface LoanStats {
  total_loans: number;
  active_loans: number;
  assigned_loans: number;
  unassigned_loans: number;
  total_installments: number;
  active_installments: number;
  overdue_installments: number;
  current_month_cumulative_balance: number;
  current_month_installments: number;
  average_cumulative_balance: number;
  timestamp: string;
}

// Collection condition options based on models.py
const COLLECTION_CONDITIONS = [
  { value: 'collectable', label: 'Collectable (Default)', icon: CheckCircle2, color: 'green' },
  { value: 'in_yard', label: 'In the Yard', icon: Car, color: 'blue' },
  { value: 'police_case', label: 'Police Case', icon: ShieldAlert, color: 'red' },
  { value: 'law_court', label: 'Law Court', icon: Scale, color: 'purple' },
  { value: 'in_auction', label: 'In Auctioneer', icon: Hammer, color: 'amber' },
  { value: 'third_party', label: 'Third Party Collection', icon: Handshake, color: 'indigo' },
  { value: 'restructured', label: 'Restructured Payment Plan', icon: FileText, color: 'teal' },
  { value: 'written_off', label: 'Written Off', icon: XCircleIcon, color: 'gray' },
  { value: 'settled', label: 'Settled', icon: CheckCircle2, color: 'emerald' },
];

// Repossession status options
const REPOSSESSION_STATUSES = [
  { value: 'not_started', label: 'Not Started', color: 'gray' },
  { value: 'marked', label: 'Marked for Repossession', color: 'orange' },
  { value: 'in_progress', label: 'Repossession in Progress', color: 'blue' },
  { value: 'repossessed', label: 'Repossessed', color: 'red' },
  { value: 'released', label: 'Released (Customer Paid)', color: 'green' },
  { value: 'court_ordered', label: 'Court Ordered', color: 'purple' },
  { value: 'disputed', label: 'Disputed', color: 'amber' },
];

// Escalation reasons
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

interface YardLocation {
  id: number;
  name: string;
  location: string;
  contact_phone: string | null;
  contact_person: string | null;
  notes: string | null;
  is_active: boolean;
}

interface EscalationRequestData {
  loan_id: string;
  reason: string;
  reason_details?: string;
  to_repossess: boolean;
  new_collection_condition?: string;
  new_repossession_status?: string;
  request_notes?: string;
  yard_location_id?: number;
  yard_notes?: string;
  is_update?: boolean;
}

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<LoanFilters>({
    page: 1,
    page_size: 20,
    cumulative_balance_gt_zero: true,
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
    assigned_only: undefined,
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
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<LoanStats>({
    total_loans: 0,
    active_loans: 0,
    assigned_loans: 0,
    unassigned_loans: 0,
    total_installments: 0,
    active_installments: 0,
    overdue_installments: 0,
    current_month_cumulative_balance: 0,
    current_month_installments: 0,
    average_cumulative_balance: 0,
    timestamp: '',
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<LoanFilters>({ ...filters });
  
  // Escalation Modal State
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [escalationData, setEscalationData] = useState<EscalationRequestData>({
    loan_id: '',
    reason: '',
    reason_details: '',
    to_repossess: false,
    new_collection_condition: '',
    new_repossession_status: '',
    request_notes: '',
    yard_location_id: undefined,
    yard_notes: '',
    is_update: false,
  });
  const [yardLocations, setYardLocations] = useState<YardLocation[]>([]);
  const [isSubmittingEscalation, setIsSubmittingEscalation] = useState(false);
  const [escalationError, setEscalationError] = useState<string | null>(null);
  const [escalationSuccess, setEscalationSuccess] = useState<string | null>(null);
  const [showYardFields, setShowYardFields] = useState(false);

  // New Yard Management State
  const [isYardModalOpen, setIsYardModalOpen] = useState(false);
  const [yardFormData, setYardFormData] = useState({
    name: '',
    location: '',
    contact_phone: '',
    contact_person: '',
    notes: '',
  });
  const [isSubmittingYard, setIsSubmittingYard] = useState(false);
  const [yardError, setYardError] = useState<string | null>(null);

  useEffect(() => {
    fetchLoans();
    fetchLoanStats();
    fetchYardLocations();
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
    filters.search,
    filters.cumulative_balance_gt_zero,
    filters.actual_repossessed,
    filters.auto_escalated_after,
    filters.auto_escalated_before,
    filters.auto_escalated_has,
    filters.collection_condition,
    filters.collection_condition_not,
    filters.repossession_completed_after,
    filters.repossession_completed_before,
    filters.repossession_completed_has,
    filters.repossession_marked_after,
    filters.repossession_marked_before,
    filters.repossession_marked_has,
    filters.repossession_status,
    filters.repossession_status_not,
    filters.to_repossess
  ]);

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const response = await client.get(`/loans/?${queryParams.toString()}`);
      setLoans(response?.data?.results || []);
      setTotalCount(response?.data?.count || 0);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLoanStats = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/loan_statistics/');
      const data = response.data;

      setStats({
        total_loans: data?.total_loans ?? 0,
        active_loans: data?.active_loans ?? 0,
        assigned_loans: data?.assigned_loans ?? 0,
        unassigned_loans: data?.unassigned_loans ?? 0,
        total_installments: data?.total_installments ?? 0,
        active_installments: data?.active_installments ?? 0,
        overdue_installments: data?.overdue_installments ?? 0,
        current_month_cumulative_balance: data?.current_month_cumulative_balance ?? 0,
        current_month_installments: data?.current_month_installments ?? 0,
        average_cumulative_balance: data?.average_cumulative_balance ?? 0,
        timestamp: data?.timestamp ?? '',
      });
    } catch (error) {
      console.error('Error fetching loan stats:', error);
    }
  };

  const fetchYardLocations = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/yard-locations/');
      setYardLocations(response.data || []);
    } catch (error) {
      console.error('Error fetching yard locations:', error);
      setYardLocations([]);
    }
  };

  const handleFilterChange = (key: keyof LoanFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20,
      cumulative_balance_gt_zero: true,
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
      assigned_only: undefined,
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
      page_size: 20,
      ordering: '-disburse_time',
      current_month_only: false,
      cumulative_balance_gt_zero: true
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleViewLoanDetails = (loanId: string) => {
    window.open(`/loans/${loanId}`, '_blank');
  };

  const handleExportLoans = async () => {
    try {
      const client = apiClient.getClient();
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const response = await client.get(`/loan-processor/loans/export/?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `loans-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting loans:', error);
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

  // ============ ESCALATION HANDLERS ============
  
  const openEscalationModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setEscalationData({
      loan_id: loan.loan_id,
      reason: '',
      reason_details: '',
      to_repossess: false,
      new_collection_condition: loan.collection_condition || '',
      new_repossession_status: loan.repossession_status || '',
      request_notes: '',
      yard_location_id: loan.yard_location?.id || undefined,
      yard_notes: loan.yard_notes || '',
      is_update: false,
    });
    setEscalationError(null);
    setEscalationSuccess(null);
    setShowYardFields(loan.collection_condition === 'in_yard');
    setIsEscalationModalOpen(true);
  };

  const handleEscalationSubmit = async () => {
    setIsSubmittingEscalation(true);
    setEscalationError(null);
    setEscalationSuccess(null);

    try {
      const client = apiClient.getClient();
      
      // Prepare the request data
      const requestData: any = {
        loan_id: escalationData.loan_id,
        reason: escalationData.reason,
        reason_details: escalationData.reason_details || '',
        to_repossess: escalationData.to_repossess,
        request_notes: escalationData.request_notes || '',
        is_update: escalationData.is_update || false,
      };

      // Add collection condition if selected
      if (escalationData.new_collection_condition) {
        requestData.new_collection_condition = escalationData.new_collection_condition;
        
        // If condition is IN_YARD, include yard location
        if (escalationData.new_collection_condition === 'in_yard') {
          if (!escalationData.yard_location_id) {
            setEscalationError('Please select a yard location when setting collection condition to "In the Yard"');
            setIsSubmittingEscalation(false);
            return;
          }
          requestData.yard_location_id = escalationData.yard_location_id;
          requestData.yard_notes = escalationData.yard_notes || '';
        }
      }

      // Add repossession status if provided
      if (escalationData.new_repossession_status) {
        requestData.new_repossession_status = escalationData.new_repossession_status;
      }

      const response = await client.post('/loan-processor/escalation/request/', requestData);

      if (response.data.success) {
        setEscalationSuccess('Escalation request created successfully!');
        setTimeout(() => {
          setIsEscalationModalOpen(false);
          fetchLoans();
          fetchLoanStats();
        }, 1500);
      } else {
        setEscalationError(response.data.error || 'Failed to create escalation request');
      }
    } catch (error: any) {
      console.error('Error creating escalation request:', error);
      setEscalationError(
        error?.response?.data?.error || 
        error?.message || 
        'An error occurred while creating the escalation request'
      );
    } finally {
      setIsSubmittingEscalation(false);
    }
  };

  // ============ YARD MANAGEMENT HANDLERS ============

  const openYardModal = () => {
    setYardFormData({
      name: '',
      location: '',
      contact_phone: '',
      contact_person: '',
      notes: '',
    });
    setYardError(null);
    setIsYardModalOpen(true);
  };

  const handleCreateYard = async () => {
    setIsSubmittingYard(true);
    setYardError(null);

    try {
      const client = apiClient.getClient();
      const response = await client.post('/loan-processor/yard-locations/create/', yardFormData);

      if (response.data.success) {
        await fetchYardLocations();
        setIsYardModalOpen(false);
        // Auto-select the new yard in escalation form if open
        const newYard = response.data.yard;
        if (newYard && isEscalationModalOpen) {
          setEscalationData(prev => ({
            ...prev,
            yard_location_id: newYard.id
          }));
        }
      } else {
        setYardError(response.data.error || 'Failed to create yard location');
      }
    } catch (error: any) {
      console.error('Error creating yard:', error);
      setYardError(
        error?.response?.data?.error || 
        error?.message || 
        'An error occurred while creating the yard location'
      );
    } finally {
      setIsSubmittingYard(false);
    }
  };

  // Helper function to get collection condition badge
  const getCollectionConditionBadge = (condition: string) => {
    const found = COLLECTION_CONDITIONS.find(c => c.value === condition);
    const Icon = found?.icon || AlertTriangle;
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
    const colorClass = colorMap[found?.color || 'gray'];
    
    return (
      <Badge className={`${colorClass} gap-1`}>
        <Icon size={12} />
        {found?.label || condition || 'Collectable'}
      </Badge>
    );
  };

  // Helper function to get repossession status badge
  const getRepossessionStatusBadge = (status: string) => {
    const found = REPOSSESSION_STATUSES.find(s => s.value === status);
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-800',
      orange: 'bg-orange-100 text-orange-800',
      blue: 'bg-blue-100 text-blue-800',
      red: 'bg-red-100 text-red-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      amber: 'bg-amber-100 text-amber-800',
    };
    
    return (
      <Badge className={`${colorMap[found?.color || 'gray']} gap-1`}>
        {found?.label || status || 'Not Started'}
      </Badge>
    );
  };

  // Helper to get yard display
  const getYardDisplay = (loan: Loan) => {
    if (loan.yard_location) {
      return `${loan.yard_location.name} - ${loan.yard_location.location}`;
    }
    return null;
  };

  const columns = [
    {
      id: 'loan_id',
      label: 'Loan ID',
      accessor: (row: Loan) => row.loan_id,
      Cell: (value: string, row: Loan) => (
        <button
          onClick={() => handleViewLoanDetails(row.loan_id)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm"
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
      accessor: (row: Loan) => row.customer_name,
      width: 200,
      sortable: true,
    },
    {
      id: 'phone_number',
      label: 'Phone',
      accessor: (row: Loan) => row.phone_number,
      width: 120,
    },
    {
      id: 'total_amount',
      label: 'Total Amount',
      accessor: (row: Loan) => row.total_amount,
      Cell: (value: string) => (
        <span className="font-medium">KSh {parseFloat(value).toLocaleString()}</span>
      ),
      width: 130,
      sortable: true,
    },
    {
      id: 'total_outstanding',
      label: 'Outstanding',
      accessor: (row: Loan) => row.total_outstanding,
      Cell: (value: string, row: Loan) => {
        const outstanding = parseFloat(value);
        const total = parseFloat(row.total_amount);
        const percentage = total > 0 ? (outstanding / total) * 100 : 0;
        
        return (
          <div>
            <span className={outstanding > 0 ? 'text-amber-700 font-medium' : 'text-green-700'}>
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
      width: 150,
      sortable: true,
    },
    {
      id: 'current_month_total_due',
      label: 'Current Month Due',
      accessor: (row: Loan) => row.current_month_total_due,
      Cell: (value: string) => {
        const amount = parseFloat(value || '0');
        return (
          <span className={amount > 0 ? 'text-amber-700 font-medium' : 'text-green-700'}>
            KSh {amount.toLocaleString()}
          </span>
        );
      },
      width: 140,
    },
    {
      id: 'current_month_installment_due_date',
      label: 'Due Date',
      accessor: (row: Loan) => row.current_month_installment_due_date,
      Cell: (value: string) => {
        if (!value) return <span className="text-gray-400">No current month</span>;
        const dueDate = new Date(value);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let colorClass = 'text-gray-600';
        if (daysUntilDue < 0) colorClass = 'text-red-700 font-medium';
        else if (daysUntilDue <= 7) colorClass = 'text-orange-700';
        
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
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: Loan) => {
        const isOverdue = row.current_month_installment_due_date ? new Date(row.current_month_installment_due_date) < new Date() && parseFloat(row.current_month_total_due || '0') > 0 && row.has_current_month_installment === true : false;
        const hasOutstanding = parseFloat(row.current_month_total_due || '0') > 0;
        if (row.has_current_month_installment === false) return 'Undue';
        if (hasOutstanding && isOverdue) return 'Overdue';
        if (hasOutstanding) return 'Current';
        return 'Paid';
      },
      Cell: (value: string, row: Loan) => {
        const isOverdue = row.current_month_installment_due_date ? new Date(row.current_month_installment_due_date) < new Date() && parseFloat(row.current_month_total_due || '0') > 0 && row.has_current_month_installment === true : false;
        const hasOutstanding = parseFloat(row.current_month_total_due || '0') > 0;
        
        if (row.has_current_month_installment === false) {
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
    },
    {
      id: 'collection_condition',
      label: 'Collection Status',
      accessor: (row: Loan) => row.collection_condition || 'collectable',
      Cell: (value: string, row: Loan) => getCollectionConditionBadge(row.collection_condition),
      width: 150,
    },
    {
      id: 'to_repossess',
      label: 'Repossession',
      accessor: (row: Loan) => row.to_repossess,
      Cell: (value: boolean, row: Loan) => {
        if (row.to_repossess) {
          return (
            <Badge variant="error" className="gap-1 bg-red-100 text-red-800 border-red-200">
              <Gavel size={12} />
              Marked
            </Badge>
          );
        }
        if (row.actual_repossessed) {
          return (
            <Badge variant="warning" className="gap-1 bg-orange-100 text-orange-800 border-orange-200">
              <Car size={12} />
              Repossessed
            </Badge>
          );
        }
        return <span className="text-gray-400 text-sm">-</span>;
      },
      width: 100,
    },
    {
      id: 'current_assigned_officer_details',
      label: 'Assigned Officer',
      accessor: (row: Loan) => row.current_assigned_officer_details,
      Cell: (value: any) => {
        if (!value) return <span className="text-gray-400 text-sm">Unassigned</span>;
        return (
          <span className="text-sm">
            {value.username || `Officer ${value.id}`}
          </span>
        );
      },
      width: 130,
    },
    {
      id: 'assigned_at',
      label: 'Assigned On',
      accessor: (row: Loan) => row.assigned_at ? new Date(row.assigned_at).toLocaleDateString() : '-',
      width: 110,
      sortable: true,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: Loan) => row,
      Cell: (value: Loan) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewLoanDetails(value.loan_id)}
            className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
            title="View loan details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => openEscalationModal(value)}
            className="text-amber-600 hover:text-amber-700 transition-colors p-1 rounded hover:bg-amber-50"
            title="Escalate loan"
          >
            <Flag size={16} />
          </button>
        </div>
      ),
      width: 80,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loan Management</h1>
          <p className="text-gray-600 mt-2">View and manage all loans in the system</p>
        </div>
        <div className="flex space-x-3">
          <ActionGuard
            requirement="can_export_loans"
            fallback={
              <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
                <Download size={20} className="mr-2" />
                Export
              </Button>
            }
            showTooltip
            tooltipMessage="You need permission to export loans"
          >
            <Button variant="outline" onClick={handleExportLoans}>
              <Download size={20} className="mr-2" />
              Export
            </Button>
          </ActionGuard>
          <Button variant="outline" onClick={openFilterModal}>
            <Filter size={20} className="mr-2" />
            Advanced Filters
          </Button>
          <Button onClick={fetchLoans} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Loans</p>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
        {(Object.keys(filters).some(key => 
          filters[key as keyof LoanFilters] !== undefined && 
          filters[key as keyof LoanFilters] !== '' && 
          key !== 'page' && 
          key !== 'page_size' && 
          key !== 'ordering' &&
          key !== 'cumulative_balance_gt_zero'
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
          placeholder="Search by customer name, phone number, loan ID, registration number, or identity number..."
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
            <h2 className="text-xl font-semibold text-gray-900">All Loans</h2>
            <div className="text-sm text-gray-600">
              Showing {totalCount > 0 ? ((filters.page - 1) * filters.page_size) + 1 : 0} - {Math.min(filters.page * filters.page_size, totalCount)} of {totalCount} loans
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading loans...</div>
            </div>
          ) : (
            <GenericTable
              data={loans}
              columns={columns}
              rowKey={(row: Loan) => row.id}
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
              pageSizeOptions={[20, 50, 100, 500, 1000]}
            />
          )}
        </CardContent>
      </Card>

      {/* ============ ESCALATION MODAL ============ */}
      <Modal
        isOpen={isEscalationModalOpen}
        onClose={() => {
          setIsEscalationModalOpen(false);
          setEscalationError(null);
          setEscalationSuccess(null);
        }}
        title={`Escalate Loan: ${selectedLoan?.loan_id || ''}`}
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {/* Loan Info Summary */}
          {selectedLoan && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Customer:</span> {selectedLoan.customer_name}</div>
                <div><span className="font-medium">Phone:</span> {selectedLoan.phone_number}</div>
                <div><span className="font-medium">Outstanding:</span> KSh {parseFloat(selectedLoan.total_outstanding).toLocaleString()}</div>
                <div><span className="font-medium">Current Collection:</span> {getCollectionConditionBadge(selectedLoan.collection_condition)}</div>
                {selectedLoan.yard_location && (
                  <div className="col-span-2">
                    <span className="font-medium">Current Yard:</span> {selectedLoan.yard_location.name} - {selectedLoan.yard_location.location}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Escalation Form */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Escalation Details</h3>
            
            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Escalation Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={escalationData.reason}
                onChange={(e) => setEscalationData(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a reason...</option>
                {ESCALATION_REASONS.map(reason => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
            </div>

            {/* Reason Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason Details
              </label>
              <textarea
                value={escalationData.reason_details || ''}
                onChange={(e) => setEscalationData(prev => ({ ...prev, reason_details: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Provide additional details about the escalation reason..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Repossession */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Gavel size={16} className="text-red-500" />
                    Mark for Repossession
                  </div>
                </label>
                <select
                  value={escalationData.to_repossess ? 'true' : 'false'}
                  onChange={(e) => setEscalationData(prev => ({ ...prev, to_repossess: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              {/* Repossession Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repossession Status
                </label>
                <select
                  value={escalationData.new_repossession_status || ''}
                  onChange={(e) => setEscalationData(prev => ({ ...prev, new_repossession_status: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Change</option>
                  {REPOSSESSION_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Collection Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection Condition
              </label>
              <select
                value={escalationData.new_collection_condition || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setEscalationData(prev => ({ ...prev, new_collection_condition: value || undefined }));
                  setShowYardFields(value === 'in_yard');
                  if (value !== 'in_yard') {
                    setEscalationData(prev => ({ ...prev, yard_location_id: undefined, yard_notes: '' }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Change</option>
                {COLLECTION_CONDITIONS.map(condition => (
                  <option key={condition.value} value={condition.value}>{condition.label}</option>
                ))}
              </select>
            </div>

            {/* Yard Fields - Shown when IN_YARD is selected */}
            {showYardFields && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-blue-900 flex items-center gap-2">
                    <Warehouse size={18} />
                    Yard Location Details
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={openYardModal}
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    <Plus size={14} className="mr-1" />
                    New Yard
                  </Button>
                </div>

                {/* Yard Location Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Yard <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={escalationData.yard_location_id || ''}
                    onChange={(e) => setEscalationData(prev => ({ 
                      ...prev, 
                      yard_location_id: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a yard...</option>
                    {yardLocations.filter(y => y.is_active).map(yard => (
                      <option key={yard.id} value={yard.id}>
                        {yard.name} - {yard.location}
                      </option>
                    ))}
                  </select>
                  {yardLocations.filter(y => y.is_active).length === 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      No yards available. Please create a yard location first.
                    </p>
                  )}
                </div>

                {/* Selected Yard Info */}
                {escalationData.yard_location_id && (
                  <div className="bg-white p-3 rounded border border-gray-200 text-sm space-y-1">
                    {(() => {
                      const selected = yardLocations.find(y => y.id === escalationData.yard_location_id);
                      if (!selected) return null;
                      return (
                        <>
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin size={14} />
                            <span className="font-medium">{selected.name}</span>
                          </div>
                          <div className="text-gray-600 pl-6">{selected.location}</div>
                          {selected.contact_person && (
                            <div className="text-gray-600 pl-6 flex items-center gap-2">
                              <User size={14} />
                              {selected.contact_person}
                            </div>
                          )}
                          {selected.contact_phone && (
                            <div className="text-gray-600 pl-6 flex items-center gap-2">
                              <Phone size={14} />
                              {selected.contact_phone}
                            </div>
                          )}
                          {selected.notes && (
                            <div className="text-gray-500 pl-6 text-xs italic">{selected.notes}</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Yard Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yard Notes
                  </label>
                  <textarea
                    value={escalationData.yard_notes || ''}
                    onChange={(e) => setEscalationData(prev => ({ ...prev, yard_notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Special instructions, contact person at yard, etc."
                  />
                </div>
              </div>
            )}

            {/* Request Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={escalationData.request_notes || ''}
                onChange={(e) => setEscalationData(prev => ({ ...prev, request_notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Any additional notes about this escalation request..."
              />
            </div>
          </div>

          {/* Error/Success Messages */}
          {escalationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{escalationError}</span>
            </div>
          )}
          {escalationSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{escalationSuccess}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t mt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsEscalationModalOpen(false);
              setEscalationError(null);
              setEscalationSuccess(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleEscalationSubmit} 
            disabled={isSubmittingEscalation || !escalationData.reason}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
          >
            {isSubmittingEscalation ? 'Submitting...' : 'Create Escalation Request'}
          </Button>
        </div>
      </Modal>

      {/* ============ YARD MANAGEMENT MODAL ============ */}
      <Modal
        isOpen={isYardModalOpen}
        onClose={() => {
          setIsYardModalOpen(false);
          setYardError(null);
        }}
        title="Create New Yard Location"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yard Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={yardFormData.name}
              onChange={(e) => setYardFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., DT Dobie Yard"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={yardFormData.location}
              onChange={(e) => setYardFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Westlands, Nairobi"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={yardFormData.contact_person}
              onChange={(e) => setYardFormData(prev => ({ ...prev, contact_person: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              value={yardFormData.contact_phone}
              onChange={(e) => setYardFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., +254 700 000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={yardFormData.notes}
              onChange={(e) => setYardFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Any additional notes about this yard..."
            />
          </div>

          {yardError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{yardError}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t mt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsYardModalOpen(false);
              setYardError(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateYard} 
            disabled={isSubmittingYard || !yardFormData.name || !yardFormData.location}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmittingYard ? 'Creating...' : 'Create Yard'}
          </Button>
        </div>
      </Modal>

      {/* Advanced Filters Modal - Keep existing */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Advanced Filters"
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {/* ... (existing filter content) ... */}
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
            <h3 className="font-medium text-gray-900 border-b pb-2">Status & Flags</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Status
                </label>
                <select
                  value={tempFilters.status || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Statuses</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Current">Current</option>
                  <option value="Paid">Paid</option>
                  <option value="Undue">Undue</option>
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
                  Active Loans (Balance &gt; 0)
                </label>
                <select
                  value={tempFilters.cumulative_balance_gt_zero === undefined ? '' : String(tempFilters.cumulative_balance_gt_zero)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTempFilters(prev => ({ 
                      ...prev, 
                      cumulative_balance_gt_zero: value === '' ? undefined : value === 'true'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="true">Yes (Active Only)</option>
                  <option value="false">No (Show All)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Default: Active loans with balance &gt; 0</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Month Only
                </label>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="current_month_only_filter"
                    checked={tempFilters.current_month_only || false}
                    onChange={(e) => setTempFilters(prev => ({ ...prev, current_month_only: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="current_month_only_filter" className="ml-2 block text-sm text-gray-900">
                    Only show current month installments
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="assigned_only"
                  checked={tempFilters.assigned_only || false}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, assigned_only: e.target.checked || undefined }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="assigned_only" className="ml-2 block text-sm text-gray-900">
                  Assigned Only
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="unassigned_only"
                  checked={tempFilters.unassigned_only || false}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, unassigned_only: e.target.checked || undefined }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="unassigned_only" className="ml-2 block text-sm text-gray-900">
                  Unassigned Only
                </label>
              </div>
            </div>
          </div>

          {/* Repossession & Escalation Filters */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2 flex items-center gap-2">
              <Gavel size={16} className="text-red-500" />
              Repossession & Escalation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marked for Repossession
                </label>
                <select
                  value={tempFilters.to_repossess === undefined ? '' : String(tempFilters.to_repossess)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTempFilters(prev => ({ 
                      ...prev, 
                      to_repossess: value === '' ? undefined : value === 'true'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actually Repossessed
                </label>
                <select
                  value={tempFilters.actual_repossessed === undefined ? '' : String(tempFilters.actual_repossessed)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTempFilters(prev => ({ 
                      ...prev, 
                      actual_repossessed: value === '' ? undefined : value === 'true'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repossession Status
                </label>
                <select
                  value={tempFilters.repossession_status || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, repossession_status: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Statuses</option>
                  {REPOSSESSION_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Condition
                </label>
                <select
                  value={tempFilters.collection_condition || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, collection_condition: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Conditions</option>
                  {COLLECTION_CONDITIONS.map(condition => (
                    <option key={condition.value} value={condition.value}>{condition.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Has Auto Escalation
                </label>
                <select
                  value={tempFilters.auto_escalated_has === undefined ? '' : String(tempFilters.auto_escalated_has)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTempFilters(prev => ({ 
                      ...prev, 
                      auto_escalated_has: value === '' ? undefined : value === 'true'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Has Repossession Mark Date
                </label>
                <select
                  value={tempFilters.repossession_marked_has === undefined ? '' : String(tempFilters.repossession_marked_has)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTempFilters(prev => ({ 
                      ...prev, 
                      repossession_marked_has: value === '' ? undefined : value === 'true'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repossession Marked After
                </label>
                <input
                  type="date"
                  value={tempFilters.repossession_marked_after || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, repossession_marked_after: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repossession Marked Before
                </label>
                <input
                  type="date"
                  value={tempFilters.repossession_marked_before || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, repossession_marked_before: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repossession Completed After
                </label>
                <input
                  type="date"
                  value={tempFilters.repossession_completed_after || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, repossession_completed_after: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repossession Completed Before
                </label>
                <input
                  type="date"
                  value={tempFilters.repossession_completed_before || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, repossession_completed_before: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto Escalated After
                </label>
                <input
                  type="date"
                  value={tempFilters.auto_escalated_after || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, auto_escalated_after: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto Escalated Before
                </label>
                <input
                  type="date"
                  value={tempFilters.auto_escalated_before || ''}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, auto_escalated_before: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
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
                <option value="-to_repossess">Repossession Marked First</option>
                <option value="-auto_escalated_at">Auto Escalated First</option>
                <option value="-collection_condition">Collection Status</option>
                <option value="-repossession_status">Repossession Status</option>
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
              page_size: 20,
              ordering: '-disburse_time',
              current_month_only: false,
              cumulative_balance_gt_zero: true
            });
          }}>
            Reset
          </Button>
          <Button onClick={applyAdvancedFilters} className="bg-blue-600 hover:bg-blue-700">
            Apply Filters
          </Button>
        </div>
      </Modal>
    </div>
  );
}