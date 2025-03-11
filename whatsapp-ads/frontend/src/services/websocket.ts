import { create } from 'zustand';
import type { WhatsAppStatus } from '@/types';

type WSEventType = 
  | 'whatsapp:qr'
  | 'whatsapp:ready'
  | 'whatsapp:authenticated'
  | 'whatsapp:disconnected'
  | 'ad:status'
  | 'ad:progress';

interface WSMessage {
  type: WSEventType;
  data: any;
}

interface WebSocketStore {
  socket: WebSocket | null;
  status: WhatsAppStatus;
  connect: () => void;
  disconnect: () => void;
  setStatus: (status: Partial<WhatsAppStatus>) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export const useWebSocket = create<WebSocketStore>((set, get) => ({
  socket: null,
  status: {
    isConnected: false,
  },
  connect: () => {
    const socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
      set({ socket });
    };

    socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'whatsapp:qr':
            set(state => ({
              status: {
                ...state.status,
                qrCode: message.data.qr,
              },
            }));
            break;
          
          case 'whatsapp:ready':
            set(state => ({
              status: {
                ...state.status,
                isConnected: true,
                qrCode: undefined,
                lastConnection: message.data.timestamp,
              },
            }));
            break;
          
          case 'whatsapp:authenticated':
            set(state => ({
              status: {
                ...state.status,
                isConnected: true,
                qrCode: undefined,
              },
            }));
            break;
          
          case 'whatsapp:disconnected':
            set(state => ({
              status: {
                ...state.status,
                isConnected: false,
                lastConnection: message.data.timestamp,
              },
            }));
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      set({ 
        socket: null,
        status: {
          isConnected: false,
          qrCode: undefined,
        },
      });
      // Attempt to reconnect after 5 seconds
      setTimeout(() => get().connect(), 5000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      socket.close();
    };
  },
  
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null });
    }
  },

  setStatus: (newStatus) => {
    set(state => ({
      status: {
        ...state.status,
        ...newStatus,
      },
    }));
  },
}));
