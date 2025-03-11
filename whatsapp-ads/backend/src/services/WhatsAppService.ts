import { Client, LocalAuth } from 'whatsapp-web.js';
import { WebSocketManager } from './WebSocketManager';
import { RateLimiterService } from './RateLimiterService';
import { EventEmitter } from 'events';
import qrcode from 'qrcode-terminal';

export class WhatsAppService extends EventEmitter {
  private client: Client;
  private wsManager: WebSocketManager;
  private rateLimiter: RateLimiterService;
  private isReady: boolean = false;

  constructor(wsManager: WebSocketManager) {
    super();
    this.wsManager = wsManager;
    this.rateLimiter = new RateLimiterService();
    this.client = new Client({
      takeoverOnConflict: true,
      authStrategy: new LocalAuth(),
      puppeteer: {
        args: ['--no-sandbox']
      }
    });

    // Register this service with the WebSocket manager
    this.wsManager.setWhatsAppService(this);

    this.setupEventListeners();
    this.setupRateLimiterEvents();
  }

  private currentQRCode: string | null = null;

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

    this.client.on('ready', () => {
      console.log('[WhatsAppService] WhatsApp client ready');
      this.isReady = true;
      this.currentQRCode = null;
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
      // Don't clear QR code on disconnect to avoid flashing
      // this.currentQRCode = null;
      this.wsManager.broadcast('whatsapp:disconnected', {
        timestamp: new Date(),
        isConnected: false
      });
    });
  }

  public async initialize(): Promise<void> {
    try {
      console.log('[WhatsAppService] Initializing WhatsApp client...');
      await this.client.initialize();
      console.log('[WhatsAppService] WhatsApp client initialized successfully');

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

      // Notify frontend of initialization error
      this.wsManager.broadcast('whatsapp:error', {
        message: 'Failed to initialize WhatsApp client',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  public async sendMessage(to: string, content: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(to);
      
      // Check rate limit before sending
      const canSend = await this.rateLimiter.canSendMessage(formattedNumber);
      if (!canSend) {
        const cooldownTime = this.rateLimiter.getCooldownTime(formattedNumber);
        throw new Error(`Rate limit reached. Please wait ${Math.ceil(cooldownTime! / 60000)} minutes before sending to ${to}`);
      }

      await this.client.sendMessage(formattedNumber, content);
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
    // Ensure number has country code
    return cleaned.startsWith('1') ? `${cleaned}@c.us` : `1${cleaned}@c.us`;
  }

  public async getContacts() {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }
    return await this.client.getContacts();
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
}
