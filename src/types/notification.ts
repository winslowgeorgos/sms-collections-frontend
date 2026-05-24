export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: 'follow_up' | 'reminder' | 'chat' | 'system' | 'assignment';
  related_object_id: string | null;
  related_object_type: string | null;
  data: Record<string, any>;
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
  read_at: string | null;
}