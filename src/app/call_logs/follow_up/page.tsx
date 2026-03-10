// app/call-logs/follow-up/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { 
  Phone, Calendar, Clock, AlertCircle, CheckCircle,
  User, Eye, RefreshCw, Filter, AlertTriangle
} from 'lucide-react';



interface FollowUpTask {
  id: string;
  type: 'call_follow_up' | 'payment_reminder';
  loan_id: string;
  customer_name: string;
  due_date: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  related_id: string;
}

interface FollowUpResponse {
  total_tasks: number;
  overdue_count: number;
  upcoming_count: number;
  tasks: FollowUpTask[];
}

export default function FollowUpTasksPage() {
  const router = useRouter();
  const [data, setData] = useState<FollowUpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFollowUpTasks();
  }, []);

  const fetchFollowUpTasks = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get('/call-logs/follow_up_tasks/');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching follow-up tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleViewTask = (task: FollowUpTask) => {
    if (task.type === 'call_follow_up') {
      router.push(`/call_logs/${task.related_id}`);
    } else {
      router.push(`/payment-reminders/${task.related_id}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call_follow_up': return <Phone size={16} className="text-blue-600" />;
      case 'payment_reminder': return <Calendar size={16} className="text-purple-600" />;
      default: return <AlertCircle size={16} />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Follow-up Tasks</h1>
          <p className="text-gray-600 mt-2">Manage pending call follow-ups and payment reminders</p>
        </div>
        <Button variant="outline" onClick={fetchFollowUpTasks}>
          <RefreshCw size={20} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">{data.total_tasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold">{data.upcoming_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-red-100 p-3 mr-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{data.overdue_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Pending Tasks</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-600">Loading tasks...</div>
            </div>
          ) : data.tasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No pending tasks</h3>
              <p className="mt-1 text-sm text-gray-500">All follow-ups are up to date!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.tasks.map((task) => {
                const overdue = isOverdue(task.due_date);
                
                return (
                  <div
                    key={task.id}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                      overdue ? 'border-red-200 bg-red-50' : ''
                    }`}
                    onClick={() => handleViewTask(task)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          task.type === 'call_follow_up' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {getTypeIcon(task.type)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{task.customer_name}</p>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {overdue && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Loan: {task.loan_id}</span>
                            <span>Due: {new Date(task.due_date).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye size={16} className="mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}