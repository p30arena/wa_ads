'use client';

import { WebSocketTest } from '@/components/WebSocketTest';

export default function TestPage() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">WebSocket Connection Test</h1>
      <WebSocketTest />
    </main>
  );
}
