import { apiClient } from './notify';

export const notificationApi = {
  getNotifications: (params?: { page?: number; page_size?: number }) =>
    apiClient.get('/', { params }),
  markAsRead: (id: string) => apiClient.post(`/${id}/mark_read/`),
  markAllAsRead: () => apiClient.post('/mark_all_read/'),
  markDelivered: (ids: string[]) => apiClient.post('/mark_delivered/', { ids }),
  getUnreadCount: () => apiClient.get('/unread_count/'),
};