// app/loan-processor/my-loans/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { MyLoan, OfficerDetails } from '@/types/index';
import { 
  Search, RefreshCw, Eye, UserCheck, AlertCircle, 
  CheckCircle, Calendar, DollarSign, TrendingUp,
  Phone, Mail, User
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';

interface MyLoansResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: MyLoan[];
}

interface MyPerformance {
  total_assigned: number;
  total_outstanding: number;
  overdue_count: number;
  collection_rate: number;
  calls_made: number;
  promises_secured: number;
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
  const [performance, setPerformance] = useState<MyPerformance>({
    total_assigned: 0,
    total_outstanding: 0,
    overdue_count: 0,
    collection_rate: 0,
    calls_made: 0,
    promises_secured: 0
  });

  useEffect(() => {
    fetchMyLoans();
    fetchMyPerformance();
  }, [page]);

  const fetchMyLoans = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/loans/my_loans/?page=${page}&page_size=20`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching my loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyPerformance = async () => {
    try {
      const client = apiClient.getClient();
      // This endpoint might need to be created or use existing ones
      // const response = await client.get('/loan-processor/officer-performance/');
      // setPerformance(response.data);
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const handleViewLoanDetails = (loanId: string) => {
    window.open(`/loans/${loanId}`, '_blank');
  };

  const filteredLoans = data.results.filter(loan => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      loan.customer_name.toLowerCase().includes(searchLower) ||
      loan.loan_id.toLowerCase().includes(searchLower) ||
      loan.phone_number.includes(searchLower)
    );
  });

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
      filter: {
        type: 'text' as const,
        placeholder: 'Search loan ID...'
      }
    },
    {
      id: 'customer_name',
      label: 'Customer Name',
      accessor: (row: MyLoan) => row.customer_name,
      width: 220,
      filter: {
        type: 'text' as const,
        placeholder: 'Search customer...'
      }
    },
    {
      id: 'phone_number',
      label: 'Phone',
      accessor: (row: MyLoan) => row.phone_number,
      width: 120,
    },
    {
      id: 'total_amount',
      label: 'Total Amount',
      accessor: (row: MyLoan) => row.total_amount,
      Cell: (value: string) => (
        <span className="font-medium">KSh {parseFloat(value).toLocaleString()}</span>
      ),
      width: 130,
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
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: MyLoan) => row.status,
      Cell: (value: number, row: MyLoan) => {
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
    },
    {
      id: 'assigned_by_details',
      label: 'Assigned By',
      accessor: (row: MyLoan) => row.assigned_by_details,
      Cell: (value: OfficerDetails) => {
        if (!value) return <span className="text-gray-400">System</span>;
        return <span>{value.username}</span>;
      },
      width: 120,
    },
    {
      id: 'assigned_at',
      label: 'Assigned On',
      accessor: (row: MyLoan) => new Date(row.assigned_at).toLocaleDateString(),
      width: 110,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: MyLoan) => row,
      Cell: (value: MyLoan) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewLoanDetails(value.loan_id)}
            className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
            title="View loan details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => window.open(`/call-logs/new?loan=${value.loan_id}`, '_blank')}
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
        <Button variant="outline" onClick={fetchMyLoans}>
          <RefreshCw size={20} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Assigned Loans</p>
            <p className="text-2xl font-bold">{data.count}</p>
          </CardContent>
        </Card>
        
        {/* <Card>
          <CardContent className="pt-4 w-full">
            <p className="text-sm text-gray-600">Outstanding</p>
            <p className="text-2xl font-bold text-purple-600">
              KSh {data.results.reduce((sum, loan) => sum + parseFloat(loan.total_outstanding), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card> */}


      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search your loans by customer name, loan ID, or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">My Loans List</h2>
            <div className="text-sm text-gray-600">
              Showing {filteredLoans.length} of {data.count} loans
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading your loans...</div>
            </div>
          ) : (
            <GenericTable
              data={filteredLoans}
              columns={columns}
              rowKey={(row: MyLoan) => row.id}
              selectionMode="none"
              virtualized={true}
              pagination={{
                totalCount: data.count,
                currentPage: data.page,
                pageSize: data.page_size,
                onPageChange: (newPage) => setPage(newPage),
                serverSide: true
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}