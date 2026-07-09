'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Package,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  Database,
  Shield,
  Clock
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Types based on your Django API responses
interface AnalyticsData {
  summary: {
    templates: { active: number; total: number; ratio: string; utilization_rate: number };
    products: { active: number; total: number; ratio: string; utilization_rate: number };
    campaigns: { active: number; total: number; ratio: string; utilization_rate: number };
    days: { active: number; total: number; ratio: string; utilization_rate: number };
    rules: { active: number; total: number; ratio: string; utilization_rate: number };
  };
  message_statistics: {
    total_messages: number;
    successful_messages: number;
    success_rate: number;
    improvement: string;
    delivery_status: Array<{ status: string; count: number }>;
    average_message_length: number;
  };
  campaign_performance: {
    total_campaigns: number;
    active_campaigns: number;
    campaigns_this_week: number;
    campaigns_today: number;
    avg_success_rate: number;
    completion_rate: number;
  };
  template_effectiveness: {
    most_used_templates: Array<{ id: string; template_name: string; usage_count: number }>;
    highest_success_templates: Array<{ id: string; template_name: string; success_rate: number; total_messages: number }>;
    templates_needing_review: number;
    total_templates_analyzed: number;
  };
  customer_engagement: {
    unique_customers_reached: number;
    repeat_customers: number;
    customer_retention_rate: number;
    top_customers_by_messages: Array<{ customer_id: string; customer_name: string; message_count: number }>;
    avg_messages_per_customer: number;
    new_customers_this_week: number;
  };
  product_performance: {
    products_performance: Array<{ id: string; product_name: string; total_messages: number; successful_messages: number; success_rate: number }>;
    most_active_products: Array<{ id: string; product_name: string; sms_count: number }>;
    best_performing_product: string;
  };
  time_analysis: {
    peak_sending_hours: Array<{ hour: number; count: number; success_rate: number }>;
    best_performing_days: Array<{ day_of_week: number; day_name: string; success_rate: number; message_count: number }>;
    messages_by_time_of_day: { morning: number; afternoon: number; evening: number; night: number };
    busiest_hour: number;
    optimal_sending_time: number;
  };
  rule_effectiveness: {
    most_used_rules: Array<{ id: string; rule_name: string; usage_count: number }>;
    active_rules_by_product: Array<{ product_name: string; rule_count: number }>;
    rules_impact: Array<{ rule_name: string; template_count: number }>;
    rules_utilization_rate: number;
  };
  operational_health: {
    avg_processing_time: number;
    system_uptime: number;
    error_rate: number;
    error_rate_trend: number;
    api_success_rate: number;
    queue_size: number;
    throughput_per_hour: number;
  };
  timeline: Array<{
    period: string;
    total_messages: number;
    success_rate: number;
    delivery_breakdown: {
      delivered: number;
      failed: number;
      pending: number;
      scheduled: number;
    };
  }>;
  filters: {
    period: string;
    product: string | null;
    template: string | null;
    day: string | null;
    campaign: string | null;
    custom_rule: string | null;
    start_date: string | null;
    end_date: string | null;
  };
}

interface PredictiveInsights {
  forecast_next_week: number;
  expected_failures: number;
  capacity_utilization: number;
  trend_direction: string;
  trend_percentage: number;
  anomaly_detection: {
    unusual_spikes: boolean;
    unusual_drops: boolean;
    recommendations: string[];
  };
  optimization_suggestions: string[];
}

interface DeliveryMetrics {
  total_messages: number;
  success_rate: number;
  delivery_breakdown: {
    successful: number;
    failed: number;
    pending: number;
    scheduled: number;
  };
  performance_indicators: {
    delivery_rate: number;
    failure_rate: number;
    utilization_rate: number;
  };
}

interface CacheData {
  data: AnalyticsData;
  predictiveInsights: PredictiveInsights;
  deliveryMetrics: DeliveryMetrics;
  timestamp: number;
  period: string;
  startDate: string;
  endDate: string;
}

// Color constants for charts
const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  accent: '#8b5cf6',
  info: '#06b6d4',
};

