"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

/**
 * Ilova bo'ylab yagona client-side provider.
 * `layout.tsx` server komponent bo'lib qoladi — faqat shu qism client'da ishlaydi.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </QueryClientProvider>
  );
}
