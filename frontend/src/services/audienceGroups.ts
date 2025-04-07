import { AudienceGroup } from 'wa-shared';

const API_BASE = '/api/audience-groups';

export const audienceGroupsApi = {
  list: async (): Promise<AudienceGroup[]> => {
    const response = await fetch(API_BASE + '/list');
    const data = await response.json();
    return data.items;
  },

  create: async (group: Omit<AudienceGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<AudienceGroup> => {
    const response = await fetch(API_BASE + '/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    return response.json();
  },

  update: async (id: string, group: Partial<Omit<AudienceGroup, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ success: boolean }> => {
    const response = await fetch(API_BASE + '/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...group }),
    });
    return response.json();
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(API_BASE + '/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return response.json();
  },
};
