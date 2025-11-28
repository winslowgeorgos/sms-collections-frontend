'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { SMSLog } from '@/types';
import { Search, Filter, Download } from 'lucide-react';
import GenericTable from '@/components/ui/cTable'; // Adjust import path as needed

export default function LogsPage() {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/sms-logs/');
      setLogs(response.data.results || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      SUCCESS: 'bg-success-100 text-success-800',
      SENT: 'bg-success-100 text-success-800',
      DELIVERED: 'bg-success-100 text-success-800',
      FAILED: 'bg-error-100 text-error-800',
      PENDING: 'bg-warning-100 text-warning-800',
      SCHEDULED: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Get unique values for filter choices
  const statusChoices = Array.from(
    new Set(logs.map(log => log.status).filter((s): s is NonNullable<SMSLog['status']> => !!s))
  );
  const productChoices = Array.from(
    new Set(logs.map(log => log.product_name).filter((p): p is NonNullable<SMSLog['product_name']> => !!p))
  );

  // Define columns for GenericTable with filters
  const columns = [
    {
      id: 'customer_name',
      label: 'Customer',
      accessor: (row: SMSLog) => row.customer_name,
      Cell: (value: string, row: SMSLog) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          {row.loan_id && (
            <p className="text-sm text-gray-500">Loan: {row.loan_id}</p>
          )}
        </div>
      ),
      width: 200,
      filter: {
        type: 'text' as const,
        placeholder: 'Search customer...'
      }
    },
    {
      id: 'phone_number',
      label: 'Phone',
      accessor: (row: SMSLog) => row.phone_number,
      width: 150,
      filter: {
        type: 'text' as const,
        placeholder: 'Filter by phone...'
      }
    },
    {
      id: 'message',
      label: 'Message',
      accessor: (row: SMSLog) => row.message,
      Cell: (value: string) => (
        <p className="text-gray-600 text-sm line-clamp-2">{value}</p>
      ),
      width: 300,
      filter: {
        type: 'text' as const,
        placeholder: 'Search message...'
      }
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: SMSLog) => row.status,
      Cell: (value: string) => (
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}>
          {value}
        </span>
      ),
      width: 120,
      filter: {
        type: 'choices' as const,
        choices: statusChoices,
        placeholder: 'All statuses'
      }
    },
    {
      id: 'sent_at',
      label: 'Sent At',
      accessor: (row: SMSLog) => row.sent_at,
      Cell: (value: string) => (
        <span className="text-gray-600 text-sm">
          {value ? new Date(value).toLocaleString() : 'Not sent'}
        </span>
      ),
      width: 180,
      filter: {
        type: 'date_range' as const,
        placeholder: 'Filter by date range'
      }
    },
    {
      id: 'template_name',
      label: 'Template',
      accessor: (row: SMSLog) => row.template_name,
      width: 180,
      filter: {
        type: 'text' as const,
        placeholder: 'Filter template...'
      }
    },
    {
      id: 'product_name',
      label: 'Product',
      accessor: (row: SMSLog) => row.product_name,
      width: 150,
      filter: {
        type: 'choices' as const,
        choices: productChoices,
        placeholder: 'All products'
      }
    },
  ];

  // You can remove the manual filteredLogs since GenericTable handles filtering internally
  // const filteredLogs = logs.filter(log =>
  //   log.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   log.phone_number.includes(searchTerm) ||
  //   log.message.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  return (
    <div className="space-y-6">

      {/* Logs Table using GenericTable */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Recent SMS Messages</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading logs...</div>
            </div>
          ) : (
            <GenericTable
              data={logs}
              columns={columns}
              rowKey={(row: SMSLog) => row.id}
              selectionMode="multiple"
              virtualized={true}
              onSelectionChange={(selectedRows) => {
                console.log('Selected rows:', selectedRows);
                // Handle bulk actions if needed
              }}
              // Optional: If you want to use external search instead of built-in
              // searchFn={(query, row, visibleColumns) => {
              //   const q = query.toLowerCase();
              //   return (
              //     row.customer_name?.toLowerCase().includes(q) ||
              //     row.phone_number?.includes(q) ||
              //     row.message?.toLowerCase().includes(q) ||
              //     row.template_name?.toLowerCase().includes(q) ||
              //     row.product_name?.toLowerCase().includes(q)
              //   );
              // }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}