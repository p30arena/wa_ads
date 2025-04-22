'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { ThemeProvider } from './theme-context';
import { LocaleProvider } from './locale-context';

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
      <ThemeProvider>
        <LocaleProvider>
          <MainLayout>{children}</MainLayout>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
