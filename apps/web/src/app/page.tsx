import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ids } from '@/lib/element-ids';

export default function HomePage() {
  return (
    <div id={ids.home.page} className="min-h-screen bg-background">
      <header id={ids.home.header} className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <span className="text-sm font-semibold tracking-tight">Student Information System</span>
          <div className="flex gap-2">
            <Button id={ids.home.signInLink} variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>
      <main id={ids.app.main} className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <div className="space-y-6">
          <h1 id={ids.home.title} className="text-2xl font-semibold tracking-tight md:text-3xl">
            Manage enrollment, grades, and attendance in one place
          </h1>
          <p id={ids.home.description} className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            A minimalist student information system for colleges — enrollment, flexible grading,
            attendance tracking, faculty syllabus management, and AI-powered lesson tailoring.
          </p>
          <Button id={ids.home.getStartedLink} asChild>
            <Link href="/login">Get started</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
