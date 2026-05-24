'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { ids } from '@/lib/element-ids';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <div id={ids.login.page} className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card id={ids.login.card} className="w-full max-w-sm">
        <CardHeader>
          <CardTitle id={ids.login.title}>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form id={ids.login.form} onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor={ids.login.email}>Email</Label>
              <Input
                id={ids.login.email}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={ids.login.password}>Password</Label>
              <Input
                id={ids.login.password}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex justify-end">
              <Button id={ids.login.submit} type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? 'Signing in…' : 'Sign in'}
              </Button>
            </div>
          </form>
          <p id={ids.login.demoHint} className="mt-4 text-xs text-muted-foreground">
            Demo: student@sis.edu / faculty@sis.edu / admin@sis.edu — Password123!
          </p>
          <Link
            id={ids.login.registerLink}
            href="/register"
            className="mt-4 block text-xs text-muted-foreground hover:underline"
          >
            Create enrollee account
          </Link>
          <Link
            id={ids.login.backLink}
            href="/"
            className="mt-2 block text-xs text-muted-foreground hover:underline"
          >
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
