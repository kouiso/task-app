'use client'

import { SessionProvider } from 'next-auth/react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { api, trpcClientOptions } from '@/lib/trpc/client'
import { theme } from '@/lib/theme'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          // React Query v5の新設定
          staleTime: 5 * 60 * 1000, // 5分
          gcTime: 10 * 60 * 1000, // 10分 (旧cacheTime)
        },
        mutations: {
          // エラー時の再試行設定
          retry: (failureCount, error: any) => {
            // 4xx エラーは再試行しない
            if (error?.status >= 400 && error?.status < 500) {
              return false
            }
            return failureCount < 3
          },
        },
      },
    })
  )

  const [trpcClient] = useState(() =>
    api.createClient(trpcClientOptions)
  )

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
            {/* 開発環境でのみReact Query DevToolsを表示 */}
            {process.env.NODE_ENV === 'development' && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </ThemeProvider>
        </SessionProvider>
      </QueryClientProvider>
    </api.Provider>
  )
}
