import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { 
  User, 
  ContactGroup, 
  PhoneBookEntry, 
  MessageTemplate, 
  AdJob, 
  ModerationLog,
  AudienceGroup,
  ScheduleSettings
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create a base API instance with common configuration
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Include cookies in requests
  });

  // Add request interceptor for logging or adding auth tokens
  instance.interceptors.request.use(
    (config) => {
      // You can add auth tokens or other headers here if needed
      // const token = localStorage.getItem('authToken');
      // if (token) {
      //   config.headers.Authorization = `Bearer ${token}`;
      // }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor for consistent error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle common errors (401, 403, 500, etc.)
      if (error.response) {
        // Handle specific status codes
        switch (error.response.status) {
          case 401:
            // Redirect to login or refresh token
            break;
          case 403:
            // Handle forbidden
            break;
          case 404:
            // Handle not found
            break;
          case 500:
            // Handle server error
            break;
          default:
            break;
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const api = createApiInstance();

// Generic response interfaces
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Helper function to handle API responses
const handleResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  if (response.data.status === 'error') {
    throw new Error(response.data.message || 'An error occurred');
  }
  return response.data.data;
};

// WhatsApp API endpoints
export const whatsappApi = {
  // Reset the WhatsApp session
  resetSession: async (): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post<ApiResponse<{ success: boolean; message?: string }>>('/api/whatsapp/resetSession');
    return handleResponse(response);
  },

  // Get WhatsApp connection status
  getStatus: async () => {
    const response = await api.get<ApiResponse<{
      connected: boolean;
      qrCode: string | null;
      connectedClients: number;
      initializationStatus: 'none' | 'initializing' | 'ready' | 'error' | 'timeout';
      initializationError: string | null;
    }>>('/api/whatsapp/status');
    return handleResponse(response);
  },

  // Initialize WhatsApp client
  initialize: async (): Promise<void> => {
    const response = await api.post<ApiResponse<void>>('/api/whatsapp/initialize');
    return handleResponse(response);
  },

  // Get contacts with pagination and search
  getContacts: async (page = 1, pageSize = 20, search?: string) => {
    const params: Record<string, any> = { page, pageSize };
    if (search) {
      params.search = search;
    }
    const response = await api.get<ApiResponse<PaginatedResponse<ContactGroup>>>(
      '/api/whatsapp/contacts',
      { params }
    );
    return handleResponse(response);
  },

  // Get groups with pagination
  getGroups: async (page = 1, pageSize = 20) => {
    const response = await api.get<ApiResponse<PaginatedResponse<ContactGroup>>>(
      '/api/whatsapp/groups',
      { params: { page, pageSize } }
    );
    return handleResponse(response);
  },
};

// Phone Book API endpoints
export const phoneBookApi = {
  // Get all phone book entries
  getEntries: async () => {
    const response = await api.get<ApiResponse<{ items: PhoneBookEntry[] }>>('/api/phonebook');
    return handleResponse(response);
  },
  
  // Add a new phone book entry
  addEntry: async (entry: Omit<PhoneBookEntry, 'id'>) => {
    const response = await api.post<ApiResponse<PhoneBookEntry>>('/api/phonebook', entry);
    return handleResponse(response);
  },
  
  // Update an existing phone book entry
  updateEntry: async (id: number, entry: Partial<PhoneBookEntry>) => {
    const response = await api.put<ApiResponse<PhoneBookEntry>>(`/api/phonebook/${id}`, entry);
    return handleResponse(response);
  },
  
  // Delete a phone book entry
  deleteEntry: async (id: number) => {
    const response = await api.delete<ApiResponse<void>>(`/api/phonebook/${id}`);
    return handleResponse(response);
  },
};

// Template API endpoints
export const templateApi = {
  // Get all message templates
  getTemplates: async () => {
    const response = await api.get<ApiResponse<{ items: MessageTemplate[] }>>('/api/templates/list');
    return handleResponse(response);
  },
  
  // Create a new message template
  createTemplate: async (template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await api.post<ApiResponse<MessageTemplate>>('/api/templates/create', template);
    return handleResponse(response);
  },
  
  // Update an existing message template
  updateTemplate: async (id: number, template: Partial<MessageTemplate>) => {
    const response = await api.put<ApiResponse<MessageTemplate>>('/api/templates/update', { id, template });
    return handleResponse(response);
  },
  
  // Delete a message template
  deleteTemplate: async (id: number) => {
    const response = await api.delete<ApiResponse<void>>(`/api/templates/delete?id=${id}`);
    return handleResponse(response);
  },
};

// Ad Job API endpoints
export const adJobApi = {
  // Get a specific job by ID
  getJob: async (id: number) => {
    const response = await api.get<ApiResponse<AdJob>>(`/api/jobs/${id}`);
    return handleResponse(response);
  },
  
  // Get all jobs
  getJobs: async () => {
    const response = await api.get<ApiResponse<{ items: AdJob[] }>>('/api/jobs');
    return handleResponse(response);
  },
  
  // Create a new job
  createJob: async (job: Omit<AdJob, 'id' | 'status' | 'messagesSent' | 'messagesDelivered' | 'createdAt' | 'updatedAt'>) => {
    const response = await api.post<ApiResponse<AdJob>>('/api/jobs', job);
    return handleResponse(response);
  },
  
  // Update job status
  updateJobStatus: async (id: number, status: AdJob['status']) => {
    const response = await api.put<ApiResponse<AdJob>>(`/api/jobs/${id}/status`, { status });
    return handleResponse(response);
  },
  
  // Get logs for a specific job
  getJobLogs: async (jobId: number) => {
    const response = await api.get<ApiResponse<{ items: ModerationLog[] }>>(`/api/jobs/${jobId}/logs`);
    return handleResponse(response);
  },
  
  // Start a job
  startJob: async (id: number) => {
    const response = await api.post<ApiResponse<AdJob>>(`/api/jobs/${id}/start`);
    return handleResponse(response);
  },
  
  // Stop a job
  stopJob: async (id: number) => {
    const response = await api.post<ApiResponse<AdJob>>(`/api/jobs/${id}/stop`);
    return handleResponse(response);
  },
  
  // Update job schedule
  updateJobSchedule: async (id: number, schedule: ScheduleSettings) => {
    const response = await api.put<ApiResponse<AdJob>>(`/api/jobs/${id}/schedule`, { schedule });
    return handleResponse(response);
  },
  
  // Schedule a job
  scheduleJob: async (id: number, scheduleTime: string) => {
    const response = await api.post<ApiResponse<{ success: boolean; message: string }>>(
      '/api/ads/schedule', 
      { id, scheduleTime }
    );
    return handleResponse(response);
  },
};

// Moderation API endpoints
export const moderationApi = {
  // Get the moderation queue
  getModerationQueue: async () => {
    const response = await api.get<ApiResponse<{ items: AdJob[] }>>('/api/moderation/queue');
    return handleResponse(response);
  },
  moderateJob: (jobId: number, action: ModerationLog['action'], notes?: string) => 
    api.post<ApiResponse<ModerationLog>>(`/api/moderation/${jobId}`, { action, notes }),
};

// Audience Group API endpoints
export const audienceGroupApi = {
  // Get all audience groups
  getGroups: async () => {
    const response = await api.get<ApiResponse<AudienceGroup[]>>('/api/audience-groups');
    return handleResponse(response);
  },
  
  // Create a new audience group
  createGroup: async (group: { name: string; contacts: string[]; groups: string[] }) => {
    const response = await api.post<ApiResponse<AudienceGroup>>('/api/audience-groups', group);
    return handleResponse(response);
  },
  
  // Update an existing audience group
  updateGroup: async (id: number, updates: { name?: string; contacts?: string[]; groups?: string[] }) => {
    const response = await api.put<ApiResponse<AudienceGroup>>(
      `/api/audience-groups/${id}`, 
      updates
    );
    return handleResponse(response);
  },
  
  // Delete an audience group
  deleteGroup: async (id: number) => {
    const response = await api.delete<ApiResponse<void>>(`/api/audience-groups/${id}`);
    return handleResponse(response);
  },
};
