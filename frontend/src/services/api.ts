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
  getStatus: () => api.get('/whatsapp/status'),
  getContacts: () => api.get<ContactGroup[]>('/whatsapp/contacts'),
  getGroups: () => api.get<ContactGroup[]>('/whatsapp/groups'),
};

export const phoneBookApi = {
  getEntries: () => api.get<PhoneBookEntry[]>('/phonebook'),
  addEntry: (entry: Omit<PhoneBookEntry, 'id'>) => api.post<PhoneBookEntry>('/phonebook', entry),
  updateEntry: (id: number, entry: Partial<PhoneBookEntry>) => 
    api.put<PhoneBookEntry>(`/phonebook/${id}`, entry),
  deleteEntry: (id: number) => api.delete(`/phonebook/${id}`),
};

export const templateApi = {
  getTemplates: () => api.get<MessageTemplate[]>('/api/templates/list'),
  createTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) => 
    api.post<MessageTemplate>('/api/templates/create', template),
  updateTemplate: (id: number, template: Partial<MessageTemplate>) => 
    api.put<MessageTemplate>(`/api/templates/update?id=${id}`, template),
  deleteTemplate: (id: number) => api.delete(`/api/templates/delete?id=${id}`),
};

export const adJobApi = {
  getJob: (id: number) => api.get<AdJob>(`/jobs/${id}`),
  getJobs: () => api.get<AdJob[]>('/jobs'),
  createJob: (job: Omit<AdJob, 'id' | 'status' | 'messagesSent' | 'messagesDelivered' | 'createdAt' | 'updatedAt'>) => 
    api.post<AdJob>('/jobs', job),
  updateJobStatus: (id: number, status: AdJob['status']) => 
    api.put<AdJob>(`/jobs/${id}/status`, { status }),
  getJobLogs: (jobId: number) => api.get<ModerationLog[]>(`/jobs/${jobId}/logs`),
  startJob: (id: number) => api.post<AdJob>(`/jobs/${id}/start`),
  stopJob: (id: number) => api.post<AdJob>(`/jobs/${id}/stop`),
  updateJobSchedule: (id: number, schedule: any) => api.put<AdJob>(`/jobs/${id}/schedule`, { schedule }),
};

export const moderationApi = {
  getModerationQueue: () => api.get<AdJob[]>('/moderation/queue'),
  moderateJob: (jobId: number, action: ModerationLog['action'], notes?: string) => 
    api.post<ModerationLog>(`/moderation/${jobId}`, { action, notes }),
};
