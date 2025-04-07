import { z } from 'zod';
import { defaultEndpointsFactory } from 'express-zod-api';
import { WhatsAppService } from '../services/WhatsAppService';

const groupFilterSchema = z.object({
  search: z.string().optional(),
  isAdmin: z.string().optional().transform(val => val === 'true'),
  page: z.string().optional().transform(Number).default('1'),
  pageSize: z.string().optional().transform(Number).default('20'),
});

export const groupEndpoints = {
  listGroups: defaultEndpointsFactory.build({
    method: 'get',
    input: groupFilterSchema,
    output: z.object({
      groups: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        participants: z.array(z.object({
          id: z.string(),
          name: z.string(),
          phoneNumber: z.string(),
          isAdmin: z.boolean(),
        })),
        isAdmin: z.boolean(),
        profilePicUrl: z.string().optional(),
        createdAt: z.date(),
      })),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
    }),
    handler: async ({ input, options }: { input: any, options: any }) => {
      const whatsapp = options.whatsapp as WhatsAppService;
      
      if (!whatsapp.isConnected()) {
        throw new Error('WhatsApp client is not ready');
      }

      const groups = await whatsapp.getGroups();
      let filteredGroups = groups;

      // Apply filters
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filteredGroups = groups.filter(group => 
          group.name.toLowerCase().includes(searchLower) ||
          group.description?.toLowerCase().includes(searchLower)
        );
      }

      if (input.isAdmin !== undefined) {
        filteredGroups = groups.filter(group => 
          group.isAdmin === input.isAdmin
        );
      }

      // Calculate pagination
      const startIndex = (input.page - 1) * input.pageSize;
      const endIndex = startIndex + input.pageSize;
      const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

      return {
        groups: paginatedGroups,
        total: filteredGroups.length,
        page: input.page,
        pageSize: input.pageSize,
      };
    },
  }),
};
