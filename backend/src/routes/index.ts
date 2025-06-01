import { Routing, defaultEndpointsFactory, Middleware } from 'express-zod-api';
import { z } from 'zod';
import prisma from '../config/prisma';
import { WhatsAppService } from '../services/WhatsAppService';
import { whatsappEndpoints } from '../controllers/WhatsAppController';
import { WebSocketManager } from '../services/WebSocketManager';
import { AdJobService } from '../services/AdJobService';
import { WSEventType } from 'wa-shared';

// Define enums to replace the removed entity enums
enum AdJobStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STOPPED = 'stopped'
}

enum ModerationAction {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MODIFIED = 'modified'
}

const zBooleanInput = () => z.string().transform(s => s === "true" ? true : false);

// Define input/output schemas
const contactSchema = z.object({
  id: z.string(),
  name: z.string().nullable().transform(val => val ?? ''),
  phoneNumber: z.string().nullable().transform(val => val ?? ''),
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

// Input schema for creating/updating templates
const messageInputSchema = z.union([
  z.string(),
  z.object({
    type: z.string(),
    content: z.string(),
    caption: z.string().optional(),
  })
]);

// Schema for the database (stored format)
const messageTemplateSchema = z.object({
  title: z.string(),
  messages: z.array(messageInputSchema),
});

// Schema for API responses
const messageOutputSchema = z.union([
  z.string(),
  z.object({
    type: z.string(),
    content: z.string(),
    caption: z.string().optional(),
  })
]);

const templateResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  messages: z.array(messageOutputSchema),
  messageIds: z.array(z.string()).optional(),
  isSentToSelf: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const messageTemplateWithIdsSchema = messageTemplateSchema.extend({
  messageIds: z.array(z.string()).optional(),
  isSentToSelf: z.boolean().optional(),
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
  adJobService?: AdJobService;
};

// Create endpoints
export const createRoutes = (wa: { whatsappService: WhatsAppService | null, wsManager: WebSocketManager | null }): Routing => {
  // Initialize AdJobService if WhatsAppService and WebSocketManager are available
  const adJobService = wa.whatsappService && wa.wsManager ? new AdJobService(wa.whatsappService, wa.wsManager) : null;
  
  const e = defaultEndpointsFactory.addMiddleware(new Middleware<any, Options, string, any>({
    handler: async ({ request: req, response: res }) => {
      return { 
        whatsappService: wa.whatsappService!, 
        wsManager: wa.wsManager!,
        adJobService: adJobService!
      };
    },
  }));

  const routing: Routing = {
    api: {
      whatsapp: {
        resetSession: whatsappEndpoints.resetSession,
        contacts: e.build({
          method: 'get',
          input: z.object({
            search: z.string().optional(),
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

            await options.whatsappService.syncContacts();
            let contacts = await options.whatsappService.getContacts();
            
            // Apply search filter if search term is provided
            if (input.search) {
              const searchTerm = input.search.toLowerCase();
              contacts = contacts.filter(contact => 
                contact.name.toLowerCase().includes(searchTerm) ||
                contact.phoneNumber.includes(searchTerm)
              );
            }
            
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
        initialize: e.build({
          method: 'post',
          input: z.object({}),
          output: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
          handler: async ({ options }) => {
            try {
              const timeout = new Promise((_, reject) => {
                setTimeout(() => {
                  reject(new Error('WhatsApp client initialization timed out after 30 seconds'));
                }, 30_000);
              });

              await Promise.race([
                options.whatsappService.initialize(),
                timeout,
              ]);
              
              return {
                success: true,
                message: 'WhatsApp client initialization started',
              };
            } catch (error) {
              return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to initialize WhatsApp client',
              };
            }
          },
        }),
        status: e.build({
          method: 'get',
          input: z.object({}),
          output: z.object({
            connected: z.boolean(),
            qrCode: z.string().nullable(),
            connectedClients: z.number(),
            initializationStatus: z.enum(['none', 'initializing', 'ready', 'error', 'timeout']),
            initializationError: z.string().nullable(),
          }),
          handler: async ({ options }) => {
            const status = options.whatsappService.getStatus();
            return {
              ...status,
              connectedClients: options.wsManager?.getConnectedClients() ?? 0,
            };
          },
        }),
      },
      templates: {
        list: e.build({
          method: 'get',
          input: z.object({}),
          output: z.object({
            items: z.array(templateResponseSchema),
          }),
          handler: async () => {
            const templates = await prisma.messageTemplate.findMany({
              orderBy: { createdAt: 'desc' },
            });
            
            const parsedTemplates = templates.map(t => {
              // Parse the messages array
              let messages;
              if (Array.isArray(t.messages)) {
                // If it's already an array, use it directly
                messages = t.messages;
              } else if (typeof t.messages === 'string') {
                try {
                  // Try to parse as JSON array first
                  messages = JSON.parse(t.messages);
                  if (!Array.isArray(messages)) {
                    // If not an array, try splitting by comma as fallback
                    messages = t.messages.split(',').map(m => m.trim());
                  }
                } catch (e) {
                  // If parsing fails, split by comma
                  messages = t.messages.split(',').map(m => m.trim());
                }
              } else {
                // Fallback to empty array
                messages = [];
              }
              
              // Ensure all messages are properly parsed
              messages = messages.map(msg => {
                if (typeof msg === 'string') {
                  try {
                    // Try to parse as JSON if it looks like a stringified object
                    if ((msg.startsWith('{') && msg.endsWith('}')) || 
                        (msg.startsWith('[') && msg.endsWith(']'))) {
                      return JSON.parse(msg);
                    }
                  } catch (e) {
                    // If parsing fails, return as is
                  }
                }
                return msg;
              });
              
              return {
                id: t.id,
                title: t.title,
                messages,
                messageIds: t.messageIds ? t.messageIds.split(',') : [],
                isSentToSelf: t.isSentToSelf || false,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt
              };
            });
            
            return { items: parsedTemplates };
          },
        }),
        create: e.build({
          method: 'post',
          input: messageTemplateSchema,
          output: z.object({ id: z.number() }),
          handler: async ({ input, options }) => {
            if (!options.whatsappService || !options.whatsappService.isConnected()) {
              throw new Error('WhatsApp client is not connected');
            }

            // Parse messages to separate text and media messages
            const textMessages: string[] = [];
            const mediaMessages: Array<{url: string, caption?: string}> = [];
            
            for (const message of input.messages) {
              // If message is already an object (from the new format)
              if (typeof message === 'object' && message !== null) {
                if (message.type === 'media') {
                  mediaMessages.push({
                    url: message.content,
                    caption: message.caption
                  });
                } else {
                  textMessages.push(message.content);
                }
              } 
              // If message is a string (from the old format or plain text)
              else if (typeof message === 'string') {
                try {
                  // Try to parse as JSON for backward compatibility
                  const parsed = JSON.parse(message);
                  if (parsed.type === 'media') {
                    mediaMessages.push({
                      url: parsed.content,
                      caption: parsed.caption
                    });
                  } else {
                    textMessages.push(parsed.content || parsed);
                  }
                } catch (e) {
                  // If parsing fails, treat as plain text
                  textMessages.push(message);
                }
              }
            }

            // Send messages to self and collect IDs
            const textMessageIds = textMessages.length > 0 
              ? await options.whatsappService.sendMessagesToSelf(textMessages)
              : [];
              
            const mediaMessageIds = mediaMessages.length > 0
              ? await options.whatsappService.sendMediaMessagesToSelf(mediaMessages)
              : [];
            
            const allMessageIds = [...textMessageIds, ...mediaMessageIds];
            
            // Prepare messages for storage
            const messagesForStorage = input.messages.map((msg: string | { type: string; content: string; caption?: string }) => {
              // If it's already a string, use it as is
              if (typeof msg === 'string') return msg;
              // Otherwise, stringify the object
              return JSON.stringify(msg);
            });
            
            // Create and save the template with message IDs
            const savedTemplate = await prisma.messageTemplate.create({
              data: {
                title: input.title,
                messages: JSON.stringify(messagesForStorage),
                messageIds: allMessageIds.join(','),
                isSentToSelf: true,
              }
            });
            
            return { id: savedTemplate.id };
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
            const template = await prisma.messageTemplate.findUnique({
              where: { id: input.id }
            });
            if (!template) {
              throw new Error('Template not found');
            }
            
            // Prepare messages for storage
            const messagesForStorage = input.template.messages.map((msg: string | { type: string; content: string; caption?: string }) => {
              // If it's already a string, use it as is
              if (typeof msg === 'string') return msg;
              // Otherwise, stringify the object
              return JSON.stringify(msg);
            });
            
            // Update fields
            await prisma.messageTemplate.update({
              where: { id: input.id },
              data: {
                title: input.template.title,
                messages: JSON.stringify(messagesForStorage),
                updatedAt: new Date(),
              }
            });
            
            return {
              id: template.id,
              title: input.template.title,
              messages: input.template.messages,
              messageIds: template.messageIds ? template.messageIds.split(',') : [],
              isSentToSelf: template.isSentToSelf,
              createdAt: template.createdAt,
              updatedAt: new Date(),
            };
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
            await prisma.messageTemplate.delete({
              where: { id: input.id }
            });
            return { success: true };
          },
        }),
      },
      jobs: {
        ':id': {
          start: e.build({
            method: 'post',
            input: z.object({
              id: z.string().transform(s => Number(s)),
            }),
            output: z.object({
              success: z.boolean(),
              job: adJobSchema.extend({ id: z.number() }).optional(),
              error: z.string().optional(),
            }),
            handler: async ({ input, options }) => {
              if (!options.adJobService) {
                throw new Error('AdJobService is not available');
              }

              try {
                // Get the job
                const job = await prisma.adJob.findUnique({
                  where: { id: input.id }
                });

                if (!job) {
                  return {
                    success: false,
                    error: `Job with ID ${input.id} not found`,
                  };
                }

                // Update job status to running
                const updatedJob = await prisma.adJob.update({
                  where: { id: input.id },
                  data: { status: AdJobStatus.RUNNING }
                });

                // Broadcast status update via WebSocket
                if (options.wsManager) {
                  options.wsManager.broadcast('ad:status' as WSEventType, {
                    jobId: updatedJob.id,
                    status: updatedJob.status,
                  });
                }

                // Start processing the job
                options.adJobService.processJob(input.id);

                return {
                  success: true,
                  job: {
                    id: updatedJob.id,
                    templateId: updatedJob.templateId,
                    status: updatedJob.status as any,
                    audience: updatedJob.audience,
                  },
                };
              } catch (error) {
                return {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                };
              }
            },
          }),
          stop: e.build({
            method: 'post',
            input: z.object({
              id: z.string().transform(s => Number(s)),
            }),
            output: z.object({
              success: z.boolean(),
              job: adJobSchema.extend({ id: z.number() }).optional(),
              error: z.string().optional(),
            }),
            handler: async ({ input, options }) => {
              if (!options.adJobService) {
                throw new Error('AdJobService is not available');
              }

              try {
                // Get the job
                const job = await prisma.adJob.findUnique({
                  where: { id: input.id }
                });

                if (!job) {
                  return {
                    success: false,
                    error: `Job with ID ${input.id} not found`,
                  };
                }

                // Update job status to stopped
                const updatedJob = await prisma.adJob.update({
                  where: { id: input.id },
                  data: { status: AdJobStatus.STOPPED }
                });

                // Broadcast status update via WebSocket
                if (options.wsManager) {
                  options.wsManager.broadcast('ad:status' as WSEventType, {
                    jobId: updatedJob.id,
                    status: updatedJob.status,
                  });
                }

                return {
                  success: true,
                  job: {
                    id: updatedJob.id,
                    templateId: updatedJob.templateId,
                    status: updatedJob.status as any,
                    audience: updatedJob.audience,
                  },
                };
              } catch (error) {
                return {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                };
              }
            },
          }),
          schedule: e.build({
            method: 'put',
            input: z.object({
              id: z.string().transform(s => Number(s)),
              schedule: z.object({
                startDate: z.string(),
                startTime: z.string(),
                endDate: z.string().optional(),
                endTime: z.string().optional(),
                repeatDaily: z.boolean().optional(),
                repeatWeekly: z.boolean().optional(),
                daysOfWeek: z.array(z.string()).optional(),
                timeSlots: z.array(z.object({
                  start: z.string(),
                  end: z.string(),
                })).optional(),
              }),
            }),
            output: z.object({
              success: z.boolean(),
              job: adJobSchema.extend({ id: z.number() }).optional(),
              error: z.string().optional(),
            }),
            handler: async ({ input, options }) => {
              try {
                // Get the job
                const job = await prisma.adJob.findUnique({
                  where: { id: input.id }
                });

                if (!job) {
                  return {
                    success: false,
                    error: `Job with ID ${input.id} not found`,
                  };
                }

                // Update job with schedule information
                // This would typically be stored in a separate table or as JSON in the job record
                // For now, we'll just return success
                
                return {
                  success: true,
                  job: {
                    id: job.id,
                    templateId: job.templateId,
                    status: job.status as any,
                    audience: job.audience,
                  },
                };
              } catch (error) {
                return {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                };
              }
            },
          }),
        },
      },
      adJobs: {
        list: e.build({
          method: 'get',
          input: z.object({
            status: z.enum(['pending', 'approved', 'rejected', 'running', 'completed', 'failed'] as const).optional(),
          }),
          output: z.object({
            items: z.array(adJobSchema.extend({ id: z.number() })),
          }),
          handler: async ({ input }) => {
            const query = prisma.adJob.findMany({
              where: input.status ? { status: input.status } : {},
            });
            const jobs = await query;
            const items = jobs.map(job => ({
              id: job.id,
              templateId: job.templateId,
              audience: job.audience,
              status: job.status as "pending" | "approved" | "rejected" | "running" | "completed" | "failed" | "stopped",
            }));
            return { items };
          },
        }),
        create: e.build({
          method: 'post',
          input: adJobSchema,
          output: z.object({ id: z.number() }),
          handler: async ({ input, options }) => {
            if (!options.whatsappService || !options.whatsappService.isConnected()) {
              throw new Error('WhatsApp client is not connected');
            }
            
            // Get the message template with stored message IDs
            const template = await prisma.messageTemplate.findUnique({
              where: { id: input.templateId }
            });
            
            if (!template) {
              throw new Error('Template not found');
            }
            
            if (!template.isSentToSelf || !template.messageIds || template.messageIds.length === 0) {
              throw new Error('Template messages have not been sent to self yet');
            }
            
            // Create the ad job
            const savedJob = await prisma.adJob.create({
              data: {
                userId: 1, // Default user for now
                templateId: input.templateId,
                status: 'pending',
                audience: input.audience,
                messagesSent: 0,
                messagesDelivered: 0
              }
            });
            
            // Broadcast ad job creation
            options.wsManager?.broadcast('ad:status', {
              id: savedJob.id,
              status: savedJob.status,
              templateId: savedJob.templateId,
              audience: savedJob.audience,
            });
            
            return { id: savedJob.id };
          },
        }),
        schedule: e.build({
          method: 'post',
          description: 'Schedule an ad job for future execution',
          input: z.object({
            id: z.number().int().positive(),
            scheduleTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
              message: 'Invalid date format. Please provide a valid ISO date string',
            }),
          }),
          output: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
          handler: async ({ input, options }) => {
            if (!options.adJobService) {
              throw new Error('AdJobService is not available');
            }
            
            try {
              const scheduleTime = new Date(input.scheduleTime);
              
              // Validate that the schedule time is in the future
              if (scheduleTime <= new Date()) {
                return {
                  success: false,
                  message: 'Schedule time must be in the future',
                };
              }
              
              await options.adJobService.scheduleJob(input.id, scheduleTime);
              
              return {
                success: true,
                message: `Job ${input.id} scheduled for ${scheduleTime.toISOString()}`,
              };
            } catch (error) {
              return {
                success: false,
                message: `Failed to schedule job: ${error instanceof Error ? error.message : String(error)}`,
              };
            }
          },
        }),
      },
      users: {
        create: e.build({
          method: 'post',
          input: userSchema,
          output: userSchema.extend({ id: z.number() }),
          handler: async ({ input }) => {
            const savedUser = await prisma.user.create({
              data: input
            });
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
            const users = await prisma.user.findMany();
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
            // Validate job exists
            const job = await prisma.adJob.findUnique({
              where: { id: input.jobId }
            });
            if (!job) {
              throw new Error('Ad job not found');
            }

            // Create moderation log
            await prisma.moderationLog.create({
              data: {
                jobId: input.jobId,
                moderator: input.moderator,
                action: input.action,
                notes: input.notes
              }
            });

            // Update job status based on action
            if (input.action === 'approved') {
              await prisma.adJob.update({
                where: { id: input.jobId },
                data: { status: 'approved' }
              });
            } else if (input.action === 'rejected') {
              await prisma.adJob.update({
                where: { id: input.jobId },
                data: { status: 'rejected' }
              });
            }

            // Broadcast moderation update
            options.wsManager?.broadcast('ad:status', {
              id: job.id,
              status: job.status,
              action: input.action,
              moderator: input.moderator,
            });

            return {
              id: job.id,
              jobId: job.id,
              moderator: input.moderator,
              action: input.action,
              notes: input.notes,
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
            const query = prisma.moderationLog.findMany({
              where: input.jobId ? { jobId: input.jobId } : {},
            });
            const logs = await query;
            return {
              items: logs.map(log => ({
                id: log.id,
                jobId: log.jobId,
                moderator: log.moderator,
                action: log.action as "approved" | "rejected" | "modified",
                notes: log.notes || undefined,
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
            const contacts = await prisma.contactGroup.findMany({
              where: { type: 'contact' },
              orderBy: { name: 'asc' }
            });
            const savedContact = await prisma.contactGroup.create({
              data: {
                ...input,
                type: 'contact',
              }
            });
            
            // Cast the type to match the expected output type
            return {
              id: savedContact.id,
              name: savedContact.name,
              phone: savedContact.phone || undefined,
              groupId: savedContact.groupId || undefined,
              type: savedContact.type as "contact" | "group",
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
            const contacts = await prisma.contactGroup.findMany({
              where: {
                ...(input.type ? { type: input.type } : {}),
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
              },
              orderBy: { name: 'asc' }
            });
            return {
              items: contacts.map(contact => ({
                id: contact.id,
                name: contact.name,
                phone: contact.phone || undefined,
                groupId: contact.groupId || undefined,
                type: contact.type as "contact" | "group",
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
            const groups = await prisma.contactGroup.findMany({
              where: { type: 'group' },
              orderBy: { name: 'asc' }
            });
            const savedGroup = await prisma.contactGroup.create({
              data: {
                ...input,
                type: 'group',
              }
            });
            return {
              id: savedGroup.id,
              name: savedGroup.name,
              groupId: savedGroup.groupId || undefined,
              type: savedGroup.type as "contact" | "group",
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
            const groups = await prisma.contactGroup.findMany({
              where: {
                type: 'group',
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
              }
            });
            return {
              items: groups.map((group: any) => ({
                id: group.id,
                name: group.name,
                groupId: group.groupId || undefined,
                type: group.type as "contact" | "group",
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
            const savedEntry = await prisma.phoneBook.create({
              data: input
            });
            return {
              id: savedEntry.id,
              name: savedEntry.name,
              phone: savedEntry.phone,
              groupName: savedEntry.groupName || undefined,
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
            let entries;
            if (input.groupName) {
              entries = await prisma.phoneBook.findMany({
                where: { groupName: input.groupName }
              });
            } else {
              entries = await prisma.phoneBook.findMany();
            }
            return {
              items: entries.map(entry => ({
                id: entry.id,
                name: entry.name,
                phone: entry.phone,
                groupName: entry.groupName || undefined,
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
            const savedGroup = await prisma.audienceGroup.create({
              data: {
                name: input.name,
                contacts: input.contacts.join(','),
                groups: input.groups.join(',')
              }
            });
            
            // Convert string fields to arrays for the response
            return {
              ...savedGroup,
              contacts: savedGroup.contacts.split(','),
              groups: savedGroup.groups.split(',')
            };
          },
        }),
        list: e.build({
          method: 'get',
          output: z.object({ items: z.array(audienceGroupSchema) }), // Update output schema
          handler: async () => {
            const groups = await prisma.audienceGroup.findMany();
            
            // Convert string fields to arrays for the response
            const formattedGroups = groups.map(group => ({
              ...group,
              contacts: group.contacts.split(','),
              groups: group.groups.split(',')
            }));
            
            return { items: formattedGroups };
          },
        }),
        update: e.build({
          method: 'put',
          input: z.object({ id: z.string(), name: z.string().optional(), contacts: z.array(z.string()).optional(), groups: z.array(z.string()).optional() }),
          output: z.object({ success: z.boolean() }),
          handler: async ({ input }) => {
            const group = await prisma.audienceGroup.findUnique({
              where: { id: Number(input.id) }
            });
            if (!group) {
              throw new Error('Audience group not found');
            }
            
            // Prepare update data
            const updateData: any = { updatedAt: new Date() };
            if (input.name) {
              updateData.name = input.name;
            }
            if (input.contacts) {
              updateData.contacts = input.contacts.join(',');
            }
            if (input.groups) {
              updateData.groups = input.groups.join(',');
            }
            
            await prisma.audienceGroup.update({
              where: { id: Number(input.id) },
              data: updateData
            });
            return { success: true };
          },
        }),
        delete: e.build({
          method: 'delete',
          input: z.object({ id: z.string() }),
          output: z.object({ success: z.boolean() }),
          handler: async ({ input }) => {
            await prisma.audienceGroup.delete({
              where: { id: Number(input.id) }
            });
            return { success: true };
          },
        }),
      },
    },
  };

  return routing;
};

export default createRoutes;
