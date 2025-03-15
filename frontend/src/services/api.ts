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

export const whatsappApi = {
  getStatus: () => api.get('/api/whatsapp/status'),
  getContacts: () => api.get<ContactGroup[]>('/api/whatsapp/contacts'),
  getGroups: () => api.get<ContactGroup[]>('/api/whatsapp/groups'),
};

export const phoneBookApi = {
  getEntries: () => api.get<PhoneBookEntry[]>('/api/phonebook'),
  addEntry: (entry: Omit<PhoneBookEntry, 'id'>) => api.post<PhoneBookEntry>('/api/phonebook', entry),
  updateEntry: (id: number, entry: Partial<PhoneBookEntry>) => 
    api.put<PhoneBookEntry>(`/api/phonebook/${id}`, entry),
  deleteEntry: (id: number) => api.delete(`/api/phonebook/${id}`),
};

export const templateApi = {
  getTemplates: () => api.get<MessageTemplate[]>('/api/templates/list'),
  createTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) => 
    api.post<MessageTemplate>('/api/templates/create', template),
  updateTemplate: (id: number, template: Partial<MessageTemplate>) => 
    api.put<MessageTemplate>(`/api/templates/update`, {id, template}),
  deleteTemplate: (id: number) => api.delete(`/api/templates/delete?id=${id}`),
};

export const adJobApi = {
  getJob: (id: number) => api.get<AdJob>(`/api/jobs/${id}`),
  getJobs: () => api.get<AdJob[]>('/api/jobs'),
  createJob: (job: Omit<AdJob, 'id' | 'status' | 'messagesSent' | 'messagesDelivered' | 'createdAt' | 'updatedAt'>) => 
    api.post<AdJob>('/api/jobs', job),
  updateJobStatus: (id: number, status: AdJob['status']) => 
    api.put<AdJob>(`/api/jobs/${id}/status`, { status }),
  getJobLogs: (jobId: number) => api.get<ModerationLog[]>(`/api/jobs/${jobId}/logs`),
  startJob: (id: number) => api.post<AdJob>(`/api/jobs/${id}/start`),
  stopJob: (id: number) => api.post<AdJob>(`/api/jobs/${id}/stop`),
  updateJobSchedule: (id: number, schedule: any) => api.put<AdJob>(`/api/jobs/${id}/schedule`, { schedule }),
};

export const moderationApi = {
  getModerationQueue: () => api.get<AdJob[]>('/api/moderation/queue'),
  moderateJob: (jobId: number, action: ModerationLog['action'], notes?: string) => 
    api.post<ModerationLog>(`/api/moderation/${jobId}`, { action, notes }),
};
