import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adJobApi } from '@/services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AdJob {
  id: number;
  templateId: number;
  status: string;
  messagesSent: number;
  messagesDelivered: number;
  createdAt: string;
}

interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  deliveryRate: number;
}

interface TemplateStats {
  templateId: number;
  sent: number;
  delivered: number;
  deliveryRate: number;
}

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Fetch all jobs
  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await adJobApi.getJobs();
      return response.data;
    },
  });

  // Calculate date range
  const getDaysForRange = (range: '7d' | '30d' | '90d') => {
    switch (range) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
    }
  };

  // Process jobs data for charts
  const processJobsData = (jobs: AdJob[] | undefined) => {
    if (!jobs) return { dailyStats: [], templateStats: [] };

    const days = getDaysForRange(dateRange);
    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    // Filter jobs within date range
    const filteredJobs = jobs.filter((job) => {
      const jobDate = new Date(job.createdAt);
      return jobDate >= startDate && jobDate <= endDate;
    });

    // Calculate daily stats
    const dailyStats: DailyStats[] = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayJobs = filteredJobs.filter((job) => {
        const jobDate = new Date(job.createdAt);
        return jobDate >= dayStart && jobDate <= dayEnd;
      });

      const sent = dayJobs.reduce((sum, job) => sum + job.messagesSent, 0);
      const delivered = dayJobs.reduce(
        (sum, job) => sum + job.messagesDelivered,
        0
      );

      dailyStats.unshift({
        date: format(date, 'MMM d'),
        sent,
        delivered,
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      });
    }

    // Calculate template stats
    const templateStats: TemplateStats[] = Object.values(
      filteredJobs.reduce((acc: { [key: number]: TemplateStats }, job) => {
        if (!acc[job.templateId]) {
          acc[job.templateId] = {
            templateId: job.templateId,
            sent: 0,
            delivered: 0,
            deliveryRate: 0,
          };
        }
        acc[job.templateId].sent += job.messagesSent;
        acc[job.templateId].delivered += job.messagesDelivered;
        acc[job.templateId].deliveryRate =
          (acc[job.templateId].delivered / acc[job.templateId].sent) * 100;
        return acc;
      }, {})
    );

    return { dailyStats, templateStats };
  };

  // Extract the items array from the API response
  const jobItems = jobs ? (jobs as any).items : undefined;
  const { dailyStats, templateStats } = processJobsData(jobItems);

  return (
    <div className="space-y-8">
      {/* Date range selector */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={() => setDateRange('7d')}
          className={`px-3 py-1 rounded-md text-sm ${
            dateRange === '7d'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          7 Days
        </button>
        <button
          onClick={() => setDateRange('30d')}
          className={`px-3 py-1 rounded-md text-sm ${
            dateRange === '30d'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          30 Days
        </button>
        <button
          onClick={() => setDateRange('90d')}
          className={`px-3 py-1 rounded-md text-sm ${
            dateRange === '90d'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          90 Days
        </button>
      </div>

      {/* Daily metrics chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Daily Message Metrics
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sent"
                stroke="#4F46E5"
                name="Messages Sent"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="delivered"
                stroke="#059669"
                name="Messages Delivered"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="deliveryRate"
                stroke="#EAB308"
                name="Delivery Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Template performance chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Template Performance
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={templateStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="templateId" label="Template ID" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sent" fill="#4F46E5" name="Messages Sent" />
              <Bar
                dataKey="delivered"
                fill="#059669"
                name="Messages Delivered"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-500">Total Messages</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {dailyStats.reduce((sum, day) => sum + day.sent, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-500">
            Messages Delivered
          </h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {dailyStats
              .reduce((sum, day) => sum + day.delivered, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-500">
            Average Delivery Rate
          </h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {(
              (dailyStats.reduce((sum, day) => sum + day.deliveryRate, 0) /
                dailyStats.length) |
              0
            ).toFixed(1)}
            %
          </p>
        </div>
      </div>
    </div>
  );
}
