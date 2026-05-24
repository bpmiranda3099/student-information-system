'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authResponseSchema, type User } from '@sis/shared';
import { apiClient, ApiError } from '@/lib/api-client';
import { z } from 'zod';

const meResponseSchema = z.object({ user: authResponseSchema.shape.user });

async function fetchCurrentUser(): Promise<{ user: User } | null> {
  try {
    return await apiClient<{ user: User }>('/auth/me', { schema: meResponseSchema });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) {
      throw err;
    }

    try {
      return await apiClient<{ user: User }>('/auth/refresh', {
        method: 'POST',
        schema: meResponseSchema,
      });
    } catch {
      return null;
    }
  }
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      apiClient('/auth/login', { method: 'POST', body: credentials, schema: meResponseSchema }),
    onSuccess: (result) => {
      queryClient.setQueryData(['auth', 'me'], result);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiClient('/auth/logout', { method: 'POST' }),
    onSuccess: () => queryClient.setQueryData(['auth', 'me'], null),
  });

  return {
    user: data?.user,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
  };
}
