// app/call-logs/my-calls/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { 
  Phone, Calendar, Clock, Users, TrendingUp,
  Eye, Filter, Search, RefreshCw, BarChart3,
  CheckCircle, AlertCircle
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';

interface MyCallsResponse {
  statistics: {
    total_calls: number;
    successful_contacts: number;
    promises_made: number;
    follow_ups_required: number;
    avg_duration: number;
  };
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: Array<{
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
  }>;
}

export default function MyCallLogsPage() {
  const router = useRouter();
  const [data, setData] = useState<MyCallsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    fetchMyCalls();
  }, [days, page, pageSize]);

  const fetchMyCalls = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/call-logs/my_calls/?days=${days}&page=${page}&page_size=${pageSize}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching my calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCall = (callId: string) => {
    window.open(`/call_logs/${callId}`, '_blank');
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
      accessor: (row: any) => row.call_time,
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
      accessor: (row: any) => row.customer_name,
      Cell: (value: string, row: any) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">Loan: {row.loan_id}</div>
        </div>
      ),
      width: 200,
    },
    {
      id: 'outcome',
      label: 'Outcome',
      accessor: (row: any) => row.outcome,
      Cell: (value: string, row: any) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'promise' ? 'bg-green-100 text-green-800' :
          value === 'contacted' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {row.outcome_display}
        </span>
      ),
      width: 150,
    },
    {
      id: 'duration',
      label: 'Duration',
      accessor: (row: any) => row.duration_seconds,
      Cell: (value: number) => formatDuration(value),
      width: 100,
    },
    {
      id: 'follow_up',
      label: 'Follow-up',
      accessor: (row: any) => row.follow_up_required,
      Cell: (value: boolean, row: any) => (
        value ? (
          <div>
            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
              {row.follow_up_date ? new Date(row.follow_up_date).toLocaleDateString() : 'Required'}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">None</span>
        )
      ),
      width: 120,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: any) => row,
      Cell: (value: any) => (
        <button
          onClick={() => handleViewCall(value.id)}
          className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
        >
          <Eye size={18} />
        </button>
      ),
      width: 80,
    },
  ];

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Call Logs</h1>
          <p className="text-gray-600 mt-2">Track your collection calls and performance</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button variant="outline" onClick={fetchMyCalls}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold">{data.statistics.total_calls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Successful</p>
                <p className="text-2xl font-bold">{data.statistics.successful_contacts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-purple-100 p-3 mr-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Promises</p>
                <p className="text-2xl font-bold">{data.statistics.promises_made}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-yellow-100 p-3 mr-4">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Follow-ups</p>
                <p className="text-2xl font-bold">{data.statistics.follow_ups_required}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-orange-100 p-3 mr-4">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold">{formatDuration(data.statistics.avg_duration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Logs Table */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">My Recent Calls</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-600">Loading your calls...</div>
            </div>
          ) : (
            <GenericTable
              data={data.results}
              columns={columns}
              rowKey={(row: any) => row.id}
              selectionMode="none"
              virtualized={true}
              pagination={{
                totalCount: data.count,
                currentPage: data.page,
                pageSize: data.page_size,
                onPageChange: (newPage) => setPage(newPage),
                serverSide: true,
                hasNextPage: data.page < data.total_pages,

              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}