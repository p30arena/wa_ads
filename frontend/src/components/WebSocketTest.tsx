import { useWebSocket } from '@/hooks/useWebSocket';
import { useEffect, useState } from 'react';

export function WebSocketTest() {
  const { status, isConnected, sendMessage } = useWebSocket();
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    // Send a test message every 5 seconds
    const interval = setInterval(() => {
      if (isConnected) {
        sendMessage('ad:status', {
          id: messageCount + 1,
          status: 'test',
          timestamp: new Date().toISOString()
        });
        setMessageCount(prev => prev + 1);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected, sendMessage, messageCount]);

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">WebSocket Test</h2>
      
      <div className="space-y-2">
        <div>
          <span className="font-semibold">Connection Status: </span>
          <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div>
          <span className="font-semibold">WhatsApp Status: </span>
          <span className={status.isConnected ? 'text-green-600' : 'text-red-600'}>
            {status.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {status.qrCode && (
          <div>
            <span className="font-semibold">QR Code Available</span>
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <pre className="text-xs">{status.qrCode}</pre>
            </div>
          </div>
        )}

        <div>
          <span className="font-semibold">Test Messages Sent: </span>
          <span>{messageCount}</span>
        </div>

        <div className="mt-4">
          <button
            onClick={() => {
              sendMessage('ad:status', {
                id: 'manual-test',
                status: 'manual',
                timestamp: new Date().toISOString()
              });
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Send Test Message
          </button>
        </div>
      </div>
    </div>
  );
}
