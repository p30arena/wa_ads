export interface User {
  id: number;
  name: string;
  phone: string;
}

export interface ContactGroup {
  id: number;
  name: string;
  phone?: string;
  groupId?: string;
  type: 'contact' | 'group';
  isActive: boolean;
}

export interface PhoneBookEntry {
  id: number;
  name: string;
  phone: string;
  groupName?: string;
}

export interface MessageTemplate {
  id: number;
  title: string;
  messages: Array<{
    type: 'text' | 'media';
    content: string;
    caption?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AdJob {
  id: number;
  userId: number;
  templateId: number;
  status: 'pending' | 'approved' | 'rejected' | 'running' | 'completed' | 'failed' | 'stopped';
  audience: string;
  messagesSent: number;
  messagesDelivered: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationLog {
  id: number;
  jobId: number;
  moderator: string;
  action: 'approved' | 'rejected' | 'modified';
  notes?: string;
  createdAt: string;
}

export interface WhatsAppStatus {
  connected: boolean;
  qrCode: string | null;
  initializationStatus: 'none' | 'initializing' | 'ready' | 'error' | 'timeout';
  initializationError: string | null;
}

export interface AudienceGroup {
  id: number;
  name: string;
  contacts: string[];
  groups: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleSettings {
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  repeatDaily?: boolean;
  repeatWeekly?: boolean;
  daysOfWeek?: string[];
  timeSlots?: { start: string; end: string }[];
}
