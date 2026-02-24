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

interface AssignedLoansResponse {
  count: number;
  assignment_metrics: AssignmentMetrics;
  assigned_loans: AssignedLoan[];
}

export default function AssignedLoansPage() {
  const router = useRouter();
  const { hasAccess } = usePermissions();

  const [data, setData] = useState<AssignedLoansResponse>({
    count: 0,
    assignment_metrics: {
      total_assigned_loans: 0,
      total_assigned_cumulative_balance: 0,
      average_assigned_balance: 0
    },
    assigned_loans: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);
  const [isBulkReassignModalOpen, setIsBulkReassignModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedLoanForHistory, setSelectedLoanForHistory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterOfficer, setFilterOfficer] = useState<string>('');

  useEffect(() => {
    fetchAssignedLoans();
  }, [page, pageSize, filterOfficer]);

  const fetchAssignedLoans = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      let url = '/loan-processor/assigned-loans/';
      if (filterOfficer) {
        url += `?officer_username=${filterOfficer}`;
      }
      const response = await client.get(url);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching assigned loans:', error);
    } finally {
      setIsLoading(false);
    }
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

  const filteredLoans = data.assigned_loans.filter(loan => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      loan.customer_name.toLowerCase().includes(searchLower) ||
      loan.loan_id.toLowerCase().includes(searchLower) ||
      loan.phone_number.includes(searchLower) ||
      loan.current_assigned_officer_details?.username?.toLowerCase().includes(searchLower)
    );
  });

  // Group loans by officer for summary
  const loansByOfficer = filteredLoans.reduce((acc, loan) => {
    const officer = loan.current_assigned_officer_details?.username || 'Unknown';
    if (!acc[officer]) {
      acc[officer] = {
        count: 0,
        cumulativeBalance: 0
      };
    }
    acc[officer].count++;
    acc[officer].cumulativeBalance += parseFloat(loan?.total_outstanding?.toString() || '0');
    return acc;
  }, {} as Record<string, { count: number; cumulativeBalance: number }>);

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
      filter: {
        type: 'text' as const,
        placeholder: 'Search loan ID...'
      }
    },
    {
      id: 'customer_name',
      label: 'Customer Name',
      accessor: (row: AssignedLoan) => row.customer_name,
      width: 220,
      filter: {
        type: 'text' as const,
        placeholder: 'Search customer...'
      }
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
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: AssignedLoan) => row,
      Cell: (value: AssignedLoan) => (
        <div className="flex space-x-2">
          {/* View button */}
          {canView && (
            <button
              onClick={() => handleViewLoanDetails(value.loan_id)}
              className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
              title="View loan details"
            >
              <Eye size={16} />
            </button>
          )}
          
          {/* Reassign button */}
          {canReassign && (
            <button
              onClick={() => handleReassignLoan(value.loan_id)}
              className="text-orange-600 hover:text-orange-700 transition-colors p-1 rounded hover:bg-orange-50"
              title="Reassign loan to another officer"
            >
              <UserMinus size={16} />
            </button>
          )}
          
          {/* History button */}
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

  // Officer filter options
  const officerOptions = Object.keys(loansByOfficer).map(officer => ({
    value: officer,
    label: `${officer} (${loansByOfficer[officer].count} loans, KSh ${loansByOfficer[officer].cumulativeBalance.toLocaleString()})`
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assigned Loans</h1>
          <p className="text-gray-600 mt-2">Loans currently assigned to collection officers</p>
        </div>
        <div className="flex space-x-3">
          {/* Bulk Reassign button */}
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
          
          {/* Refresh button */}
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
                  {data.assignment_metrics.total_assigned_loans}
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
                  KSh {data.assignment_metrics.total_assigned_cumulative_balance.toLocaleString()}
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
                  KSh {data.assignment_metrics.average_assigned_balance.toLocaleString()}
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
                  {Object.keys(loansByOfficer).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Officer Distribution Summary */}
      {/* {Object.keys(loansByOfficer).length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Assignment Distribution</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(loansByOfficer).map(([officer, stats]) => (
                <div key={officer} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{officer}</p>
                    <p className="text-sm text-gray-600">{stats.count} loans</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-purple-600">
                      KSh {stats.cumulativeBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Search and Filter Bar */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search assigned loans by customer name, loan ID, phone number, or officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        
        {/* Officer Filter Dropdown */}
        {officerOptions.length > 0 && (
          <select
            value={filterOfficer}
            onChange={(e) => setFilterOfficer(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Officers</option>
            {officerOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">Assigned Loans List</h2>
            <div className="text-sm text-gray-600">
              Showing {filteredLoans.length} of {data.assignment_metrics.total_assigned_loans} assigned loans
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
              data={filteredLoans}
              columns={columns}
              rowKey={(row: AssignedLoan) => row.id}
              selectionMode={canReassign ? "multiple" : "none"}
              onSelectionChange={(selectedRows) => {
                if (canReassign) {
                  setSelectedLoans(selectedRows.map((row: AssignedLoan) => row.loan_id));
                }
              }}
              virtualized={true}
            />
          )}
        </CardContent>
      </Card>

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