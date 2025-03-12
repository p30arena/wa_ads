import { useEffect, useState, useCallback } from 'react';
import { WebSocketService, WSEventType } from '@/services/WebSocketService';

interface WhatsAppStatus {
  isConnected: boolean;
  qrCode: string | null;
  lastError?: string;
}

interface UseWebSocketReturn {
  status: WhatsAppStatus;
  isConnected: boolean;
  sendMessage: (type: WSEventType, data: any) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export function useWebSocket(): UseWebSocketReturn {
  const [ws, setWs] = useState<WebSocketService | null>(null);
  const [status, setStatus] = useState<WhatsAppStatus>({
    isConnected: false,
    qrCode: null,
  });

  // Log WebSocket events in development
  const logEvent = useCallback((event: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[WebSocket] ${event}:`, data || '');
    }
  }, []);

  useEffect(() => {
    const wsService = new WebSocketService(WS_URL);

    wsService.on('connected', () => {
      logEvent('Connected');
      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        lastError: undefined
      }));
    });

    wsService.on('disconnected', () => {
      logEvent('Disconnected');
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        // Keep QR code when disconnected to avoid flashing
        // qrCode: null
      }));
    });

    wsService.on('error', (error) => {
      logEvent('Error', error);
      setStatus((prev) => ({
        ...prev,
        lastError: error.message
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

        const newStatus = {
          ...prev,
          qrCode: data.qr,
          isConnected: false // Reset connected state when new QR code arrives
        };

        console.log('[useWebSocket] Updated status:', {
          ...newStatus,
          qrCode: newStatus.qrCode ? `${newStatus.qrCode.slice(0, 20)}...` : null
        });

        return newStatus;
      });
    });

    wsService.on('whatsapp:ready', () => {
      logEvent('WhatsApp Ready');
      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        qrCode: null,
        lastError: undefined
      }));
    });

    wsService.on('whatsapp:authenticated', () => {
      logEvent('WhatsApp Authenticated');
      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        qrCode: null,
        lastError: undefined
      }));
    });

    wsService.on('whatsapp:disconnected', () => {
      logEvent('WhatsApp Disconnected');
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
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

  return {
    status,
    isConnected: ws?.isConnected() || false,
    sendMessage,
  };
}
