import { WSEventType, WSMessage } from 'wa-shared';
export type { WSEventType };
import { EventEmitter } from 'events';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');

const debug = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WebSocket] ${message}`, ...args);
  }
};

const debugError = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[WebSocket Error] ${message}`, ...args);
  }
};

export class WebSocketService extends EventEmitter {
  private static instance: WebSocketService | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000; // Start with 1 second
  private connectionStartTime: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: { type: WSEventType; data: any }[] = [];
  private url: string;

  private constructor(url: string) {
    super();
    // Ensure we have a proper WebSocket URL
    const wsUrl = url.startsWith('ws') ? url : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    this.url = wsUrl;
    debug('Initializing WebSocket service', { url: wsUrl });
    this.connect();
  }

  public static getInstance(url: string): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(url);
    }
    return WebSocketService.instance;
  }

  private connect() {
    try {
      debug('Attempting to connect...');
      this.connectionStartTime = Date.now();
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      debugError('Failed to connect:', error);
      this.handleReconnect();
    }
  }

  private setupEventListeners() {
    if (!this.ws) {
      debugError('No WebSocket instance available');
      return;
    }

    this.ws.onopen = () => {
      const connectionTime = Date.now() - this.connectionStartTime;
      debug(`Connected in ${connectionTime}ms`, {
        url: this.url,
        readyState: this.ws?.readyState,
        queuedMessages: this.messageQueue.length
      });

      this.reconnectAttempts = 0;
      this.reconnectTimeout = 1000;
      this.emit('connected');

      // Process any queued messages
      const queuedMessages = [...this.messageQueue]; // Create a copy to avoid mutation during iteration
      this.messageQueue = [];

      queuedMessages.forEach(message => {
        debug('Processing queued message:', {
          type: message.type,
          data: message.data
        });
        this.send(message.type, message.data);
      });
    };

    this.ws.onclose = (event) => {
      debug('Disconnected', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      this.emit('disconnected');
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      debugError('Connection error:', error);
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        
        // Special handling for QR code messages
        if (message.type === 'whatsapp:qr') {
          debug('Received QR code message', {
            qrLength: message.data?.qr?.length,
            qrStart: message.data?.qr?.substring(0, 20),
            size: event.data.length
          });
          
          // Ensure we have a valid QR code
          if (!message.data?.qr) {
            debugError('Received invalid QR code message:', message);
            return;
          }
          
          // Emit the QR code data directly
          this.emit('whatsapp:qr', { qr: message.data.qr });
          return;
        }
        
        // Handle other message types
        debug('Received message', {
          type: message.type,
          data: message.data,
          size: event.data.length,
          readyState: this.ws?.readyState
        });

        // Validate message format before emitting
        if (!message.type) {
          throw new Error('Message type is missing');
        }

        this.emit(message.type, message.data);
      } catch (error) {
        debugError('Failed to parse message:', error, '\nRaw message:', event.data);
      }
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      debugError('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    const nextAttempt = this.reconnectTimeout * Math.pow(2, this.reconnectAttempts);
    debug('Scheduling reconnect', {
      attempt: this.reconnectAttempts + 1,
      delay: nextAttempt,
      maxAttempts: this.maxReconnectAttempts
    });

    // Clear any existing reconnect timeout
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectTimeout *= 2; // Exponential backoff
      this.connect();
    }, nextAttempt);
  }

  public send(type: WSEventType, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const message = JSON.stringify({ type, data });
        debug('Sending message', {
          type,
          data: type === 'whatsapp:qr' 
            ? { qrLength: data.qr?.length, qrStart: data.qr?.slice(0, 20) }
            : data,
          size: message.length,
          readyState: this.ws?.readyState
        });
        this.ws.send(message);
      } catch (error) {
        debugError('Failed to send message:', error, { type, data });
        // Queue the message for retry
        this.messageQueue.push({ type, data });
      }
    } else {
      debug('Queueing message - not connected', {
        readyState: this.ws?.readyState,
        type,
        data: type === 'whatsapp:qr' 
          ? { qrLength: data.qr?.length, qrStart: data.qr?.slice(0, 20) }
          : data,
        queueLength: this.messageQueue.length + 1
      });
      // Queue the message to be sent when connection is established
      this.messageQueue.push({ type, data });
      // Attempt to reconnect if not already trying
      if (!this.reconnectTimer && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
        this.connect();
      }
    }
  }

  public isConnected(): boolean {
    const connected = this.ws?.readyState === WebSocket.OPEN;
    debug('Connection status check', {
      connected,
      readyState: this.ws?.readyState
    });
    return connected;
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      debug('Disconnecting...');
      this.ws.close();
      this.ws = null;
    } else {
      debug('Already disconnected');
    }

    // Clear message queue
    this.messageQueue = [];
  }
}
