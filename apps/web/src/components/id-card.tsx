'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Profile } from '@sis/shared';

const INSTITUTION = process.env.NEXT_PUBLIC_INSTITUTION_NAME ?? 'Student Information System';

export function IdCard({ profile, className }: { profile: Profile; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, profile.id, { width: 72, margin: 1 });
  }, [profile.id]);

  const idLine =
    profile.role === 'student'
      ? profile.studentNumber
      : profile.role === 'faculty'
        ? profile.employeeId
        : profile.email;

  const subtitle =
    profile.role === 'student'
      ? `${profile.programCode ?? '—'} · Year ${profile.yearLevel ?? '—'}`
      : profile.department ?? 'Faculty';

  return (
    <div
      id="sis-id-card"
      className={cn(
        'relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-lg print:shadow-none',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-300">{INSTITUTION}</p>
          <Badge variant="secondary" className="mt-2 capitalize">
            {profile.role}
          </Badge>
        </div>
        <canvas ref={canvasRef} className="rounded bg-white p-1" aria-label="Profile QR code" />
      </div>
      <div className="mt-6 flex items-end gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-lg border-2 border-white/20 bg-slate-700">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-2xl font-semibold text-slate-300">
              {profile.firstName[0]}
              {profile.lastName[0]}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="text-sm text-slate-300">{idLine}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
