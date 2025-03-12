import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  XCircleIcon,
  PlayCircleIcon,
  StopCircleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ModerationLog } from '@/types';
import { moderationApi, adJobApi } from '@/services/api';

type JobStatus = 'pending' | 'approved' | 'rejected' | 'running' | 'completed' | 'failed' | 'stopped';

interface AdJob {
  id: number;
  templateId: number;
  status: JobStatus;
  audience: string;
  createdAt: string;
  messagesDelivered?: number;
  messagesSent?: number;
}

interface ModerationAction {
  jobId: number;
  action: 'approved' | 'rejected';
  moderator: string;
  notes?: string;
}

export function ModerationPanel() {
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<AdJob | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');

  const { data: pendingJobs } = useQuery({
    queryKey: ['pending-jobs'],
    queryFn: async () => {
      const response = await moderationApi.getModerationQueue();
      return response.data;
    },
  });

  const moderateMutation = useMutation<ModerationLog, Error, ModerationAction>({
    mutationFn: async (action: ModerationAction) => {
      const response = await moderationApi.moderateJob(action.jobId, action.action, action.notes);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-jobs'] });
      setSelectedJob(null);
      setModerationNotes('');
    },
  });

  const jobControlMutation = useMutation<AdJob, Error, { jobId: number; action: 'start' | 'stop' }>({
    mutationFn: async ({ jobId, action }) => {
      const response = await adJobApi.updateJobStatus(jobId, action === 'start' ? 'running' : 'stopped');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-jobs'] });
    },
  });

  const handleModeration = (action: 'approved' | 'rejected') => {
    if (!selectedJob) return;

    moderateMutation.mutate({
      jobId: selectedJob.id,
      action,
      moderator: 'Admin', // TODO: Get from auth context
      notes: moderationNotes,
    });
  };

  const handleJobControl = (jobId: number, action: 'start' | 'stop') => {
    jobControlMutation.mutate({ jobId, action });
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Moderation Queue
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Review and manage pending ad jobs
            </p>
          </div>
        </div>

        <div className="mt-6 flow-root">
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
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingJobs?.map((job) => (
                    <tr
                      key={job.id}
                      className={
                        selectedJob?.id === job.id ? 'bg-indigo-50' : undefined
                      }
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          Template #{job.templateId}
                        </button>
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          {(job.status === 'approved' || job.status === 'running' || job.status === 'stopped') && (
                            <>
                              {job.status === 'approved' || job.status === 'stopped' ? (
                                <button
                                  onClick={() =>
                                    handleJobControl(job.id, 'start')
                                  }
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <PlayCircleIcon className="h-5 w-5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleJobControl(job.id, 'stop')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <StopCircleIcon className="h-5 w-5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Moderation Dialog */}
        {selectedJob && (
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Moderate Job #{selectedJob.id}
            </h4>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Moderation Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={moderationNotes}
                  onChange={(e) => setModerationNotes(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleModeration('rejected')}
                  className="inline-flex items-center px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  Reject
                </button>
                <button
                  onClick={() => handleModeration('approved')}
                  className="inline-flex items-center px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
