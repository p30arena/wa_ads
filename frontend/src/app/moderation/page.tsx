'use client';

import { ModerationPanel } from '@/components/ModerationPanel';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function ModerationPage() {
  const { status: wsStatus } = useWebSocket();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Moderation Panel
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage ad campaigns
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-3 w-3 rounded-full ${
                wsStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {wsStatus.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <ModerationPanel />
      </div>
    </div>
  );
}
