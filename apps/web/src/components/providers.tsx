'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { ids } from '@/lib/element-ids';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <div id={ids.app.root}>{children}</div>
        <div id={ids.app.toast}>
          <Toaster position="top-right" />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
