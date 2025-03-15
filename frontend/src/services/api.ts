import axios from 'axios';
import type { 
  User, 
  ContactGroup, 
  PhoneBookEntry, 
  MessageTemplate, 
  AdJob, 
  ModerationLog 
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface ApiResponse<T> {
  status: string;
  data: T;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const whatsappApi = {
  getStatus: () => api.get<ApiResponse<{
    connected: boolean;
    qrCode: string | null;
    connectedClients: number;
  }>>('/api/whatsapp/status'),
  getContacts: (page = 1, pageSize = 20) => api.get<ApiResponse<PaginatedResponse<ContactGroup>>>('/api/whatsapp/contacts', {
    params: { page, pageSize }
  }),
  getGroups: (page = 1, pageSize = 20) => api.get<ApiResponse<PaginatedResponse<ContactGroup>>>('/api/whatsapp/groups', {
    params: { page, pageSize }
  }),
};

export const phoneBookApi = {
  getEntries: () => api.get<ApiResponse<{
    items: PhoneBookEntry[];
  }>>('/api/phonebook'),
  addEntry: (entry: Omit<PhoneBookEntry, 'id'>) => 
    api.post<ApiResponse<PhoneBookEntry>>('/api/phonebook', entry),
  updateEntry: (id: number, entry: Partial<PhoneBookEntry>) => 
    api.put<ApiResponse<PhoneBookEntry>>(`/api/phonebook/${id}`, entry),
  deleteEntry: (id: number) => api.delete<ApiResponse<void>>(`/api/phonebook/${id}`),
};

export const templateApi = {
  getTemplates: () => api.get<ApiResponse<{
    items: MessageTemplate[];
  }>>('/api/templates/list'),
  createTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) => 
    api.post<ApiResponse<MessageTemplate>>('/api/templates/create', template),
  updateTemplate: (id: number, template: Partial<MessageTemplate>) => 
    api.put<ApiResponse<MessageTemplate>>(`/api/templates/update`, {id, template}),
  deleteTemplate: (id: number) => api.delete<ApiResponse<void>>(`/api/templates/delete?id=${id}`),
};

export const adJobApi = {
  getJob: (id: number) => api.get<ApiResponse<AdJob>>(`/api/jobs/${id}`),
  getJobs: () => api.get<ApiResponse<{
    items: AdJob[];
  }>>('/api/jobs'),
  createJob: (job: Omit<AdJob, 'id' | 'status' | 'messagesSent' | 'messagesDelivered' | 'createdAt' | 'updatedAt'>) => 
    api.post<ApiResponse<AdJob>>('/api/jobs', job),
  updateJobStatus: (id: number, status: AdJob['status']) => 
    api.put<ApiResponse<AdJob>>(`/api/jobs/${id}/status`, { status }),
  getJobLogs: (jobId: number) => api.get<ApiResponse<{
    items: ModerationLog[];
  }>>(`/api/jobs/${jobId}/logs`),
  startJob: (id: number) => api.post<ApiResponse<AdJob>>(`/api/jobs/${id}/start`),
  stopJob: (id: number) => api.post<ApiResponse<AdJob>>(`/api/jobs/${id}/stop`),
  updateJobSchedule: (id: number, schedule: any) => api.put<ApiResponse<AdJob>>(`/api/jobs/${id}/schedule`, { schedule }),
};

export const moderationApi = {
  getModerationQueue: () => api.get<ApiResponse<{
    items: AdJob[];
  }>>('/api/moderation/queue'),
  moderateJob: (jobId: number, action: ModerationLog['action'], notes?: string) => 
    api.post<ApiResponse<ModerationLog>>(`/api/moderation/${jobId}`, { action, notes }),
};
