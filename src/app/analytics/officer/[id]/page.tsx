'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft, User, Calendar, Clock, DollarSign,
  TrendingUp, Target, Award, Activity,
  AlertCircle, CheckCircle, XCircle, BarChart3,
  RefreshCw, Download, Eye, Phone, Mail, HelpCircle
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
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';

// ============================================================
// TYPES - UPDATED TO MATCH PROVIDED RESPONSES
// ============================================================

// Week Metrics Type (from /loan-processor/metrics/officer/12/week/)
interface OfficerWeekMetrics {
  officer_id: number;
  date: string;
  week_start: string;
  week_end: string;
  week_number: number;
  year: number;
  days_passed: number;
  days_remaining: number;
  week_progress_percentage: number;
  weekly_targets: {
    week_to_date_target: number;
    upcoming_target: number;
    full_week_target: number;
    description: string;
    source: string;
  };
  daily_snapshots: Record<string, {
    target: number;
    cumulative_balance: number;
    collected: number;
    achievement: number;
  }>;
  week_to_date_balance: number;
  upcoming_balance: number;
  full_week_balance: number;
  weekly_installments_count: number;
  weekly_overdue_count: number;
  weekly_overdue_percentage: number;
  collected_week_to_date: number;
  paid_off_this_week: number;
  remaining_week_to_date: number;
  remaining_full_week: number;
  collection_rate_vs_week_to_date: number;
  collection_rate_vs_full_week: number;
  expected_collection_to_date: number;
  performance_vs_expected: number;
  performance_percentage: number;
  average_daily_collection: number;
  projected_weekly_collection: number;
  projected_vs_target: number;
  on_track: boolean;
  status: string;
  risk_level: string;
  collection_pace: string;
  needs_attention: boolean;
  daily_breakdown: Array<{
    date: string;
    day_name: string;
    daily_cumulative_target: number;
    cumulative_due_up_to_day: number;
    cumulative_collected_up_to_day: number;
    remaining_after_day: number;
    collected_today: number;
    paid_off_count_today: number;
    cumulative_overdue_up_to_day: number;
    target_accuracy: number;
    cumulative_achievement: number;
  }>;
  month_context: {
    monthly_target: number;
    week_share_of_month: number;
    collected_mtd: number;
  };
  call_metrics: {
    calls_made_today: number;
    successful_calls_today: number;
    call_success_rate: number;
    avg_duration: number;
  };
  promise_metrics: {
    promises_received_today: number;
    promised_amount_today: string;
    promises_fulfilled_today: number;
    fulfilled_amount_today: string;
  };
  enhanced_metrics: {
    efficiency: {
      best_collection_day: { date: string; amount: number };
      best_cumulative_day: { date: string; achievement: number };
      worst_cumulative_day: { date: string; achievement: number };
      target_accuracy_range: { min: number; max: number; average: number };
    };
  };
}

// Month Metrics Type (from /loan-processor/metrics/officer/12/month/)
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
    current_month_target: number;
    total_current_balance: number;
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
    pre_payments: number;
    collection_rate: number;
    status: string;
    remaining: number;
  }>;
  peer_comparison: {
    peer_average_target: number;
    peer_average_count: number;
    peer_average_overdue_ratio: number;
    peer_average_collection_rate: number;
    peer_average_collected: number;
    percentile: number;
    rank: string;
    comparison_vs_avg: number;
    collected_vs_avg: number;
    load_comparison: { target_vs_avg: number };
  };
  trend: Array<{
    date: string;
    collected: number;
    target: number;
    cumulative_balance: number;
    pre_payments: number;
    day_name: string;
    week_number: number;
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
  call_metrics: {
    calls_made_today: number;
    successful_calls_today: number;
    call_success_rate: number;
    avg_duration: number;
  };
  promise_metrics: {
    promises_received_today: number;
    promised_amount_today: string;
    promises_fulfilled_today: number;
    fulfilled_amount_today: string;
  };
  enhanced_metrics: {
    pre_payment: { count: number; total_posted: number; total_remained: number; collection_efficiency: number };
    discounts: { count: number; total_amount: number };
    assignment_stats: { assignments_this_month: number; currently_assigned_loans: number; total_collected_all_time: number };
    collection_efficiency: { amount_received: number; collection_rate_vs_expected: number; projected_remaining: number };
    payment_quality: { pre_payment_ratio: number; discount_ratio: number };
  };
}

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

