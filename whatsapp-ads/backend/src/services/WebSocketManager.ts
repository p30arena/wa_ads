import WebSocket from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';
import { WSEventType, WSMessage } from '@shared/types/websocket';

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
  } | null = null; // Will be set by setWhatsAppService
  private messageStats = {
    received: 0,
    sent: 0,
    errors: 0
  };

  public setWhatsAppService(service: {
    getQRCode: () => string | null;
    isConnected: () => boolean;
  }) {
    debug('Setting WhatsApp service');
    this.whatsAppService = service;
  }

  constructor(server: Server) {
    super();
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
      if (this.whatsAppService) {
        const isConnected = this.whatsAppService.isConnected();
        const currentQR = this.whatsAppService.getQRCode();

        debug('Sending initial WhatsApp state to client:', {
          isConnected,
          hasQRCode: Boolean(currentQR)
        });

        // Send current QR code if available and not connected
        if (currentQR && !isConnected) {
          this.sendTo(ws, 'whatsapp:qr', { qr: currentQR });
        }

        // Send connected state if connected
        if (isConnected) {
          this.sendTo(ws, 'whatsapp:ready', { timestamp: new Date() });
        }
      }

      ws.on('message', (message: string) => {
        try {
          const parsed: WSMessage = JSON.parse(message.toString());
          this.messageStats.received++;

          debug('Received message', {
            type: parsed.type,
            data: parsed.data,
            stats: this.messageStats
          });

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
    const message = JSON.stringify({ type, data });
    let sentCount = 0;
    let failedCount = 0;

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
          this.messageStats.sent++;
        } catch (error) {
          failedCount++;
          debugError('Failed to send to client:', error);
          // Remove failed client
          this.clients.delete(client);
        }
      } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
        // Clean up closed connections
        this.clients.delete(client);
      }
    });

    debug('Broadcast message', {
      type,
      data: type === 'whatsapp:qr' ? { qrLength: data.qr?.length } : data,
      recipients: sentCount,
      failed: failedCount,
      totalClients: this.clients.size
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
