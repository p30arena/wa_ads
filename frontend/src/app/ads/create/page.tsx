'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MessageTemplateEditor } from '@/components/MessageTemplateEditor';
import { AdScheduler } from '@/components/AdScheduler';
import { AudienceSelector } from '@/components/AudienceSelector';
import { whatsappApi, templateApi, adJobApi, phoneBookApi } from '@/services/api';
import { ContactGroup, MessageTemplate, AdJob } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WhatsAppStatus } from '@/components/WhatsAppStatus';

export default function CreateAdPage() {
  const router = useRouter();
  const { status: wsStatus } = useWebSocket();
  const [step, setStep] = useState<'template' | 'audience' | 'schedule'>('template');
  const [template, setTemplate] = useState<{
    title: string;
    messages: Array<{ type: 'text' | 'media'; content: string; caption?: string }>;
  } | null>(null);

  // Fetch data for audience selection
  const { data: contactGroups } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await whatsappApi.getContacts();
      return response.data;
    },
  });

  // Transform ContactGroups into separate contacts and groups
  const contacts = contactGroups?.data?.items?.filter((cg: ContactGroup) => cg.type === 'contact').map((cg: ContactGroup) => ({
    id: cg.id,
    name: cg.name,
    phone: cg.phone || '',
  }));

  const groups = contactGroups?.data?.items?.filter((cg: ContactGroup) => cg.type === 'group').map((cg: ContactGroup) => ({
    id: cg.id,
    name: cg.name,
    groupId: cg.groupId || '',
  }));

  const { data: phoneBookEntries } = useQuery({
    queryKey: ['phonebook'],
    queryFn: async () => {
      const response = await phoneBookApi.getEntries();
      return response.data;
    },
  });

  const { data: templatesResponse } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await templateApi.getTemplates();
      return response.data;
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: { title: string; messages: Array<{ type: 'text' | 'media'; content: string; caption?: string }> }) => {
      const response = await templateApi.createTemplate(templateData);
      return response.data;
    },
  });

  // Create ad job mutation
  const createJobMutation = useMutation({
    mutationFn: async (jobData: { templateId: number; audience: string; schedule: any; userId: number }) => {
      const response = await adJobApi.createJob(jobData);
      return response.data;
    },
    onSuccess: () => {
      router.push('/ads');
    },
  });

  const handleTemplateCreation = async (title: string, messages: Array<{ type: 'text' | 'media'; content: string; caption?: string }>) => {
    setTemplate({ title, messages });
    setStep('audience');

    // Create template in background
    await createTemplateMutation.mutateAsync({
      title,
      messages,
    });
  };

  const [selectedAudience, setSelectedAudience] = useState<{
    contacts: { id: number; name: string; phone: string }[];
    groups: { id: number; name: string; groupId: string }[];
    phoneBook: { id: number; name: string; phone: string }[];
  } | null>(null);

  const handleAudienceSelection = async (audience: {
    contacts: { id: number; name: string; phone: string }[];
    groups: { id: number; name: string; groupId: string }[];
    phoneBook: { id: number; name: string; phone: string }[];
  }) => {
    setSelectedAudience(audience);
    setStep('schedule');
  };

  const handleScheduleSubmit = async (schedule: any) => {
    if (!template || !selectedAudience) return;

    // Create ad job
    await createJobMutation.mutateAsync({
      templateId: createTemplateMutation.data?.data?.id || 0,
      userId: 1, // TODO: Get from auth context
      audience: JSON.stringify(selectedAudience),
      schedule,
    });
  };

  if (!wsStatus.connected) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <WhatsAppStatus />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Create New Ad Campaign
          </h2>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {/* Step indicator */}
        <nav aria-label="Progress">
          <ol role="list" className="space-y-4 md:flex md:space-y-0 md:space-x-8">
            <li className="md:flex-1">
              <button
                onClick={() => setStep('template')}
                className={`group ${
                  step === 'template'
                    ? 'border-indigo-600'
                    : 'border-gray-200 hover:border-gray-300'
                } flex w-full items-center border-l-4 py-2 pl-4 text-left text-sm font-medium`}
              >
                <span
                  className={`${
                    step === 'template' ? 'text-indigo-600' : 'text-gray-500'
                  } flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    step === 'template'
                      ? 'border-indigo-600'
                      : 'border-gray-300 group-hover:border-gray-400'
                  }`}
                >
                  1
                </span>
                <span className="ml-4 text-sm font-medium">
                  Create Message Template
                </span>
              </button>
            </li>

            <li className="md:flex-1">
              <button
                onClick={() => template && setStep('audience')}
                className={`group ${
                  step === 'audience'
                    ? 'border-indigo-600'
                    : 'border-gray-200 hover:border-gray-300'
                } flex w-full items-center border-l-4 py-2 pl-4 text-left text-sm font-medium ${
                  !template && 'opacity-50 cursor-not-allowed'
                }`}
                disabled={!template}
              >
                <span
                  className={`${
                    step === 'audience' ? 'text-indigo-600' : 'text-gray-500'
                  } flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    step === 'audience'
                      ? 'border-indigo-600'
                      : 'border-gray-300 group-hover:border-gray-400'
                  }`}
                >
                  2
                </span>
                <span className="ml-4 text-sm font-medium">Select Audience</span>
              </button>
            </li>

            <li className="md:flex-1">
              <button
                onClick={() => selectedAudience && setStep('schedule')}
                className={`group ${
                  step === 'schedule'
                    ? 'border-indigo-600'
                    : 'border-gray-200 hover:border-gray-300'
                } flex w-full items-center border-l-4 py-2 pl-4 text-left text-sm font-medium ${
                  !selectedAudience && 'opacity-50 cursor-not-allowed'
                }`}
                disabled={!selectedAudience}
              >
                <span
                  className={`${
                    step === 'schedule' ? 'text-indigo-600' : 'text-gray-500'
                  } flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    step === 'schedule'
                      ? 'border-indigo-600'
                      : 'border-gray-300 group-hover:border-gray-400'
                  }`}
                >
                  3
                </span>
                <span className="ml-4 text-sm font-medium">Schedule Campaign</span>
              </button>
            </li>
          </ol>
        </nav>

        {/* Step content */}
        <div className="mt-8">
          {step === 'template' && (
            <MessageTemplateEditor onSave={handleTemplateCreation} />
          )}

          {step === 'audience' && contacts && groups && phoneBookEntries && (
            <AudienceSelector
              contacts={contacts || []}
              groups={groups || []}
              phoneBook={phoneBookEntries?.data?.items || []}
              onSelectionChange={handleAudienceSelection}
            />
          )}

          {step === 'schedule' && createJobMutation.data?.data && (
            <AdScheduler
              jobId={createJobMutation.data.data.id}
              onScheduleSubmit={handleScheduleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
