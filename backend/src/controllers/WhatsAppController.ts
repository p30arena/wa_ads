import { defaultEndpointsFactory } from 'express-zod-api';
import { z } from 'zod';
import { WhatsAppService } from '../services/WhatsAppService';

export const whatsappEndpoints = {
  resetSession: defaultEndpointsFactory.build({
    method: 'post',
    input: z.object({}),
    output: z.object({ success: z.boolean(), message: z.string().optional() }),
    handler: async ({ options }) => {
      const whatsapp = options.whatsapp as WhatsAppService;
      try {
        await whatsapp.clearSessionAndReinit();
        return { success: true };
      } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
      }
    },
  }),
};
