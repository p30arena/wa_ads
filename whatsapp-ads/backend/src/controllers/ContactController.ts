import { z } from 'zod';
import { createApi, endpoint } from 'express-zod-api';
import { WhatsAppService } from '../services/WhatsAppService';

const contactFilterSchema = z.object({
  search: z.string().optional(),
  isMyContact: z.string().optional().transform(val => val === 'true'),
  page: z.string().optional().transform(Number).default('1'),
  pageSize: z.string().optional().transform(Number).default('20'),
});

export const contactEndpoints = {
  listContacts: endpoint({
    method: 'get',
    path: '/contacts',
    input: contactFilterSchema,
    output: z.object({
      contacts: z.array(z.object({
        id: z.string(),
        name: z.string(),
        phoneNumber: z.string(),
        isMyContact: z.boolean(),
        profilePicUrl: z.string().optional(),
        lastSeen: z.date().optional(),
        status: z.string().optional(),
      })),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
    }),
    handler: async ({ input, options }) => {
      const whatsapp = options.whatsapp as WhatsAppService;
      
      if (!whatsapp.isReady()) {
        throw new Error('WhatsApp client is not ready');
      }

      const contacts = await whatsapp.getContacts();
      let filteredContacts = contacts;

      // Apply filters
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filteredContacts = contacts.filter(contact => 
          contact.name.toLowerCase().includes(searchLower) ||
          contact.phoneNumber.includes(searchLower)
        );
      }

      if (input.isMyContact !== undefined) {
        filteredContacts = contacts.filter(contact => 
          contact.isMyContact === input.isMyContact
        );
      }

      // Calculate pagination
      const startIndex = (input.page - 1) * input.pageSize;
      const endIndex = startIndex + input.pageSize;
      const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

      return {
        contacts: paginatedContacts,
        total: filteredContacts.length,
        page: input.page,
        pageSize: input.pageSize,
      };
    },
  }),

  importContacts: endpoint({
    method: 'post',
    path: '/contacts/import',
    input: z.object({}),
    output: z.object({
      imported: z.number(),
      message: z.string(),
    }),
    handler: async ({ options }) => {
      const whatsapp = options.whatsapp as WhatsAppService;
      
      if (!whatsapp.isReady()) {
        throw new Error('WhatsApp client is not ready');
      }

      const imported = await whatsapp.syncContacts();
      
      return {
        imported,
        message: \`Successfully imported \${imported} contacts\`,
      };
    },
  }),
};
