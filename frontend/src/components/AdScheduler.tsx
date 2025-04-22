import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adJobApi } from '@/services/api';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

interface ScheduleSettings {
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  repeatDaily?: boolean;
  repeatWeekly?: boolean;
  daysOfWeek?: string[];
  timeSlots?: { start: string; end: string }[];
}

interface AdJob {
  id: number;
  templateId: number;
  status: string;
  schedule?: ScheduleSettings;
  messagesSent: number;
  messagesDelivered: number;
  createdAt: string;
}

interface AdSchedulerProps {
  jobId: number;
  onScheduleSubmit: (schedule: ScheduleSettings) => void;
}

export function AdScheduler({ jobId, onScheduleSubmit }: AdSchedulerProps) {
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<ScheduleSettings>({
    startDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    startTime: '09:00',
    daysOfWeek: [],
    timeSlots: [{ start: '09:00', end: '17:00' }],
  });

  // Fetch job details
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const response = await adJobApi.getJob(jobId);
      return response.data;
    },
  });

  // Update job schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (schedule: ScheduleSettings) => {
      const response = await adJobApi.updateJobSchedule(jobId, schedule);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });
  
  // Schedule job for a specific time mutation
  const scheduleJobMutation = useMutation({
    mutationFn: async (scheduleTime: string) => {
      const response = await adJobApi.scheduleJob(jobId, scheduleTime);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });

  const handleDayToggle = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek?.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...(prev.daysOfWeek || []), day],
    }));
  };

  const handleAddTimeSlot = () => {
    setSchedule((prev) => ({
      ...prev,
      timeSlots: [
        ...(prev.timeSlots || []),
        { start: '09:00', end: '17:00' },
      ],
    }));
  };

  const handleRemoveTimeSlot = (index: number) => {
    setSchedule((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots?.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateTimeSlot = (
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots?.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const handleSaveSchedule = () => {
    // First update the detailed schedule settings
    updateScheduleMutation.mutate(schedule);
    
    // Then schedule the job for execution at the start date/time
    const scheduleDateTime = `${schedule.startDate}T${schedule.startTime}:00`;
    scheduleJobMutation.mutate(scheduleDateTime);
    
    onScheduleSubmit(schedule);
  };

  return (
    <div className="bg-card text-card-foreground shadow sm:rounded-lg border border-border">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-foreground">
          Schedule Campaign
        </h3>
        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          {/* Start Date & Time */}
          <div className="sm:col-span-3">
            <label
              htmlFor="start-date"
              className="block text-sm font-medium text-gray-700"
            >
              Start Date
            </label>
            <div className="mt-1">
              <input
                type="date"
                name="start-date"
                id="start-date"
                value={schedule.startDate}
                onChange={(e) =>
                  setSchedule((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="start-time"
              className="block text-sm font-medium text-gray-700"
            >
              Start Time
            </label>
            <div className="mt-1">
              <input
                type="time"
                name="start-time"
                id="start-time"
                value={schedule.startTime}
                onChange={(e) =>
                  setSchedule((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Repeat Options */}
          <div className="sm:col-span-6">
            <fieldset className="space-y-4">
              <legend className="text-sm font-medium text-gray-700">
                Repeat Options
              </legend>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={schedule.repeatDaily}
                    onChange={(e) =>
                      setSchedule((prev) => ({
                        ...prev,
                        repeatDaily: e.target.checked,
                        repeatWeekly: e.target.checked
                          ? false
                          : prev.repeatWeekly,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Daily</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={schedule.repeatWeekly}
                    onChange={(e) =>
                      setSchedule((prev) => ({
                        ...prev,
                        repeatWeekly: e.target.checked,
                        repeatDaily: e.target.checked ? false : prev.repeatDaily,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Weekly</span>
                </label>
              </div>
            </fieldset>
          </div>

          {/* Days of Week */}
          {schedule.repeatWeekly && (
            <div className="sm:col-span-6">
              <fieldset>
                <legend className="text-sm font-medium text-gray-700">
                  Days of Week
                </legend>
                <div className="mt-2 flex flex-wrap gap-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                    (day) => (
                      <label
                        key={day}
                        className="relative flex items-center justify-center"
                      >
                        <input
                          type="checkbox"
                          checked={schedule.daysOfWeek?.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          className="sr-only"
                        />
                        <span
                          className={`flex h-8 w-12 items-center justify-center rounded-full text-sm font-medium ${
                            schedule.daysOfWeek?.includes(day)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-muted text-foreground hover:bg-accent dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
                          }`}
                        >
                          {day}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </fieldset>
            </div>
          )}

          {/* Time Slots */}
          <div className="sm:col-span-6">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Time Slots
              </label>
              <button
                type="button"
                onClick={handleAddTimeSlot}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-3 py-2 text-sm font-medium leading-4 text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Add Slot
              </button>
            </div>
            <div className="mt-2 space-y-3">
              {schedule.timeSlots?.map((slot, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(e) =>
                      handleUpdateTimeSlot(index, 'start', e.target.value)
                    }
                    className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(e) =>
                      handleUpdateTimeSlot(index, 'end', e.target.value)
                    }
                    className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTimeSlot(index)}
                    className="inline-flex items-center rounded-md border border-transparent bg-red-100 px-3 py-2 text-sm font-medium leading-4 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSchedule}
            disabled={updateScheduleMutation.isPending}
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {updateScheduleMutation.isPending ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
