// app/analytics/admin/components/EscalationAnalyticsTab.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api';
import { usePermissions } from '@/context/permission-context';
import { ActionGuard } from '@/components/auth/action-guard';

import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Download,
  Filter,
  Eye,
  Users,
  Building2,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Gauge,
  Target,
  Zap,
  Loader2,
  Info,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  FileText,
  FileSpreadsheet,
  FileBarChart,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  ExternalLink,
  DollarSign,
  GitCompare,
  LayoutDashboard,
  Link,
  List
} from 'lucide-react';

import {
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

// ============================================================================
// TYPES
// ============================================================================

interface EscalationDashboardData {
  as_of: string;
  summary: {
    current: EscalationStats;
    month_to_date: EscalationStats;
    quarter_to_date: EscalationStats;
    year_to_date: EscalationStats;
  };
  repossession_funnel: {
    total_escalated: number;
    marked_for_repossession: number;
    in_progress: number;
    repossessed: number;
    released: number;
    court_ordered: number;
    conversion_rates: {
      marked_to_progress: number;
      progress_to_repossessed: number;
      escalated_to_repossessed: number;
    };
  };
  collection_condition_distribution: Array<{
    condition: string;
    label: string;
    count: number;
    percentage: number;
    total_cumulative_balance: number;
  }>;
  escalation_trends: Array<{
    week_start: string;
    week_end: string;
    week_number: number;
    year: number;
    escalations: number;
  }>;
  top_officers: Array<{
    officer_id: number;
    username: string;
    full_name: string;
    escalated_loans: number;
    repossessed_loans: number;
    total_cumulative_balance: number;
    escalated_cumulative_balance: number;
    escalation_rate: number;
  }>;
  risk_metrics: {
    total_loans: number;
    total_cumulative_balance: number;
    risk_distribution: {
      low_risk: { count: number; percentage: number; cumulative: number };
      medium_risk: { count: number; percentage: number; cumulative: number };
      high_risk: { count: number; percentage: number; cumulative: number };
      critical_risk: { count: number; percentage: number; cumulative: number };
    };
    risk_score: number;
    risk_level: string;
  };
  request_metrics: {
    total_requests: number;
    pending: number;
    approved: number;
    rejected: number;
    executed: number;
    cancelled: number;
    approval_rate: number;
    execution_rate: number;
    avg_approval_hours: number;
    reasons_breakdown: Array<{ reason: string; count: number }>;
  };
}

interface EscalationStats {
  escalated_count: number;
  repossessed_count: number;
  auto_escalated_count: number;
  total_cumulative_balance: number;
  avg_days_to_escalation: number;
}

interface AdvancedFilters {
  collection_conditions: string[];
  repossession_statuses: string[];
  officer_ids: number[];
  date_range: { start: string | null; end: string | null };
  min_cumulative_balance: number | null;
  max_cumulative_balance: number | null;
  to_repossess: boolean | null;
  actual_repossessed: boolean | null;
  auto_escalated: boolean | null;
  min_overdue_days: number | null;
  max_overdue_days: number | null;
}

interface AdvancedAnalyticsData {
  filters_applied: AdvancedFilters;
  loan_analytics: {
    total_loans: number;
    total_cumulative_balance: number;
    avg_cumulative_balance: number;
    by_repossession_status: Array<{
      status: string;
      label: string;
      count: number;
      total_cumulative_balance: number;
    }>;
    by_collection_condition: Array<{
      condition: string;
      label: string;
      count: number;
      total_cumulative_balance: number;
    }>;
    by_officer: Array<{
      officer_id: number;
      username: string;
      full_name: string;
      total_loans: number;
      escalated_loans: number;
      total_cumulative_balance: number;
      escalated_cumulative_balance: number;
      escalation_rate: number;
    }>;
    by_escalation_reason: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };
  installment_analytics: {
    total_installments: number;
    total_cumulative_balance: number;
    by_overdue_bucket: Record<string, { count: number; cumulative: number }>;
    by_age: Record<string, { count: number; cumulative: number }>;
  };
  time_series: Array<{
    period: string;
    escalated_count: number;
    escalated_cumulative: number;
    repossessed_count: number;
  }>;
  heatmap: Array<{
    day: string;
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  }>;
  generated_at: string;
}

interface ComparativeAnalyticsData {
  period1: {
    name: string;
    range: { start: string; end: string };
    stats: EscalationStats;
  };
  period2: {
    name: string;
    range: { start: string; end: string };
    stats: EscalationStats;
  };
  changes: {
    escalated_count_change: number;
    escalated_count_change_absolute: number;
    repossessed_count_change: number;
    repossessed_count_change_absolute: number;
    auto_escalated_count_change: number;
    auto_escalated_count_change_absolute: number;
    total_cumulative_balance_change: number;
    total_cumulative_balance_change_absolute: number;
  };
  comparison_date: string;
}

interface EscalationFilters {
  officer_id: string;
  date_range: string;
  collection_condition: string;
  repossession_status: string;
}

// ============================================================================
// OFFICER DETAIL TYPES
// ============================================================================

interface OfficerDetailData {
  officer: {
    id: number;
    username: string;
    full_name: string;
    email: string;
  };
  summary: {
    total_assigned_loans: number;
    escalated_loans: number;
    escalation_rate: number;
    escalated_cumulative_balance: number;
    repossessed_loans: number;
    repossession_rate: number;
    avg_escalation_days: number;
  };
  request_metrics: {
    total_requests: number;
    approved: number;
    executed: number;
    approval_rate: number;
  };
  condition_breakdown: Array<{
    condition: string;
    label: string;
    count: number;
    total_cumulative: number;
  }>;
  risk_distribution: Array<{
    level: string;
    count: number;
    percentage: number;
    cumulative_balance: number;
  }>;
  weekly_trend: Array<{
    week_start: string;
    week_end: string;
    escalated_count: number;
    escalated_cumulative: number;
  }>;
  escalated_loans_list: Array<{
    loan_id: string;
    customer_name: string;
    phone_number: string;
    cumulative_balance: number;
    days_overdue: number;
    to_repossess: boolean;
    repossession_status: string;
    collection_condition: string;
    assigned_officer: string;
    escalation_date: string | null;
    is_auto_escalated: boolean;
  }>;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="relative inline-block group ml-1">
    <Info size={14} className="text-gray-400 cursor-help hover:text-blue-500" />
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
      {text}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

const RiskBadge = ({ score, level }: { score: number; level: string }) => {
  const getColor = () => {
    if (level === 'Critical') return 'bg-red-600';
    if (level === 'High') return 'bg-orange-600';
    if (level === 'Medium') return 'bg-yellow-600';
    return 'bg-green-600';
  };
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getColor()}`}>
        {level} Risk - Score: {score.toFixed(1)}
      </div>
    </div>
  );
};

// Risk Distribution Bar Chart Component
const RiskDistributionBarChart = ({ data }: { data: any }) => {
  const chartData = [
    { name: 'Low Risk', count: data.low_risk.count, cumulative: data.low_risk.cumulative, color: '#00C49F' },
    { name: 'Medium Risk', count: data.medium_risk.count, cumulative: data.medium_risk.cumulative, color: '#FFBB28' },
    { name: 'High Risk', count: data.high_risk.count, cumulative: data.high_risk.cumulative, color: '#FF8042' },
    { name: 'Critical Risk', count: data.critical_risk.count, cumulative: data.critical_risk.cumulative, color: '#FF6B6B' }
  ];
  
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={100} />
          <Tooltip 
            formatter={(value: any, name: string) => {
              if (name === 'count') return [`${value.toLocaleString()} loans`, 'Count'];
              return [formatCurrency(value), 'Cumulative Balance'];
            }}
          />
          <Legend />
          <Bar dataKey="count" name="Number of Loans" fill="#8884d8" />
          <Bar dataKey="cumulative" name="Cumulative Balance (KES)" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Collection Condition Bar Chart Component
const CollectionConditionBarChart = ({ data }: { data: Array<{ label: string; count: number; total_cumulative_balance: number }> }) => {
  const chartData = data.filter(d => d.count > 0).map(d => ({
    name: d.label.length > 20 ? d.label.substring(0, 20) + '...' : d.label,
    fullName: d.label,
    count: d.count,
    balance: d.total_cumulative_balance
  }));
  
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
          <Tooltip 
            formatter={(value: any, name: string, props: any) => {
              if (name === 'count') return [`${value.toLocaleString()} loans`, 'Count'];
              return [formatCurrency(value), 'Cumulative Balance'];
            }}
            labelFormatter={(label, props) => props[0]?.payload?.fullName || label}
          />
          <Legend />
          <Bar dataKey="count" name="Number of Loans" fill="#8884d8" />
          <Bar dataKey="balance" name="Cumulative Balance (KES)" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Escalation Reasons Bar Chart Component
const EscalationReasonsBarChart = ({ data }: { data: Array<{ reason: string; count: number; percentage: number }> }) => {
  const chartData = data.map(d => ({
    name: d.reason,
    count: d.count,
    percentage: d.percentage
  }));
  
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 140 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
          <Tooltip 
            formatter={(value: any, name: string) => {
              if (name === 'count') return [`${value.toLocaleString()} requests`, 'Count'];
              return [`${value.toFixed(1)}%`, 'Percentage'];
            }}
          />
          <Legend />
          <Bar dataKey="count" name="Number of Requests" fill="#8884d8" />
          <Bar dataKey="percentage" name="Percentage (%)" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Officer Detail Modal Component
const OfficerDetailModal = ({ 
  officerData, 
  isOpen, 
  onClose,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate
}: { 
  officerData: OfficerDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
  formatDate: (dateString: string) => string;
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!officerData) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Officer Analytics: ${officerData.officer.full_name}`}
      size="xl"
    >
      <div className="max-h-[80vh] overflow-y-auto p-1">
        {/* Officer Info Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {officerData.officer.full_name?.charAt(0) || officerData.officer.username.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{officerData.officer.full_name}</h3>
                  <p className="text-sm text-gray-500">@{officerData.officer.username}</p>
                  <p className="text-xs text-gray-400">{officerData.officer.email}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Officer ID</div>
              <div className="font-mono text-lg">{officerData.officer.id}</div>
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-xs text-blue-600">Total Assigned</p>
            <p className="text-xl font-bold text-blue-700">{formatNumber(officerData.summary.total_assigned_loans)}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <p className="text-xs text-red-600">Escalated Loans</p>
            <p className="text-xl font-bold text-red-700">{formatNumber(officerData.summary.escalated_loans)}</p>
            <p className="text-xs text-gray-500">Rate: {formatPercent(officerData.summary.escalation_rate)}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <p className="text-xs text-green-600">Repossessed</p>
            <p className="text-xl font-bold text-green-700">{formatNumber(officerData.summary.repossessed_loans)}</p>
            <p className="text-xs text-gray-500">Rate: {formatPercent(officerData.summary.repossession_rate)}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <p className="text-xs text-purple-600">Avg Escalation Days</p>
            <p className="text-xl font-bold text-purple-700">{officerData.summary.avg_escalation_days.toFixed(1)} days</p>
          </div>
        </div>
        
        {/* Escalated Balance Card */}
        <div className="bg-orange-50 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-orange-600">Escalated Cumulative Balance</p>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(officerData.summary.escalated_cumulative_balance)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-orange-600">Request Metrics</p>
              <p className="text-lg font-semibold">{officerData.request_metrics.total_requests} requests</p>
              <p className="text-xs text-gray-500">Executed: {officerData.request_metrics.executed}</p>
            </div>
          </div>
        </div>
        
        {/* Tabs for detailed views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="overview">Risk Distribution</TabsTrigger>
            <TabsTrigger value="trend">Weekly Trend</TabsTrigger>
            <TabsTrigger value="loans">Escalated Loans</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Risk Distribution Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={officerData.risk_distribution} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="level" width={80} />
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => {
                      if (name === 'count') return [`${value.toLocaleString()} loans`, 'Count'];
                      return [formatCurrency(value), 'Cumulative Balance'];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" name="Number of Loans" fill="#8884d8" />
                  <Bar dataKey="cumulative_balance" name="Cumulative Balance" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Risk Distribution Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Risk Level</th>
                    <th className="text-right py-2">Count</th>
                    <th className="text-right py-2">Percentage</th>
                    <th className="text-right py-2">Cumulative Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {officerData.risk_distribution.map((risk) => (
                    <tr key={risk.level} className="border-b">
                      <td className="py-2 font-medium">{risk.level}</td>
                      <td className="text-right py-2">{formatNumber(risk.count)}</td>
                      <td className="text-right py-2">{formatPercent(risk.percentage)}</td>
                      <td className="text-right py-2">{formatCurrency(risk.cumulative_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Condition Breakdown */}
            {officerData.condition_breakdown.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Collection Condition Breakdown</h4>
                <div className="grid grid-cols-1 gap-2">
                  {officerData.condition_breakdown.map((condition) => (
                    <div key={condition.condition} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">{condition.label}</span>
                      <div className="flex space-x-4">
                        <span className="text-sm font-medium">{formatNumber(condition.count)} loans</span>
                        <span className="text-sm text-orange-600">{formatCurrency(condition.total_cumulative)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trend" className="space-y-4">
            {/* Weekly Trend Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={officerData.weekly_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week_start" tickFormatter={(date) => formatDate(date)} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    labelFormatter={(label) => `Week of ${formatDate(label)}`}
                    formatter={(value: any, name: string) => {
                      if (name === 'escalated_cumulative') return formatCurrency(value);
                      return formatNumber(value);
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="escalated_count" name="Escalations" fill="#8884d8" />
                  <Line yAxisId="right" type="monotone" dataKey="escalated_cumulative" name="Cumulative Balance" stroke="#82ca9d" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            {/* Weekly Trend Table */}
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left py-2">Week</th>
                    <th className="text-right py-2">Escalations</th>
                    <th className="text-right py-2">Cumulative Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {officerData.weekly_trend.filter(w => w.escalated_count > 0 || w.escalated_cumulative !== 0).map((week, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{formatDate(week.week_start)} - {formatDate(week.week_end)}</td>
                      <td className="text-right py-2 font-medium">{formatNumber(week.escalated_count)}</td>
                      <td className="text-right py-2">{formatCurrency(week.escalated_cumulative)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          <TabsContent value="loans" className="space-y-4">
            {/* Escalated Loans Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left py-2">Loan ID</th>
                    <th className="text-left py-2">Customer</th>
                    <th className="text-right py-2">Balance</th>
                    <th className="text-right py-2">Days Overdue</th>
                    <th className="text-center py-2">Status</th>
                    <th className="text-center py-2">Auto</th>
                    <th className="text-center py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {officerData.escalated_loans_list.map((loan) => (
                    <tr key={loan.loan_id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-mono text-xs">{loan.loan_id}</td>
                      <td className="py-2">
                        <div className="font-medium">{loan.customer_name}</div>
                        <div className="text-xs text-gray-500">{loan.phone_number}</div>
                      </td>
                      <td className="text-right py-2 text-orange-600">{formatCurrency(loan.cumulative_balance)}</td>
                      <td className="text-right py-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          loan.days_overdue > 90 ? 'bg-red-100 text-red-800' :
                          loan.days_overdue > 60 ? 'bg-orange-100 text-orange-800' :
                          loan.days_overdue > 30 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {loan.days_overdue} days
                        </span>
                      </td>
                      <td className="text-center py-2">
                        <span className="text-xs text-gray-600">{loan.repossession_status}</span>
                      </td>
                      <td className="text-center py-2">
                        {loan.is_auto_escalated ? (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Auto</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">Manual</span>
                        )}
                      </td>
                      <td className="text-center py-2">
                        <Link href={`/loans/${loan.loan_id}`}>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Eye size={14} className="mr-1" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="text-center text-xs text-gray-500 mt-2">
              Showing {officerData.escalated_loans_list.length} escalated loans
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Modal>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (value: number) => `KSh ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const formatNumber = (value: number) => value.toLocaleString();
const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EscalationAnalyticsTab() {
  const { hasAccess } = usePermissions();
  
  // State
  const [dashboardData, setDashboardData] = useState<EscalationDashboardData | null>(null);
  const [advancedData, setAdvancedData] = useState<AdvancedAnalyticsData | null>(null);
  const [comparativeData, setComparativeData] = useState<ComparativeAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [filters, setFilters] = useState<EscalationFilters>({
    officer_id: '',
    date_range: 'month',
    collection_condition: '',
    repossession_status: ''
  });
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    collection_conditions: [],
    repossession_statuses: [],
    officer_ids: [],
    date_range: { start: null, end: null },
    min_cumulative_balance: null,
    max_cumulative_balance: null,
    to_repossess: null,
    actual_repossessed: null,
    auto_escalated: null,
    min_overdue_days: null,
    max_overdue_days: null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<any>(null);
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [comparativePeriod1, setComparativePeriod1] = useState('current_month');
  const [comparativePeriod2, setComparativePeriod2] = useState('previous_month');
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Officer Detail State
  const [officerDetailData, setOfficerDetailData] = useState<OfficerDetailData | null>(null);
  const [isOfficerDetailModalOpen, setIsOfficerDetailModalOpen] = useState(false);
  const [isOfficerDetailLoading, setIsOfficerDetailLoading] = useState(false);
  
  // Collection condition options
  const collectionConditionOptions = [
    { value: 'collectable', label: 'Collectable (Default)' },
    { value: 'in_yard', label: 'In the Yard' },
    { value: 'police_case', label: 'Police Case' },
    { value: 'law_court', label: 'Law Court' },
    { value: 'in_auction', label: 'In Auctioneer' },
    { value: 'third_party', label: 'Third Party Collection' },
    { value: 'restructured', label: 'Restructured Payment Plan' },
    { value: 'written_off', label: 'Written Off' },
    { value: 'settled', label: 'Settled' }
  ];
  
  const repossessionStatusOptions = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'marked', label: 'Marked for Repossession' },
    { value: 'in_progress', label: 'Repossession in Progress' },
    { value: 'repossessed', label: 'Repossessed' },
    { value: 'released', label: 'Released (Customer Paid)' },
    { value: 'court_ordered', label: 'Court Ordered' },
    { value: 'disputed', label: 'Disputed' }
  ];
  
  const periodOptions = [
    { value: 'current_month', label: 'Current Month' },
    { value: 'previous_month', label: 'Previous Month' },
    { value: 'current_quarter', label: 'Current Quarter' },
    { value: 'previous_quarter', label: 'Previous Quarter' },
    { value: 'current_year', label: 'Current Year' },
    { value: 'previous_year', label: 'Previous Year' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' }
  ];
  
  // ============================================================================
  // API CALLS
  // ============================================================================
  
  const fetchDashboard = useCallback(async () => {
    try {
      const client = apiClient.getClient();
      const params = new URLSearchParams();
      if (filters.officer_id) params.append('officer_id', filters.officer_id);
      
      const response = await client.get(`/loan-processor/escalation/analytics/dashboard/?${params.toString()}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching escalation dashboard:', error);
    }
  }, [filters.officer_id]);
  
  const fetchAdvancedAnalytics = useCallback(async () => {
    try {
      const client = apiClient.getClient();
      const payload: any = {};
      
      if (advancedFilters.collection_conditions.length > 0) {
        payload.collection_conditions = advancedFilters.collection_conditions;
      }
      if (advancedFilters.repossession_statuses.length > 0) {
        payload.repossession_statuses = advancedFilters.repossession_statuses;
      }
      if (advancedFilters.officer_ids.length > 0) {
        payload.officer_ids = advancedFilters.officer_ids;
      }
      if (advancedFilters.date_range.start && advancedFilters.date_range.end) {
        payload.date_range = advancedFilters.date_range;
      }
      if (advancedFilters.min_cumulative_balance) {
        payload.min_cumulative_balance = advancedFilters.min_cumulative_balance;
      }
      if (advancedFilters.max_cumulative_balance) {
        payload.max_cumulative_balance = advancedFilters.max_cumulative_balance;
      }
      if (advancedFilters.to_repossess !== null) {
        payload.to_repossess = advancedFilters.to_repossess;
      }
      if (advancedFilters.actual_repossessed !== null) {
        payload.actual_repossessed = advancedFilters.actual_repossessed;
      }
      if (advancedFilters.auto_escalated !== null) {
        payload.auto_escalated = advancedFilters.auto_escalated;
      }
      if (advancedFilters.min_overdue_days) {
        payload.min_overdue_days = advancedFilters.min_overdue_days;
      }
      if (advancedFilters.max_overdue_days) {
        payload.max_overdue_days = advancedFilters.max_overdue_days;
      }
      
      const response = await client.post('/loan-processor/escalation/analytics/advanced/', payload);
      setAdvancedData(response.data);
    } catch (error) {
      console.error('Error fetching advanced analytics:', error);
    }
  }, [advancedFilters]);
  
  const fetchComparativeAnalytics = useCallback(async () => {
    try {
      const client = apiClient.getClient();
      const params = new URLSearchParams();
      params.append('period1', comparativePeriod1);
      params.append('period2', comparativePeriod2);
      if (filters.officer_id) params.append('officer_id', filters.officer_id);
      
      const response = await client.get(`/loan-processor/escalation/analytics/comparative/?${params.toString()}`);
      setComparativeData(response.data);
    } catch (error) {
      console.error('Error fetching comparative analytics:', error);
    }
  }, [comparativePeriod1, comparativePeriod2, filters.officer_id]);
  
  // NEW: Fetch Officer Detail
  const fetchOfficerDetail = useCallback(async (officerId: number) => {
    setIsOfficerDetailLoading(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/loan-processor/escalation/analytics/officer/${officerId}/`);
      setOfficerDetailData(response.data);
      setIsOfficerDetailModalOpen(true);
    } catch (error) {
      console.error('Error fetching officer detail:', error);
      alert('Failed to load officer details. Please try again.');
    } finally {
      setIsOfficerDetailLoading(false);
    }
  }, []);
  
  const handleOfficerClick = (officer: any) => {
    fetchOfficerDetail(officer.officer_id);
  };
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const client = apiClient.getClient();
      const payload: any = {};
      
      if (advancedFilters.collection_conditions.length > 0) {
        payload.collection_conditions = advancedFilters.collection_conditions;
      }
      if (advancedFilters.repossession_statuses.length > 0) {
        payload.repossession_statuses = advancedFilters.repossession_statuses;
      }
      if (advancedFilters.officer_ids.length > 0) {
        payload.officer_ids = advancedFilters.officer_ids;
      }
      if (advancedFilters.date_range.start && advancedFilters.date_range.end) {
        payload.date_range = advancedFilters.date_range;
      }
      
      const response = await client.post(`/loan-processor/escalation/analytics/export/?format=${exportFormat}`, payload, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `escalation_analytics_${new Date().toISOString().split('T')[0]}.${exportFormat === 'csv' ? 'csv' : exportFormat === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchDashboard(),
        fetchAdvancedAnalytics(),
        fetchComparativeAnalytics()
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchDashboard, fetchAdvancedAnalytics, fetchComparativeAnalytics]);
  
  // Load data when tab becomes active
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);
  
  // Reload when filters change
  useEffect(() => {
    if (activeSubTab === 'dashboard') {
      fetchDashboard();
    } else if (activeSubTab === 'advanced') {
      fetchAdvancedAnalytics();
    } else if (activeSubTab === 'comparative') {
      fetchComparativeAnalytics();
    }
  }, [activeSubTab, fetchDashboard, fetchAdvancedAnalytics, fetchComparativeAnalytics]);
  
  if (isLoading && !dashboardData) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading escalation analytics...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <Shield className="mr-2 h-5 w-5 text-orange-600" />
            Escalation & Repossession Analytics
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track loans marked for repossession, collection conditions, and escalation metrics
          </p>
        </div>
        
        <div className="flex space-x-2">
          {/* NEW: Escalation Portal Button */}
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/escalation_portal'}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <ExternalLink size={16} className="mr-2" />
            Escalation Portal
          </Button>
          
          {/* NEW: Escalation Lists Button */}
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/escalation_portal/list'}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <List size={16} className="mr-2" />
            Escalation Lists
          </Button>

            <Button 
            variant="outline" 
            onClick={() => window.location.href = '/yard'}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <List size={16} className="mr-2" />
            Yard Management
          </Button>
          
          <ActionGuard requirement="can_export_data" fallback={null}>
            <Button variant="outline" onClick={() => setIsExportModalOpen(true)}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </ActionGuard>
          <Button variant="outline" onClick={loadAllData}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Quick Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Filter size={16} className="text-gray-500 mr-2" />
            <span className="text-sm font-medium">Quick Filters</span>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Officer</label>
              <input
                type="text"
                placeholder="Officer ID or username..."
                value={filters.officer_id}
                onChange={(e) => setFilters(prev => ({ ...prev, officer_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Collection Condition</label>
              <select
                value={filters.collection_condition}
                onChange={(e) => setFilters(prev => ({ ...prev, collection_condition: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All</option>
                {collectionConditionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Repossession Status</label>
              <select
                value={filters.repossession_status}
                onChange={(e) => setFilters(prev => ({ ...prev, repossession_status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All</option>
                {repossessionStatusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadAllData} className="w-full bg-blue-600 hover:bg-blue-700">
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Sub Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Filter size={16} />
            <span>Advanced Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="comparative" className="flex items-center space-x-2">
            <GitCompare size={16} />
            <span>Comparative Analysis</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {dashboardData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Escalated Loans</p>
                        <p className="text-2xl font-bold">{formatNumber(dashboardData.summary.current.escalated_count)}</p>
                        <p className="text-xs text-gray-400">
                          MTD: {formatNumber(dashboardData.summary.month_to_date.escalated_count)}
                        </p>
                      </div>
                      <div className="rounded-full bg-orange-100 p-3">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Auto-Escalated</p>
                        <p className="text-2xl font-bold">{formatNumber(dashboardData.summary.current.auto_escalated_count)}</p>
                        <p className="text-xs text-gray-400">
                          {formatPercent(dashboardData.summary.current.auto_escalated_count / dashboardData.summary.current.escalated_count * 100)} of escalated
                        </p>
                      </div>
                      <div className="rounded-full bg-blue-100 p-3">
                        <Zap className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Cumulative Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(dashboardData.summary.current.total_cumulative_balance)}</p>
                        <p className="text-xs text-gray-400">
                          Avg: {formatCurrency(dashboardData.summary.current.total_cumulative_balance / dashboardData.summary.current.escalated_count)}
                        </p>
                      </div>
                      <div className="rounded-full bg-green-100 p-3">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Risk Score</p>
                        <p className="text-2xl font-bold">{dashboardData.risk_metrics.risk_score.toFixed(1)}</p>
                        <p className="text-xs text-gray-400">{dashboardData.risk_metrics.risk_level} Risk</p>
                      </div>
                      <div className={`rounded-full p-3 ${dashboardData.risk_metrics.risk_level === 'Critical' ? 'bg-red-100' : dashboardData.risk_metrics.risk_level === 'High' ? 'bg-orange-100' : dashboardData.risk_metrics.risk_level === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        <Shield className={`h-6 w-6 ${dashboardData.risk_metrics.risk_level === 'Critical' ? 'text-red-600' : dashboardData.risk_metrics.risk_level === 'High' ? 'text-orange-600' : dashboardData.risk_metrics.risk_level === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Risk Distribution Bar Chart & Funnel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Risk Distribution</h3>
                  </CardHeader>
                  <CardContent>
                    <RiskDistributionBarChart data={dashboardData.risk_metrics.risk_distribution} />
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Low Risk:</span>
                        <span className="font-medium">{formatNumber(dashboardData.risk_metrics.risk_distribution.low_risk.count)} loans</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cumulative:</span>
                        <span>{formatCurrency(dashboardData.risk_metrics.risk_distribution.low_risk.cumulative)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Medium Risk:</span>
                        <span className="font-medium">{formatNumber(dashboardData.risk_metrics.risk_distribution.medium_risk.count)} loans</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cumulative:</span>
                        <span>{formatCurrency(dashboardData.risk_metrics.risk_distribution.medium_risk.cumulative)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">High Risk:</span>
                        <span className="font-medium">{formatNumber(dashboardData.risk_metrics.risk_distribution.high_risk.count)} loans</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cumulative:</span>
                        <span>{formatCurrency(dashboardData.risk_metrics.risk_distribution.high_risk.cumulative)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Critical Risk:</span>
                        <span className="font-medium text-red-600">{formatNumber(dashboardData.risk_metrics.risk_distribution.critical_risk.count)} loans</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cumulative:</span>
                        <span className="text-red-600">{formatCurrency(dashboardData.risk_metrics.risk_distribution.critical_risk.cumulative)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Repossession Funnel</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Total Escalated</span>
                          <span className="font-medium">{formatNumber(dashboardData.repossession_funnel.total_escalated)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Marked for Repossession</span>
                          <span className="font-medium">{formatNumber(dashboardData.repossession_funnel.marked_for_repossession)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-600 h-2 rounded-full" style={{ width: `${(dashboardData.repossession_funnel.marked_for_repossession / dashboardData.repossession_funnel.total_escalated) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>In Progress</span>
                          <span className="font-medium">{formatNumber(dashboardData.repossession_funnel.in_progress)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${(dashboardData.repossession_funnel.in_progress / dashboardData.repossession_funnel.total_escalated) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Repossessed</span>
                          <span className="font-medium">{formatNumber(dashboardData.repossession_funnel.repossessed)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(dashboardData.repossession_funnel.repossessed / dashboardData.repossession_funnel.total_escalated) * 100}%` }} />
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <p className="text-gray-500">Marked → Progress</p>
                            <p className="font-semibold">{formatPercent(dashboardData.repossession_funnel.conversion_rates.marked_to_progress)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Progress → Repossessed</p>
                            <p className="font-semibold">{formatPercent(dashboardData.repossession_funnel.conversion_rates.progress_to_repossessed)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Escalated → Repossessed</p>
                            <p className="font-semibold">{formatPercent(dashboardData.repossession_funnel.conversion_rates.escalated_to_repossessed)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Escalation Trends */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Escalation Trends (Last 13 Weeks)</h3>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.escalation_trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week_start" tickFormatter={(date) => formatDate(date)} />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(label) => `Week of ${formatDate(label)}`}
                          formatter={(value: any) => [formatNumber(value), 'Escalations']}
                        />
                        <Legend />
                        <Bar dataKey="escalations" name="Escalations" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Top Officers & Collection Conditions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center">
                      <Users className="mr-2 h-5 w-5 text-blue-600" />
                      Top Officers by Escalated Loans
                      <InfoTooltip text="Click on any officer to view detailed analytics including risk distribution, weekly trends, and escalated loans list" />
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardData.top_officers.map((officer, index) => (
                        <div 
                          key={officer.officer_id} 
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => handleOfficerClick(officer)}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-bold text-gray-400 w-8">{index + 1}.</span>
                            <div>
                              <p className="font-medium">{officer.full_name}</p>
                              <p className="text-xs text-gray-500">@{officer.username}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-orange-600">{formatNumber(officer.escalated_loans)} loans</p>
                            <p className="text-xs text-gray-500">{formatCurrency(officer.escalated_cumulative_balance)}</p>
                          </div>
                          <ExternalLink size={16} className="text-gray-400 ml-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Collection Condition Distribution</h3>
                  </CardHeader>
                  <CardContent>
                    <CollectionConditionBarChart data={dashboardData.collection_condition_distribution} />
                    <div className="mt-4 space-y-1 max-h-40 overflow-y-auto">
                      {dashboardData.collection_condition_distribution.map((condition) => (
                        <div key={condition.condition} className="flex justify-between text-sm">
                          <span className="text-gray-600">{condition.label}</span>
                          <div className="flex space-x-4">
                            <span>{formatNumber(condition.count)} loans</span>
                            <span className="font-medium">{formatCurrency(condition.total_cumulative_balance)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Request Metrics */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Escalation Request Metrics</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Requests</p>
                      <p className="text-xl font-bold">{formatNumber(dashboardData.request_metrics.total_requests)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Pending</p>
                      <p className="text-xl font-bold text-yellow-600">{formatNumber(dashboardData.request_metrics.pending)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Approved</p>
                      <p className="text-xl font-bold text-green-600">{formatNumber(dashboardData.request_metrics.approved)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Rejected</p>
                      <p className="text-xl font-bold text-red-600">{formatNumber(dashboardData.request_metrics.rejected)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Executed</p>
                      <p className="text-xl font-bold text-blue-600">{formatNumber(dashboardData.request_metrics.executed)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Approval Rate</p>
                      <p className="text-xl font-bold">{formatPercent(dashboardData.request_metrics.approval_rate)}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Reasons Breakdown</p>
                    <div className="flex flex-wrap gap-2">
                      {dashboardData.request_metrics.reasons_breakdown.map((reason) => (
                        <span key={reason.reason} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {reason.reason}: {reason.count}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        {/* Advanced Analytics Tab */}
        <TabsContent value="advanced" className="space-y-6">
          {/* Advanced Filters Panel */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center">
                <Filter size={16} className="text-gray-500 mr-2" />
                <span className="font-medium">Advanced Filters</span>
              </div>
              {showAdvancedFilters ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {showAdvancedFilters && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Collection Conditions</label>
                    <select
                      multiple
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-24"
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setAdvancedFilters(prev => ({ ...prev, collection_conditions: values }));
                      }}
                    >
                      {collectionConditionOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repossession Statuses</label>
                    <select
                      multiple
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-24"
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setAdvancedFilters(prev => ({ ...prev, repossession_statuses: values }));
                      }}
                    >
                      {repossessionStatusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Officer IDs</label>
                    <input
                      type="text"
                      placeholder="Comma-separated officer IDs"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      onChange={(e) => {
                        const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                        setAdvancedFilters(prev => ({ ...prev, officer_ids: ids }));
                      }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Cumulative Balance</label>
                    <input
                      type="number"
                      placeholder="Min amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, min_cumulative_balance: e.target.value ? parseFloat(e.target.value) : null }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Cumulative Balance</label>
                    <input
                      type="number"
                      placeholder="Max amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, max_cumulative_balance: e.target.value ? parseFloat(e.target.value) : null }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Overdue Days</label>
                    <input
                      type="number"
                      placeholder="Min days"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, min_overdue_days: e.target.value ? parseInt(e.target.value) : null }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Overdue Days</label>
                    <input
                      type="number"
                      placeholder="Max days"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, max_overdue_days: e.target.value ? parseInt(e.target.value) : null }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, to_repossess: e.target.checked ? true : null }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Marked for Repossession Only</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, actual_repossessed: e.target.checked ? true : null }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Actually Repossessed Only</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, auto_escalated: e.target.checked ? true : null }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Auto-Escalated Only</span>
                  </label>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={fetchAdvancedAnalytics} className="bg-blue-600 hover:bg-blue-700">
                    Apply Advanced Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {advancedData && (
            <>
              {/* Loan Analytics Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">Total Loans (Filtered)</p>
                    <p className="text-2xl font-bold">{formatNumber(advancedData.loan_analytics.total_loans)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">Total Cumulative Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(advancedData.loan_analytics.total_cumulative_balance)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">Avg Cumulative Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(advancedData.loan_analytics.avg_cumulative_balance)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">Total Installments</p>
                    <p className="text-2xl font-bold">{formatNumber(advancedData.installment_analytics.total_installments)}</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Time Series */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Time Series Analysis</h3>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={advancedData.time_series}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip
                          formatter={(value: any, name: string) => {
                            if (name === 'escalated_cumulative') return formatCurrency(value);
                            return formatNumber(value);
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="escalated_count" name="Escalations" fill="#8884d8" />
                        <Line yAxisId="right" type="monotone" dataKey="escalated_cumulative" name="Cumulative Balance" stroke="#82ca9d" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Heatmap */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Escalation Heatmap (Day & Time)</h3>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="border p-2 bg-gray-50">Day</th>
                          <th className="border p-2 bg-gray-50">Morning (6-12)</th>
                          <th className="border p-2 bg-gray-50">Afternoon (12-17)</th>
                          <th className="border p-2 bg-gray-50">Evening (17-21)</th>
                          <th className="border p-2 bg-gray-50">Night (21-24)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advancedData.heatmap.map((row) => {
                          const maxValue = Math.max(row.morning, row.afternoon, row.evening, row.night);
                          return (
                            <tr key={row.day}>
                              <td className="border p-2 font-medium">{row.day}</td>
                              <td className="border p-2 text-center" style={{ backgroundColor: row.morning > 0 ? `rgba(255, 99, 71, ${Math.min(row.morning / (maxValue || 1), 0.8)})` : '' }}>
                                {row.morning > 0 ? formatNumber(row.morning) : '-'}
                              </td>
                              <td className="border p-2 text-center" style={{ backgroundColor: row.afternoon > 0 ? `rgba(255, 99, 71, ${Math.min(row.afternoon / (maxValue || 1), 0.8)})` : '' }}>
                                {row.afternoon > 0 ? formatNumber(row.afternoon) : '-'}
                              </td>
                              <td className="border p-2 text-center" style={{ backgroundColor: row.evening > 0 ? `rgba(255, 99, 71, ${Math.min(row.evening / (maxValue || 1), 0.8)})` : '' }}>
                                {row.evening > 0 ? formatNumber(row.evening) : '-'}
                              </td>
                              <td className="border p-2 text-center" style={{ backgroundColor: row.night > 0 ? `rgba(255, 99, 71, ${Math.min(row.night / (maxValue || 1), 0.8)})` : '' }}>
                                {row.night > 0 ? formatNumber(row.night) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              
              {/* By Officer Breakdown */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Officer Breakdown</h3>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Officer</th>
                          <th className="text-right py-2">Total Loans</th>
                          <th className="text-right py-2">Escalated</th>
                          <th className="text-right py-2">Escalation Rate</th>
                          <th className="text-right py-2">Total Balance</th>
                          <th className="text-right py-2">Escalated Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advancedData.loan_analytics.by_officer.map((officer) => (
                          <tr key={officer.officer_id} className="border-b hover:bg-gray-50">
                            <td className="py-2 font-medium">{officer.full_name}</td>
                            <td className="text-right py-2">{formatNumber(officer.total_loans)}</td>
                            <td className="text-right py-2">{formatNumber(officer.escalated_loans)}</td>
                            <td className="text-right py-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${officer.escalation_rate > 50 ? 'bg-red-100 text-red-800' : officer.escalation_rate > 25 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                {formatPercent(officer.escalation_rate)}
                              </span>
                            </td>
                            <td className="text-right py-2">{formatCurrency(officer.total_cumulative_balance)}</td>
                            <td className="text-right py-2 text-orange-600">{formatCurrency(officer.escalated_cumulative_balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Escalation Reasons - Bar Chart */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Escalation Reasons Breakdown</h3>
                </CardHeader>
                <CardContent>
                  <EscalationReasonsBarChart data={advancedData.loan_analytics.by_escalation_reason} />
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    {advancedData.loan_analytics.by_escalation_reason.map((reason, idx) => (
                      <div key={reason.reason} className="text-center">
                        <div className="text-xs text-gray-500">{reason.reason}</div>
                        <div className="text-sm font-semibold">{formatNumber(reason.count)} ({formatPercent(reason.percentage)})</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        {/* Comparative Analysis Tab */}
        <TabsContent value="comparative" className="space-y-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period 1</label>
                <select
                  value={comparativePeriod1}
                  onChange={(e) => setComparativePeriod1(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period 2</label>
                <select
                  value={comparativePeriod2}
                  onChange={(e) => setComparativePeriod2(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchComparativeAnalytics} className="w-full bg-blue-600 hover:bg-blue-700">
                  Compare Periods
                </Button>
              </div>
            </div>
          </div>
          
          {comparativeData && (
            <>
              {/* Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">{comparativeData.period1.name}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(comparativeData.period1.range.start)} to {formatDate(comparativeData.period1.range.end)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Escalated Loans:</span>
                        <span className="font-bold">{formatNumber(comparativeData.period1.stats.escalated_count)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Auto-Escalated:</span>
                        <span>{formatNumber(comparativeData.period1.stats.auto_escalated_count)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Repossessed:</span>
                        <span>{formatNumber(comparativeData.period1.stats.repossessed_count)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cumulative Balance:</span>
                        <span className="font-bold">{formatCurrency(comparativeData.period1.stats.total_cumulative_balance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Days to Escalation:</span>
                        <span>{comparativeData.period1.stats.avg_days_to_escalation.toFixed(1)} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">{comparativeData.period2.name}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(comparativeData.period2.range.start)} to {formatDate(comparativeData.period2.range.end)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Escalated Loans:</span>
                        <span className="font-bold">{formatNumber(comparativeData.period2.stats.escalated_count)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Auto-Escalated:</span>
                        <span>{formatNumber(comparativeData.period2.stats.auto_escalated_count)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Repossessed:</span>
                        <span>{formatNumber(comparativeData.period2.stats.repossessed_count)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cumulative Balance:</span>
                        <span className="font-bold">{formatCurrency(comparativeData.period2.stats.total_cumulative_balance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Days to Escalation:</span>
                        <span>{comparativeData.period2.stats.avg_days_to_escalation.toFixed(1)} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Changes Summary */}
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <h3 className="text-md font-semibold mb-4">Period Over Period Changes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="text-gray-600">Escalated Loans Change:</span>
                      <div className="flex items-center">
                        {comparativeData.changes.escalated_count_change_absolute >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                        )}
                        <span className={`font-bold ${comparativeData.changes.escalated_count_change_absolute >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {comparativeData.changes.escalated_count_change_absolute >= 0 ? '+' : ''}
                          {formatNumber(comparativeData.changes.escalated_count_change_absolute)}
                        </span>
                        <span className="ml-2 text-gray-500">
                          ({comparativeData.changes.escalated_count_change >= 0 ? '+' : ''}{comparativeData.changes.escalated_count_change.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="text-gray-600">Auto-Escalated Change:</span>
                      <div className="flex items-center">
                        {comparativeData.changes.auto_escalated_count_change_absolute >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                        )}
                        <span className={`font-bold ${comparativeData.changes.auto_escalated_count_change_absolute >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {comparativeData.changes.auto_escalated_count_change_absolute >= 0 ? '+' : ''}
                          {formatNumber(comparativeData.changes.auto_escalated_count_change_absolute)}
                        </span>
                        <span className="ml-2 text-gray-500">
                          ({comparativeData.changes.auto_escalated_count_change >= 0 ? '+' : ''}{comparativeData.changes.auto_escalated_count_change.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="text-gray-600">Cumulative Balance Change:</span>
                      <div className="flex items-center">
                        {comparativeData.changes.total_cumulative_balance_change_absolute >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                        )}
                        <span className={`font-bold ${comparativeData.changes.total_cumulative_balance_change_absolute >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {comparativeData.changes.total_cumulative_balance_change_absolute >= 0 ? '+' : ''}
                          {formatCurrency(comparativeData.changes.total_cumulative_balance_change_absolute)}
                        </span>
                        <span className="ml-2 text-gray-500">
                          ({comparativeData.changes.total_cumulative_balance_change >= 0 ? '+' : ''}{comparativeData.changes.total_cumulative_balance_change.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="text-gray-600">Repossessed Change:</span>
                      <div className="flex items-center">
                        <span className="font-bold text-gray-600">
                          {comparativeData.changes.repossessed_count_change_absolute >= 0 ? '+' : ''}
                          {formatNumber(comparativeData.changes.repossessed_count_change_absolute)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Officer Detail Modal */}
      <OfficerDetailModal
        officerData={officerDetailData}
        isOpen={isOfficerDetailModalOpen}
        onClose={() => {
          setIsOfficerDetailModalOpen(false);
          setOfficerDetailData(null);
        }}
        formatCurrency={formatCurrency}
        formatNumber={formatNumber}
        formatPercent={formatPercent}
        formatDate={formatDate}
      />
      
      {/* Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Escalation Analytics"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Choose export format for the current view</p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setExportFormat('csv')}
                className={`p-3 border rounded-lg text-center ${exportFormat === 'csv' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <FileText size={24} className="mx-auto mb-1 text-gray-600" />
                <span className="text-xs">CSV</span>
              </button>
              <button
                onClick={() => setExportFormat('excel')}
                className={`p-3 border rounded-lg text-center ${exportFormat === 'excel' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <FileSpreadsheet size={24} className="mx-auto mb-1 text-green-600" />
                <span className="text-xs">Excel</span>
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`p-3 border rounded-lg text-center ${exportFormat === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <FileBarChart size={24} className="mx-auto mb-1 text-red-600" />
                <span className="text-xs">PDF</span>
              </button>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={isExporting} className="bg-blue-600 hover:bg-blue-700">
              {isExporting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
              Export
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}