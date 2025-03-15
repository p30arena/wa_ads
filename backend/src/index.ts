import { createConfig, createServer as createZodServer } from 'express-zod-api';
import { AppDataSource } from './config/database';
import { WebSocketManager } from './services/WebSocketManager';
import { WhatsAppService } from './services/WhatsAppService';
import { createRoutes } from './routes';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database and start services
const startServer = async () => {
  try {
    let currentVersion: string | undefined;
    try {
      const res = await fetch("https://web.whatsapp.com/check-update?version=1&platform=web");
      const data = await res.json();
      currentVersion = (data as any).currentVersion;
      console.log('Current WhatsApp version:', currentVersion);
    } catch(e) {
      console.error(e);
    }

    // Initialize express-zod-api with minimal config
    const config = createConfig({
      http: {
        listen: process.env.PORT ? parseInt(process.env.PORT) : 8000,
      },
      logger: {
        level: 'debug',
        color: true,
      },
      cors: ({
        defaultHeaders,
        request,
        endpoint,
        logger,
      }): Record<string, string> => {
        const origin = request.headers.origin;
        const allowedOrigin =
          (origin && new URL(origin).origin) || request.hostname || "*";
    
        return {
          ...defaultHeaders,
          // 'Access-Control-Allow-Origin': new URL(swaggerBaseUrl).origin!,
          "Access-Control-Allow-Origin": allowedOrigin, // handle proxied requests
          "Access-Control-Allow-Credentials": "true", // Allow credentials
          "Access-Control-Allow-Headers":
            "Authorization, Content-Type, Accept, Origin, X-Requested-With, Access-Control-Allow-Origin, Access-Control-Allow-Credentials, Access-Control-Allow-Methods, Access-Control-Allow-Headers, x-access-key",
        };
      },
    });

    // Initialize database
    await AppDataSource.initialize();
    console.log('Database connection established');

    const wa: { whatsappService: WhatsAppService | null, wsManager: WebSocketManager | null } = { whatsappService: null, wsManager: null };
    // Create API routes
    const routing = createRoutes(wa);
    const { app, servers } = await createZodServer(config, routing);
    const server = servers[0];

    // Initialize WebSocket Manager
    const wsManager = new WebSocketManager(server);

    // Initialize WhatsApp Service
    const whatsappService = new WhatsAppService(wsManager, { currentVersion });

    wa.whatsappService = whatsappService;
    wa.wsManager = wsManager;

    // Initialize WhatsApp client
    whatsappService.initialize().then(() => 
      console.log('WhatsApp client initialized'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
