import * as WebSocket from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';
import { WSEventType } from 'wa-shared';

export class WebSocketManager extends EventEmitter {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    super();
    this.wss = new WebSocket.Server({ server });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message);
          this.emit('message', parsed);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      // Send initial connection success
      ws.send(JSON.stringify({ type: 'connection:established', data: { timestamp: new Date() } }));
    });
  }

  public broadcast(type: WSEventType, data: any) {
    const message = JSON.stringify({ type, data });
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public sendTo(client: WebSocket, type: WSEventType, data: any) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, data }));
    }
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }
}
