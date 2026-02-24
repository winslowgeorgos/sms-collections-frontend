// app/analytics/officer/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { 
  ArrowLeft, User, Calendar, Clock, DollarSign, 
  TrendingUp, Target, Award, Activity, PieChart,
  AlertCircle, CheckCircle, XCircle, BarChart3,
  RefreshCw, Download, Eye, Phone, Mail
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

interface OfficerMonthMetrics {
  officer_id: number;
  date: string;
  month_start: string;
  month_end: string;
  month_name: string;
  days_passed: number;
  days_in_month: number;
  month_progress_percentage: number;
  monthly_target: {
    total_cumulative_balance: number;
    total_installments_count: number;
    average_installment_balance: number;
    overdue_count: number;
    overdue_percentage: number;
    paid_off_target: number;
    remaining_to_pay: number;
  };
  progress: {
    collected_month_to_date: number;
    remaining_balance: number;
    collection_rate: number;
    paid_off_this_month: number;
    average_daily_collection: number;
    required_daily_to_meet_target: number;
    projected_total: number;
    projected_vs_target: number;
    projected_success: boolean;
    confidence_score: number;
  };
  performance_analysis: {
    status: string;
    risk_level: string;
    expected_collection_to_date: number;
    actual_vs_expected: number;
    performance_percentage: number;
    efficiency_ratio: number;
    collection_pace: string;
    needs_attention: boolean;
    recovery_possible: boolean;
  };
  weekly_breakdown: Array<{
    week_start: string;
    week_end: string;
    week_number: number;
    target: number;
    collected: number;
    collection_rate: number;
    status: string;
  }>;
  peer_comparison: {
    peer_average_balance: number;
    peer_average_count: number;
    peer_average_overdue_ratio: number;
    peer_average_collection_rate: number;
    percentile: number;
    rank: string;
    comparison_vs_avg: number;
    load_comparison: {
      balance_vs_avg: number;
    };
  };
  trend: Array<{
    date: string;
    collected: number;
    cumulative_balance: number;
    day_name: string;
  }>;
  installments_breakdown: {
    total_assigned: number;
    current_month: number;
    current_month_paid: number;
    current_month_active: number;
    other_months: number;
    other_months_paid: number;
    paid_off_total: number;
    overdue_total: number;
  };
  indicators: {
    month_strength: string;
    collection_consistency: string;
    improvement_trend: string;
  };
}

interface OfficerWeekMetrics {
  officer_id: number;
  date: string;
  week_start: string;
  week_end: string;
  week_number: number;
  year: number;
  days_passed: number;
  week_progress_percentage: number;
  weekly_target: {
    total_cumulative_balance: number;
    total_installments_count: number;
    average_installment_balance: number;
    overdue_count: number;
    overdue_percentage: number;
  };
  progress: {
    collected_week_to_date: number;
    collected_from_weekly_target: number;
    remaining_in_week: number;
    collection_rate: number;
    paid_off_this_week: number;
    average_daily_collection: number;
    projected_weekly_collection: number;
    projected_vs_target: number;
    on_track: boolean;
    confidence_score: number;
  };
  daily_breakdown: Array<{
    date: string;
    day_name: string;
    due_amount: number;
    due_count: number;
    collected: number;
    paid_off_count: number;
    overdue_count: number;
    efficiency: number;
    performance_vs_target: number;
  }>;
  month_context: {
    total_month_cumulative_balance: number;
    active_month_installments: number;
    month_overdue_count: number;
    week_share_of_month: number;
    collected_mtd: number;
  };
  performance: {
    status: string;
    risk_level: string;
    efficiency: number;
    performance_vs_expected: number;
    variance_from_expected: number;
    collection_pace: string;
    needs_attention: boolean;
  };
  peer_comparison: {
    peer_average: number;
    percentile: number;
    rank: string;
    comparison_vs_avg: number;
  };
  trend: Array<{
    date: string;
    collected: number;
  }>;
}

