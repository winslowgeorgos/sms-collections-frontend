// app/loan-processor/my-loans/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { MyLoan, OfficerDetails } from '@/types/index';
import { 
  Search, RefreshCw, Eye, AlertCircle, 
  CheckCircle, Calendar, Phone, Filter, X,
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
  ordering?: string;
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

  // Update the fetch function to log the URL for debugging
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
    console.log('Fetching URL:', url); // Debug log
    
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

// app/loan-processor/my-loans/page.tsx

// Update the handleServerFilterChange function
const handleServerFilterChange = (newFilters: Record<string, any>) => {
  console.log('Raw filters from table:', newFilters); // Debug log
  
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
      // Handle status mapping to API params
      if (value === 'Overdue') {
        apiFilters.is_overdue = 'true';
      } else if (value === 'Current') {
        apiFilters.is_overdue = 'false';
        // Optionally add status filter if needed
        // apiFilters.status = 'active';
      } else if (value === 'Paid') {
        // For paid loans, outstanding should be 0
        apiFilters.outstanding_min = '0';
        apiFilters.outstanding_max = '0';
      }
    }
    else {
      // Direct mapping for simple filters like loan_id, customer_name, etc.
      // These will be caught by _build_filters() which does __icontains for these fields
      apiFilters[key as keyof FilterState] = value;
    }
  });
  
  console.log('Transformed API filters:', apiFilters); // Debug log
  setFilters(apiFilters);
  setPage(1);
};


  // Handle search change from GenericTable
  const handleServerSearchChange = (search: string) => {
    setSearchTerm(search);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPage(1);
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
      id: 'due_date',
      label: 'Due Date',
      accessor: (row: MyLoan) => row.due_date,
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
          <Button variant="outline" onClick={fetchMyLoans}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

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
            
            return (
              <span
                key={key}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
              >
                {label}: {value}
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