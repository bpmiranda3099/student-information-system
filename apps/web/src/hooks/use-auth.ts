'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authResponseSchema, type User } from '@sis/shared';
import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

const meResponseSchema = z.object({ user: authResponseSchema.shape.user });

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient<{ user: User }>('/auth/me', { schema: meResponseSchema }),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      apiClient('/auth/login', { method: 'POST', body: credentials, schema: meResponseSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth'] }),
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
