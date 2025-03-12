'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adJobApi } from '@/services/api';
import { AdJob } from '@/types';
import { AdScheduler } from '@/components/AdScheduler';

export default function SchedulePage() {
  const [selectedJob, setSelectedJob] = useState<AdJob | null>(null);

  const { data: jobs } = useQuery({
    queryKey: ['scheduled-jobs'],
    queryFn: async () => {
      const response = await adJobApi.getJobs();
      return response.data.filter(job => job.status !== 'completed' && job.status !== 'failed');
    },
  });

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Ad Campaign Schedule
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Schedule and manage your ad campaigns
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scheduled Jobs List */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Active Campaigns
            </h3>
            <div className="mt-6 flow-root">
              <ul role="list" className="-my-5 divide-y divide-gray-200">
                {jobs?.map((job) => (
                  <li
                    key={job.id}
                    className="py-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          Template #{job.templateId}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          Status: {job.status}
                        </p>
                      </div>
                      <div>
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          {job.messagesDelivered}/{job.messagesSent}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Scheduler */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {selectedJob ? (
              <AdScheduler
                jobId={selectedJob.id}
                onScheduleSubmit={async (schedule) => {
                  // Handle schedule update
                  await adJobApi.updateJobSchedule(selectedJob.id, schedule);
                  setSelectedJob(null);
                }}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">
                  Select a campaign from the list to schedule
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
