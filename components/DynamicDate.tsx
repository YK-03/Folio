'use client';

import { useEffect, useState } from 'react';

export default function DynamicDate() {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).formatToParts(now);
    const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    setLabel(`${weekday}, ${day} ${month}`);
  }, []);

  return <span aria-label="Current date">{label || 'Today'}</span>;
}
