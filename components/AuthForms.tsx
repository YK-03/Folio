'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';

function AuthShell({
  children,
  title,
  eyebrow,
  footer,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow: string;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-7 sm:px-10">
      <Link href="/" className="font-display text-xl font-medium ">
        folio<span className="text-[#b35a35]">.</span>
      </Link>
      <div className="mx-auto flex max-w-md flex-col items-center pb-10 pt-24 text-center">
        <p className="mb-4 type-label-eyebrow text-accent">{eyebrow}</p>
        <h1 className="font-display type-display-section ">{title}</h1>
        {children}
        {footer && <p className="mt-8 type-label-ui text-ink-muted">{footer}</p>}
      </div>
    </main>
  );
}
const inputClass =
  'mt-2 w-full rounded-xl bg-[#f4f4f1] px-4 py-3.5 text-sm text-[#20211f] outline-none ring-[#b35a35] placeholder:text-[#a3a59f] focus-visible:ring-2';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok)
        throw new Error("We couldn't sign you in. Check your details and try again.");
      router.push('/notes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthShell eyebrow="Welcome back" title="Good to see you again.">
      <form onSubmit={submit} className="mt-10 w-full text-left">
        <label className="type-label-ui text-ink-muted" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
        <label className="mt-5 block type-label-ui text-ink-muted" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="Your password"
        />
        {error && (
          <p role="alert" className="mt-4 text-sm text-[#9b3f25]">
            {error}
          </p>
        )}
        <Button disabled={loading} className="button-origin mt-7 w-full" variant="primary">
          {loading ? 'Signing in...' : 'Log in to Folio'} <span className="ml-2">-&gt;</span>
        </Button>
      </form>
    </AuthShell>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok)
        throw new Error("We couldn't create your account. Please check your details.");
      localStorage.setItem('display_name', name.trim());
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthShell eyebrow="A place to begin" title="Start with a blank page.">
      <form onSubmit={submit} className="mt-10 w-full text-left">
        <label className="type-label-ui text-ink-muted" htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Alex Morgan"
        />
        <label className="mt-5 block type-label-ui text-ink-muted" htmlFor="signup-email">
          Email address
        </label>
        <input
          id="signup-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
        <label className="mt-5 block type-label-ui text-ink-muted" htmlFor="signup-password">
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="At least 8 characters"
        />
        {error && (
          <p role="alert" className="mt-4 text-sm text-[#9b3f25]">
            {error}
          </p>
        )}
        <Button disabled={loading} className="button-origin mt-7 w-full" variant="primary">
          {loading ? 'Creating your space...' : 'Create your notebook'}{' '}
          <span className="ml-2">-&gt;</span>
        </Button>
      </form>
    </AuthShell>
  );
}
