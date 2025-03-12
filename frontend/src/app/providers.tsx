'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000, // 5 seconds
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>{children}</MainLayout>
    </QueryClientProvider>
  );
}
