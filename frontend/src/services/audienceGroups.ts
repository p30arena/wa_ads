import axios from 'axios';
import { AudienceGroup } from 'wa-shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const audienceGroupsApi = {
  list: async (): Promise<AudienceGroup[]> => {
    const response = await api.get<{ items: AudienceGroup[] }>('/api/audience-groups/list');
    return response.data.items;
  },

  create: async (group: Omit<AudienceGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<AudienceGroup> => {
    const response = await api.post<AudienceGroup>('/api/audience-groups/create', group);
    return response.data;
  },

  update: async (id: string, group: Partial<Omit<AudienceGroup, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ success: boolean }> => {
    const response = await api.put<{ success: boolean }>('/api/audience-groups/update', { id, ...group });
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.delete<{ success: boolean }>('/api/audience-groups/delete', {
      data: { id },
    });
    return response.data;
  },
};
