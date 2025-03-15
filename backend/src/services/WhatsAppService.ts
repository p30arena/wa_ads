import { Client, LocalAuth, Chat, Contact } from 'whatsapp-web.js';
import { WebSocketManager } from './WebSocketManager';
import { RateLimiterService } from './RateLimiterService';
import { EventEmitter } from 'events';
import qrcode from 'qrcode-terminal';

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
  private client: Client;
  private wsManager: WebSocketManager;
  private rateLimiter: RateLimiterService;
  private isReady: boolean = false;
  private currentQRCode: string | null = null;
  private contacts: Map<string, ContactData> = new Map();
  private groups: Map<string, GroupData> = new Map();
  private initializationStatus: 'none' | 'initializing' | 'ready' | 'error' | 'timeout' = 'none';
  private initializationError: string | null = null;
  constructor(wsManager: WebSocketManager, { currentVersion }: { currentVersion?: string }) {
    super();
    this.wsManager = wsManager;
    this.rateLimiter = new RateLimiterService();
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

  private setupEventListeners() {
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
  } {
    return {
      connected: this.isReady,
      qrCode: this.currentQRCode,
      initializationStatus: this.initializationStatus,
      initializationError: this.initializationError
    };
  }
}
