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
  content: string;
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
  isConnected: boolean;
  qrCode?: string;
  lastConnection?: string;
}
