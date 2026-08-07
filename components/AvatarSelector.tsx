'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const avatars = [
  { id: 'spider-man', src: '/avatars/spider-man.jpg' },
  { id: 'batman', src: '/avatars/batman.jpg' },
  { id: 'jake', src: '/avatars/jake.jpg' },
  { id: 'random', src: '/avatars/random.jpg' },
] as const;

type Avatar = (typeof avatars)[number];

export default function AvatarSelector() {
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>(avatars[0]);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Load avatar from database
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const res = await fetch('/api/auth/avatar');

        if (!res.ok) return;

        const data = await res.json();

        const avatar = avatars.find((a) => a.id === data.avatarId);

        if (avatar) {
          setSelectedAvatar(avatar);
        }
      } catch {
        // Ignore
      }
    };

    void loadAvatar();
  }, []);

  // Outside click + Escape handling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleAvatarSelect = async (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    setIsOpen(false);

    try {
      await fetch('/api/auth/avatar', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatarId: avatar.id,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
  <div ref={rootRef} className="relative">
    <button
  type="button"
  onClick={() => setIsOpen((prev) => !prev)}
  className="group flex h-14 w-14 hover:w-[72px] items-center overflow-hidden rounded-full border border-[#e4e1dc] bg-[#f5f2ec] p-1 shadow-[0_2px_8px_rgba(31,27,22,0.08)] transition-all duration-200 hover:shadow-[0_4px_14px_rgba(31,27,22,0.12)]"
>
  <Image
    src={selectedAvatar.src}
    alt="User avatar"
    width={48}
    height={48}
    className="h-12 w-12 rounded-full object-cover"
    style={{ imageRendering: 'pixelated' }}
  />

  <svg
    className={`ml-1 h-4 w-4 text-[#7b756f] transition-all duration-200 ${
      isOpen
        ? 'opacity-100 rotate-180'
        : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-0'
    }`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
      clipRule="evenodd"
    />
  </svg>
</button>

    {isOpen && (
      <div className="absolute right-0 top-full z-50 mt-2 w-16 rounded-2xl border border-[#d9d9d4] bg-white p-2 shadow-[0_10px_20px_rgba(33,33,33,0.08)]">
        <div className="space-y-2">
          {avatars.map((avatar) => {
            const selected = avatar.id === selectedAvatar.id;

            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => void handleAvatarSelect(avatar)}
                className={`flex h-14 w-full items-center justify-center rounded-2xl transition duration-200 ${
                  selected
                    ? 'ring-2 ring-[#b35a35] ring-opacity-40'
                    : 'hover:bg-[#f7f5f2] hover:scale-[1.05]'
                }`}
              >
                <Image
                  src={avatar.src}
                  alt=""
                  aria-hidden
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              </button>
            );
          })}
        </div>
      </div>
    )}
  </div>
);
}
