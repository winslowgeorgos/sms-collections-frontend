'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { SMSLog } from '@/types';
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Megaphone
} from 'lucide-react';


export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalTemplates: 0,
    totalCampaigns: 0,
    sentToday: 0,
    successRate: 0,
  });
  const [recentLogs, setRecentLogs] = useState<SMSLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const client = apiClient.getClient();
        
        // Fetch data with error handling for each request
        const [templatesRes, campaignsRes, logsRes, summaryRes] = await Promise.all([
          client.get('/templates/').catch(() => ({ data: [] })),
          client.get('/custom-campaigns/').catch(() => ({ data: [] })),
          client.get('/sms-logs/?limit=5').catch(() => ({ data: { results: [] } })),
          client.get('/sms-logs/status_summary/').catch(() => ({ data: [] })),
        ]);

        // Handle different response structures
        const templatesData = Array.isArray(templatesRes.data) ? templatesRes.data : [];
        const campaignsData = Array.isArray(campaignsRes.data) ? campaignsRes.data : [];
        
        // Handle logs response - could be array or object with results property
        let logsData: SMSLog[] = [];
        if (Array.isArray(logsRes.data)) {
          logsData = logsRes.data;
        } else if (logsRes.data && Array.isArray(logsRes.data.results)) {
          logsData = logsRes.data.results;
        }

        // Calculate success rate
        const summaryData = Array.isArray(summaryRes.data) ? summaryRes.data : [];
        const totalSent = summaryData.find((s: any) => s.status === 'SUCCESS')?.count || 0;
        const totalFailed = summaryData.find((s: any) => s.status === 'FAILED')?.count || 0;
        const total = totalSent + totalFailed;
        const successRate = total > 0 ? Math.round((totalSent / total) * 100) : 0;

        setStats({
          totalTemplates: templatesData.length,
          totalCampaigns: campaignsData.length,
          sentToday: logsData.length,
          successRate,
        });

        setRecentLogs(logsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set empty arrays on error
        setRecentLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
  }> = ({ title, value, icon, trend }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="p-3 bg-accent-100 rounded-lg">
              <div className="text-accent-600">{icon}</div>
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            <p className="text-sm text-gray-500">{title}</p>
            {trend && <p className="text-xs text-success mt-1">{trend}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Ensure recentLogs is always an array before mapping
  const safeRecentLogs = Array.isArray(recentLogs) ? recentLogs : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to SMS Collections Console</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Templates"
          value={stats.totalTemplates}
          icon={<MessageSquare size={24} />}
        />
        <StatCard
          title="Active Campaigns"
          value={stats.totalCampaigns}
          icon={<Megaphone size={24} />}
        />
        <StatCard
          title="Recent Messages"
          value={stats.sentToday}
          icon={<TrendingUp size={24} />}
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={<CheckCircle size={24} />}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Recent SMS Activity</h2>
        </CardHeader>
        <CardContent>
          {safeRecentLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {safeRecentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      log.status === 'SUCCESS' || log.status === 'DELIVERED' ? 'bg-success' : 
                      log.status === 'FAILED' ? 'bg-error' : 'bg-warning'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{log.customer_name || 'Unknown Customer'}</p>
                      <p className="text-sm text-gray-500">{log.phone_number || 'No phone number'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{log.status || 'UNKNOWN'}</p>
                    <p className="text-sm text-gray-500">
                      {log.sent_at ? new Date(log.sent_at).toLocaleString() : 'Pending'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}