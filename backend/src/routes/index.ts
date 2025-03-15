import { Routing, defaultEndpointsFactory, Middleware } from 'express-zod-api';
import { z } from 'zod';
import { AdJob, AdJobStatus } from '../entities/AdJob';
import { MessageTemplate } from '../entities/MessageTemplate';
import { User } from '../entities/User';
import { ModerationLog, ModerationAction } from '../entities/ModerationLog';
import { ContactGroup } from '../entities/ContactGroup';
import { PhoneBook } from '../entities/PhoneBook';
import { AppDataSource } from '../config/database';
import { WhatsAppService } from '../services/WhatsAppService';
import { WebSocketManager } from '../services/WebSocketManager';
import { AudienceGroup } from '../entities/AudienceGroup'; // Import AudienceGroup entity

const zBooleanInput = () => z.string().transform(s => s === "true" ? true : false);

// Define input/output schemas
const contactSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneNumber: z.string(),
  isMyContact: z.boolean(),
  profilePicUrl: z.string().optional(),
  status: z.string().optional(),
});

const groupSchema = z.object({
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
});

const adJobSchema = z.object({
  templateId: z.number(),
  audience: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'running', 'completed', 'failed', 'stopped'] as const),
});

const messageTemplateSchema = z.object({
  title: z.string(),
  messages: z.array(z.string()),
});

const userSchema = z.object({
  name: z.string(),
  phone: z.string(),
  session: z.string().nullable(),
});

const moderationLogSchema = z.object({
  jobId: z.number(),
  moderator: z.string(),
  action: z.enum(['approved', 'rejected', 'modified'] as const),
  notes: z.string().optional(),
});

const contactGroupSchema = z.object({
  name: z.string(),
  phone: z.string().optional(),
  groupId: z.string().optional(),
  type: z.enum(['contact', 'group'] as const),
  isActive: z.boolean().optional(),
});

const phoneBookSchema = z.object({
  name: z.string(),
  phone: z.string(),
  groupName: z.string().optional(),
});

