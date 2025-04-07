import { AdJob } from '@prisma/client';
import { AdJobService } from './AdJobService';
import prisma from '../config/prisma';

interface ScheduledJob {
  jobId: number;
  scheduledTime: Date;
  timeoutId: NodeJS.Timeout;
}

export class JobSchedulerService {
  private scheduledJobs: Map<number, ScheduledJob> = new Map();
  private adJobService: AdJobService;
  
  constructor(adJobService: AdJobService) {
    this.adJobService = adJobService;
  }

  /**
   * Initialize the scheduler and load any existing scheduled jobs from the database
   */
  public async initialize(): Promise<void> {
    try {
      // Find all jobs with a schedule that haven't been processed yet
      const scheduledJobs = await prisma.adJob.findMany({
        where: {
          schedule: { not: null },
          status: 'pending'
        }
      });
      
      console.log(`Found ${scheduledJobs.length} scheduled jobs to initialize`);
      
      // Schedule each job
      for (const job of scheduledJobs) {
        if (job.schedule) {
          await this.scheduleJob(job.id, new Date(job.schedule));
        }
      }
    } catch (error) {
      console.error('Failed to initialize job scheduler:', error);
    }
  }

  /**
   * Schedule a job to be executed at a specific time
   */
  public async scheduleJob(jobId: number, scheduledTime: Date): Promise<void> {
    try {
      // Cancel any existing schedule for this job
      this.cancelScheduledJob(jobId);
      
      // Get the job to ensure it exists
      const job = await prisma.adJob.findUnique({
        where: { id: jobId }
      });
      
      if (!job) {
        throw new Error(`Job with ID ${jobId} not found`);
      }
      
      // Update the job with the scheduled time
      await prisma.adJob.update({
        where: { id: jobId },
        data: { schedule: scheduledTime.toISOString() }
      });
      
      // Calculate delay in milliseconds
      const now = new Date();
      const delay = scheduledTime.getTime() - now.getTime();
      
      if (delay <= 0) {
        console.log(`Job ${jobId} is scheduled for the past, executing immediately`);
        await this.executeJob(jobId);
        return;
      }
      
      // Schedule the job
      const timeoutId = setTimeout(() => {
        this.executeJob(jobId).catch(error => {
          console.error(`Failed to execute scheduled job ${jobId}:`, error);
        });
      }, delay);
      
      // Store the scheduled job
      this.scheduledJobs.set(jobId, {
        jobId,
        scheduledTime,
        timeoutId
      });
      
      console.log(`Job ${jobId} scheduled for ${scheduledTime.toISOString()} (in ${Math.floor(delay / 1000)} seconds)`);
    } catch (error) {
      console.error(`Failed to schedule job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled job
   */
  public cancelScheduledJob(jobId: number): void {
    const scheduledJob = this.scheduledJobs.get(jobId);
    
    if (scheduledJob) {
      clearTimeout(scheduledJob.timeoutId);
      this.scheduledJobs.delete(jobId);
      console.log(`Cancelled scheduled job ${jobId}`);
    }
  }

  /**
   * Execute a scheduled job
   */
  private async executeJob(jobId: number): Promise<void> {
    try {
      // Remove from scheduled jobs
      this.scheduledJobs.delete(jobId);
      
      // Process the job
      const result = await this.adJobService.processJob(jobId);
      
      console.log(`Executed scheduled job ${jobId}: ${result.message}`);
    } catch (error) {
      console.error(`Failed to execute job ${jobId}:`, error);
      
      // Update job status to failed
      await prisma.adJob.update({
        where: { id: jobId },
        data: { status: 'failed' }
      });
    }
  }

  /**
   * Get all currently scheduled jobs
   */
  public getScheduledJobs(): ScheduledJob[] {
    return Array.from(this.scheduledJobs.values());
  }

  /**
   * Reschedule a job
   */
  public async rescheduleJob(jobId: number, newScheduledTime: Date): Promise<void> {
    await this.scheduleJob(jobId, newScheduledTime);
  }
}
