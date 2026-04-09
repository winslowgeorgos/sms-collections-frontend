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
import { apiClient } from '@/lib/api';
import { MyLoan } from '@/types/index';
import { 
  RefreshCw, Eye, AlertCircle, 
  CheckCircle, Calendar, Phone, X,
  SlidersHorizontal
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';

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
  ordering?: string;
  page_size?: string;
}

export default function MyLoansPage() {
  const router = useRouter();
  const [data, setData] = useState<MyLoansResponse>({
    count: 0,
    page: 1,
    page_size: 20,
    total_pages: 1,
    results: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filter state - use null for empty values instead of empty string
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
    ordering: '-disburse_time',
  });

  const fetchMyLoans = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20'
      });
      
      // Add search term
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      // Add all active filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && value !== undefined) {
          params.append(key, value.toString());
        }
      });
      
      const url = `/loans/my_loans/?${params.toString()}`;
      console.log('Fetching URL:', url);
      
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

  const handleServerFilterChange = (newFilters: Record<string, any>) => {
    console.log('Raw filters from table:', newFilters);
    
    const apiFilters: FilterState = {};
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (!value || value === '' || (typeof value === 'object' && Object.keys(value).length === 0)) {
        return;
      }
      
      // Handle different filter types
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
        if (value === 'Overdue') {
          apiFilters.is_overdue = 'true';
        } else if (value === 'Current') {
          apiFilters.is_overdue = 'false';
        } else if (value === 'Paid') {
          apiFilters.outstanding_min = '0';
          apiFilters.outstanding_max = '0';
        }
      }
      else {
        apiFilters[key as keyof FilterState] = value;
      }
    });
    
    console.log('Transformed API filters:', apiFilters);
    setFilters(apiFilters);
    setPage(1);
  };

  const handleServerSearchChange = (search: string) => {
    setSearchTerm(search);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
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
      ordering: '-disburse_time',
    });
  };

  const applyAdvancedFilters = () => {
    const newFilters: FilterState = {};
    
    // Only add non-empty values
    Object.entries(advancedFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== undefined && value !== null) {
        if (key === 'status') {
          if (value === 'Overdue') {
            newFilters.is_overdue = 'true';
          } else if (value === 'Current') {
            newFilters.is_overdue = 'false';
          } else if (value === 'Paid') {
            newFilters.outstanding_min = '0';
            newFilters.outstanding_max = '0';
          }
        } else if (key === 'is_overdue' && value) {
          newFilters.is_overdue = value;
        } else if (key === 'current_month_only' && value === 'true') {
          newFilters.current_month_only = 'true';
        } else if (key === 'ordering' && value) {
          newFilters.ordering = value;
        } else {
          newFilters[key as keyof FilterState] = value;
        }
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
      ordering: '-disburse_time',
    });
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => v && v !== '').length + (searchTerm ? 1 : 0);

  const columns = [
    {
      id: 'loan_id',
      label: 'Loan ID',
      accessor: (row: MyLoan) => row.loan_id,
      Cell: (value: string, row: MyLoan) => (
        <button
          onClick={() => handleViewLoanDetails(row.loan_id)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm"
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
        <span className="font-medium">KSh {parseFloat(value).toLocaleString()}</span>
      ),
      width: 130,
      filter: { type: 'number_range' as const, placeholder: 'Amount' }
    },
    {
      id: 'total_outstanding',
      label: 'Outstanding',
      accessor: (row: MyLoan) => row.total_outstanding,
      Cell: (value: string, row: MyLoan) => {
        const outstanding = parseFloat(value);
        return (
          <span className={outstanding > 0 ? 'text-gray-600 font-medium' : 'text-gray-600'}>
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
        if (daysUntilDue < 0) colorClass = 'text-red-600 font-medium';
        else if (daysUntilDue <= 7) colorClass = 'text-orange-600';
        
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
      filter: { type: 'date_range' as const, placeholder: 'Due date' }
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: MyLoan) => {
        const isOverdue = row.is_overdue_status;
        const hasOutstanding = parseFloat(row.total_outstanding) > 0;
        
        if (hasOutstanding && isOverdue) return 'Overdue';
        if (hasOutstanding) return 'Current';
        return 'Paid';
      },
      Cell: (value: string, row: MyLoan) => {
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
      filter: {
        type: 'choices' as const,
        choices: ['Overdue', 'Current', 'Paid'],
        placeholder: 'Status'
      }
    },
    {
      id: 'assigned_by_details',
      label: 'Assigned By',
      accessor: (row: MyLoan) => row.assigned_by_details?.username || 'System',
      Cell: (value: string, row: MyLoan) => {
        if (!row.assigned_by_details) return <span className="text-gray-400">System</span>;
        return <span>{row.assigned_by_details.username}</span>;
      },
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
          <button
            onClick={() => handleViewLoanDetails(row.loan_id)}
            className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
            title="View loan details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => router.push(`/call-logs/new?loan=${row.loan_id}`)}
            className="text-green-600 hover:text-green-700 transition-colors p-1 rounded hover:bg-green-50"
            title="Log call"
          >
            <Phone size={16} />
          </button>
        </div>
      ),
      width: 100,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Assigned Loans</h1>
          <p className="text-gray-600 mt-2">Loans assigned to you for collection</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAdvancedFilters(true)}
            className="relative"
          >
            <SlidersHorizontal size={20} className="mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={fetchMyLoans}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Advanced Filters</h2>
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info Section */}
              <div>
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="loan_id">Loan ID</Label>
                    <Input
                      id="loan_id"
                      placeholder="Search by loan ID"
                      value={advancedFilters.loan_id}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, loan_id: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_name">Customer Name</Label>
                    <Input
                      id="customer_name"
                      placeholder="Search by customer name"
                      value={advancedFilters.customer_name}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, customer_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      placeholder="Search by phone number"
                      value={advancedFilters.phone_number}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, phone_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="registration_number">Registration Number</Label>
                    <Input
                      id="registration_number"
                      placeholder="Search by registration number"
                      value={advancedFilters.registration_number}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, registration_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="identity_num">ID Number</Label>
                    <Input
                      id="identity_num"
                      placeholder="Search by ID number"
                      value={advancedFilters.identity_num}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, identity_num: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Status Filters */}
              <div>
                <h3 className="text-lg font-medium mb-4">Status Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Loan Status</Label>
                    <Select
                      value={advancedFilters.status || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                        <SelectItem value="Current">Current</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="current_month_only">Current Month Only</Label>
                    <Select
                      value={advancedFilters.current_month_only || undefined}
                      onValueChange={(value) => setAdvancedFilters({...advancedFilters, current_month_only: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Loans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Only Current Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Amount Filters */}
              <div>
                <h3 className="text-lg font-medium mb-4">Amount Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Total Amount Range</Label>
                    <div className="flex space-x-2">
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
                    <Label>Outstanding Amount Range</Label>
                    <div className="flex space-x-2">
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
              </div>

              {/* Date Filters */}
              <div>
                <h3 className="text-lg font-medium mb-4">Date Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Due Date Range</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={advancedFilters.due_date_after}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, due_date_after: e.target.value})}
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={advancedFilters.due_date_before}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, due_date_before: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Disbursement Date Range</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={advancedFilters.disburse_date_after}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, disburse_date_after: e.target.value})}
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={advancedFilters.disburse_date_before}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, disburse_date_before: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Assignment Date Range</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={advancedFilters.assigned_after}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, assigned_after: e.target.value})}
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={advancedFilters.assigned_before}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, assigned_before: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sort Order */}
              <div>
                <h3 className="text-lg font-medium mb-4">Sort Order</h3>
                <div>
                  <Label htmlFor="ordering">Sort By</Label>
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
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  resetAdvancedFilters();
                  applyAdvancedFilters();
                }}
              >
                Reset All
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={applyAdvancedFilters}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Active filters:</span>
          
          {searchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              Search: {searchTerm}
              <button
                onClick={() => setSearchTerm('')}
                className="ml-2 hover:text-blue-600"
              >
                <X size={12} />
              </button>
            </span>
          )}
          
          {Object.entries(filters).map(([key, value]) => {
            if (!value || value === '') return null;
            
            let label = key.replace(/_/g, ' ');
            if (key.includes('_min')) label = `${key.replace('_min', '')} min`;
            if (key.includes('_max')) label = `${key.replace('_max', '')} max`;
            if (key.includes('_after')) label = `${key.replace('_after', '')} after`;
            if (key.includes('_before')) label = `${key.replace('_before', '')} before`;
            if (key === 'current_month_only') label = 'Current month only';
            
            let displayValue = value;
            if (key === 'is_overdue') displayValue = value === 'true' ? 'Overdue' : 'Not Overdue';
            if (key === 'current_month_only') displayValue = 'Yes';
            
            return (
              <span
                key={key}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
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
                  className="ml-2 hover:text-blue-600"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
          
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 ml-auto"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Assigned Loans</p>
            <p className="text-2xl font-bold">{data.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Total Outstanding</p>
            <p className="text-2xl font-bold text-purple-600">
              KSh {data.results.reduce((sum, loan) => sum + parseFloat(loan.total_outstanding), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Overdue Loans</p>
            <p className="text-2xl font-bold text-red-600">
              {data.results.filter(loan => loan.is_overdue_status && parseFloat(loan.total_outstanding) > 0).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Collection Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {data.results.length > 0 
                ? Math.round((data.results.filter(loan => parseFloat(loan.total_outstanding) === 0).length / data.results.length) * 100) 
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">My Loans List</h2>
          </div>
        </CardHeader>
        <CardContent>
          <GenericTable
            data={data.results}
            columns={columns}
            rowKey={(row: MyLoan) => row.id}
            selectionMode="none"
            virtualized={true}
            pagination={{
              totalCount: data.count,
              currentPage: data.page,
              pageSize: data.page_size,
              onPageChange: (newPage: React.SetStateAction<number>) => setPage(newPage),
              serverSide: true
            }}
            serverSideSearch={searchTerm}
            onServerSearchChange={handleServerSearchChange}
            serverSideFilters={filters}
            onServerFilterChange={handleServerFilterChange}
            wrapText={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}