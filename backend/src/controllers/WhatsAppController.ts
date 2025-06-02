import { defaultEndpointsFactory } from 'express-zod-api';
import { z } from 'zod';
import { WhatsAppService } from '../services/WhatsAppService';

export function createWhatsAppEndpoints(whatsappService: WhatsAppService) {
  return {
    resetSession: defaultEndpointsFactory.build({
      method: 'post',
      input: z.object({}),
      output: z.object({ success: z.boolean(), message: z.string().optional() }),
      handler: async () => {
        if (!whatsappService) {
          return { success: false, message: 'WhatsApp service is not available' };
        }
        try {
          await whatsappService.clearSessionAndReinit();
          return { success: true };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
        }
      },
    }),
  };
}
