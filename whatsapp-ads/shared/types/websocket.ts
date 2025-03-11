export type WSEventType =
  | 'connection:established'
  | 'whatsapp:qr'
  | 'whatsapp:ready'
  | 'whatsapp:authenticated'
  | 'whatsapp:disconnected'
  | 'whatsapp:error'
  | 'whatsapp:status'
  | 'ad:progress'
  | 'ad:complete'
  | 'ad:error';

export interface WSMessage {
  type: WSEventType;
  data: any;
}
