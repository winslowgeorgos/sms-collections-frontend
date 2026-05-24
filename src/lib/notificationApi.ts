import { apiClient } from './notify';

export const notificationApi = {
  getNotifications: (params?: { page?: number; page_size?: number }) =>
    apiClient.get('/notifications/', { params }),
  markAsRead: (id: string) => apiClient.post(`/notifications/${id}/mark_read/`),
  markAllAsRead: () => apiClient.post('/notifications/mark_all_read/'),
  markDelivered: (ids: string[]) => apiClient.post('/notifications/mark_delivered/', { ids }),
  getUnreadCount: () => apiClient.get('/notifications/unread_count/'),
};