import { createConfig, createServer as createZodServer } from 'express-zod-api';
import prisma from './config/prisma';
import { WebSocketManager } from './services/WebSocketManager';
import { WhatsAppService } from './services/WhatsAppService';
import { AdJobService } from './services/AdJobService';
import { JobSchedulerService } from './services/JobSchedulerService';
import { createRoutes } from './routes';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { Server } from 'http';

// Load environment variables
dotenv.config();

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Store references for graceful shutdown
let httpServer: Server | null = null;
let whatsappService: WhatsAppService | null = null;
let jobSchedulerService: JobSchedulerService | null = null;
let wsManager: WebSocketManager | null = null;

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close HTTP server
    if (httpServer) {
      console.log('Closing HTTP server...');
      await new Promise<void>((resolve) => httpServer?.close(() => resolve()));
    }
    
    // Close WebSocket connections
    if (wsManager) {
      console.log('Closing WebSocket connections...');
      wsManager.closeAllConnections();
    }
    
    // Stop job scheduler
    if (jobSchedulerService) {
      console.log('Stopping job scheduler...');
      await jobSchedulerService.stop();
    }
    
    // Destroy WhatsApp client
    if (whatsappService) {
      console.log('Disconnecting WhatsApp client...');
      try {
        await whatsappService.clearSessionAndReinit();
      } catch (error) {
        console.error('Error during WhatsApp client cleanup:', error);
      }
    }
    
    // Close database connection
    console.log('Closing database connection...');
    await prisma.$disconnect();
    
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Initialize database and start services
const startServer = async () => {
  try {
    // Setup signal handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
    
    let currentVersion: string | undefined;
    try {
      const res = await fetch("https://web.whatsapp.com/check-update?version=1&platform=web");
      const data = await res.json();
      currentVersion = (data as any).currentVersion;
      console.log('Current WhatsApp version:', currentVersion);
    } catch(e) {
      console.error('Failed to check WhatsApp version:', e);
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

    // Initialize database connection
    await prisma.$connect();
    console.log('Database connection established');

    const wa: { whatsappService: WhatsAppService | null, wsManager: WebSocketManager | null, adJobService: AdJobService | null } = { whatsappService: null, wsManager: null, adJobService: null };
    // Create API routes
    const routing = createRoutes(wa);
    const { app, servers } = await createZodServer(config, routing);
    httpServer = servers[0];

    // Initialize WebSocket Manager
    wsManager = new WebSocketManager(httpServer);

    // Initialize WhatsApp Service
    whatsappService = new WhatsAppService(wsManager, { currentVersion });

    // Initialize AdJobService
    const adJobService = new AdJobService(whatsappService, wsManager);

    // Initialize JobSchedulerService
    jobSchedulerService = new JobSchedulerService(adJobService);

    // Store references for routes
    wa.whatsappService = whatsappService;
    wa.wsManager = wsManager;
    wa.adJobService = adJobService;

    // Initialize WhatsApp client
    await whatsappService.initialize().then(() => 
      console.log('WhatsApp client initialized'));
      
    // Initialize job scheduler
    await jobSchedulerService.initialize().then(() =>
      console.log('Job scheduler initialized'));
      
    if (config.http) {
      console.log('Server is running on port', config.http.listen);
    } else {
      console.log('Server is running');
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
