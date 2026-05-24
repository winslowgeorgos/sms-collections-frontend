'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, CheckCheck, BellOff, BellRing } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { notificationApi } from '@/lib/notificationApi';
import type { Notification } from '@/types/notification';

// ---------- Fallback UI (remove when shadcn/ui is installed) ----------
const Popover = ({ children, open, onOpenChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const actualOpen = open !== undefined ? open : isOpen;
  const setActualOpen = onOpenChange || setIsOpen;
  return (
    <div className="relative">
      <div onClick={() => setActualOpen(!actualOpen)}>{children[0]}</div>
      {actualOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-md shadow-lg z-50 border">
          {children[1]}
        </div>
      )}
    </div>
  );
};
const PopoverTrigger = ({ children }: any) => children;
const PopoverContent = ({ children, className }: any) => <div className={className}>{children}</div>;
const ScrollArea = ({ children, className }: any) => <div className={`overflow-auto ${className}`}>{children}</div>;
const Separator = () => <hr className="my-1 border-gray-200" />;
const Switch = ({ checked, onCheckedChange }: any) => (
  <button
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
      checked ? 'bg-blue-600' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0.5'
      }`}
    />
  </button>
);
const Badge = ({ children, className }: any) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className || 'bg-gray-100 text-gray-800'}`}>
    {children}
  </span>
);
// -----------------------------------------------------------------------

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const lastNotificationTimestamp = useRef<string | null>(null);
  const router = useRouter();

  // Request desktop permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const browserNotify = window.Notification;
      if (browserNotify.permission === 'granted') {
        setPermissionGranted(true);
        setDesktopEnabled(true);
      } else if (browserNotify.permission !== 'denied') {
        browserNotify.requestPermission().then(permission => {
          if (permission === 'granted') {
            setPermissionGranted(true);
            setDesktopEnabled(true);
          }
        });
      }
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationApi.getNotifications({ page_size: 50 });
      // response might be already unwrapped (e.g., { results: [...] }) or raw axios
      const data = (response as any).data ?? response;
      const items = Array.isArray(data) ? data : data?.results ?? [];
      
      if (items.length) {
        const ids = items.map((n: Notification) => n.id);
        await notificationApi.markDelivered(ids);

        const latestTimestamp = items[0]?.created_at;
        if (latestTimestamp && lastNotificationTimestamp.current && desktopEnabled && permissionGranted) {
          const newItems = items.filter((n: Notification) => n.created_at > lastNotificationTimestamp.current!);
          if (newItems.length && 'Notification' in window) {
            newItems.forEach((notif: Notification) => {
              const browserNotify = window.Notification;
              const notificationObj = new browserNotify(notif.title, {
                body: notif.message,
                icon: '/favicon.ico',
                tag: notif.id,
                data: notif,
              });
              notificationObj.onclick = () => {
                window.focus();
                handleNotificationClick(notif);
                notificationObj.close();
              };
            });
          }
        }
        lastNotificationTimestamp.current = latestTimestamp;
        setNotifications(items);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, [desktopEnabled, permissionGranted]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      const data = (response as any).data ?? response;
      const count = data?.unread_count ?? 0;
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

  // Refresh on popover open
  useEffect(() => {
    if (open) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [open, fetchNotifications, fetchUnreadCount]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all read', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) handleMarkAsRead(notification.id);
    if (notification.notification_type === 'follow_up' && notification.data?.loan_id) {
      router.push(`/loans/${notification.data.loan_id}`);
    } else if (notification.notification_type === 'reminder' && notification.data?.loan_id) {
      router.push(`/loans/${notification.data.loan_id}`);
    }
    setOpen(false);
  };

  const toggleDesktopNotifications = async () => {
    if (!desktopEnabled) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const browserNotify = window.Notification;
        if (browserNotify.permission === 'granted') {
          setDesktopEnabled(true);
        } else if (browserNotify.permission !== 'denied') {
          const permission = await browserNotify.requestPermission();
          if (permission === 'granted') {
            setDesktopEnabled(true);
            setPermissionGranted(true);
          }
        }
      }
    } else {
      setDesktopEnabled(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow_up': return '📞';
      case 'reminder': return '⏰';
      case 'chat': return '💬';
      case 'assignment': return '📌';
      default: return '🔔';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <button className="relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {desktopEnabled && permissionGranted ? <BellRing className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
              <Switch checked={desktopEnabled && permissionGranted} onCheckedChange={toggleDesktopNotifications} />
            </div>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 text-xs">
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No notifications</div>
          ) : (
            notifications.map((notif, idx) => (
              <React.Fragment key={notif.id}>
                <div
                  className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-blue-50' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-start gap-2">
                    <div className="text-lg">{getNotificationIcon(notif.notification_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{notif.title}</p>
                        {!notif.is_read && <Badge className="h-2 w-2 rounded-full p-0 bg-blue-600" />}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{formatRelativeTime(new Date(notif.created_at))}</span>
                        {notif.notification_type === 'follow_up' && <span className="text-xs text-amber-600">⏰ Follow‑up</span>}
                      </div>
                    </div>
                  </div>
                </div>
                {idx < notifications.length - 1 && <Separator />}
              </React.Fragment>
            ))
          )}
        </ScrollArea>
        <div className="p-2 border-t text-center">
          <button onClick={() => router.push('/notifications')} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-3 text-xs">
            View all
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}