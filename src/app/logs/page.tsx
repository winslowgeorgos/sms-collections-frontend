'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { SMSLog } from '@/types';
import GenericTable from '@/components/ui/cTable';

export default function LogsPage() {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<{
    count: number;
    next: string | null;
    previous: string | null;
    currentPage: number;
    pageSize: number;
  }>({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
    pageSize: 10,
  });

  // State for filters that will be sent to server
  const [serverFilters, setServerFilters] = useState<Record<string, any>>({});
  const [serverSearch, setServerSearch] = useState('');

  // Fetch logs with current filters and search
  const fetchLogs = useCallback(async (pageUrl?: string, filters?: Record<string, any>, search?: string) => {
    try {
      const client = apiClient.getClient();
      let url = pageUrl || '/sms-logs/';
      
      // If not a page URL, build query with current filters and search
      if (!pageUrl) {
        const params = new URLSearchParams();
        
        // Add pagination
        params.append('page', pagination.currentPage.toString());
        
        // Add search if available
        if (search) {
          params.append('search', search);
        }
        
        // Add filters
        Object.entries(filters || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            // Handle different filter types
            if (typeof value === 'object') {
              // For date_range filters
              if (value.start) params.append(`${key}_start`, value.start);
              if (value.end) params.append(`${key}_end`, value.end);
            } else {
              params.append(key, value.toString());
            }
          }
        });
        
        const queryString = params.toString();
        if (queryString) {
          url = `${url}?${queryString}`;
        }
      }
      
      const response = await client.get(url);
      
      // Check if response has pagination structure
      if (response.data && typeof response.data === 'object') {
        if ('results' in response.data && 'count' in response.data) {
          // Paginated response
          setLogs(response.data.results);
          setPagination(prev => ({
            ...prev,
            count: response.data.count,
            next: response.data.next,
            previous: response.data.previous,
            currentPage: extractPageNumber(pageUrl) || 1,
          }));
        } else if (Array.isArray(response.data)) {
          // Non-paginated array response
          setLogs(response.data);
          setPagination(prev => ({
            ...prev,
            count: response.data.length,
            next: null,
            previous: null,
            currentPage: 1,
          }));
        } else if ('results' in response.data) {
          // Results only (backward compatibility)
          setLogs(response.data.results || response.data);
          setPagination(prev => ({
            ...prev,
            count: response.data.results?.length || 0,
            next: null,
            previous: null,
            currentPage: 1,
          }));
        }
      } else if (Array.isArray(response.data)) {
        // Direct array response
        setLogs(response.data);
        setPagination(prev => ({
          ...prev,
          count: response.data.length,
          next: null,
          previous: null,
          currentPage: 1,
        }));
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.currentPage]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const extractPageNumber = (url?: string): number | null => {
    if (!url) return 1;
    const match = url.match(/[?&]page=(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const handlePageChange = (page: number) => {
    if (page === pagination.currentPage) return;
    
    // If we have pagination links, use them
    if (pagination.next || pagination.previous) {
      const baseUrl = '/sms-logs/';
      let url = `${baseUrl}?page=${page}`;
      
      // Add search and filters to pagination URLs
      if (serverSearch) {
        url += `&search=${encodeURIComponent(serverSearch)}`;
      }
      
      // Add filters to URL
      Object.entries(serverFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'object') {
            if (value.start) url += `&${key}_start=${encodeURIComponent(value.start)}`;
            if (value.end) url += `&${key}_end=${encodeURIComponent(value.end)}`;
          } else {
            url += `&${key}=${encodeURIComponent(value.toString())}`;
          }
        }
      });
      
      fetchLogs(url);
    } else {
      // Client-side pagination
      setPagination(prev => ({ ...prev, currentPage: page }));
    }
  };

  // Handle server-side search and filtering
  const handleServerSearch = (query: string) => {
    setServerSearch(query);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchLogs(undefined, serverFilters, query);
  };

  const handleServerFilterChange = (filters: Record<string, any>) => {
    setServerFilters(filters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchLogs(undefined, filters, serverSearch);
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
          {row.customer_id && (
            <p className="text-sm text-gray-500">Customer ID: {row.customer_id}</p>
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
        <div className="space-y-1">
          <p className="text-gray-600 text-sm line-clamp-2">{value}</p>
          {value && (
            <p className="text-xs text-gray-400">
              {value.length} characters
            </p>
          )}
        </div>
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
    {
      id: 'used_info',
      label: 'Used Details',
      accessor: (row: SMSLog) => row,
      Cell: (row: SMSLog) => (
        <div className="text-xs text-gray-500 space-y-1">
          {row.used_product_name && (
            <div>Product: {row.used_product_name}</div>
          )}
          {row.used_day_name && (
            <div>Day: {row.used_day_name}</div>
          )}
          {row.is_from_campaign && (
            <div className="text-purple-600">From Campaign</div>
          )}
        </div>
      ),
      width: 150,
    },
    {
      id: 'sent_at',
      label: 'Sent At',
      accessor: (row: SMSLog) => row.sent_at,
      Cell: (value: string) => (
        <div className="space-y-1">
          <span className="text-gray-600 text-sm">
            {value ? new Date(value).toLocaleDateString() : 'Not sent'}
          </span>
          {value && (
            <span className="text-gray-400 text-xs block">
              {new Date(value).toLocaleTimeString()}
            </span>
          )}
        </div>
      ),
      width: 150,
      filter: {
        type: 'date_range' as const,
        placeholder: 'Filter by date range'
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SMS Logs</h1>
          <p className="text-gray-600 mt-2">View all sent SMS messages and their status</p>
        </div>
      </div>

      {/* Logs Table using GenericTable */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Recent SMS Messages</h2>
          {pagination.count > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Showing {logs.length} of {pagination.count} total records
            </p>
          )}
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
              }}
              // Pagination props for server-side pagination
              pagination={{
                totalCount: pagination.count,
                currentPage: pagination.currentPage,
                pageSize: pagination.pageSize,
                onPageChange: handlePageChange,
                 hasNextPage: !!pagination.next,
                hasPreviousPage: !!pagination.previous,
                serverSide: !!pagination.next || !!pagination.previous, // Auto-detect server-side pagination
              }}
              // Server-side search and filtering
              serverSideSearch={serverSearch}
              onServerSearchChange={handleServerSearch}
              serverSideFilters={serverFilters}
              onServerFilterChange={handleServerFilterChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}