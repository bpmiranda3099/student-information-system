'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile } from '@sis/shared';

const INSTITUTION = process.env.NEXT_PUBLIC_INSTITUTION_NAME ?? 'Student Information System';

const CARD_ASPECT = 'aspect-[86/54]';
const SECURITY_PATTERN =
  'pointer-events-none absolute inset-0 opacity-[0.35] bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,currentColor_3px,currentColor_4px)] bg-[length:6px_6px] text-foreground';

export type IdCardPayload = {
  roleLabel: string;
  idLine: string;
  subtitle: string;
  qrPayload: string;
  validThru: string;
  fullName: string;
  ariaLabel: string;
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function getBarcodeWidths(payload: string, count = 52): number[] {
  const widths: number[] = [];
  let seed = hashString(payload);
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    widths.push((seed % 3) + 1);
  }
  return widths;
}

function getValidThru(): string {
  const now = new Date();
  const year = now.getMonth() >= 4 ? now.getFullYear() + 1 : now.getFullYear();
  return `May ${year}`;
}

export function getIdCardPayload(profile: Profile): IdCardPayload {
  const fullName = `${profile.firstName} ${profile.lastName}`;

  let roleLabel: string;
  let idLine: string;
  let subtitle: string;
  let qrPayload: string;

  if (profile.role === 'student') {
    roleLabel = 'STUDENT ID';
    idLine = profile.studentNumber ?? '—';
    const program = profile.programName ?? profile.programCode ?? '—';
    subtitle = `${program} · Year ${profile.yearLevel ?? '—'}`;
    qrPayload = profile.studentNumber
      ? `SIS:STU:${profile.studentNumber}`
      : `SIS:UID:${profile.id}`;
  } else if (profile.role === 'faculty') {
    roleLabel = 'FACULTY ID';
    idLine = profile.employeeId ?? profile.email;
    subtitle = profile.department ?? 'Faculty';
    qrPayload = profile.employeeId
      ? `SIS:FAC:${profile.employeeId}`
      : `SIS:USR:${profile.id}`;
  } else {
    roleLabel = 'IDENTIFICATION';
    idLine = profile.email;
    subtitle = profile.role.replace(/_/g, ' ');
    qrPayload = `SIS:USR:${profile.id}`;
  }

  return {
    roleLabel,
    idLine,
    subtitle,
    qrPayload,
    validThru: getValidThru(),
    fullName,
    ariaLabel: `${roleLabel} for ${fullName}, ID ${idLine}`,
  };
}

function BarcodeStrip({ payload }: { payload: string }) {
  const widths = useMemo(() => getBarcodeWidths(payload), [payload]);
  return (
    <div
      className="flex h-9 w-full max-w-[220px] items-stretch justify-center gap-px overflow-hidden rounded-sm bg-card px-1 py-0.5"
      aria-hidden
    >
      {widths.map((w, i) => (
        <div key={i} className="h-full shrink-0 bg-foreground" style={{ width: w }} />
      ))}
    </div>
  );
}

function IdPhoto({ profile }: { profile: Profile }) {
  return (
    <div className="aspect-[3/4] w-[72px] shrink-0 overflow-hidden rounded-sm bg-muted ring-2 ring-border">
      {profile.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.photoUrl} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center bg-muted text-lg font-semibold text-muted-foreground">
          {profile.firstName[0]}
          {profile.lastName[0]}
        </div>
      )}
    </div>
  );
}

function InstitutionBand({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="relative flex items-center justify-between gap-2 bg-primary px-3 py-1.5 text-primary-foreground">
      <div className="flex min-w-0 items-center gap-2">
        <Shield className="size-4 shrink-0 opacity-90" aria-hidden />
        <p className="truncate text-[9px] font-medium uppercase tracking-widest leading-tight">
          {INSTITUTION}
        </p>
      </div>
      <span className="shrink-0 text-[8px] font-semibold tracking-wider opacity-90">
        {roleLabel}
      </span>
    </div>
  );
}

function MicrotextStrip() {
  return (
    <p
      className="border-t border-border/60 px-2 py-0.5 text-center text-[6px] uppercase tracking-[0.2em] text-muted-foreground/80"
      aria-hidden
    >
      {INSTITUTION} · OFFICIAL USE ONLY · NOT FOR TRANSFER
    </p>
  );
}

