import * as WebSocket from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';
import { WSEventType, WSMessage } from 'wa-shared';

const debug = (message: string, ...args: any[]) => {
  console.log(`[WebSocket Server] ${message}`, ...args);
};

const debugError = (message: string, ...args: any[]) => {
  console.error(`[WebSocket Server Error] ${message}`, ...args);
};

export class WebSocketManager extends EventEmitter {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();
  private whatsAppService: {
    getQRCode: () => string | null;
    isConnected: () => boolean;
    initialize: () => Promise<void>;
    handleRetry?: () => Promise<void>; // Add handleRetry to the interface
  } | null = null; // Will be set by setWhatsAppService
  private messageStats = {
    received: 0,
    sent: 0,
    errors: 0
  };

  public setWhatsAppService(service: {
    getQRCode: () => string | null;
    isConnected: () => boolean;
    initialize: () => Promise<void>;
    handleRetry?: () => Promise<void>;
  }) {
    debug('Setting WhatsApp service');
    this.whatsAppService = service;
    
    // Broadcast the current WhatsApp state to all connected clients
    this.broadcastWhatsAppState();
  }
  
  /**
   * Broadcasts the current WhatsApp state to all connected clients
   * or to a specific client if ws is provided
   */
  public broadcastWhatsAppState(ws?: WebSocket) {
    if (!this.whatsAppService) {
      const state = {
        connected: false,
        qrCode: null,
        initializationStatus: 'error' as const,
        initializationError: 'WhatsApp service not available',
        timestamp: Date.now()
      };
      
      if (ws) {
        this.sendTo(ws, 'whatsapp:state', state);
      } else {
        this.broadcast('whatsapp:state', state);
      }
      return;
    }
    
    const state = {
      connected: this.whatsAppService.isConnected(),
      qrCode: this.whatsAppService.getQRCode(),
      initializationStatus: this.whatsAppService.isConnected() ? 'ready' as const : 'initializing' as const,
      initializationError: null,
      timestamp: Date.now()
    };
    
    debug('Broadcasting WhatsApp state:', state);
    
    if (ws) {
      this.sendTo(ws, 'whatsapp:state', state);
    } else {
      this.broadcast('whatsapp:state', state);
    }
  }

  constructor(server?: Server) {
    super();
    if (server) {
      this.wss = new WebSocket.Server({ server });
      this.setupWebSocket();
      this.startStatsReporting();
    }
  }

  /**
   * Updates the HTTP server reference
   * @param server The new HTTP server instance
   */
  public updateServer(server: Server) {
    if (this.wss) {
      this.wss.close();
    }
    this.wss = new WebSocket.Server({ server });
    this.setupWebSocket();
    this.startStatsReporting();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress;
      debug('New client connected', { ip: clientIp, totalClients: this.clients.size + 1 });
      this.clients.add(ws);

      // Send initial connection success
      this.sendTo(ws, 'connection:established', {
        timestamp: new Date(),
        stats: this.messageStats,
        clientsConnected: this.clients.size
      });

          // Send initial WhatsApp state to the client
      this.broadcastWhatsAppState(ws);

      ws.on('message', (message: string) => {
        try {
          const parsed: WSMessage = JSON.parse(message.toString());
          this.messageStats.received++;

          debug('Received message', {
            type: parsed.type,
            data: parsed.data,
            stats: this.messageStats
          });

          // Handle retry request
          if (parsed.type === 'whatsapp:retry' as WSEventType && this.whatsAppService) {
            debug('Received retry request');
            
            // Notify all clients that we're retrying
            this.broadcast('whatsapp:state', {
              connected: false,
              qrCode: null,
              initializationStatus: 'initializing',
              initializationError: null
            });
            
            // Use handleRetry if available, otherwise fall back to initialize
            const retryPromise = this.whatsAppService.handleRetry 
              ? this.whatsAppService.handleRetry() 
              : this.whatsAppService.initialize();
              
            retryPromise.catch(error => {
              debugError('Failed to retry WhatsApp initialization:', error);
              // Notify clients of the error
              this.broadcast('whatsapp:state', {
                connected: false,
                qrCode: null,
                initializationStatus: 'error',
                initializationError: error instanceof Error ? error.message : 'Unknown error during retry'
              });
            });
          }

          // Echo back test messages
          if (parsed.type === 'ad:status' && parsed.data.status === 'test') {
            this.sendTo(ws, 'ad:status', {
              ...parsed.data,
              echo: true,
              serverTimestamp: new Date().toISOString()
            });
          }

          this.emit('message', parsed);
        } catch (error) {
          this.messageStats.errors++;
          debugError('Failed to parse message:', error);
        }
      });

      ws.on('close', (code, reason) => {
        debug('Client disconnected', {
          ip: clientIp,
          code,
          reason: reason.toString(),
          remainingClients: this.clients.size - 1
        });
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        this.messageStats.errors++;
        debugError('Client error:', { ip: clientIp, error });
        this.clients.delete(ws);
      });
    });
  }

  private startStatsReporting() {
    setInterval(() => {
      debug('WebSocket Stats', {
        clients: this.clients.size,
        ...this.messageStats
      });
    }, 60000); // Report every minute
  }

  public broadcast(type: WSEventType, data: any) {
    const message = { type, data };
    const messageString = JSON.stringify(message);
    let sentCount = 0;
    let failedCount = 0;

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
          sentCount++;
          this.messageStats.sent++;
        } catch (error) {
          failedCount++;
          debugError('Failed to send to client:', error);
          this.clients.delete(client);
        }
      } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
        this.clients.delete(client);
      }
    });

    if (failedCount > 0) {
      debug(`Broadcast: ${sentCount} sent, ${failedCount} failed`);
    }
  }

  /**
   * Close all active WebSocket connections
   */
  public closeAllConnections(): void {
    debug(`Closing all WebSocket connections (${this.clients.size} clients)`);
    
    // Send close message to all clients
    this.broadcast('server:shutdown' as WSEventType, { message: 'Server is shutting down' });
    
    // Close all connections
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Server is shutting down');
      }
    });
    
    // Clear the clients set
    this.clients.clear();
    
    // Stop the WebSocket server
    this.wss.close(() => {
      debug('WebSocket server closed');
    });
  }

  public sendTo(client: WebSocket, type: WSEventType, data: any) {
    if (client.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, data });
      client.send(message);
      this.messageStats.sent++;

      debug('Sent message', { type, data });
    } else {
      debugError('Cannot send - client not ready', {
        readyState: client.readyState
      });
    }
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public getStats() {
    return {
      ...this.messageStats,
      clients: this.clients.size
    };
  }
}
