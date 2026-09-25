import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import { queryClient } from '@/lib/queryClient';
import { router } from '@/routes/router';
import { Toaster } from '@/components/ui/sonner';

// Side-effect import: initialises i18next before the first render, so the first
// paint is already in the right language rather than flashing English.
import '@/lib/i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {/*
          Bottom-centre rather than web/'s top-right: on a phone the top-right
          corner is where the sticky header's menu button sits, and a toast
          there covers it.
        */}
        <Toaster richColors position="bottom-center" closeButton />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);