function IdCardFace({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-md',
        CARD_ASPECT,
        '[backface-visibility:hidden]',
        className,
      )}
    >
      <div className={SECURITY_PATTERN} />
      {children}
    </div>
  );
}

function IdCardFront({ profile, payload }: { profile: Profile; payload: IdCardPayload }) {
  return (
    <IdCardFace>
      <InstitutionBand roleLabel={payload.roleLabel} />
      <div className="relative flex gap-3 p-3">
        <IdPhoto profile={profile} />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <p className="truncate text-sm font-semibold leading-tight">{payload.fullName}</p>
          <p className="font-mono text-base font-semibold tabular-nums tracking-tight">
            {payload.idLine}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{payload.subtitle}</p>
          <p className="mt-1 text-[9px] text-muted-foreground">
            Valid thru <span className="font-medium text-foreground">{payload.validThru}</span>
          </p>
        </div>
      </div>
      <MicrotextStrip />
    </IdCardFace>
  );
}

function IdCardBack({
  profile,
  payload,
  canvasRef,
  flipFace = false,
}: {
  profile: Profile;
  payload: IdCardPayload;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  flipFace?: boolean;
}) {
  return (
    <IdCardFace className={flipFace ? '[transform:rotateY(180deg)]' : undefined}>
      <div className="relative flex h-full flex-col items-center justify-between p-3">
        <p className="text-center text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
          {INSTITUTION}
        </p>
        <div className="flex flex-col items-center gap-2">
          <canvas
            ref={canvasRef}
            className="rounded-sm bg-white p-1"
            aria-label="ID verification QR code"
          />
          <BarcodeStrip payload={payload.qrPayload} />
        </div>
        <div className="w-full space-y-0.5 text-center">
          <p className="text-[8px] text-muted-foreground">
            Scan to verify at {INSTITUTION}
          </p>
          <p className="truncate text-[7px] text-muted-foreground/80">
            Issued by SIS · {payload.qrPayload}
          </p>
          <p className="truncate text-[7px] text-muted-foreground/80">{profile.email}</p>
        </div>
      </div>
    </IdCardFace>
  );
}

export function IdCard({
  profile,
  className,
  flipped: flippedProp,
  onFlippedChange,
}: {
  profile: Profile;
  className?: string;
  flipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
}) {
  const [flippedInternal, setFlippedInternal] = useState(false);
  const flipped = flippedProp ?? flippedInternal;
  const setFlipped = onFlippedChange ?? setFlippedInternal;

  const screenCanvasRef = useRef<HTMLCanvasElement>(null);
  const printCanvasRef = useRef<HTMLCanvasElement>(null);
  const payload = useMemo(() => getIdCardPayload(profile), [profile]);

  useEffect(() => {
    const opts = { width: 104, margin: 1 };
    if (screenCanvasRef.current) {
      void QRCode.toCanvas(screenCanvasRef.current, payload.qrPayload, opts);
    }
    if (printCanvasRef.current) {
      void QRCode.toCanvas(printCanvasRef.current, payload.qrPayload, opts);
    }
  }, [payload.qrPayload]);

  const toggleFlip = useCallback(() => {
    setFlipped(!flipped);
  }, [flipped, setFlipped]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFlip();
      }
    },
    [toggleFlip],
  );

  return (
    <div id="sis-id-card" className={cn('w-full max-w-[340px]', className)}>
      {/* Screen: 3D flip */}
      <div
        className="print:hidden"
        role="button"
        tabIndex={0}
        aria-label={payload.ariaLabel}
        aria-pressed={flipped}
        onClick={toggleFlip}
        onKeyDown={handleKeyDown}
        style={{ perspective: '1000px' }}
      >
        <div
          className={cn('relative w-full transition-transform duration-500', CARD_ASPECT)}
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div aria-hidden={flipped}>
            <IdCardFront profile={profile} payload={payload} />
          </div>
          <div aria-hidden={!flipped}>
            <IdCardBack
              profile={profile}
              payload={payload}
              canvasRef={screenCanvasRef}
              flipFace
            />
          </div>
        </div>
      </div>

      {/* Print: front + back stacked */}
      <div className="hidden flex-col gap-6 print:flex">
        <div className={cn('relative w-full', CARD_ASPECT)}>
          <IdCardFront profile={profile} payload={payload} />
        </div>
        <div className={cn('relative w-full', CARD_ASPECT)}>
          <IdCardBack profile={profile} payload={payload} canvasRef={printCanvasRef} />
        </div>
      </div>
    </div>
  );
}
