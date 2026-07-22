export interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  action_url?: string;
  created_at: string;
  read_at?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
}

export class NotificationTransformer {
  static toUI(record: NotificationRecord): Notification {
    return {
      id: record.id,
      userId: record.user_id,
      title: record.title,
      message: record.message,
      type: record.type,
      read: record.read,
      actionUrl: record.action_url,
      createdAt: record.created_at,
      readAt: record.read_at,
    };
  }

  static toUIList(records: NotificationRecord[]): Notification[] {
    return records.map((r) => this.toUI(r));
  }

  static fromUI(data: Partial<Notification>): Partial<NotificationRecord> {
    return {
      ...(data.id && { id: data.id }),
      ...(data.userId && { user_id: data.userId }),
      ...(data.title && { title: data.title }),
      ...(data.message && { message: data.message }),
      ...(data.type && { type: data.type }),
      ...(data.read !== undefined && { read: data.read }),
      ...(data.actionUrl && { action_url: data.actionUrl }),
      ...(data.readAt && { read_at: data.readAt }),
    };
  }

  static getTypeColor(type: string): string {
    const typeMap: { [key: string]: string } = {
      info: 'bg-blue-500/20 text-blue-600',
      warning: 'bg-yellow-500/20 text-yellow-600',
      error: 'bg-red-500/20 text-red-600',
      success: 'bg-green-500/20 text-green-600',
    };
    return typeMap[type] || 'bg-gray-500/20 text-gray-600';
  }

  static getTypeIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✓',
    };
    return iconMap[type] || '•';
  }
}
