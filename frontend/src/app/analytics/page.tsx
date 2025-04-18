'use client';

import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WhatsAppStatus } from '@/components/WhatsAppStatus';

export default function AnalyticsPage() {
  const { status: wsStatus } = useWebSocket();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Analytics Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track your WhatsApp ad campaign performance
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <WhatsAppStatus />
        </div>
      </div>

      <div className="mt-8">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
