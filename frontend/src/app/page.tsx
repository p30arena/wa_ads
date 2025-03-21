'use client';

import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { adJobApi, moderationApi } from '@/services/api';
import { WhatsAppStatus } from '@/components/WhatsAppStatus';
import { AdJob } from '@/types';
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
    connected: wsStatus.connected,
    hasQRCode: Boolean(wsStatus.qrCode),
    qrCodeLength: wsStatus.qrCode?.length
  });
  
  const { data: pendingJobsResponse } = useQuery({
    queryKey: ['pending-jobs'],
    queryFn: async () => {
      const response = await moderationApi.getModerationQueue();
      return response.data;
    },
  });

  const pendingJobs = pendingJobsResponse?.data?.items || [];

  const { data: recentJobsResponse } = useQuery({
    queryKey: ['recent-jobs'],
    queryFn: async () => {
      const response = await adJobApi.getJobs();
      return response.data;
    },
  });

  const recentJobs = recentJobsResponse?.data?.items || [];

  return (
    <div className="space-y-6">
      {/* WhatsApp Connection Status */}
      <WhatsAppStatus />

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
                    {pendingJobs.length}
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
                    {recentJobs.slice(0, 5).map((job: AdJob) => (
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
