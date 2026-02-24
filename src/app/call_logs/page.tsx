// app/call-logs/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api';
import { 
  Phone, PhoneCall, Clock, Calendar, Users, TrendingUp, 
  CheckCircle, AlertCircle, Filter, Search, RefreshCw,
  Download, BarChart3, PieChart as PieChartIcon, UserCheck,
  ListTodo, Plus, Eye, Edit, Trash2, MessageSquare
} from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import CreateCallLogModal from '@/components/call_logs/CreateCallLogModal';
import Link from 'next/link';

interface CallLogStatistics {
  period: string;
  start_date: string;
  end_date: string;
  total_calls: number;
  outcome_breakdown: Record<string, { count: number; percentage: number }>;
  daily_trend: Array<{ date: string; calls: number }>;
  officer_stats: Array<{
    officer: string;
    full_name: string;
    total_calls: number;
    successful_contacts: number;
    promises_made: number;
    avg_duration: number;
    success_rate: number;
  }>;
  avg_call_duration: number;
  follow_up_pending: number;
  follow_up_overdue: number;
}

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

export default function CallLogsPage() {
  const router = useRouter();
  const [statistics, setStatistics] = useState<CallLogStatistics | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchStatistics();
    fetchRecentCalls();
  }, [selectedPeriod]);

  const fetchStatistics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/call-logs/statistics/?period=${selectedPeriod}`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching call statistics:', error);
    }
  };

  const fetchRecentCalls = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get('/call-logs/?page_size=10');
      setRecentCalls(response.data?.results || []);
    } catch (error) {
      console.error('Error fetching recent calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCall = (callId: string) => {
    window.open(`/call_logs/${callId}`, '_blank');
  };

  const handleExportData = () => {
    // Export logic
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Call Logs</h1>
          <p className="text-gray-600 mt-2">Track and manage collection calls</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => router.push('/call_logs/follow_up')}>
            <ListTodo size={20} className="mr-2" />
            Follow-ups ({statistics?.follow_up_pending || 0})
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download size={20} className="mr-2" />
            Export
          </Button>
          {/* <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <PhoneCall size={20} className="mr-2" />
            Log Call
          </Button> */}
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-blue-100 p-3 mr-4">
                    <PhoneCall className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Calls</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.total_calls}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-green-100 p-3 mr-4">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDuration(statistics.avg_call_duration)}
                    </p>
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
                    <p className="text-sm font-medium text-gray-600">Follow-ups Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.follow_up_pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-red-100 p-3 mr-4">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.follow_up_overdue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Period Selector and Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Outcome Breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Outcome Breakdown</h2>
                  <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    {(['day', 'week', 'month'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          selectedPeriod === period
                            ? 'bg-white text-gray-900 shadow'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statistics.outcome_breakdown).map(([outcome, data]) => (
                    <div key={outcome}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{outcome}</span>
                        <span className="font-medium">{data.count} ({data.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <h2 className="text-lg font-semibold">Daily Call Trend</h2>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end space-x-2">
                  {statistics.daily_trend.map((day) => {
                    const maxCalls = Math.max(...statistics.daily_trend.map(d => d.calls));
                    const height = maxCalls > 0 ? (day.calls / maxCalls) * 100 : 0;
                    
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-blue-100 rounded-t relative group">
                          <div
                            className="bg-blue-600 rounded-t transition-all duration-300"
                            style={{ height: `${height}%`, minHeight: day.calls > 0 ? '4px' : '0' }}
                          />
                          {day.calls > 0 && (
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {day.calls} calls
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 mt-2">
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Officer Performance */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Officer Performance</h2>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Officer</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Total Calls</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Success Rate</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Promises</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.officer_stats.map((officer) => (
                      <tr key={officer.officer} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-blue-600">
                                {officer.officer.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{officer.officer}</p>
                              <p className="text-xs text-gray-500">{officer.full_name || 'Collection Officer'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">{officer.total_calls}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            officer.success_rate >= 70 ? 'bg-green-100 text-green-800' :
                            officer.success_rate >= 40 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {officer.success_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">{officer.promises_made}</td>
                        <td className="py-3 px-4">{formatDuration(officer.avg_duration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Calls</h2>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/call_logs/all')}>
                View All
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/call_logs/my-calls')}>
                <UserCheck size={16} className="mr-2" />
                My Calls
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-600">Loading recent calls...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewCall(call.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Phone size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{call.customer_name}</p>
                        <p className="text-sm text-gray-600">Loan: {call.loan_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        call.outcome === 'promise' ? 'bg-green-100 text-green-800' :
                        call.outcome === 'contacted' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {call.outcome_display}
                      </span>
                      {call.follow_up_required && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          Follow-up
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">Time:</span>
                      <p className="font-medium">{new Date(call.call_time).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <p className="font-medium">{formatDuration(call.duration_seconds)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Officer:</span>
                      <p className="font-medium">{call.officer_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Follow-up:</span>
                      <p className="font-medium">
                        {call.follow_up_date ? new Date(call.follow_up_date).toLocaleDateString() : 'None'}
                      </p>
                    </div>
                  </div>
                  
                  {call.notes && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{call.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Call Log Modal */}
      {/* <CreateCallLogModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchStatistics();
          fetchRecentCalls();
        }}
      /> */}
    </div>
  );
}