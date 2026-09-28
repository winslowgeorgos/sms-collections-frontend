import { notifyClient } from './notify';

export interface NotificationListParams {
  page?: number;
  page_size?: number;
}

export const notificationApi = {
  // The client's get() already wraps its 2nd argument as { params } — pass params directly.
  getNotifications: <T = unknown>(params?: NotificationListParams) => notifyClient.get<T>('/', params),
  markAsRead: <T = unknown>(id: string) => notifyClient.post<T>(`/${encodeURIComponent(id)}/mark_read/`),
  markAllAsRead: <T = unknown>() => notifyClient.post<T>('/mark_all_read/'),
  markDelivered: <T = unknown>(ids: string[]) => notifyClient.post<T>('/mark_delivered/', { ids }),
  getUnreadCount: <T = unknown>() => notifyClient.get<T>('/unread_count/'),
};