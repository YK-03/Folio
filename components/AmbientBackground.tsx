'use client';

export default function AmbientBackground({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`ambient-background ${className}`}>
      <span className="ambient-blob ambient-blob--one" />
      <span className="ambient-blob ambient-blob--two" />
      <span className="ambient-blob ambient-blob--three" />
      <span className="ambient-overlay" />
    </div>
  );
}
