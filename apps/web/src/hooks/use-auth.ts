'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authResponseSchema, type User } from '@sis/shared';
import { apiClient, ApiError } from '@/lib/api-client';
import { getAccessToken, setAccessToken } from '@/lib/auth-session';
import { z } from 'zod';

const meResponseSchema = z.object({ user: authResponseSchema.shape.user });
const loginResponseSchema = authResponseSchema.extend({
  accessToken: z.string(),
});

async function fetchCurrentUser(): Promise<{ user: User } | null> {
  if (!getAccessToken()) {
    return null;
  }

  try {
    return await apiClient<{ user: User }>('/auth/me', { schema: meResponseSchema });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      setAccessToken(null);
      return null;
    }
    throw err;
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
      apiClient<z.infer<typeof loginResponseSchema>>('/auth/login', {
        method: 'POST',
        body: credentials,
        schema: loginResponseSchema,
      }),
    onSuccess: (result) => {
      setAccessToken(result.accessToken);
      queryClient.setQueryData(['auth', 'me'], { user: result.user });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiClient('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      setAccessToken(null);
      queryClient.setQueryData(['auth', 'me'], null);
    },
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
