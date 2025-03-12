import { createServer } from 'http';
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
    const res = await fetch("https://web.whatsapp.com/check-update?version=1&platform=web");
    //@ts-ignore
    const { currentVersion } = await res.json();
    console.log(currentVersion);

    // Create HTTP server for both Express and WebSocket
    const server = createServer();

    // Initialize WebSocket Manager
    const wsManager = new WebSocketManager(server);

    // Initialize WhatsApp Service
    const whatsappService = new WhatsAppService(wsManager, { currentVersion });

    // Initialize express-zod-api with minimal config
    const config = createConfig({
      logger: {
        level: 'debug',
        color: true,
      },
      cors: true, // Enable CORS, we'll handle specific headers in middleware
    });

    // Initialize database
    await AppDataSource.initialize();
    console.log('Database connection established');

    // Initialize WhatsApp client
    await whatsappService.initialize();
    console.log('WhatsApp client initialized');

    // Create API routes
    const routing = createRoutes({ whatsappService, wsManager });
    const { app } = await createZodServer(config, routing);

    // Mount Express app on the HTTP server
    server.on('request', app);
    // Start the server
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
      console.log(`WebSocket server ready at ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
