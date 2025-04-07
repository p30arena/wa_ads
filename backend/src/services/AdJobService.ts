import { AdJob, MessageTemplate, AudienceGroup } from '@prisma/client';
import { WhatsAppService } from './WhatsAppService';
import { WebSocketManager } from './WebSocketManager';
import prisma from '../config/prisma';

export class AdJobService {
  private whatsAppService: WhatsAppService;
  private wsManager: WebSocketManager;

  constructor(whatsAppService: WhatsAppService, wsManager: WebSocketManager) {
    this.whatsAppService = whatsAppService;
    this.wsManager = wsManager;
  }

  /**
   * Process an ad job by sending messages to all recipients
   */
  public async processJob(jobId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!this.whatsAppService.isConnected()) {
      throw new Error('WhatsApp client is not connected');
    }
    
    // Get the ad job
    const adJob = await prisma.adJob.findUnique({
      where: { id: jobId }
    });
    
    if (!adJob) {
      throw new Error('Ad job not found');
    }
    
    if (adJob.status !== 'pending' && adJob.status !== 'approved') {
      throw new Error(`Cannot process ad job with status ${adJob.status}`);
    }
    
    // Get the message template with stored message IDs
    const template = await prisma.messageTemplate.findUnique({
      where: { id: adJob.templateId }
    });
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    if (!template.isSentToSelf || !template.messageIds || template.messageIds.length === 0) {
      throw new Error('Template messages have not been sent to self yet');
    }
    
    // Update job status to running
    await this.updateJobStatus(adJob.id, 'running');
    
    try {
      const recipients = await this.getRecipients(adJob);
      
      // Send messages to all recipients using stored message IDs
      const result = await this.sendMessagesToRecipients(recipients, template);
      
      // Update job status based on results
      if (result.failureCount === 0) {
        await this.updateJobStatus(adJob.id, 'completed', {
          messagesSent: result.successCount,
          messagesDelivered: result.successCount
        });
      } else if (result.successCount === 0) {
        await this.updateJobStatus(adJob.id, 'failed', {
          messagesSent: 0,
          messagesDelivered: 0
        });
      } else {
        await this.updateJobStatus(adJob.id, 'completed', {
          messagesSent: result.successCount,
          messagesDelivered: result.successCount
        });
      }
      
      return {
        success: true,
        message: `Messages sent to ${result.successCount} recipients. ${result.failureCount > 0 ? `Failed for ${result.failureCount} recipients.` : ''}`
      };
    } catch (error) {
      // Update job status to failed
      await this.updateJobStatus(adJob.id, 'failed');
      
      return {
        success: false,
        message: `Failed to process ad job: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get all recipients for an ad job
   */
  private async getRecipients(adJob: AdJob): Promise<string[]> {
    // Parse audience (could be a contact, group, or audience group ID)
    try {
      const audienceGroup = await prisma.audienceGroup.findUnique({
        where: { id: Number(adJob.audience) }
      });
      
      if (audienceGroup) {
        // If it's an audience group, get all contacts and groups
        const contacts = audienceGroup.contacts ? audienceGroup.contacts.split(',') : [];
        const groups = audienceGroup.groups ? audienceGroup.groups.split(',') : [];
        
        // For groups, we would need to get all members of each group
        // This is a placeholder for future implementation
        const groupMembers: string[] = [];
        
        return [...contacts, ...groupMembers];
      } else {
        // Assume it's a single recipient
        return [adJob.audience];
      }
    } catch (error) {
      console.error('Error getting recipients:', error);
      throw new Error(`Failed to get recipients: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send messages to all recipients
   */
  private async sendMessagesToRecipients(
    recipients: string[],
    template: MessageTemplate
  ): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;
    
    const messageIds = template.messageIds ? template.messageIds.split(',') : [];
    
    for (const recipient of recipients) {
      try {
        await this.whatsAppService.forwardStoredMessages(recipient, messageIds);
        successCount++;
        
        // Broadcast progress
        this.wsManager.broadcast('ad:progress', {
          recipient,
          status: 'success',
          message: `Message sent to ${recipient}`
        });
      } catch (error) {
        console.error(`Failed to send to ${recipient}:`, error);
        failureCount++;
        
        // Broadcast failure
        this.wsManager.broadcast('ad:progress', {
          recipient,
          status: 'error',
          message: `Failed to send to ${recipient}: ${error instanceof Error ? error.message : String(error)}`
        });
      }
      
      // Add a small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return { successCount, failureCount };
  }

  /**
   * Update job status and broadcast the update
   */
  private async updateJobStatus(
    jobId: number,
    status: string,
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    const updatedJob = await prisma.adJob.update({
      where: { id: jobId },
      data: { status, ...additionalData }
    });
    
    // Broadcast status update
    this.wsManager.broadcast('ad:status', {
      id: updatedJob.id,
      status: updatedJob.status,
      templateId: updatedJob.templateId,
      audience: updatedJob.audience,
      messagesSent: updatedJob.messagesSent,
      messagesDelivered: updatedJob.messagesDelivered
    });
  }

  /**
   * Schedule a job for future execution
   */
  public async scheduleJob(jobId: number, scheduleTime: Date): Promise<void> {
    // First, validate that the job exists and is in a valid state for scheduling
    const job = await prisma.adJob.findUnique({
      where: { id: jobId }
    });
    
    if (!job) {
      throw new Error('Ad job not found');
    }
    
    if (job.status !== 'pending' && job.status !== 'approved') {
      throw new Error(`Cannot schedule job with status ${job.status}`);
    }
    
    // Update the job with the schedule time
    await prisma.adJob.update({
      where: { id: jobId },
      data: { schedule: scheduleTime.toISOString() }
    });
    
    // Broadcast status update
    this.wsManager.broadcast('ad:status', {
      id: job.id,
      status: job.status,
      templateId: job.templateId,
      audience: job.audience,
      schedule: scheduleTime.toISOString()
    });
    
    console.log(`Job ${jobId} scheduled for ${scheduleTime.toISOString()}`);
  }
}