// ============================================================
// HELPER COMPONENT: Metric Hint Tooltip
// ============================================================

const MetricHint = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="focus:outline-none"
      >
        <HelpCircle size={14} className="text-gray-400 hover:text-gray-600" />
      </button>
      {show && (
        <div className="absolute z-10 w-48 p-2 mt-1 text-xs text-white bg-gray-800 rounded shadow-lg -left-24 top-4">
          {text}
          <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 -top-1 left-1/2 -ml-1"></div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

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
    return `KSh ${value?.toLocaleString() ?? 0}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
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
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Officer Performance Analytics</h1>
            <p className="text-gray-600">Officer ID: {officerId} | As of {new Date().toLocaleDateString()}</p>
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

      {/* MONTH VIEW - UPDATED */}
      {selectedView === 'month' && monthMetrics && (
        <div className="space-y-6">
          {/* Month Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="rounded-full bg-blue-100 p-3 mr-4">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 flex items-center">
                        Monthly Target
                        <MetricHint text="Total cumulative balance target for the current month from all assigned installments" />
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(monthMetrics.monthly_target.current_month_target)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="rounded-full bg-green-100 p-3 mr-4">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 flex items-center">
                        Collected MTD
                        <MetricHint text="Total amount collected from the start of the month until today" />
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(monthMetrics.progress.collected_month_to_date)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

              <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="rounded-full bg-orange-100 p-3 mr-4">
                      <Target className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 flex items-center">
                        Pending Collections
                        <MetricHint text="Total cumulative balance target for the current month from all assigned installments" />
                      </p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(monthMetrics.monthly_target.total_current_balance)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="rounded-full bg-purple-100 p-3 mr-4">
                      <Activity className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 flex items-center">
                        Collection Rate
                        <MetricHint text="Percentage of monthly target collected so far (Collected / Monthly Target)" />
                      </p>
                      <p className="text-2xl font-bold">{monthMetrics.progress.collection_rate?.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
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
                      <p className="text-sm text-gray-600 flex items-center">
                        Risk Level
                        <MetricHint text="Overall risk assessment based on overdue percentage, collection pace, and recovery possibility" />
                      </p>
                      <p className="text-2xl font-bold capitalize">{monthMetrics.performance_analysis.risk_level}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  Month Progress
                  <MetricHint text="How far into the month we are (days passed) vs collection progress" />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Time Progress: {monthMetrics.days_passed}/{monthMetrics.days_in_month} days</span>
                      <span>{monthMetrics.month_progress_percentage?.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${monthMetrics.month_progress_percentage}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Collection Progress</span>
                      <span>{monthMetrics.progress.collection_rate?.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(monthMetrics.progress.collection_rate, 100)}%` }} />
                    </div>
                  </div>
                  <div className="pt-2 text-sm text-gray-600">
                    <p>📊 <strong>Analysis:</strong> {monthMetrics.progress.collection_rate < monthMetrics.month_progress_percentage ? 
                      `Collection is behind schedule by ${(monthMetrics.month_progress_percentage - monthMetrics.progress.collection_rate).toFixed(1)}%.` : 
                      `Collection is ahead of schedule!`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  Performance Snapshot
                  <MetricHint text="Key performance indicators comparing expected vs actual collection" />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(monthMetrics.performance_analysis.status)}`}>
                      {monthMetrics.performance_analysis.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Collection Pace</p>
                    <p className="font-medium">{monthMetrics.performance_analysis.collection_pace}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Efficiency Ratio</p>
                    <p className="font-medium">{monthMetrics.performance_analysis.efficiency_ratio?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Recovery Possible</p>
                    <p className="font-medium">{monthMetrics.performance_analysis.recovery_possible ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Breakdown Chart */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center">
                Weekly Collection Performance
                <MetricHint text="Shows target vs actual collected by week. 'In Progress' weeks are current, 'Completed' are past" />
              </h2>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthMetrics.weekly_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week_number" label={{ value: 'Week Number', position: 'insideBottom', offset: -5 }} />
                    <YAxis tickFormatter={(value) => `KSh ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="target" name="Weekly Target" fill="#8884d8" />
                    <Bar dataKey="collected" name="Collected" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Installments & Peer Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  Installments Overview
                  <MetricHint text="Breakdown of installments: Total assigned to officer, current month status, overdue count" />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Total Assigned:</span>
                    <span className="font-medium">{monthMetrics.installments_breakdown.total_assigned}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Current Month:</span>
                    <span className="font-medium">{monthMetrics.installments_breakdown.current_month}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Current Month Paid:</span>
                    <span className="font-medium text-green-600">{monthMetrics.installments_breakdown.current_month_paid}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Active This Month:</span>
                    <span className="font-medium text-orange-600">{monthMetrics.installments_breakdown.current_month_active}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Paid Off Total:</span>
                    <span className="font-medium text-green-600">{monthMetrics.installments_breakdown.paid_off_total}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Overdue Total:</span>
                    <span className="font-medium text-red-600">{monthMetrics.installments_breakdown.overdue_total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  Peer Comparison
                  <MetricHint text="How this officer performs compared to peers. Positive numbers mean better than average." />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Target vs Peer Avg:</span>
                    <span className={`font-medium ${monthMetrics.peer_comparison.load_comparison.target_vs_avg >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(monthMetrics.peer_comparison.load_comparison.target_vs_avg)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Collection Rate vs Avg:</span>
                    <span className={`font-medium ${monthMetrics.peer_comparison.comparison_vs_avg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {monthMetrics.peer_comparison.comparison_vs_avg?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Percentile:</span>
                    <span className="font-medium">{monthMetrics.peer_comparison.percentile}th</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Rank:</span>
                    <span className="font-medium capitalize">{monthMetrics.peer_comparison.rank}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call & Promise Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  <Phone size={18} className="mr-2" />
                  Call Metrics
                  <MetricHint text="Today's call activity: total calls, successful connections, average duration" />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Calls Made Today</p>
                    <p className="text-xl font-bold">{monthMetrics.call_metrics.calls_made_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Successful Calls</p>
                    <p className="text-xl font-bold">{monthMetrics.call_metrics.successful_calls_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-xl font-bold">{monthMetrics.call_metrics.call_success_rate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Duration</p>
                    <p className="text-xl font-bold">{monthMetrics.call_metrics.avg_duration}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  <Mail size={18} className="mr-2" />
                  Promise Metrics
                  <MetricHint text="Payment promises received vs fulfilled today. Fulfilled shows actual collection from promises." />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Promises Received</p>
                    <p className="text-xl font-bold">{monthMetrics.promise_metrics.promises_received_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Promised Amount</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(parseFloat(monthMetrics.promise_metrics.promised_amount_today))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fulfilled Count</p>
                    <p className="text-xl font-bold text-green-600">{monthMetrics.promise_metrics.promises_fulfilled_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fulfilled Amount</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(parseFloat(monthMetrics.promise_metrics.fulfilled_amount_today))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* WEEK VIEW - UPDATED */}
      {selectedView === 'week' && weekMetrics && (
        <div className="space-y-6">
          {/* Week Header Info */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center flex-wrap">
                <div>
                  <p className="text-sm text-gray-600">Week {weekMetrics.week_number} • {weekMetrics.year}</p>
                  <p className="text-lg font-semibold">{formatDate(weekMetrics.week_start)} - {formatDate(weekMetrics.week_end)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Days Passed: {weekMetrics.days_passed} | Days Remaining: {weekMetrics.days_remaining}</p>
                  <p className="text-sm font-medium">Week Progress: {weekMetrics.week_progress_percentage?.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Week Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-blue-100 p-3 mr-4">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center">
                      Full Week Target
                      <MetricHint text="Total target for the entire week (all days included)" />
                    </p>
                    <p className="text-2xl font-bold">{formatCurrency(weekMetrics.weekly_targets.full_week_target)}</p>
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
                    <p className="text-sm text-gray-600 flex items-center">
                      Collected WTD
                      <MetricHint text="Total amount collected from Monday (week start) until today" />
                    </p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(weekMetrics.collected_week_to_date)}</p>
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
                    <p className="text-sm text-gray-600 flex items-center">
                      Collection Rate
                      <MetricHint text="Collected vs Week-to-Date Target" />
                    </p>
                    <p className="text-2xl font-bold">{weekMetrics.collection_rate_vs_week_to_date?.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className={`rounded-full p-3 mr-4 ${weekMetrics.on_track ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Activity className={`h-6 w-6 ${weekMetrics.on_track ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center">
                      Week Status
                      <MetricHint text="Whether weekly collection is on track to meet target" />
                    </p>
                    <p className="text-2xl font-bold">{weekMetrics.on_track ? 'On Track' : 'Behind'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Breakdown Chart */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center">
                Daily Collection Trend
                <MetricHint text="Daily collected amount vs cumulative target. Shows progress day by day." />
              </h2>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weekMetrics.daily_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day_name" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `KSh ${(value / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: any, name: string) => {
                      if (name === 'collected_today') return formatCurrency(value);
                      if (name === 'daily_cumulative_target') return formatCurrency(value);
                      return value;
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="collected_today" name="Collected Today" fill="#82ca9d" />
                    <Line yAxisId="left" type="monotone" dataKey="daily_cumulative_target" name="Cumulative Target" stroke="#8884d8" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Daily Details Table */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center">
                Daily Breakdown
                <MetricHint text="Performance for each day: target, collected, overdue count, and achievement percentage" />
              </h2>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Day</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Target</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Collected</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Paid Off Count</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Overdue (Cum.)</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Achievement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekMetrics.daily_breakdown.map((day, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{day.day_name}</td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(day.date)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(day.daily_cumulative_target)}</td>
                        <td className="py-3 px-4 text-right text-green-600">{formatCurrency(day.collected_today)}</td>
                        <td className="py-3 px-4 text-right">{day.paid_off_count_today}</td>
                        <td className="py-3 px-4 text-right text-red-600">{day.cumulative_overdue_up_to_day}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs ${day.cumulative_achievement >= 80 ? 'bg-green-100 text-green-700' : day.cumulative_achievement >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {day.cumulative_achievement?.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Week Projections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  Projections
                  <MetricHint text="Based on average daily collection so far, projected end-of-week total and variance from target" />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span>Average Daily Collection:</span>
                    <span className="font-medium">{formatCurrency(weekMetrics.average_daily_collection)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Projected Weekly Total:</span>
                    <span className="font-medium">{formatCurrency(weekMetrics.projected_weekly_collection)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Projected vs Full Target:</span>
                    <span className={`font-medium ${weekMetrics.projected_vs_target >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(weekMetrics.projected_vs_target)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  Efficiency Metrics
                  <MetricHint text="Best and worst performing days based on collection amount and target achievement" />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span>Best Collection Day:</span>
                    <span className="font-medium text-green-600">
                      {weekMetrics.enhanced_metrics.efficiency.best_collection_day.date 
                        ? formatDate(weekMetrics.enhanced_metrics.efficiency.best_collection_day.date)
                        : 'N/A'} 
                      ({formatCurrency(weekMetrics.enhanced_metrics.efficiency.best_collection_day.amount)})
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Best Achievement Day:</span>
                    <span className="font-medium">
                      {weekMetrics.enhanced_metrics.efficiency.best_cumulative_day.date 
                        ? formatDate(weekMetrics.enhanced_metrics.efficiency.best_cumulative_day.date)
                        : 'N/A'} 
                      ({weekMetrics.enhanced_metrics.efficiency.best_cumulative_day.achievement?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Target Accuracy Range:</span>
                    <span className="font-medium">
                      {weekMetrics.enhanced_metrics.efficiency.target_accuracy_range.min?.toFixed(1)}% - {weekMetrics.enhanced_metrics.efficiency.target_accuracy_range.max?.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Month Context */}
          {/* <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center">
                Month Context
                <MetricHint text="How this week fits into the overall month: monthly target, week's share, MTD collected" />
              </h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Monthly Target</p>
                  <p className="text-xl font-bold">{formatCurrency(weekMetrics.month_context.monthly_target)}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Week Share of Month</p>
                  <p className="text-xl font-bold">{weekMetrics.month_context.week_share_of_month?.toFixed(1)}%</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Collected MTD</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(weekMetrics.month_context.collected_mtd)}</p>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Call & Promise Metrics for Week View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  <Phone size={18} className="mr-2" />
                  Today's Call Metrics
                </h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Calls Made</p>
                    <p className="text-2xl font-bold">{weekMetrics.call_metrics.calls_made_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">{weekMetrics.call_metrics.call_success_rate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Duration</p>
                    <p className="text-2xl font-bold">{weekMetrics.call_metrics.avg_duration}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  <Mail size={18} className="mr-2" />
                  Today's Promise Metrics
                </h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Promises Received</p>
                    <p className="text-2xl font-bold">{weekMetrics.promise_metrics.promises_received_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Promised Amount</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(parseFloat(weekMetrics.promise_metrics.promised_amount_today))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fulfilled Count</p>
                    <p className="text-2xl font-bold text-green-600">{weekMetrics.promise_metrics.promises_fulfilled_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fulfilled Amount</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(parseFloat(weekMetrics.promise_metrics.fulfilled_amount_today))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* HISTORY VIEW - UPDATED */}
      {selectedView === 'history' && (
        <div className="space-y-6">
          {/* Daily Trend Chart */}
          {dailyHistory && dailyHistory.data.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  Daily Collection Trend (Last 30 Days)
                  <MetricHint text="Shows daily collected amount vs daily cumulative balance over time. Green bars are collections, line shows total assigned balance." />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyHistory.data.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" tickFormatter={(value) => `KSh ${(value / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="collected_during_day" name="Collected Daily" fill="#82ca9d" />
                      <Line yAxisId="right" type="monotone" dataKey="daily_cumulative_balance" name="Cumulative Balance" stroke="#8884d8" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Collection Rate Trend */}
          {dailyHistory && dailyHistory.data.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  Collection Rate Trend
                  <MetricHint text="Daily collection rate percentage shows what % of the target was collected each day." />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyHistory.data.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip formatter={(value: any) => `${value?.toFixed(1)}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="collection_rate" name="Daily Collection Rate %" stroke="#ff7300" strokeWidth={2} />
                      <Line type="monotone" dataKey="daily_target_achievement" name="Daily Target Achievement %" stroke="#387908" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Call & Promise Trend */}
          {dailyHistory && dailyHistory.data.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  <Phone size={18} className="mr-2" />
                  Call Activity Trend
                  <MetricHint text="Shows calls made vs successful calls over time. The gap indicates missed connections." />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyHistory.data.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="calls_made" name="Calls Made" fill="#8884d8" />
                      <Bar yAxisId="left" dataKey="successful_calls" name="Successful Calls" fill="#82ca9d" />
                      <Line yAxisId="right" type="monotone" dataKey="call_success_rate" name="Success Rate %" stroke="#ff7300" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily History Table */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center">
                Daily Performance Log
                <MetricHint text="Complete daily breakdown including collection, calls, promises, and achievement rates" />
              </h2>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-3">Date</th>
                      <th className="text-right py-3 px-3">Collected</th>
                      <th className="text-right py-3 px-3">Cumulative Balance</th>
                      <th className="text-right py-3 px-3">Collection Rate</th>
                      <th className="text-right py-3 px-3">Calls/Success</th>
                      <th className="text-right py-3 px-3">Promises/Resolved</th>
                      <th className="text-right py-3 px-3">Target Achieved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyHistory?.data?.slice().reverse().slice(0, 30).map((day, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium">{formatDate(day.date)}</td>
                        <td className="py-3 px-3 text-right text-green-600">{formatCurrency(day.collected_during_day)}</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(day.daily_cumulative_balance)}</td>
                        <td className="py-3 px-3 text-right">{day.collection_rate?.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right">{day.calls_made}/{day.successful_calls}</td>
                        <td className="py-3 px-3 text-right">{day.promises_received}/{day.resolved}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${day.daily_target_achievement >= 80 ? 'bg-green-100 text-green-700' : day.daily_target_achievement >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {day.daily_target_achievement?.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Summary */}
          {monthlyHistory && monthlyHistory.data.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center">
                  Monthly Performance Summary
                  <MetricHint text="Month-over-month collection totals, collection rates, and resolved counts" />
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthlyHistory.data.map((month, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Period</p>
                          <p className="font-medium text-sm">{formatDate(month.month_start_date)} - {formatDate(month.month_end_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Collected</p>
                          <p className="font-medium text-green-600">{formatCurrency(month.total_collected_month)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Collection Rate</p>
                          <p className="font-medium">{month.avg_collection_rate?.toFixed(1)}%</p>
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