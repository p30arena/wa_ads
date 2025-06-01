import { Client, LocalAuth, Chat, Contact } from 'whatsapp-web.js';
import { WSEventType } from 'wa-shared';
import { WebSocketManager } from './WebSocketManager';
import { RateLimiterService } from './RateLimiterService';
import { EventEmitter } from 'events';
import * as qrcode from 'qrcode-terminal';

interface ExtendedChat extends Chat {
  participants: Array<{
    id: { _serialized: string };
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
  }>;
  description?: string;
  createdAt: Date;
  getProfilePicUrl(): Promise<string>;
}

interface ContactData {
  id: string;
  name: string;
  phoneNumber: string;
  isMyContact: boolean;
  profilePicUrl?: string;
  status?: string;
}

interface GroupData {
  id: string;
  name: string;
  description?: string;
  participants: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    isAdmin: boolean;
  }>;
  isAdmin: boolean;
  profilePicUrl?: string;
  createdAt: Date;
}

export class WhatsAppService extends EventEmitter {
  public async close(): Promise<void> {
    this.stopStateChecks();
    if (this.client) {
      await this.client.destroy();
    }
  }
  /**
   * Clear WhatsApp session and cache, then re-initialize client for re-auth (QR)
   */
  public async clearSessionAndReinit(): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    try {
      this.stopStateChecks();
      if (this.client) {
        await this.client.destroy();
      }
      // Remove session and cache folders
      const baseDir = path.resolve(__dirname, '../../');
      const authDir = path.join(baseDir, '.wwebjs_auth');
      const cacheDir = path.join(baseDir, '.wwebjs_cache');
      for (const dir of [authDir, cacheDir]) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
        } catch (err) {
          // Ignore if already deleted
        }
      }
      // Recreate client
      this.client = new Client({
        takeoverOnConflict: true,
        authStrategy: new LocalAuth(),
        puppeteer: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ],
          headless: true
        }
      });
      this.setupEventListeners();
      this.setupRateLimiterEvents();
      await this.initialize();
    } catch (error) {
      console.error('[WhatsAppService] Failed to clear session and re-initialize:', error);
      this.wsManager.broadcast('whatsapp:status', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error during session reset',
        timestamp: new Date()
      });
      throw error;
    }
  }

  private client: Client;
  private wsManager: WebSocketManager;
  private rateLimiter: RateLimiterService;
  private isReady: boolean = false;
  private currentQRCode: string | null = null;
  private contacts: Map<string, ContactData> = new Map();
  private groups: Map<string, GroupData> = new Map();
  private initializationStatus: 'none' | 'initializing' | 'ready' | 'error' | 'timeout' = 'none';
  private initializationError: string | null = null;
  private stateCheckInterval: NodeJS.Timeout | null = null;
  private readonly STATE_CHECK_INTERVAL = 5000; // Check every 5 seconds
  constructor(wsManager: WebSocketManager, { currentVersion }: { currentVersion?: string }) {
    super();
    this.wsManager = wsManager;
    this.rateLimiter = new RateLimiterService();
    this.startStateChecks();
    this.client = new Client({
      takeoverOnConflict: true,
      authStrategy: new LocalAuth(),
      puppeteer: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        headless: true
      },
      webVersion: currentVersion ?? "2.2413.51", // retrieve the latest using this url: https://web.whatsapp.com/check-update?version=1&platform=web
    });

    // Register this service with the WebSocket manager
    this.wsManager.setWhatsAppService(this);

    this.setupEventListeners();
    this.setupRateLimiterEvents();
  }

  private setupRateLimiterEvents() {
    this.rateLimiter.on('cooldown:start', ({ phoneNumber, cooldownUntil }) => {
      this.wsManager.broadcast('ad:progress', {
        type: 'rate_limit',
        phoneNumber,
        cooldownUntil,
        message: `Rate limit reached for ${phoneNumber}. Cooling down until ${new Date(cooldownUntil).toLocaleString()}`
      });
    });
  }

  private startStateChecks() {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
    }

    this.stateCheckInterval = setInterval(() => {
      const state = this.getStatus();
      this.wsManager.broadcast('whatsapp:state' as WSEventType, state);
    }, this.STATE_CHECK_INTERVAL);
  }

  private stopStateChecks() {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }
  }

  public async handleRetry() {
    try {
      console.log('[WhatsAppService] Retrying WhatsApp initialization...');
      
      // Update status to show we're retrying
      this.initializationStatus = 'initializing';
      this.initializationError = null;
      this.isReady = false;
      
      // Notify clients that we're retrying
      this.wsManager.broadcast('whatsapp:state', {
        connected: false,
        qrCode: null,
        initializationStatus: 'initializing',
        initializationError: null
      });

      // Clean up existing client if it exists
      if (this.client) {
        try {
          this.client.removeAllListeners();
          await this.client.destroy();
        } catch (error) {
          console.error('[WhatsAppService] Error destroying old client:', error);
        }
      }

      // Create a new client instance with updated configuration
      this.client = new Client({
        takeoverOnConflict: true,
        authStrategy: new LocalAuth(),
        puppeteer: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ],
          headless: true
        },
        webVersion: '2.2413.51'
      });

      // Set up event listeners and initialize
      this.setupEventListeners();
      await this.initialize();
      
      console.log('[WhatsAppService] Retry completed successfully');
    } catch (error) {
      console.error('[WhatsAppService] Retry failed:', error);
      this.initializationStatus = 'error';
      this.initializationError = error instanceof Error ? error.message : 'Unknown error during retry';
      this.isReady = false;
      
      this.wsManager.broadcast('whatsapp:state', {
        connected: false,
        qrCode: null,
        initializationStatus: 'error',
        initializationError: this.initializationError
      });
      
      // Schedule a retry if we're still having issues
      setTimeout(() => this.handleRetry(), 5000);
    }
  }

  private setupEventListeners() {
    // Handle WebSocket messages
    this.wsManager.on('whatsapp:retry', () => {
      console.log('[WhatsAppService] Received retry request');
      this.initializationStatus = 'initializing';
      this.initializationError = null;
      this.handleRetry();
    });

    this.client.on('qr', (qr) => {
      if (!qr) {
        console.error('[WhatsAppService] Received invalid QR code');
        return;
      }

      console.log('[WhatsAppService] Received QR code:', {
        length: qr.length,
        start: qr.slice(0, 20)
      });

      // Reset connection state when new QR code is received
      this.isReady = false;
      this.currentQRCode = qr;
      
      // Generate QR in terminal for development purposes
      qrcode.generate(qr, { small: true });
      
      // Send QR to frontend via WebSocket
      console.log('[WhatsAppService] Broadcasting QR code to frontend');
      this.wsManager.broadcast('whatsapp:qr', { qr });
      
      // Verify broadcast was sent
      const connectedClients = this.wsManager.getConnectedClients();
      console.log('[WhatsAppService] QR code broadcast status:', {
        connectedClients,
        qrLength: qr.length,
        qrStart: qr.slice(0, 20),
        isReady: this.isReady
      });
    });

    this.client.on('ready', async () => {
      console.log('[WhatsAppService] WhatsApp client ready');
      this.isReady = true;
      this.currentQRCode = null;

      // Sync contacts and groups when ready
      await this.syncContacts();
      await this.syncGroups();

      this.wsManager.broadcast('whatsapp:ready', {
        timestamp: new Date(),
        isConnected: true
      });
    });

    this.client.on('authenticated', () => {
      console.log('[WhatsAppService] WhatsApp client authenticated');
      this.currentQRCode = null;
      this.wsManager.broadcast('whatsapp:authenticated', {
        timestamp: new Date(),
        isConnected: this.isReady
      });
    });

    this.client.on('disconnected', () => {
      console.log('[WhatsAppService] WhatsApp client disconnected');
      this.isReady = false;
      this.stopStateChecks(); // Stop state checks when disconnected
      this.contacts.clear();
      this.groups.clear();
      // Don't clear QR code on disconnect to avoid flashing
      // this.currentQRCode = null;
      this.wsManager.broadcast('whatsapp:disconnected', {
        timestamp: new Date(),
        isConnected: false
      });
    });

    // Listen for contact and group updates
    this.client.on('contact_changed', async (contact: Contact) => {
      if (contact.id && contact.id._serialized) {
        await this.updateContact(contact);
      }
    });

    this.client.on('group_join', async (notification) => {
      await this.syncGroups();
    });

    this.client.on('group_leave', async (notification) => {
      await this.syncGroups();
    });

    this.client.on('group_update', async (notification) => {
      await this.syncGroups();
    });
  }

  public async syncContacts(): Promise<number> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const contacts = await this.client.getContacts();
      this.contacts.clear();

      for (const contact of contacts) {
        await this.updateContact(contact);
      }

      console.log(`[WhatsAppService] Synced ${this.contacts.size} contacts`);
      return this.contacts.size;
    } catch (error) {
      console.error('[WhatsAppService] Error syncing contacts:', error);
      throw error;
    }
  }

  private async updateContact(contact: Contact): Promise<ContactData | undefined> {
    if (!contact.id || !contact.id._serialized) return;

    const contactData: ContactData = {
      id: contact.id._serialized,
      name: contact.name || contact.pushname || contact.number,
      phoneNumber: contact.number,
      isMyContact: contact.isMyContact,
      profilePicUrl: await contact.getProfilePicUrl().catch(() => undefined),
      // Note: getStatus is not available in the current version, so we'll skip it
      status: undefined,
    };

    this.contacts.set(contactData.id, contactData);
    return contactData;
  }

  public async getContacts(): Promise<ContactData[]> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    return Array.from(this.contacts.values());
  }

  public async syncGroups(): Promise<number> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const chats = await this.client.getChats();
      const groups = chats.filter(chat => chat.isGroup) as ExtendedChat[];
      this.groups.clear();

      for (const group of groups) {
        const participants = await Promise.all(
          group.participants.map(async (participant) => {
            const contact = await this.client.getContactById(participant.id._serialized) as Contact;
            return {
              id: participant.id._serialized,
              name: contact.name || contact.pushname || contact.number,
              phoneNumber: contact.number,
              isAdmin: participant.isAdmin || participant.isSuperAdmin || false,
            };
          })
        );

        const groupData: GroupData = {
          id: group.id._serialized,
          name: group.name,
          description: group.description,
          participants,
          isAdmin: group.participants.find(
            (p) => p.id._serialized === this.client.info.wid._serialized
          )?.isAdmin || false,
          profilePicUrl: await group.getProfilePicUrl().catch(() => undefined),
          createdAt: group.createdAt,
        };

        this.groups.set(groupData.id, groupData);
      }

      console.log(`[WhatsAppService] Synced ${this.groups.size} groups`);
      return this.groups.size;
    } catch (error) {
      console.error('[WhatsAppService] Error syncing groups:', error);
      throw error;
    }
  }

  public async getGroups(): Promise<GroupData[]> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    return Array.from(this.groups.values());
  }
  public async initialize(): Promise<void> {
    try {
      console.log('[WhatsAppService] Initializing WhatsApp client...');
      this.initializationStatus = 'initializing';
      this.initializationError = null;
      
      // Notify clients about initialization start
      this.wsManager.broadcast('whatsapp:status', {
        status: 'initializing',
        timestamp: new Date()
      });
      
      // Create a timeout promise
      const timeout = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('WhatsApp client initialization timed out after 30 seconds'));
        }, 30_000);
      });

      // Race between initialization and timeout
      await Promise.race([
        this.client.initialize(),
        timeout
      ]);

      console.log('[WhatsAppService] WhatsApp client initialized successfully');
      this.initializationStatus = 'ready';

      // After initialization, if we're not ready and don't have a QR code,
      // notify clients that we're waiting for QR
      if (!this.isReady && !this.currentQRCode) {
        this.wsManager.broadcast('whatsapp:status', {
          status: 'waiting_for_qr',
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('[WhatsAppService] Failed to initialize WhatsApp client:', error);
      // Reset state
      this.isReady = false;
      this.currentQRCode = null;
      this.initializationError = error instanceof Error ? error.message : String(error);
      this.initializationStatus = (error instanceof Error && error.message?.includes('timed out')) ? 'timeout' : 'error';

      // Notify frontend of initialization error
      this.wsManager.broadcast('whatsapp:status', {
        status: this.initializationStatus,
        error: this.initializationError,
        timestamp: new Date()
      });
      throw error;
    }
  }

  public async sendMessage(to: string, content: string | string[]): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(to);
      const messages = Array.isArray(content) ? content : [content];
      
      // Check rate limit for all messages
      for (let i = 0; i < messages.length; i++) {
        const canSend = await this.rateLimiter.canSendMessage(formattedNumber);
        if (!canSend) {
          const cooldownTime = this.rateLimiter.getCooldownTime(formattedNumber);
          throw new Error(`Rate limit reached. Please wait ${Math.ceil(cooldownTime! / 60000)} minutes before sending to ${to}`);
        }
      }

      // Send all messages in sequence
      for (const message of messages) {
        await this.client.sendMessage(formattedNumber, message);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  public async sendMediaMessage(to: string, mediaUrl: string, caption?: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(to);
      
      // Check rate limit before sending (counts as 2 messages if there's a caption)
      const messageCount = caption ? 2 : 1;
      for (let i = 0; i < messageCount; i++) {
        const canSend = await this.rateLimiter.canSendMessage(formattedNumber);
        if (!canSend) {
          const cooldownTime = this.rateLimiter.getCooldownTime(formattedNumber);
          throw new Error(`Rate limit reached. Please wait ${Math.ceil(cooldownTime! / 60000)} minutes before sending to ${to}`);
        }
      }

      const media = await this.client.sendMessage(formattedNumber, mediaUrl);
      if (caption) {
        await this.client.sendMessage(formattedNumber, caption);
      }
    } catch (error) {
      console.error('Failed to send media message:', error);
      throw error;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    // Ensure number has country code and WhatsApp suffix
    return cleaned.startsWith('1') ? `${cleaned}@c.us` : `1${cleaned}@c.us`;
  }

  /**
   * Get the phone number of the currently logged-in user
   */
  public async getSelfNumber(): Promise<string> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }
    
    try {
      // Get the client's own phone number
      // @ts-ignore - The client API might not have proper typings for all methods
      const info = await this.client.info;
      return info.wid._serialized.replace('@c.us', '');
    } catch (error) {
      console.error('Failed to get self number:', error);
      throw error;
    }
  }

  /**
   * Send messages to self and return their message IDs for later reuse
   */
  public async sendMessagesToSelf(messages: string[]): Promise<string[]> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const selfNumber = await this.getSelfNumber();
      const formattedNumber = this.formatPhoneNumber(selfNumber);
      const messageIds: string[] = [];
      
      // Send all messages in sequence and collect their IDs
      for (const message of messages) {
        const sentMessage = await this.client.sendMessage(formattedNumber, message);
        messageIds.push(sentMessage.id._serialized);
      }
      
      return messageIds;
    } catch (error) {
      console.error('Failed to send messages to self:', error);
      throw error;
    }
  }

  /**
   * Send media messages to self and return their message IDs for later reuse
   */
  public async sendMediaMessagesToSelf(mediaMessages: Array<{url: string, caption?: string}>): Promise<string[]> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const selfNumber = await this.getSelfNumber();
      const formattedNumber = this.formatPhoneNumber(selfNumber);
      const messageIds: string[] = [];
      
      // Send all media messages in sequence and collect their IDs
      for (const { url, caption } of mediaMessages) {
        const sentMedia = await this.client.sendMessage(formattedNumber, url);
        messageIds.push(sentMedia.id._serialized);
        
        if (caption) {
          const sentCaption = await this.client.sendMessage(formattedNumber, caption);
          messageIds.push(sentCaption.id._serialized);
        }
      }
      
      return messageIds;
    } catch (error) {
      console.error('Failed to send media messages to self:', error);
      throw error;
    }
  }

  /**
   * Forward stored messages using their IDs
   */
  public async forwardStoredMessages(to: string, messageIds: string[]): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(to);
      
      // Check rate limit for all messages
      for (let i = 0; i < messageIds.length; i++) {
        const canSend = await this.rateLimiter.canSendMessage(formattedNumber);
        if (!canSend) {
          const cooldownTime = this.rateLimiter.getCooldownTime(formattedNumber);
          throw new Error(`Rate limit reached. Please wait ${Math.ceil(cooldownTime! / 60000)} minutes before sending to ${to}`);
        }
      }

      // Forward all messages in sequence
      for (const messageId of messageIds) {
        // Use message ID to get the message and then forward it
        // @ts-ignore - The client API might not have proper typings
        const message = await this.client.getMessageById(messageId);
        if (message) {
          await message.forward(formattedNumber);
        }
      }
    } catch (error) {
      console.error('Failed to forward stored messages:', error);
      throw error;
    }
  }

  public async getChats() {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }
    return await this.client.getChats();
  }

  public isConnected(): boolean {
    return this.isReady;
  }

  public getQRCode(): string | null {
    return this.currentQRCode;
  }

  public getStatus(): {
    connected: boolean;
    qrCode: string | null;
    initializationStatus: 'none' | 'initializing' | 'ready' | 'error' | 'timeout';
    initializationError: string | null;
    timestamp: number;
  } {
    return {
      connected: this.isReady,
      qrCode: this.currentQRCode,
      initializationStatus: this.initializationStatus,
      initializationError: this.initializationError,
      timestamp: Date.now()
    };
  }
}
