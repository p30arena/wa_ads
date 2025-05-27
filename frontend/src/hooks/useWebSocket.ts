import { useEffect, useState, useCallback } from 'react';
import { WebSocketService, WSEventType } from '@/services/WebSocketService';
import { whatsappApi } from '@/services/api';

interface WhatsAppStatus {
  connected: boolean;
  qrCode: string | null;
  initializationStatus: 'none' | 'initializing' | 'ready' | 'error' | 'timeout';
  initializationError: string | null;
}

interface UseWebSocketReturn {
  status: WhatsAppStatus;
  isConnected: boolean;
  sendMessage: (type: WSEventType, data: any) => void;
  retryWhatsAppConnection: () => void;
}

// Derive WebSocket URL from API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws');

export function useWebSocket(): UseWebSocketReturn {
  const [ws, setWs] = useState<WebSocketService | null>(null);
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    qrCode: null,
    initializationStatus: 'none',
    initializationError: null,
  });

  // Log WebSocket events in development
  const logEvent = useCallback((event: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[WebSocket] ${event}:`, data || '');
    }
  }, []);

  useEffect(() => {
    const wsService = WebSocketService.getInstance(WS_URL);

    wsService.on('connected', () => {
      logEvent('Connected');
      setStatus((prev) => ({
        ...prev,
        connected: true,
        initializationError: null
      }));
    });

    wsService.on('disconnected', () => {
      logEvent('Disconnected');
      setStatus((prev) => ({
        ...prev,
        connected: false,
        initializationStatus: 'error',
        // Keep QR code when disconnected to avoid flashing
        // qrCode: null
      }));
    });

    wsService.on('error', (error) => {
      logEvent('Error', error);
      setStatus((prev) => ({
        ...prev,
        initializationError: error.message,
        initializationStatus: 'error'
      }));
    });

    wsService.on('whatsapp:qr', (data) => {
      if (!data.qr) {
        logEvent('Invalid QR Code Received', data);
        return;
      }

      logEvent('QR Code Received', {
        qrLength: data.qr.length,
        qrStart: data.qr.slice(0, 20)
      });

      setStatus((prev) => {
        // Only update if QR code is different
        if (prev.qrCode === data.qr) {
          return prev;
        }

        const newStatus: WhatsAppStatus = {
          ...prev,
          qrCode: data.qr,
          connected: false, // Reset connected state when new QR code arrives
          initializationStatus: 'initializing'
        };

        console.log('[useWebSocket] Updated status:', {
          ...newStatus,
          qrCode: newStatus.qrCode ? `${newStatus.qrCode.slice(0, 20)}...` : null
        });

        return newStatus;
      });
    });

    wsService.on('whatsapp:state', (data) => {
      logEvent('WhatsApp State', data);
      setStatus((prev) => {
        const newStatus: WhatsAppStatus = {
          ...prev,
          connected: data.connected,
          initializationStatus: data.initializationStatus as WhatsAppStatus['initializationStatus'],
          initializationError: data.initializationError
        };
        return newStatus;
      });
    });

    wsService.on('whatsapp:ready', () => {
      logEvent('WhatsApp Ready');
      setStatus((prev) => ({
        ...prev,
        connected: true,
        qrCode: null,
        initializationStatus: 'ready',
        initializationError: null
      }));
    });

    wsService.on('whatsapp:authenticated', () => {
      logEvent('WhatsApp Authenticated');
      setStatus((prev) => ({
        ...prev,
        connected: true,
        qrCode: null,
        initializationStatus: 'ready',
        initializationError: null
      }));
    });

    wsService.on('whatsapp:disconnected', () => {
      logEvent('WhatsApp Disconnected');
      setStatus((prev) => ({
        ...prev,
        connected: false,
        initializationStatus: 'error',
        // Don't clear QR code on disconnect to avoid flashing
        // qrCode: null
      }));
    });

    // Handle ad-related events
    wsService.on('ad:status', (data) => {
      logEvent('Ad Status Update', data);
    });

    wsService.on('ad:progress', (data) => {
      logEvent('Ad Progress Update', data);
    });

    setWs(wsService);

    return () => {
      wsService.disconnect();
    };
  }, [logEvent]);

  const sendMessage = useCallback((type: WSEventType, data: any) => {
    if (ws?.isConnected()) {
      logEvent('Sending Message', { type, data });
      ws.send(type, data);
    } else {
      console.warn('[WebSocket] Cannot send message: not connected');
    }
  }, [ws, logEvent]);

  const retryWhatsAppConnection = useCallback(async () => {
    logEvent('Retrying WhatsApp Connection');
    
    // Reset status to show loading state
    setStatus(prev => ({
      ...prev,
      initializationStatus: 'initializing',
      initializationError: null,
      qrCode: null
    }));

    try {
      // Try to force a reconnection if not connected
      if (!ws?.isConnected()) {
        console.warn('[WebSocket] Not connected, attempting to reconnect...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay before retry
      }
      
      // Send retry message if connected, otherwise the message will be queued
      ws?.send('whatsapp:retry', {});
      
      // Also trigger a new initialization via the API service as a fallback
      try {
        await whatsappApi.initialize();
      } catch (httpError) {
        console.error('Failed to initialize via API:', httpError);
        // Continue with WebSocket approach even if API call fails
      }
    } catch (error) {
      console.error('Error during retry:', error);
      setStatus(prev => ({
        ...prev,
        initializationStatus: 'error',
        initializationError: error instanceof Error ? error.message : 'Failed to retry connection'
      }));
    }
  }, [ws, logEvent]);

  return {
    status,
    isConnected: status.connected,
    sendMessage,
    retryWhatsAppConnection
  };
}