const STATUS_COLORS = {
  SUCCESS: CHART_COLORS.success,
  DELIVERED: CHART_COLORS.success,
  SENT: CHART_COLORS.info,
  FAILED: CHART_COLORS.error,
  PENDING: CHART_COLORS.warning,
  SCHEDULED: CHART_COLORS.accent,
};

// Cache key generator
const getCacheKey = (period: string, startDate: string, endDate: string) => {
  return `analytics_cache_${period}_${startDate}_${endDate}`;
};

// Check if cache is expired (after 10:00 AM daily)
const isCacheExpired = (timestamp: number): boolean => {
  const now = new Date();
  const cacheDate = new Date(timestamp);
  
  // If it's a different day, cache is expired
  if (now.getDate() !== cacheDate.getDate() || 
      now.getMonth() !== cacheDate.getMonth() || 
      now.getFullYear() !== cacheDate.getFullYear()) {
    return true;
  }
  
  // If current time is after 10:00 AM and cache was created before 10:00 AM
  const currentHour = now.getHours();
  const cacheHour = cacheDate.getHours();
  
  if (currentHour >= 10 && cacheHour < 10) {
    return true;
  }
  
  // Cache is valid for 1 hour after 10:00 AM, then refresh
  if (currentHour >= 10) {
    const cacheAgeInHours = (now.getTime() - timestamp) / (1000 * 60 * 60);
    return cacheAgeInHours > 1;
  }
  
  return false;
};

