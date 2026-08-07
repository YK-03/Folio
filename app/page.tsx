import Link from 'next/link';
import Reveal from '@/components/Reveal';
import BloomField from '@/components/BloomField';
import Button from '@/components/Button';
import DynamicDate from '@/components/DynamicDate';
import AmbientBackground from '@/components/AmbientBackground';
import HeaderAuth from '@/components/HeaderAuth';
import Image from 'next/image';

function TagIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="m5 17 11 10 11-11V6H16L5 17Z" />
      <circle cx="22" cy="11" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="14" cy="14" r="7" />
      <path d="m19 19 7 7" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="7" y="14" width="18" height="13" rx="2" />
      <path d="M11 14V9a5 5 0 0 1 10 0v5M16 19v4" />
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.62 1.22 3.26.93.1-.72.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.75 10.75 0 0 1 5.64 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.28-5.14 5.56.4.35.75 1.04.75 2.1v3.12c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.13 3.5A2.37 2.37 0 1 1 .4 3.5a2.37 2.37 0 0 1 4.73 0ZM.72 7.1h4.63V21H.72V7.1ZM8.25 7.1h4.44v1.9h.06c.62-1.17 2.13-2.4 4.38-2.4 4.68 0 5.55 3.08 5.55 7.08V21h-4.63v-6.47c0-1.54-.03-3.52-2.14-3.52-2.15 0-2.48 1.68-2.48 3.41V21H8.8V7.1h-.55Z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f8f6] px-6 py-7 sm:px-10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="font-display text-xl font-medium ">
          folio<span className="text-[#c4562e]">.</span>
        </Link>
        <HeaderAuth />
      </nav>
      <section className="hero-atmosphere mx-auto grid max-w-6xl items-center gap-16 pb-20 pt-24 lg:grid-cols-[1.1fr_.9fr] lg:pt-28">
        <div>
          <p className="hero-reveal hero-eyebrow mb-6 text-xs font-medium  text-accent-dark">
            A private space for your thoughts
          </p>
          <h1 className="hero-reveal hero-headline max-w-2xl font-display text-display-hero">
            Make room for
            <br />
            <em className="type-accent">good ideas.</em>
          </h1>
          <p className="hero-reveal hero-subhead mt-8 max-w-md type-body-large">
            Folio is a calm, beautifully simple home for the things you want to remember.
          </p>
          <Link
            href="/notes"
            className="hero-reveal hero-cta mt-9 inline-flex items-center rounded-full bg-[#c4562e] px-6 py-3.5 text-sm font-medium text-white shadow-[0_8px_18px_rgba(196,86,46,.2)] transition hover:bg-[#9f4224]"
          >
            Open your notebook <span className="ml-3">→</span>
          </Link>
        </div>
        <div className="hero-mockup relative mx-auto w-full max-w-md">
          <div
            className="absolute -bottom-4 -left-2 right-5 top-4 rotate-[-3deg] rounded-[1.5rem] bg-[#eee1d6] shadow-[0_16px_30px_rgba(128,72,45,.1)]"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-2 left-2 right-[-.4rem] top-2 rotate-[5deg] rounded-[1.5rem] bg-[#f3e9e0] shadow-[0_14px_25px_rgba(128,72,45,.08)]"
            aria-hidden="true"
          />
          <article className="relative rotate-[2deg] rounded-[1.5rem] bg-white p-8 shadow-[0_24px_55px_rgba(116,63,39,.2),0_4px_10px_rgba(32,33,31,.08)]">
            <div className="mb-14 flex items-center justify-between text-xs text-ink-faint">
              <DynamicDate />
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f5e8e1] px-2.5 py-1 text-[10px] font-medium  text-accent-dark">
                #writing
              </span>
              <span className="rounded-full bg-[#f5e8e1] px-2.5 py-1 text-[10px] font-medium  text-accent-dark">
                #ideas
              </span>
            </div>
            <h2 className="font-display text-display-section">
              The best ideas
              <br />
              need somewhere
              <br />
              <span className="font-normal text-accent">quiet to land.</span>
            </h2>
            <div className="mt-14 border-t border-[#e7e8e3] pt-4 text-xs text-ink-faint">
              A note to come back to
            </div>
          </article>
        </div>
      </section>

      <Reveal className="mx-auto max-w-6xl border-t border-[#e7e8e3] py-20 sm:py-24">
        <div className="grid gap-14 sm:grid-cols-3 sm:gap-10">
          <div>
            <div className="mb-5 text-[#c4562e]">
              <TagIcon />
            </div>
            <h2 className="font-display text-display-card">Hold the moment</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
              Thoughts, photos, and quiet memories belong here.
            </p>
          </div>
          <div>
            <div className="mb-5 text-[#c4562e]">
              <SearchIcon />
            </div>
            <h2 className="font-display text-display-card">Find them again</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
              Everything stays close, even after time moves on.
            </p>
          </div>
          <div>
            <div className="mb-5 text-[#c4562e]">
              <LockIcon />
            </div>
            <h2 className="font-display text-display-card">Always yours</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
              Private by default, like a personal notebook should be.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal className="mx-auto max-w-6xl pb-24 sm:pb-32">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-3 text-xs font-medium  text-accent-dark">A clearer view</p>
            <h2 className="font-display text-display-section">Everything in its place.</h2>
          </div>
        </div>
        <div className="relative -mx-4 overflow-hidden rounded-[2.5rem] bg-[#faf9ef] p-8 shadow-[0_18px_50px_rgba(32,33,31,.1),0_2px_5px_rgba(32,33,31,.04)] sm:-mx-10 sm:p-12">
          <BloomField className="absolute inset-0 opacity-100" />
          <div className="relative z-10 overflow-hidden rounded-[1.5rem] bg-white p-4 sm:p-7">
            <div className="mb-7 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#dfc5af]" />
                <span className="font-display text-lg ">
                  folio<span className="text-[#c4562e]">.</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center">
                  <Image
                    src="/avatars/spider-man.jpg"
                    alt="User avatar"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-[#efefeb] p-3">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="h-10 flex-1 rounded-lg bg-white px-4 py-3 text-xs text-ink-faint">
                  Search
                </div>
                <div className="rounded-lg bg-white px-4 py-3 text-xs text-ink-muted">
                  Sort&nbsp; <span className="font-medium text-[#20211f]">Newest first</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="rounded-full bg-[#c4562e] px-3 py-1.5 text-[10px] font-medium text-white">
                  All notes
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-ink-muted">
                  Ideas
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-ink-muted">
                  Reading
                </span>
                <span className="hidden rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-ink-muted sm:inline-block">
                  Work
                </span>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <PreviewNote
                title="Paying attention"
                copy="Notice the small details first. They usually tell the real story."
                tags="#Ideas  #Reading"
                date="Aug 06, 2026"
              />
              <PreviewNote
                title="Things I make time for"
                copy="Long walks, a good question, and the first coffee of the day."
                tags="#Personal"
                date="Aug 04, 2026"
              />
              <PreviewNote
                title="A simple research habit"
                copy="Start with the question. Write down what you learn as you go."
                tags="#Work  #Ideas"
                date="Jul 29, 2026"
              />
              <PreviewNote
                title="Books I want to read"
                copy="A short list of books that slow me down and hold my attention."
                tags="#Reading"
                date="Jul 18, 2026"
              />
            </div>
          </div>
        </div>
        <p className="mt-6 text-center font-display text-sm italic text-ink-subtle">
          Your notes, organized without the effort.
        </p>
      </Reveal>

      <Reveal className="relative -mx-6 w-[calc(100%+3rem)] overflow-hidden px-6 py-24 text-center sm:-mx-10 sm:w-[calc(100%+5rem)] sm:px-12 sm:py-28">
        <AmbientBackground />
        <div className="relative z-20 mx-auto max-w-[620px]">
          <p className="type-display-section">
            Most note apps ask you to organize. Folio asks you to think.
          </p>
          <p className="mx-auto mt-5 max-w-[46ch] type-body-large">
            A quiet place to write things down, tag them if you want, and trust they&apos;ll be
            there when you need them again.
          </p>
        </div>
      </Reveal>

      <footer className="mx-auto max-w-6xl border-t border-[#e1e2dc] py-10">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-display text-lg font-medium ">
            folio<span className="text-[#c4562e]">.</span>
          </Link>
          <div className="flex flex-col gap-2 sm:items-end">
            <span className="type-meta">Connect with Yash Kaushik</span>
            <div className="flex items-center gap-4 text-ink-muted">
              <a
                href="https://github.com/YK-03"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub profile"
                className="transition hover:text-[#c4562e]"
              >
                <GitHubIcon />
              </a>
              <a
                href="https://www.linkedin.com/in/yash005kaushik/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn profile"
                className="transition hover:text-[#c4562e]"
              >
                <LinkedInIcon />
              </a>
            </div>
          </div>
        </div>
        <p className="mt-7 text-xs text-ink-faint">
          Folio - a quieter place for ideas. <span className="ml-2">Copyright 2026</span>
        </p>
      </footer>
    </main>
  );
}

function PreviewNote({
  title,
  copy,
  tags,
  date,
}: {
  title: string;
  copy: string;
  tags: string;
  date: string;
}) {
  return (
    <article className="rounded-xl bg-[#fdfdfb] p-5 shadow-[0_1px_3px_rgba(0,0,0,.06),0_1px_2px_rgba(0,0,0,.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-3 text-[10px] font-medium  text-accent-dark">{tags}</p>
          <h3 className="font-display text-display-card">{title}</h3>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-muted">{copy}</p>
      <p className="mt-5 text-[10px] text-ink-faint">{date}</p>
    </article>
  );
}