const audienceGroupSchema = z.object({ // Define audience group schema
  id: z.number(),
  name: z.string(),
  contacts: z.array(z.string()),
  groups: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type Options = {
  whatsappService: WhatsAppService;
  wsManager?: WebSocketManager;
};

// Create endpoints
export const createRoutes = (wa: { whatsappService: WhatsAppService | null, wsManager: WebSocketManager | null }): Routing => {
  const e = defaultEndpointsFactory.addMiddleware(new Middleware<any, Options, string, any>({
    handler: async ({ request: req, response: res }) => {
      return { whatsappService: wa.whatsappService!, wsManager: wa.wsManager! };
    },
  }));

  const routing: Routing = {
    api: {
      whatsapp: {
        contacts: e.build({
          method: 'get',
          input: z.object({
            page: z.string().transform(s => Number(s)).optional().default("1"),
            pageSize: z.string().transform(s => Number(s)).optional().default("20"),
          }),
          output: z.object({
            items: z.array(contactSchema),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
          }),
          handler: async ({ input, options }) => {
            if (!options.whatsappService.isConnected()) {
              throw new Error('WhatsApp client is not connected');
            }

            const contacts = await options.whatsappService.getContacts();
            const startIndex = (input.page - 1) * input.pageSize;
            const endIndex = startIndex + input.pageSize;
            
            return {
              items: contacts.slice(startIndex, endIndex),
              total: contacts.length,
              page: input.page,
              pageSize: input.pageSize,
            };
          },
        }),
        groups: e.build({
          method: 'get',
          input: z.object({
            page: z.string().transform(s => Number(s)).optional().default("1"),
            pageSize: z.string().transform(s => Number(s)).optional().default("20"),
          }),
          output: z.object({
            items: z.array(groupSchema),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
          }),
          handler: async ({ input, options }) => {
            if (!options.whatsappService.isConnected()) {
              throw new Error('WhatsApp client is not connected');
            }

            const groups = await options.whatsappService.getGroups();
            const startIndex = (input.page - 1) * input.pageSize;
            const endIndex = startIndex + input.pageSize;
            
            return {
              items: groups.slice(startIndex, endIndex),
              total: groups.length,
              page: input.page,
              pageSize: input.pageSize,
            };
          },
        }),
        status: e.build({
          method: 'get',
          input: z.object({}),
          output: z.object({
            connected: z.boolean(),
            qrCode: z.string().nullable(),
            connectedClients: z.number(),
          }),
          handler: async ({ options }) => ({
            connected: options.whatsappService.isConnected(),
            qrCode: options.whatsappService.getQRCode(),
            connectedClients: options.wsManager?.getConnectedClients() ?? 0,
          }),
        }),
      },
      templates: {
        list: e.build({
          method: 'get',
          input: z.object({}),
          output: z.object({
            items: z.array(messageTemplateSchema.extend({ id: z.number(), createdAt: z.date(), updatedAt: z.date() })),
          }),
          handler: async () => {
            const templateRepo = AppDataSource.getRepository(MessageTemplate);
            const templates = await templateRepo.find({
              order: { createdAt: 'DESC' },
            });
            return { items: templates.map(t => ({
              id: t.id,
              title: t.title,
              messages: t.messages,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt
            })) };
          },
        }),
        create: e.build({
          method: 'post',
          input: messageTemplateSchema,
          output: messageTemplateSchema.extend({ id: z.number(), createdAt: z.date(), updatedAt: z.date() }),
          handler: async ({ input }) => {
            const templateRepo = AppDataSource.getRepository(MessageTemplate);
            const template = templateRepo.create(input);
            const savedTemplate = await templateRepo.save(template) as unknown as MessageTemplate;
            return savedTemplate;
          },
        }),
        update: e.build({
          method: 'put',
          input: z.object({
            id: z.number(),
            template: messageTemplateSchema,
          }),
          output: messageTemplateSchema.extend({ id: z.number(), createdAt: z.date(), updatedAt: z.date() }),
          handler: async ({ input }) => {
            const templateRepo = AppDataSource.getRepository(MessageTemplate);
            const template = await templateRepo.findOneBy({ id: input.id });
            if (!template) {
              throw new Error('Template not found');
            }
            
            // Update fields
            template.title = input.template.title;
            template.messages = input.template.messages;
            template.updatedAt = new Date();
            
            const savedTemplate = await templateRepo.save(template);
            return savedTemplate;
          },
        }),
        delete: e.build({
          method: 'delete',
          input: z.object({
            id: z.string().transform(s => Number(s)),
          }),
          output: z.object({
            success: z.boolean(),
          }),
          handler: async ({ input }) => {
            const templateRepo = AppDataSource.getRepository(MessageTemplate);
            await templateRepo.delete(input.id);
            return { success: true };
          },
        }),
      },
      ads: {
        create: e.build({
          method: 'post',
          input: adJobSchema,
          output: adJobSchema.extend({ id: z.number() }),
          handler: async ({ input, options }) => {
            const adJobRepo = AppDataSource.getRepository(AdJob);
            const newJob = adJobRepo.create(input);
            const [savedJob] = await adJobRepo.save(newJob);
            
            // Broadcast ad job creation
            options.wsManager?.broadcast('ad:status', {
              id: savedJob.id,
              status: savedJob.status,
              templateId: savedJob.templateId,
              audience: savedJob.audience,
            });
            
            return {
              id: savedJob.id,
              templateId: savedJob.templateId,
              audience: savedJob.audience,
              status: savedJob.status,
            };
          },
        }),
        list: e.build({
          method: 'get',
          input: z.object({
            status: z.enum(['pending', 'approved', 'rejected', 'running', 'completed', 'failed'] as const).optional(),
          }),
          output: z.object({
            items: z.array(adJobSchema.extend({ id: z.number() })),
          }),
          handler: async ({ input }) => {
            const adJobRepo = AppDataSource.getRepository(AdJob);
            const query = adJobRepo.createQueryBuilder('adJob');
            
            if (input.status) {
              query.where('adJob.status = :status', { status: input.status });
            }
            
            const jobs = await query.getMany();
            const items = jobs.map(job => ({
              id: job.id,
              templateId: job.templateId,
              audience: job.audience,
              status: job.status,
            }));
            return { items };
          },
        }),
      },
      users: {
        create: e.build({
          method: 'post',
          input: userSchema,
          output: userSchema.extend({ id: z.number() }),
          handler: async ({ input }) => {
            const userRepo = AppDataSource.getRepository(User);
            const newUser = userRepo.create(input);
            const [savedUser] = await userRepo.save(newUser);
            return {
              id: savedUser.id,
              name: savedUser.name,
              phone: savedUser.phone,
              session: savedUser.session,
            };
          },
        }),
        list: e.build({
          method: 'get',
          input: z.object({}),
          output: z.object({
            items: z.array(userSchema.extend({ id: z.number() })),
          }),
          handler: async () => {
            const userRepo = AppDataSource.getRepository(User);
            const users = await userRepo.find();
            return {
              items: users.map(user => ({
                id: user.id,
                name: user.name,
                phone: user.phone,
                session: user.session,
              })),
            };
          },
        }),
      },
      moderation: {
        create: e.build({
          method: 'post',
          input: moderationLogSchema,
          output: moderationLogSchema.extend({ id: z.number() }),
          handler: async ({ input, options }) => {
            const moderationRepo = AppDataSource.getRepository(ModerationLog);
            const adJobRepo = AppDataSource.getRepository(AdJob);
            
            // Update ad job status based on moderation action
            const adJob = await adJobRepo.findOneBy({ id: input.jobId });
            if (!adJob) {
              throw new Error('Ad job not found');
            }
            
            adJob.status = input.action === 'approved' ? 'approved' : 'rejected';
            const updatedJob = await adJobRepo.save(adJob);
            
            // Broadcast moderation update
            options.wsManager?.broadcast('ad:status', {
              id: updatedJob.id,
              status: updatedJob.status,
              action: input.action,
              moderator: input.moderator,
            });
            
            // Create moderation log
            const newLog = moderationRepo.create(input);
            const [savedLog] = await moderationRepo.save(newLog);
            return {
              id: savedLog.id,
              jobId: savedLog.jobId,
              moderator: savedLog.moderator,
              action: savedLog.action,
              notes: savedLog.notes,
            };
          },
        }),
        list: e.build({
          method: 'get',
          input: z.object({
            jobId: z.string().transform(s=>Number(s)).optional(),
          }),
          output: z.object({
            items: z.array(moderationLogSchema.extend({ id: z.number() })),
          }),
          handler: async ({ input }) => {
            const moderationRepo = AppDataSource.getRepository(ModerationLog);
            const query = moderationRepo.createQueryBuilder('log');
            
            if (input.jobId) {
              query.where('log.jobId = :jobId', { jobId: input.jobId });
            }
            
            const logs = await query.getMany();
            return {
              items: logs.map(log => ({
                id: log.id,
                jobId: log.jobId,
                moderator: log.moderator,
                action: log.action,
                notes: log.notes,
              })),
            };
          },
        }),
      },
      contactGroups: {
        create: e.build({
          method: 'post',
          input: contactGroupSchema,
          output: contactGroupSchema.extend({ id: z.number() }),
          handler: async ({ input }) => {
            const contactRepo = AppDataSource.getRepository(ContactGroup);
            const newContact = contactRepo.create({
              ...input,
              type: 'contact',
            });
            const [savedContact] = await contactRepo.save(newContact);
            return {
              id: savedContact.id,
              name: savedContact.name,
              phone: savedContact.phone,
              groupId: savedContact.groupId,
              type: savedContact.type,
              isActive: savedContact.isActive,
            };
          },
        }),
        list: e.build({
          method: 'get',
          input: z.object({
            type: z.enum(['contact', 'group'] as const).optional(),
            isActive: zBooleanInput().optional(),
          }),
          output: z.object({
            items: z.array(contactGroupSchema.extend({ id: z.number() })),
          }),
          handler: async ({ input }) => {
            const contactRepo = AppDataSource.getRepository(ContactGroup);
            const query = contactRepo.createQueryBuilder('contact');
            
            if (input.type) {
              query.where('contact.type = :type', { type: input.type });
            }
            
            if (input.isActive !== undefined) {
              query.andWhere('contact.isActive = :isActive', { isActive: input.isActive });
            }
            
            const contacts = await query.getMany();
            return {
              items: contacts.map(contact => ({
                id: contact.id,
                name: contact.name,
                phone: contact.phone,
                groupId: contact.groupId,
                type: contact.type,
                isActive: contact.isActive,
              })),
            };
          },
        }),
      },
      whatsappGroups: {
        create: e.build({
          method: 'post',
          input: contactGroupSchema,
          output: contactGroupSchema.extend({ id: z.number() }),
          handler: async ({ input }) => {
            const groupRepo = AppDataSource.getRepository(ContactGroup);
            const newGroup = groupRepo.create({
              ...input,
              type: 'group',
            });
            const [savedGroup] = await groupRepo.save(newGroup);
            return {
              id: savedGroup.id,
              name: savedGroup.name,
              groupId: savedGroup.groupId,
              type: savedGroup.type,
              isActive: savedGroup.isActive,
            };
          },
        }),
        list: e.build({
          method: 'get',
          input: z.object({
            isActive: zBooleanInput().optional(),
          }),
          output: z.object({
            items: z.array(contactGroupSchema.extend({ id: z.number() })),
          }),
          handler: async ({ input }) => {
            const groupRepo = AppDataSource.getRepository(ContactGroup);
            const query = groupRepo.createQueryBuilder('group')
              .where('group.type = :type', { type: 'group' });
            
            if (input.isActive !== undefined) {
              query.andWhere('group.isActive = :isActive', { isActive: input.isActive });
            }
            
            const groups = await query.getMany();
            return {
              items: groups.map(group => ({
                id: group.id,
                name: group.name,
                groupId: group.groupId,
                type: group.type,
                isActive: group.isActive,
              })),
            };
          },
        }),
      },
      phonebook: {
        create: e.build({
          method: 'post',
          input: phoneBookSchema,
          output: phoneBookSchema.extend({ id: z.number() }),
          handler: async ({ input }) => {
            const phoneBookRepo = AppDataSource.getRepository(PhoneBook);
            const newEntry = phoneBookRepo.create(input);
            const [savedEntry] = await phoneBookRepo.save(newEntry);
            return {
              id: savedEntry.id,
              name: savedEntry.name,
              phone: savedEntry.phone,
              groupName: savedEntry.groupName,
            };
          },
        }),
        list: e.build({
          method: 'get',
          input: z.object({
            groupName: z.string().optional(),
          }),
          output: z.object({
            items: z.array(phoneBookSchema.extend({ id: z.number() })),
          }),
          handler: async ({ input }) => {
            const phoneBookRepo = AppDataSource.getRepository(PhoneBook);
            const query = phoneBookRepo.createQueryBuilder('entry');
            
            if (input.groupName) {
              query.where('entry.groupName = :groupName', { groupName: input.groupName });
            }
            
            const entries = await query.getMany();
            return {
              items: entries.map(entry => ({
                id: entry.id,
                name: entry.name,
                phone: entry.phone,
                groupName: entry.groupName,
              })),
            };
          },
        }),
      },
      audienceGroups: {
        create: e.build({
          method: 'post',
          input: z.object({
            name: z.string(),
            contacts: z.array(z.string()),
            groups: z.array(z.string()),
          }),
          output: audienceGroupSchema, // Update output schema
          handler: async ({ input }) => {
            const audienceGroupRepo = AppDataSource.getRepository(AudienceGroup); // Get AudienceGroup repository
            const audienceGroup = audienceGroupRepo.create(input);
            const savedGroup = await audienceGroupRepo.save(audienceGroup) as unknown as AudienceGroup;
            return savedGroup;
          },
        }),
        list: e.build({
          method: 'get',
          output: z.object({ items: z.array(audienceGroupSchema) }), // Update output schema
          handler: async () => {
            const audienceGroupRepo = AppDataSource.getRepository(AudienceGroup); // Get AudienceGroup repository
            const groups = await audienceGroupRepo.find();
            return { items: groups };
          },
        }),
        update: e.build({
          method: 'put',
          input: z.object({ id: z.string(), name: z.string().optional(), contacts: z.array(z.string()).optional(), groups: z.array(z.string()).optional() }),
          output: z.object({ success: z.boolean() }),
          handler: async ({ input }) => {
            const audienceGroupRepo = AppDataSource.getRepository(AudienceGroup); // Get AudienceGroup repository
            const group = await audienceGroupRepo.findOneBy({ id: input.id });
            if (!group) {
              throw new Error('Audience group not found');
            }
            
            // Update fields
            if (input.name) {
              group.name = input.name;
            }
            if (input.contacts) {
              group.contacts = input.contacts;
            }
            if (input.groups) {
              group.groups = input.groups;
            }
            group.updatedAt = new Date();
            
            await audienceGroupRepo.save(group);
            return { success: true };
          },
        }),
        delete: e.build({
          method: 'delete',
          input: z.object({ id: z.string() }),
          output: z.object({ success: z.boolean() }),
          handler: async ({ input }) => {
            const audienceGroupRepo = AppDataSource.getRepository(AudienceGroup); // Get AudienceGroup repository
            await audienceGroupRepo.delete(input.id);
            return { success: true };
          },
        }),
      },
    },
  };

  return routing;
};

export default createRoutes;
