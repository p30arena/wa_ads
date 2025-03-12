'use client';

import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { adJobApi, moderationApi } from '@/services/api';
import { WhatsAppQRCode } from '@/components/WhatsAppQRCode';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function Dashboard() {
  const { status: wsStatus } = useWebSocket();

  // Debug logging for WhatsApp connection status
  console.log('[Dashboard] WhatsApp status:', {
    isConnected: wsStatus.isConnected,
    hasQRCode: Boolean(wsStatus.qrCode),
    qrCodeLength: wsStatus.qrCode?.length
  });
  
  const { data: pendingJobs } = useQuery({
    queryKey: ['pending-jobs'],
    queryFn: async () => {
      const response = await moderationApi.getModerationQueue();
      return response.data;
    },
  });

  const { data: recentJobs } = useQuery({
    queryKey: ['recent-jobs'],
    queryFn: async () => {
      const response = await adJobApi.getJobs();
      return response.data;
    },
  });

  return (
    <div className="space-y-6">
      {/* WhatsApp Connection Status */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-start sm:justify-between">
            <div className="w-full">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                WhatsApp Connection Status
              </h3>
              <div className="mt-2">
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <pre className="text-xs text-gray-500 mb-4">
                    {JSON.stringify({ wsStatus }, null, 2)}
                  </pre>
                )}

                {wsStatus.qrCode ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <ClockIcon className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">WhatsApp authentication required</span>
                    </div>
                    <div className="flex flex-col items-center justify-center lg:flex-row lg:items-start lg:gap-8">
                      <WhatsAppQRCode 
                        qrCode={wsStatus.qrCode}
                        onRefresh={() => {
                          console.log('[Dashboard] QR code refresh requested');
                          // The client will automatically refresh when disconnected
                        }} 
                      />
                      <div className="mt-4 lg:mt-0 max-w-sm text-sm text-gray-500">
                        <h4 className="font-semibold mb-2">Having trouble?</h4>
                        <ul className="space-y-2 list-disc pl-4">
                          <li>Make sure you have the latest version of WhatsApp installed on your phone</li>
                          <li>Check your internet connection</li>
                          <li>Try refreshing the QR code if it expires</li>
                          <li>Make sure you're using the primary device with your WhatsApp account</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : wsStatus.isConnected ? (
                  <div className="max-w-xl text-sm text-gray-500">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Connected and ready to send messages</span>
                    </div>
                    <p>Your WhatsApp account is connected and ready to use. You can now send messages and manage your campaigns.</p>
                  </div>
                ) : (
                  <div className="max-w-xl text-sm text-gray-500">
                    <div className="flex items-center gap-2 mb-2">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Initializing WhatsApp connection</span>
                    </div>
                    <p>Please wait while we establish a connection to WhatsApp. This should only take a few moments...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Approval
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {pendingJobs?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Ad Jobs */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Recent Ad Jobs
          </h3>
          <div className="mt-4 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        Template
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Progress
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentJobs?.slice(0, 5).map((job) => (
                      <tr key={job.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          Template #{job.templateId}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {job.status}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {job.messagesDelivered}/{job.messagesSent}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(new Date(job.createdAt), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
