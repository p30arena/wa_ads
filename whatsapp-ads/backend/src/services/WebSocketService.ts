import WebSocket, { Server as WebSocketServer } from 'ws';
import { Server } from 'http';
import { AdJob } from '../entities/AdJob';
import { ModerationLog } from '../entities/ModerationLog';

export type WebSocketMessage = {
  type: 'whatsapp_status' | 'ad_job_update' | 'moderation_update';
  data: any;
};

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      // Add new client
      this.clients.add(ws);

      // Remove client on disconnect
      ws.on('close', () => {
        this.clients.delete(ws);
      });

      // Handle incoming messages
      ws.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message);
          this.handleMessage(ws, parsedMessage);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
    });
  }

  private handleMessage(ws: WebSocket, message: any) {
    // Handle different message types
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  public broadcastWhatsAppStatus(connected: boolean, qrCode: string | null) {
    const message: WebSocketMessage = {
      type: 'whatsapp_status',
      data: { connected, qrCode },
    };
    this.broadcast(message);
  }

  public broadcastAdJobUpdate(adJob: AdJob) {
    const message: WebSocketMessage = {
      type: 'ad_job_update',
      data: {
        id: adJob.id,
        templateId: adJob.templateId,
        audience: adJob.audience,
        status: adJob.status,
      },
    };
    this.broadcast(message);
  }

  public broadcastModerationUpdate(log: ModerationLog) {
    const message: WebSocketMessage = {
      type: 'moderation_update',
      data: {
        id: log.id,
        jobId: log.jobId,
        moderator: log.moderator,
        action: log.action,
        notes: log.notes,
      },
    };
    this.broadcast(message);
  }

  private broadcast(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}
