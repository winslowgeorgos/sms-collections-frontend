// app/call-logs/all/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api';
import { 
  Phone, Filter, Search, RefreshCw, Eye,
  Calendar, Clock, Users, Download, X
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import Link from 'next/link';



interface CallLog {
  id: string;
  call_time: string;
  duration_seconds: number;
  duration_minutes: number;
  outcome: string;
  outcome_display: string;
  notes: string;
  officer: number;
  officer_name: string;
  main_loan: string;
  loan_id: string;
  customer_name: string;
  new_collection_status: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  created_at: string;
}

interface FilterParams {
  start_date?: string;
  end_date?: string;
  outcome?: string;
  follow_up_required?: boolean;
  loan_id?: string;
  officer_id?: string;
  page: number;
  page_size: number;
}

const OUTCOME_OPTIONS = [
  { value: 'contacted', label: 'Customer Contacted' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Line Busy' },
  { value: 'callback', label: 'Customer Requested Callback' },
  { value: 'voicemail', label: 'Left Voicemail' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'disconnected', label: 'Number Disconnected' },
  { value: 'switched_off', label: 'Phone Switched Off' },
  { value: 'language', label: 'Language Barrier' },
  { value: 'hung_up', label: 'Customer Hung Up' },
  { value: 'abusive', label: 'Abusive Customer' },
  { value: 'promise', label: 'Promise to Pay Made' },
  { value: 'partial', label: 'Partial Payment Made' },
  { value: 'full', label: 'Full Payment Made' },
];

export default function AllCallLogsPage() {
  const router = useRouter();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    page_size: 20,
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchCallLogs();
  }, [filters.page, filters.page_size, filters.start_date, filters.end_date, filters.outcome, filters.follow_up_required, filters.loan_id, filters.officer_id]);

  const fetchCallLogs = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const queryParams = new URLSearchParams();
      
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);
      if (filters.outcome) queryParams.append('outcome', filters.outcome);
      if (filters.follow_up_required !== undefined) queryParams.append('follow_up_required', String(filters.follow_up_required));
      if (filters.loan_id) queryParams.append('loan_id', filters.loan_id);
      if (filters.officer_id) queryParams.append('officer_id', filters.officer_id);
      queryParams.append('page', String(filters.page));
      queryParams.append('page_size', String(filters.page_size));

      const response = await client.get(`/call-logs/?${queryParams.toString()}`);
      setCallLogs(response.data?.results || []);
      setTotalCount(response.data?.count || 0);
    } catch (error) {
      console.error('Error fetching call logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCall = (callId: string) => {
    router.push(`/call_logs/${callId}`);
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20,
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      outcome: undefined,
      follow_up_required: undefined,
      loan_id: undefined,
      officer_id: undefined
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const columns = [
    {
      id: 'call_time',
      label: 'Date & Time',
      accessor: (row: CallLog) => row.call_time,
      Cell: (value: string) => (
        <div>
          <div className="font-medium">{new Date(value).toLocaleDateString()}</div>
          <div className="text-xs text-gray-500">{new Date(value).toLocaleTimeString()}</div>
        </div>
      ),
      width: 150,
    },
    {
      id: 'customer_name',
      label: 'Customer',
      accessor: (row: CallLog) => row.customer_name,
      Cell: (value: string, row: CallLog) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">Loan: {row.loan_id}</div>
        </div>
      ),
      width: 200,
      filter: {
        type: 'text' as const,
        placeholder: 'Search customer...'
      }
    },
    {
      id: 'outcome',
      label: 'Outcome',
      accessor: (row: CallLog) => row.outcome,
      Cell: (value: string, row: CallLog) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'promise' ? 'bg-green-100 text-green-800' :
          value === 'contacted' ? 'bg-blue-100 text-blue-800' :
          value === 'no_answer' ? 'bg-gray-100 text-gray-800' :
          value === 'wrong_number' || value === 'disconnected' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {row.outcome_display}
        </span>
      ),
      width: 150,
      filter: {
        type: 'choices' as const,
        choices: OUTCOME_OPTIONS.map(o => o.value),
        placeholder: 'Filter by outcome'
      }
    },
       {
      id: 'notes',
      label: 'Comments/Notes',
      accessor: (row: CallLog) => row.notes,
      width: 100,
    },
    {
      id: 'duration',
      label: 'Duration',
      accessor: (row: CallLog) => row.duration_seconds,
      Cell: (value: number) => formatDuration(value),
      width: 100,
    },
    {
      id: 'officer_name',
      label: 'Officer',
      accessor: (row: CallLog) => row.officer_name,
      width: 120,
    },
    {
      id: 'follow_up',
      label: 'Follow-up',
      accessor: (row: CallLog) => row.follow_up_required,
      Cell: (value: boolean, row: CallLog) => (
        value ? (
          <div>
            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
              Required
            </span>
            {row.follow_up_date && (
              <div className="text-xs text-gray-500 mt-1">
                {new Date(row.follow_up_date).toLocaleDateString()}
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-sm">None</span>
        )
      ),
      width: 120,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: CallLog) => row,
      Cell: (value: CallLog) => (
        <button
          onClick={() => handleViewCall(value.id)}
          className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
          title="View details"
        >
          <Eye size={18} />
        </button>
      ),
      width: 80,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Call Logs</h1>
          <p className="text-gray-600 mt-2">View and filter all collection calls</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setIsFilterModalOpen(true)}>
            <Filter size={20} className="mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={resetFilters}>
            <X size={20} className="mr-2" />
            Clear
          </Button>
          <Button variant="outline" onClick={fetchCallLogs}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.outcome || filters.follow_up_required || filters.loan_id || filters.officer_id) && (
        <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Active Filters:</span>
          {filters.outcome && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
              Outcome: {OUTCOME_OPTIONS.find(o => o.value === filters.outcome)?.label || filters.outcome}
              <button onClick={() => setFilters(prev => ({ ...prev, outcome: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.follow_up_required !== undefined && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center">
              Follow-up Required
              <button onClick={() => setFilters(prev => ({ ...prev, follow_up_required: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
          {filters.loan_id && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center">
              Loan: {filters.loan_id}
              <button onClick={() => setFilters(prev => ({ ...prev, loan_id: undefined }))} className="ml-2">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Call Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Call Logs</h2>
            <div className="text-sm text-gray-600">
              Showing {((filters.page - 1) * filters.page_size) + 1} - {Math.min(filters.page * filters.page_size, totalCount)} of {totalCount}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-600">Loading call logs...</div>
            </div>
          ) : (
            <GenericTable
              data={callLogs}
              columns={columns}
              rowKey={(row: CallLog) => row.id}
              selectionMode="none"
              virtualized={true}
        
              pagination={{
                totalCount,
                currentPage: filters.page,
                pageSize: filters.page_size,
                onPageChange: handlePageChange,
                serverSide: true,
                hasNextPage: filters.page * filters.page_size < totalCount
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Call Logs"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outcome
            </label>
            <select
              value={filters.outcome || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, outcome: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Outcomes</option>
              {OUTCOME_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loan ID
            </label>
            <input
              type="text"
              value={filters.loan_id || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, loan_id: e.target.value || undefined }))}
              placeholder="Enter loan ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Officer ID
            </label>
            <input
              type="text"
              value={filters.officer_id || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, officer_id: e.target.value || undefined }))}
              placeholder="Enter officer ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="follow_up_required"
              checked={filters.follow_up_required || false}
              onChange={(e) => setFilters(prev => ({ ...prev, follow_up_required: e.target.checked || undefined }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="follow_up_required" className="ml-2 block text-sm text-gray-900">
              Follow-up Required Only
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsFilterModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setFilters(prev => ({ ...prev, page: 1 }));
              setIsFilterModalOpen(false);
            }}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}