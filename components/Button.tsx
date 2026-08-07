'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
};

export default function Button({
  children,
  className = '',
  href,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const isOrigin = className.includes('button-origin');
  const [hovered, setHovered] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const classes = `folio-button folio-button--${variant} ${className}`.trim();
  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!isOrigin) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };
  const content = (
    <>
      <span className="folio-button__surface" aria-hidden="true" />
      <span className="folio-button__border" aria-hidden="true" />
      {isOrigin && (
        <span
          className="button-origin__circle"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: `translate(-50%, -50%) scale(${hovered ? 1 : 0})`,
          }}
          aria-hidden="true"
        />
      )}
      <span className="folio-button__content">{children}</span>
    </>
  );
  const interactionProps = isOrigin
    ? {
        onPointerMove: handlePointerMove,
        onPointerEnter: () => setHovered(true),
        onPointerLeave: () => setHovered(false),
      }
    : {};

  if (href)
    return (
      <Link href={href} className={classes} {...interactionProps}>
        {content}
      </Link>
    );
  return (
    <button {...props} {...interactionProps} className={classes}>
      {content}
    </button>
  );
}