// Clear expired caches
const clearExpiredCaches = () => {
  const now = new Date();
  const cachePrefix = 'analytics_cache_';
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(cachePrefix)) {
      try {
        const cacheData = JSON.parse(localStorage.getItem(key) || '{}');
        if (cacheData.timestamp && isCacheExpired(cacheData.timestamp)) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error('Error clearing cache:', error);
        localStorage.removeItem(key);
      }
    }
  }
};

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsights | null>(null);
  const [deliveryMetrics, setDeliveryMetrics] = useState<DeliveryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState('daily');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Add state variables for date range
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);

  // Initialize default dates on component mount
  useEffect(() => {
    const initializeDates = () => {
      const today = new Date();
      
      if (period === 'daily') {
        // Default to today's date for both start and end
        const todayStr = today.toISOString().split('T')[0];
        setStartDate(todayStr);
        setEndDate(todayStr);
      } else if (period === 'weekly') {
        // Find Sunday of the current week
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - today.getDay());
        const sundayStr = sunday.toISOString().split('T')[0];
        
        // End date is Saturday (6 days after Sunday)
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        const saturdayStr = saturday.toISOString().split('T')[0];
        
        setStartDate(sundayStr);
        setEndDate(saturdayStr);
      } else if (period === 'monthly') {
        // First day of current month
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDayStr = firstDay.toISOString().split('T')[0];
        
        // Last day of current month
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const lastDayStr = lastDay.toISOString().split('T')[0];
        
        setStartDate(firstDayStr);
        setEndDate(lastDayStr);
      }
    };

    initializeDates();
    // Clear expired caches on component mount
    clearExpiredCaches();
  }, [period]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [period, startDate, endDate, useCustomDates, forceRefresh]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const cacheKey = getCacheKey(period, startDate, endDate);
      
      // Check cache first (unless force refresh is requested)
      if (!forceRefresh) {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          try {
            const cacheData: CacheData = JSON.parse(cachedData);
            
            // Check if cache is still valid
            if (!isCacheExpired(cacheData.timestamp)) {
              setAnalyticsData(cacheData.data);
              setPredictiveInsights(cacheData.predictiveInsights);
              setDeliveryMetrics(cacheData.deliveryMetrics);
              setIsUsingCache(true);
              setCacheTimestamp(cacheData.timestamp);
              setIsLoading(false);
              return;
            } else {
              // Cache expired, remove it
              localStorage.removeItem(cacheKey);
            }
          } catch (error) {
            console.error('Error parsing cache:', error);
            localStorage.removeItem(cacheKey);
          }
        }
      }
      
      // Fetch fresh data
      const client = apiClient.getClient();
      
      // Build query parameters
      const params = new URLSearchParams({
        period: period,
      });
      
      // Add custom dates if they're set and we're using them
      if (useCustomDates && startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      }
      
      const [analyticsRes, insightsRes, deliveryRes] = await Promise.all([
        client.get(`/sms-analytics/?${params.toString()}`),
        client.get('/sms-analytics/predictive_insights/'),
        client.get('/sms-analytics/delivery_metrics/'),
      ]);

      const data = {
        data: analyticsRes.data,
        predictiveInsights: insightsRes.data,
        deliveryMetrics: deliveryRes.data,
        timestamp: Date.now(),
        period,
        startDate,
        endDate
      };

      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(data));
      
      setAnalyticsData(analyticsRes.data);
      setPredictiveInsights(insightsRes.data);
      setDeliveryMetrics(deliveryRes.data);
      setIsUsingCache(false);
      setCacheTimestamp(Date.now());
      
      // Reset force refresh flag
      if (forceRefresh) {
        setForceRefresh(false);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      
      // Try to fall back to cache if available
      if (!forceRefresh) {
        const cacheKey = getCacheKey(period, startDate, endDate);
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          try {
            const cacheData: CacheData = JSON.parse(cachedData);
            setAnalyticsData(cacheData.data);
            setPredictiveInsights(cacheData.predictiveInsights);
            setDeliveryMetrics(cacheData.deliveryMetrics);
            setIsUsingCache(true);
            setCacheTimestamp(cacheData.timestamp);
          } catch (cacheError) {
            console.error('Error falling back to cache:', cacheError);
          }
        }
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setForceRefresh(true);
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    setUseCustomDates(false);
    setShowDatePicker(false);
    
    const today = new Date();
    
    if (newPeriod === 'daily') {
      const todayStr = today.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (newPeriod === 'weekly') {
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - today.getDay());
      const sundayStr = sunday.toISOString().split('T')[0];
      
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      const saturdayStr = saturday.toISOString().split('T')[0];
      
      setStartDate(sundayStr);
      setEndDate(saturdayStr);
    } else if (newPeriod === 'monthly') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayStr = firstDay.toISOString().split('T')[0];
      
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const lastDayStr = lastDay.toISOString().split('T')[0];
      
      setStartDate(firstDayStr);
      setEndDate(lastDayStr);
    } else if (newPeriod === 'custom') {
      setUseCustomDates(true);
      setShowDatePicker(true);
    }
  };

  const handleCustomDateRange = () => {
    if (startDate && endDate && new Date(startDate) <= new Date(endDate)) {
      setUseCustomDates(true);
      setPeriod('custom');
      setShowDatePicker(false);
      fetchAnalyticsData();
    } else {
      alert('Please select valid dates. Start date must be before or equal to end date.');
    }
  };

  const handleQuickDateRange = (range: '7days' | '30days' | '90days' | 'year') => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = new Date();
    
    if (range === '7days') {
      start.setDate(today.getDate() - 7);
    } else if (range === '30days') {
      start.setDate(today.getDate() - 30);
    } else if (range === '90days') {
      start.setDate(today.getDate() - 90);
    } else if (range === 'year') {
      start.setFullYear(today.getFullYear() - 1);
    }
    
    const startStr = start.toISOString().split('T')[0];
    setStartDate(startStr);
    setEndDate(end);
    setUseCustomDates(true);
    setPeriod('custom');
    setShowDatePicker(false);
  };

  const clearAllCache = () => {
    const cachePrefix = 'analytics_cache_';
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(cachePrefix)) {
        localStorage.removeItem(key);
      }
    }
    
    // Force refresh current data
    setForceRefresh(true);
  };

  // Format timeline data for charts
  const timelineChartData = analyticsData?.timeline.map(item => ({
    period: new Date(item.period).toLocaleDateString(),
    messages: item.total_messages,
    successRate: item.success_rate,
    ...item.delivery_breakdown
  })) || [];

  // Format delivery status for pie chart
  const deliveryStatusData = analyticsData?.message_statistics.delivery_status.map(item => ({
    name: item.status,
    value: item.count,
    color: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || CHART_COLORS.primary
  })) || [];

  // Format time of day data
  const timeOfDayData = analyticsData?.time_analysis ? [
    { name: 'Morning (6-12)', value: analyticsData?.time_analysis?.messages_by_time_of_day?.morning },
    { name: 'Afternoon (12-18)', value: analyticsData?.time_analysis?.messages_by_time_of_day?.afternoon },
    { name: 'Evening (18-24)', value: analyticsData?.time_analysis?.messages_by_time_of_day?.evening },
    { name: 'Night (0-6)', value: analyticsData?.time_analysis?.messages_by_time_of_day?.night },
  ] : [];

  // Format peak hours data
  const peakHoursData = analyticsData?.time_analysis.peak_sending_hours.map(item => ({
    hour: `${item.hour}:00`,
    messages: item.count,
    successRate: item.success_rate
  })) || [];

  // Format product performance data
  const productPerformanceData = analyticsData?.product_performance.products_performance.map(item => ({
    name: item.product_name,
    successRate: item.success_rate,
    totalMessages: item.total_messages,
    successfulMessages: item.successful_messages
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 mx-auto text-accent-600" />
          <p className="mt-2 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData || !predictiveInsights || !deliveryMetrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-error-600">Failed to load analytics data</p>
          <Button onClick={fetchAnalyticsData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive SMS campaign performance and insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['daily', 'weekly', 'monthly', 'custom'].map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-white text-accent-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          
          
          {/* Date Range Picker */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {useCustomDates && startDate && endDate ? (
                <>
                  {startDate} to {endDate}
                  {period !== 'custom' && ` (${period})`}
                </>
              ) : (
                `${period.charAt(0).toUpperCase() + period.slice(1)}`
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            {showDatePicker && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Quick Date Ranges</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickDateRange('7days')}
                        className="text-xs"
                      >
                        Last 7 Days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickDateRange('30days')}
                        className="text-xs"
                      >
                        Last 30 Days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickDateRange('90days')}
                        className="text-xs"
                      >
                        Last 90 Days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickDateRange('year')}
                        className="text-xs"
                      >
                        Last Year
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm mb-2">Custom Date Range</h4>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 w-20">From:</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 w-20">To:</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <Button
                        onClick={handleCustomDateRange}
                        size="sm"
                        className="mt-2"
                      >
                        Apply Custom Range
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {forceRefresh ? 'Fetching...' : 'Refresh'}
          </Button>
          
          <Button 
            onClick={clearAllCache}
            variant="outline"
            size="sm"
          >
            <Database className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
          
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Cache Status Banner */}
      {isUsingCache && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Showing cached data
              </span>
              {cacheTimestamp && (
                <span className="text-xs text-blue-600">
                  (Last updated: {new Date(cacheTimestamp).toLocaleTimeString()})
                </span>
              )}
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh for latest data
            </Button>
          </div>
        </div>
      )}

      {/* Date Range Display */}
      <div className={`border rounded-lg p-3 ${isUsingCache ? 'border-blue-100 bg-blue-50' : 'border-green-100 bg-green-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isUsingCache ? (
              <Clock className="h-4 w-4 text-blue-600" />
            ) : (
              <Shield className="h-4 w-4 text-green-600" />
            )}
            <span className={`text-sm font-medium ${isUsingCache ? 'text-blue-900' : 'text-green-900'}`}>
              {isUsingCache ? 'Cached Analysis' : 'Live Analysis'} •{' '}
              {useCustomDates ? 'Custom Date Range' : `${period.charAt(0).toUpperCase() + period.slice(1)} Analysis`}
            </span>
          </div>
          <div className={`text-sm ${isUsingCache ? 'text-blue-700' : 'text-green-700'}`}>
            {analyticsData.filters.start_date && analyticsData.filters.end_date ? (
              <>
                {new Date(analyticsData.filters.start_date).toLocaleDateString()} - {new Date(analyticsData.filters.end_date).toLocaleDateString()}
              </>
            ) : (
              <>
                {startDate} to {endDate}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'performance', name: 'Performance' },
            { id: 'customers', name: 'Customers' },
            { id: 'insights', name: 'Predictive Insights' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Messages"
              value={analyticsData.message_statistics.total_messages.toLocaleString()}
              change={analyticsData.message_statistics.improvement}
              icon={<MessageSquare className="text-accent-600" size={24} />}
              color="accent"
            />
            
            <MetricCard
              title="Success Rate"
              value={`${analyticsData.message_statistics.success_rate}%`}
              change={`+${analyticsData.message_statistics.success_rate}%`}
              icon={<TrendingUp className="text-success-600" size={24} />}
              color="success"
            />
            
            <MetricCard
              title="Active Templates"
              value={analyticsData.summary.templates.ratio}
              change={`${analyticsData.summary.templates.utilization_rate}% util`}
              icon={<Package className="text-warning-600" size={24} />}
              color="warning"
            />
            
            <MetricCard
              title="Unique Customers"
              value={analyticsData.customer_engagement.unique_customers_reached.toLocaleString()}
              change={`${analyticsData.customer_engagement.customer_retention_rate}% retention`}
              icon={<Users className="text-purple-600" size={24} />}
              color="purple"
            />
          </div>

          {/* System Health Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="animate-slide-up" >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent-600" />
                  System Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(analyticsData.summary).map(([key, data]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600 capitalize">
                      {key.replace('_', ' ')}
                    </span>
                    <Badge variant={data.utilization_rate > 80 ? 'success' : data.utilization_rate > 50 ? 'warning' : 'error'}>
                      {data.ratio}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="animate-slide-up" >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent-600" />
                  Delivery Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deliveryStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {deliveryStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-slide-up">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accent-600" />
                  Campaign Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-accent-50 rounded-lg">
                    <div className="text-2xl font-bold text-accent-600">
                      {analyticsData.campaign_performance.total_campaigns}
                    </div>
                    <div className="text-xs text-gray-600">Total Campaigns</div>
                  </div>
                  <div className="text-center p-3 bg-success-50 rounded-lg">
                    <div className="text-2xl font-bold text-success-600">
                      {analyticsData.campaign_performance.active_campaigns}
                    </div>
                    <div className="text-xs text-gray-600">Active</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>This Week</span>
                    <span className="font-medium">{analyticsData.campaign_performance.campaigns_this_week}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Today</span>
                    <span className="font-medium">{analyticsData.campaign_performance.campaigns_today}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Success Rate</span>
                    <span className="font-medium">{analyticsData.campaign_performance.avg_success_rate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Chart */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Message Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="messages" 
                      stackId="1"
                      stroke={CHART_COLORS.primary} 
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.6}
                      name="Total Messages"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="delivered" 
                      stackId="2"
                      stroke={CHART_COLORS.success} 
                      fill={CHART_COLORS.success}
                      fillOpacity={0.6}
                      name="Delivered"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="failed" 
                      stackId="3"
                      stroke={CHART_COLORS.error} 
                      fill={CHART_COLORS.error}
                      fillOpacity={0.6}
                      name="Failed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Performance */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productPerformanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="successRate" 
                        name="Success Rate (%)" 
                        fill={CHART_COLORS.success}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Peak Sending Hours */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>Peak Sending Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHoursData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="messages" 
                        name="Messages Sent" 
                        fill={CHART_COLORS.primary}
                        radius={[4, 4, 0, 0]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="successRate" 
                        name="Success Rate (%)" 
                        stroke={CHART_COLORS.success}
                        strokeWidth={2}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time of Day Distribution */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>Messages by Time of Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={timeOfDayData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {timeOfDayData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(CHART_COLORS)[index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Template Effectiveness */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>Top Performing Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.template_effectiveness.most_used_templates.slice(0, 5).map((template, index) => (
                    <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium text-accent-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{template.template_name}</p>
                          <p className="text-xs text-gray-500">{template.usage_count} messages</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {((template.usage_count / analyticsData.message_statistics.total_messages) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard
              title="Unique Customers"
              value={analyticsData.customer_engagement.unique_customers_reached.toLocaleString()}
              change={`${analyticsData.customer_engagement.new_customers_this_week} new this week`}
              icon={<Users className="text-accent-600" size={20} />}
              color="accent"
            />
            
            <MetricCard
              title="Customer Retention"
              value={`${analyticsData.customer_engagement.customer_retention_rate}%`}
              change={`${analyticsData.customer_engagement.repeat_customers} repeat customers`}
              icon={<TrendingUp className="text-success-600" size={20} />}
              color="success"
            />
            
            <MetricCard
              title="Avg Messages/Customer"
              value={analyticsData.customer_engagement.avg_messages_per_customer.toFixed(1)}
              change="Per customer average"
              icon={<MessageSquare className="text-warning-600" size={20} />}
              color="warning"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>Top Customers by Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.customer_engagement.top_customers_by_messages.slice(0, 8).map((customer, index) => (
                    <div key={customer.customer_id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-accent-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-accent-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{customer.customer_name}</p>
                          <p className="text-xs text-gray-500">ID: {customer.customer_id}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {customer.message_count} messages
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Engagement Metrics */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>Engagement Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {analyticsData.customer_engagement.repeat_customers}
                    </div>
                    <div className="text-sm text-blue-600">Repeat Customers</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {analyticsData.customer_engagement.new_customers_this_week}
                    </div>
                    <div className="text-sm text-green-600">New This Week</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Messages Sent</span>
                    <span className="font-medium">{analyticsData.message_statistics.total_messages.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average per Customer</span>
                    <span className="font-medium">{analyticsData.customer_engagement.avg_messages_per_customer.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Retention Rate</span>
                    <span className="font-medium text-success-600">
                      {analyticsData.customer_engagement.customer_retention_rate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Predictive Insights Tab */}
      {activeTab === 'insights' && predictiveInsights && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Next Week Forecast"
              value={predictiveInsights.forecast_next_week.toLocaleString()}
              change="Expected messages"
              icon={<TrendingUp className="text-accent-600" size={20} />}
              color="accent"
            />
            
            <MetricCard
              title="Expected Failures"
              value={predictiveInsights.expected_failures.toLocaleString()}
              change="Based on historical data"
              icon={<MessageSquare className="text-error-600" size={20} />}
              color="error"
            />
            
            <MetricCard
              title="Capacity Utilization"
              value={`${predictiveInsights.capacity_utilization}%`}
              change="Current system load"
              icon={<BarChart3 className="text-warning-600" size={20} />}
              color="warning"
            />
            
            <MetricCard
              title="Trend Direction"
              value={predictiveInsights.trend_direction}
              change={`${predictiveInsights.trend_percentage}% change`}
              icon={
                predictiveInsights.trend_direction === 'up' ? 
                  <ArrowUp className="text-success-600" size={20} /> :
                predictiveInsights.trend_direction === 'down' ? 
                  <ArrowDown className="text-error-600" size={20} /> :
                  <Minus className="text-warning-600" size={20} />
              }
              color={
                predictiveInsights.trend_direction === 'up' ? 'success' :
                predictiveInsights.trend_direction === 'down' ? 'error' : 'warning'
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recommendations */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent-600" />
                  Optimization Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictiveInsights.optimization_suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 bg-accent-100 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-accent-600">{index + 1}</span>
                      </div>
                      <p className="text-sm text-gray-700">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Anomaly Detection */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-accent-600" />
                  Anomaly Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Unusual Spikes</span>
                    <Badge variant={predictiveInsights.anomaly_detection.unusual_spikes ? 'error' : 'success'}>
                      {predictiveInsights.anomaly_detection.unusual_spikes ? 'Detected' : 'Normal'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Unusual Drops</span>
                    <Badge variant={predictiveInsights.anomaly_detection.unusual_drops ? 'error' : 'success'}>
                      {predictiveInsights.anomaly_detection.unusual_drops ? 'Detected' : 'Normal'}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                    <ul className="space-y-2">
                      {predictiveInsights.anomaly_detection.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-accent-600 mt-1">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: 'accent' | 'success' | 'warning' | 'error' | 'purple' | 'info';
}

function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  const colorClasses = {
    accent: 'bg-accent-100 text-accent-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    error: 'bg-error-100 text-error-600',
    purple: 'bg-purple-100 text-purple-600',
    info: 'bg-info-100 text-info-600',
  };

  return (
    <Card className="animate-slide-up hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            <p className="text-xs text-gray-500 mt-1">{change}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}