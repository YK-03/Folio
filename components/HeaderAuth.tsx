'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import Button from '@/components/Button';
import AvatarSelector from '@/components/AvatarSelector';

export default function HeaderAuth() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/avatar', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!mounted) return;

        setAuthenticated(res.ok);
      } catch {
        if (!mounted) return;
        setAuthenticated(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center">
        <div className="h-11 w-11 rounded-full bg-[#f2efe9] animate-pulse" />
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className="flex items-center">
        <AvatarSelector />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Button href="/login" variant="outline">
        Log in
      </Button>

      <Link
        href="/signup"
        className="rounded-full border border-[#20211f] px-4 py-2 font-medium text-[#20211f] transition hover:bg-[#20211f] hover:text-white"
      >
        Start writing
      </Link>
    </div>
  );
}