// Updated interface to match the new response structure
interface OfficerDailyHistory {
  data: Array<{
    date: string;
    daily_cumulative_balance: number;
    daily_installments: number;
    daily_overdue: number;
    collected_during_day: number;
    collected_mtd: number;
    collection_rate: number;
    calls_made: number;
    successful_calls: number;
    call_success_rate: number;
    promises_received: number;
    promised_amount: number;
    resolved: number;
    assigned_installments: number;
    assigned_cumulative_balance: number;
    daily_target: number;
    daily_target_achievement: number;
    monthly_target: number;
    monthly_target_achievement: number;
    repayments_handled: number;
  }>;
  count: number;
}

interface OfficerMonthlyHistory {
  data: Array<{
    year: number;
    month: number;
    month_start_date: string;
    month_end_date: string;
    total_collected_month: number;
    avg_cumulative_balance: number;
    avg_collection_rate: number;
    total_resolved_month: number;
    start_cumulative_balance: number;
    end_cumulative_balance: number;
    avg_assigned_installments: number;
    avg_assigned_cumulative_balance: number;
    peak_cumulative_balance: number;
  }>;
  count: number;
}

export default function OfficerAnalyticsPage() {
  const params = useParams();
  const officerId = params.id as string;
  
  const [monthMetrics, setMonthMetrics] = useState<OfficerMonthMetrics | null>(null);
  const [weekMetrics, setWeekMetrics] = useState<OfficerWeekMetrics | null>(null);
  const [dailyHistory, setDailyHistory] = useState<OfficerDailyHistory | null>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<OfficerMonthlyHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'month' | 'week' | 'history'>('month');

  useEffect(() => {
    if (officerId) {
      fetchAllData();
    }
  }, [officerId]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchMonthMetrics(),
        fetchWeekMetrics(),
        fetchDailyHistory(),
        fetchMonthlyHistory()
      ]);
    } catch (error) {
      console.error('Error fetching officer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthMetrics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/loan-processor/metrics/officer/${officerId}/month/`);
      setMonthMetrics(response.data);
    } catch (error) {
      console.error('Error fetching month metrics:', error);
    }
  };

  const fetchWeekMetrics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/loan-processor/metrics/officer/${officerId}/week/`);
      setWeekMetrics(response.data);
    } catch (error) {
      console.error('Error fetching week metrics:', error);
    }
  };

  const fetchDailyHistory = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const client = apiClient.getClient();
      const response = await client.get(
        `/loan-processor/officers/${officerId}/daily-history/?start_date=${startDate}&end_date=${endDate}`
      );
      setDailyHistory(response.data);
    } catch (error) {
      console.error('Error fetching daily history:', error);
    }
  };

  const fetchMonthlyHistory = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      
      const client = apiClient.getClient();
      const response = await client.get(
        `/loan-processor/officers/${officerId}/monthly-history/?year=${year}&month=${month}`
      );
      setMonthlyHistory(response.data);
    } catch (error) {
      console.error('Error fetching monthly history:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return `KSh ${value.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead':
      case 'exceeding':
        return 'text-green-600 bg-green-100';
      case 'behind':
        return 'text-red-600 bg-red-100';
      case 'on_track':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading officer analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/analytics/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Officer Performance Analytics</h1>
            <p className="text-gray-600">Officer ID: {officerId}</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchAllData}>
          <RefreshCw size={20} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* View Selector */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setSelectedView('month')}
          className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
            selectedView === 'month'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Month View
        </button>
        <button
          onClick={() => setSelectedView('week')}
          className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
            selectedView === 'week'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Week View
        </button>
        <button
          onClick={() => setSelectedView('history')}
          className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
            selectedView === 'history'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          History
        </button>
      </div>

      {selectedView === 'month' && monthMetrics && (
        <div className="space-y-6">
          {/* Month Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-blue-100 p-3 mr-4">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Target</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(monthMetrics.monthly_target.total_cumulative_balance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-green-100 p-3 mr-4">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Collected MTD</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(monthMetrics.progress.collected_month_to_date)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-purple-100 p-3 mr-4">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Collection Rate</p>
                    <p className="text-2xl font-bold">{monthMetrics?.progress?.collection_rate?.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className={`rounded-full p-3 mr-4 ${
                    monthMetrics.performance_analysis.risk_level === 'low' ? 'bg-green-100' :
                    monthMetrics.performance_analysis.risk_level === 'medium' ? 'bg-yellow-100' :
                    'bg-red-100'
                  }`}>
                    <AlertCircle className={`h-6 w-6 ${
                      monthMetrics.performance_analysis.risk_level === 'low' ? 'text-green-600' :
                      monthMetrics.performance_analysis.risk_level === 'medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Risk Level</p>
                    <p className="text-2xl font-bold capitalize">{monthMetrics.performance_analysis.risk_level}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Month Progress</span>
                  <span className="font-medium">{monthMetrics?.month_progress_percentage?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${monthMetrics?.month_progress_percentage || 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Performance Analysis</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(monthMetrics.performance_analysis.status)}`}>
                        {monthMetrics.performance_analysis.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Collection Pace:</span>
                      <span className="font-medium">{monthMetrics?.performance_analysis?.collection_pace}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Efficiency Ratio:</span>
                      <span className="font-medium">{monthMetrics?.performance_analysis?.efficiency_ratio?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Expected vs Actual:</span>
                      <span className={monthMetrics.performance_analysis.actual_vs_expected >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(monthMetrics.performance_analysis.actual_vs_expected)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Projections</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Projected Total:</span>
                      <span className="font-medium">{formatCurrency(monthMetrics.progress.projected_total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>vs Target:</span>
                      <span className={monthMetrics.progress.projected_vs_target >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(monthMetrics.progress.projected_vs_target)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Confidence Score:</span>
                      <span className="font-medium">{monthMetrics.progress.confidence_score}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Recovery Possible:</span>
                      <span>{monthMetrics.performance_analysis.recovery_possible ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Breakdown */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Weekly Breakdown</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthMetrics?.weekly_breakdown?.map((week) => (
                  <div key={week.week_number} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Week {week.week_number}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(week.week_start)} - {formatDate(week.week_end)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Target</p>
                        <p className="font-medium">{formatCurrency(week.target)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Collected</p>
                        <p className="font-medium text-green-600">{formatCurrency(week.collected)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Rate</p>
                        <p className={`font-medium ${
                          week.collection_rate >= 100 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {week?.collection_rate?.toFixed(1)}%
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        week.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        week.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {week.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Installments Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Installments Overview</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Assigned:</span>
                    <span className="font-medium">{monthMetrics.installments_breakdown.total_assigned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Month:</span>
                    <span className="font-medium">{monthMetrics.installments_breakdown.current_month}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Month Paid:</span>
                    <span className="font-medium text-green-600">{monthMetrics.installments_breakdown.current_month_paid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Month Active:</span>
                    <span className="font-medium text-orange-600">{monthMetrics.installments_breakdown.current_month_active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid Off Total:</span>
                    <span className="font-medium text-green-600">{monthMetrics.installments_breakdown.paid_off_total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overdue Total:</span>
                    <span className="font-medium text-red-600">{monthMetrics.installments_breakdown.overdue_total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Peer Comparison</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Balance:</span>
                    <span className="font-medium">{formatCurrency(monthMetrics.monthly_target.total_cumulative_balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Peer Average:</span>
                    <span className="font-medium">{formatCurrency(monthMetrics.peer_comparison.peer_average_balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Difference:</span>
                    <span className={`font-medium ${
                      monthMetrics.peer_comparison.load_comparison.balance_vs_avg >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(monthMetrics.peer_comparison.load_comparison.balance_vs_avg)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Collection Rate vs Avg:</span>
                    <span className={`font-medium ${
                      monthMetrics?.peer_comparison?.comparison_vs_avg >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {monthMetrics?.peer_comparison?.comparison_vs_avg?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Percentile:</span>
                    <span className="font-medium">{monthMetrics?.peer_comparison?.percentile}th</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rank:</span>
                    <span className="font-medium capitalize">{monthMetrics?.peer_comparison?.rank}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedView === 'week' && weekMetrics && (
        <div className="space-y-6">
          {/* Week Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-blue-100 p-3 mr-4">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Week Target</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(weekMetrics?.weekly_target?.total_cumulative_balance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-green-100 p-3 mr-4">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Collected</p>
                    <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(weekMetrics?.progress?.collected_week_to_date)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-purple-100 p-3 mr-4">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Progress</p>
                    <p className="text-2xl font-bold">{weekMetrics?.week_progress_percentage?.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className={`rounded-full p-3 mr-4 ${
                    weekMetrics.progress.on_track ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <Activity className={`h-6 w-6 ${
                      weekMetrics.progress.on_track ? 'text-green-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-2xl font-bold">{weekMetrics.progress.on_track ? 'On Track' : 'Behind'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Breakdown */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Daily Breakdown</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weekMetrics?.daily_breakdown?.map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{day.day_name}</p>
                      <p className="text-xs text-gray-500">{formatDate(day.date)}</p>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Due</p>
                        <p className="font-medium">{formatCurrency(day.due_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Collected</p>
                        <p className="font-medium text-green-600">{formatCurrency(day.collected)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Efficiency</p>
                        <p className="font-medium">{day?.efficiency?.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Paid Off</p>
                        <p className="font-medium">{day?.paid_off_count}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Projections */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Weekly Projections</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Projected Total:</span>
                      <span className="font-medium">{formatCurrency(weekMetrics.progress.projected_weekly_collection)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>vs Target:</span>
                      <span className={weekMetrics.progress.projected_vs_target >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(weekMetrics.progress.projected_vs_target)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence Score:</span>
                      <span className="font-medium">{weekMetrics.progress.confidence_score}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Performance</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(weekMetrics.performance.status)}`}>
                        {weekMetrics.performance.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Level:</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getRiskColor(weekMetrics.performance.risk_level)}`}>
                        {weekMetrics.performance.risk_level}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Collection Pace:</span>
                      <span className="font-medium">{weekMetrics.performance.collection_pace}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efficiency:</span>
                      <span className="font-medium">{weekMetrics?.performance?.efficiency?.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'history' && (
        <div className="space-y-6">
          {/* Daily History Chart - Updated with new field names */}
          {dailyHistory && dailyHistory.data.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Daily Collection History</h2>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyHistory.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="collected_during_day"
                        name="Collected Today"
                        fill="#82ca9d"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="daily_cumulative_balance"
                        name="Daily Cumulative Balance"
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily History Table - Updated with new field names */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Daily Performance History</h2>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Collected</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Daily Cumulative</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Collection Rate</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Calls Made</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Resolved</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Assigned Balance</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Daily Target %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyHistory?.data?.map((day, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{formatDate(day.date)}</td>
                        <td className="text-right py-3 px-4 text-green-600">{formatCurrency(day.collected_during_day)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(day.daily_cumulative_balance)}</td>
                        <td className="text-right py-3 px-4">{day?.collection_rate?.toFixed(1)}%</td>
                        <td className="text-right py-3 px-4">{day.calls_made}</td>
                        <td className="text-right py-3 px-4">{day.resolved}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(day.assigned_cumulative_balance)}</td>
                        <td className="text-right py-3 px-4">{day?.daily_target_achievement?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Monthly History */}
          {monthlyHistory && monthlyHistory.data.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Monthly Summary</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyHistory?.data?.map((month, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Period</p>
                          <p className="font-medium">
                            {formatDate(month.month_start_date)} - {formatDate(month.month_end_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Collected</p>
                          <p className="font-medium text-green-600">{formatCurrency(month.total_collected_month)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Avg Collection Rate</p>
                          <p className="font-medium">{month?.avg_collection_rate?.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Resolved</p>
                          <p className="font-medium">{month.total_resolved_month}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}