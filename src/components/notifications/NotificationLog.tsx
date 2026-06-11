'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { NOTIFY_BASE_URL } from '@/lib/constants';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  notification_type_display?: string;
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
  read_at: string | null;
}

type FilterType = 'all' | 'read' | 'unread';

export default function NotificationLog() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterType>('all');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalNotifications, setTotalNotifications] = useState<number>(0);
  const PAGE_SIZE = 20;

  const isMounted = useRef<boolean>(true);

  const getAuthHeader = useCallback((): HeadersInit => {
    if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
    try {
      const token = JSON.parse(localStorage.getItem('auth_tokens') ?? '{}')?.access ?? '';
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  }, []);

  const fetchNotificationData = useCallback(async (page: number, activeFilter: FilterType, abortController?: AbortController) => {
    try {
      setLoading(true);
      const headers = getAuthHeader();
      
      // Building backend query parameters
      let url = `${NOTIFY_BASE_URL}/?page=${page}`;
      if (activeFilter === 'read') url += '&is_read=true';
      if (activeFilter === 'unread') url += '&is_read=false';

      const [logResponse, countResponse] = await Promise.all([
        fetch(url, { headers, signal: abortController?.signal }),
        fetch(`${NOTIFY_BASE_URL}/unread_count/`, { headers, signal: abortController?.signal })
      ]);

      if (!logResponse.ok || !countResponse.ok) throw new Error("API error");

      const logData = await logResponse.json();
      const countData = await countResponse.json();

      if (!isMounted.current) return;

      if (logData && Array.isArray(logData.results)) {
        setNotifications(logData.results);
        setTotalNotifications(logData.count ?? 0);
      } else if (Array.isArray(logData)) {
        setNotifications(logData);
        setTotalNotifications(logData.length);
      } else {
        setNotifications([]);
        setTotalNotifications(0);
      }

      setUnreadCount(countData.unread_count ?? 0);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Failed fetching notification log entries:", error);
      if (isMounted.current) setNotifications([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    isMounted.current = true;
    const abortController = new AbortController();
    
    fetchNotificationData(currentPage, filter, abortController);

    return () => {
      isMounted.current = false;
      abortController.abort();
    };
  }, [currentPage, filter, fetchNotificationData]);

  // Frontend local fallback filtering
  const displayedNotifications = useMemo(() => {
    if (filter === 'read') return notifications.filter(n => n.is_read === true);
    if (filter === 'unread') return notifications.filter(n => n.is_read === false);
    return notifications;
  }, [notifications, filter]);

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    if (filter === 'unread') {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotalNotifications(prev => Math.max(0, prev - 1));
    }

    try {
      await fetch(`${NOTIFY_BASE_URL}/${id}/mark_read/`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
    } catch (error) {
      console.error("Error setting log entry status:", error);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    if (filter === 'unread') {
      setNotifications([]);
      setTotalNotifications(0);
    }

    try {
      await fetch(`${NOTIFY_BASE_URL}/mark_all_read/`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
    } catch (error) {
      console.error("Bulk clearing operation failed:", error);
    }
  };

  // Optimized Dynamic Pagination Math Block
  const { activeCount, totalPages, startItem, endItem } = useMemo(() => {
    let count = totalNotifications;
    if (filter === 'unread') count = unreadCount;
    if (filter === 'read') count = Math.max(0, totalNotifications - unreadCount);

    const pages = Math.ceil(count / PAGE_SIZE) || 1;
    const start = count === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, count);

    return { activeCount: count, totalPages: pages, startItem: start, endItem: end };
  }, [filter, totalNotifications, unreadCount, currentPage]);

  return (
    <div className="max-w-2xl mx-auto my-6 p-6 bg-white rounded-xl shadow-md border border-gray-100">
      
      {/* Header element */}
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          System Notification History
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full animate-pulse">
              {unreadCount} pending
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead} 
            className="text-xs font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-all"
          >
            Clear All Alerts
          </button>
        )}
      </div>

      {/* Filter Tabs Menu UI */}
      <div className="flex gap-2 mb-6 bg-gray-50 p-1 rounded-xl border border-gray-100">
        {(['all', 'unread', 'read'] as FilterType[]).map((type) => (
          <button
            key={type}
            onClick={() => handleFilterChange(type)}
            className={`flex-1 text-center py-2 text-xs font-medium rounded-lg transition-all capitalize ${
              filter === type
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Main Content Body */}
      {loading ? (
        <div className="p-12 text-sm text-gray-400 font-medium text-center">Loading notifications...</div>
      ) : displayedNotifications.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center italic">
          No {filter !== 'all' ? filter : ''} system log activity captured yet.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {displayedNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                className={`p-4 border rounded-xl transition-all duration-200 select-none ${
                  notification.is_read 
                    ? 'bg-gray-50 border-gray-200 border-l-4 border-l-gray-400 opacity-75' 
                    : 'bg-white border-blue-100 shadow-sm border-l-4 border-l-blue-500 cursor-pointer hover:bg-blue-50/30 hover:scale-[1.01]'
                }`}
              >
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2 font-mono">
                  <span className="font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 bg-gray-100 rounded text-gray-500">
                    {notification.notification_type_display || notification.notification_type}
                  </span>
                  <span>{new Date(notification.created_at).toLocaleString()}</span>
                </div>
                
                <h4 className={`text-base font-semibold mb-1 ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">{notification.message}</p>

                {notification.is_read && notification.read_at && (
                  <div className="mt-3 pt-2 border-t border-gray-200/50 text-[10px] font-mono text-gray-400">
                    Receipt Logged: {new Date(notification.read_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Navigation Footer */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100 text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold text-gray-800">{startItem}</span> to{' '}
              <span className="font-semibold text-gray-800">{endItem}</span> of{' '}
              <span className="font-semibold text-gray-800">{activeCount}</span> alerts
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all font-medium text-xs text-gray-700"
              >
                Previous
              </button>
              
              <span className="text-xs font-mono text-gray-500 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all font-medium text-xs text-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}