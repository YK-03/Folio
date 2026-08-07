'use client';

import { useEffect, useRef } from 'react';

type Blob = {
  color: string;
  rgb: string;
  x: number;
  y: number;
  radius: number;
  xPhase: number;
  yPhase: number;
  xRate: number;
  yRate: number;
};

const grain =
  "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.18'/></svg>\")";
const blobs: Blob[] = [
  {
    color: 'rgba(230, 176, 147, 1)',
    rgb: '230, 176, 147',
    x: 68.1,
    y: 46.03,
    radius: 41.1,
    xPhase: 1.37,
    yPhase: 2.41,
    xRate: 0.55,
    yRate: 0.43,
  },
  {
    color: 'rgba(163, 206, 255, 1)',
    rgb: '163, 206, 255',
    x: 25.17,
    y: 75.99,
    radius: 44.6,
    xPhase: 2.89,
    yPhase: 1.16,
    xRate: 0.55,
    yRate: 0.43,
  },
  {
    color: 'rgba(250, 249, 239, 1)',
    rgb: '250, 249, 239',
    x: 53.11,
    y: 12.71,
    radius: 66.65,
    xPhase: 0.52,
    yPhase: 3.07,
    xRate: 0.55,
    yRate: 0.43,
  },
];

function radialGradient(blob: Blob, spin: number, amount: number) {
  const x =
    blob.x + (Math.sin(spin * blob.xRate + blob.xPhase) - Math.sin(blob.xPhase)) * 14 * amount;
  const y =
    blob.y + (Math.sin(spin * blob.yRate + blob.yPhase) - Math.sin(blob.yPhase)) * 14 * amount;
  const { color, radius } = blob;
  return `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, rgba(${blob.rgb}, .844) ${radius * 0.25}%, rgba(${blob.rgb}, .5) ${radius * 0.5}%, rgba(${blob.rgb}, .156) ${radius * 0.75}%, rgba(${blob.rgb}, 0) ${radius}%)`;
}

function backgroundAt(seconds: number) {
  const ph = seconds * 0.86;
  const amt = 0.72;
  const dir = 1;
  const spin = ph * dir;
  return `${grain}, ${blobs.map((blob) => radialGradient(blob, spin, amt)).join(', ')}`;
}

export default function BloomField({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const paint = (now: number) => {
      element.style.backgroundImage = backgroundAt((now - start) / 1000);
    };
    paint(start);
    if (reduceMotion) return;
    let frame = 0;
    const animate = (now: number) => {
      paint(now);
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <div ref={ref} aria-hidden="true" className={`bloom-field ${className}`} />;
}
