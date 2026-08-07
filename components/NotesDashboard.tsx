'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import AvatarSelector from '@/components/AvatarSelector';
import RichTextEditor from '@/components/RichTextEditor';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tags: string[];
};

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

export default function NotesDashboard() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [dbTags, setDbTags] = useState<{ id: string; name: string }[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All notes');
  const [sort, setSort] = useState('Newest first');
  const [showForm, setShowForm] = useState(false);

  // Create Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Edit Form State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  // Dropdown UI state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tags from API
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setDbTags(data);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  }, [router]);

  useEffect(() => {
    setDisplayName(localStorage.getItem('display_name') || '');
    fetchTags();
  }, [fetchTags]);

  // Fetch notes from API
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      if (activeTag !== 'All notes') params.set('tag', activeTag);

      const sortVal =
        sort === 'Newest first' ? 'newest' : sort === 'Oldest first' ? 'oldest' : 'newest';
      params.set('sort', sortVal);

      const res = await fetch(`/api/notes?${params.toString()}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data === 'object' && data !== null && 'error' in data
            ? (data as { error?: string }).error
            : undefined;
        throw new Error(message || 'Failed to fetch notes');
      }
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query, activeTag, sort, router]);

  // Fetch notes whenever filter/sort query changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    localStorage.removeItem('display_name');
    router.push('/login');
  }

  // Client side sorting for A-Z
  const filteredNotes = useMemo(() => {
    const notesCopy = [...notes];
    if (sort === 'A-Z') {
      return notesCopy.sort((a, b) => a.title.localeCompare(b.title));
    }
    return notesCopy;
  }, [notes, sort]);

  // Create Note
  async function addNote() {
    if (!title.trim()) return;
    setError(null);
    const tagNames = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: sanitizeHtml(content),
          tagNames,
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data === 'object' && data !== null && 'error' in data
            ? (data as { error?: string }).error
            : undefined;
        throw new Error(message || 'Failed to create note');
      }

      setTitle('');
      setContent('');
      setTagsInput('');
      setShowForm(false);

      await Promise.all([fetchNotes(), fetchTags()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create note';
      setError(message);
    }
  }

  // Start Editing
  function startEditing(note: Note) {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTags(note.tags.join(', '));
    setOpenMenuId(null);
  }

  // Update Note
  async function updateNote(noteId: string) {
    if (!editTitle.trim()) return;
    setError(null);
    const tagNames = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: sanitizeHtml(editContent),
          tagNames,
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data === 'object' && data !== null && 'error' in data
            ? (data as { error?: string }).error
            : undefined;
        throw new Error(message || 'Failed to update note');
      }

      setEditingNoteId(null);
      await Promise.all([fetchNotes(), fetchTags()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update note';
      setError(message);
    }
  }

  // Delete Note
  async function deleteNote(noteId: string) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    setError(null);
    setOpenMenuId(null);

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data === 'object' && data !== null && 'error' in data
            ? (data as { error?: string }).error
            : undefined;
        throw new Error(message || 'Failed to delete note');
      }

      await Promise.all([fetchNotes(), fetchTags()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete note';
      setError(message);
    }
  }

  // Helper to format date string
  function formatDate(dateString: string) {
    try {
      const d = new Date(dateString);

      if (isNaN(d.getTime())) return 'Just now';

      const weekday = d.toLocaleDateString('en-US', {
        weekday: 'long',
      });

      const date = d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });

      return `${weekday} · ${date}`;
    } catch {
      return 'Just now';
    }
  }

  const allTags = ['All notes', ...dbTags.map((t) => t.name)];

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <header className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-7 sm:px-10">
        <a href="/" className="font-display text-xl font-medium ">
          folio<span className="text-[#b35a35]">.</span>
        </a>
        <div className="flex items-center gap-4">
          <Button onClick={signOut} variant="ghost" className="h-9 min-h-9 px-2 text-xs">
            Sign out
          </Button>
          <AvatarSelector />
        </div>
      </header>
      <div className="mx-auto max-w-[800px] px-6 pb-20 pt-14 sm:px-10 sm:pt-20">
        <div className="mb-10 flex items-end justify-between gap-5">
          <div>
            <p className="mb-3 type-label-eyebrow text-accent">Your notebook</p>
            <h1 className="font-display type-display-section">All your notes.</h1>
            <p className="mt-3 text-[15px] text-ink-muted">{notes.length} notes</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="hidden shrink-0 sm:flex">
            <PlusIcon /> New note
          </Button>
        </div>
        {showForm && (
          <section className="mb-8 overflow-hidden rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.06),0_1px_2px_rgba(0,0,0,.04)]">
            <label className="sr-only" htmlFor="new-title">
              Note title
            </label>
            <input
              id="new-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this note a title"
              className="w-full border-0 bg-transparent font-display font-display text-display-section outline-none placeholder:text-[#b9bbb5]"
            />
            <label className="sr-only" htmlFor="new-content">
              Note content
            </label>
            <RichTextEditor
              id="new-content"
              value={content}
              onChange={setContent}
              placeholder="Start writing..."
              className="mt-4"
            />
            <label className="sr-only" htmlFor="new-tags">
              Tags
            </label>
            <input
              id="new-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags (comma separated, e.g. Ideas, Reading)"
              className="mt-4 w-full border-b border-[#e7e8e3] bg-transparent pb-2 text-xs outline-none placeholder:text-[#b9bbb5]"
            />
            <div className="flex justify-end gap-3 border-t border-[#e7e8e3] pt-4">
              <Button onClick={() => setShowForm(false)} variant="ghost">
                Cancel
              </Button>
              <Button onClick={addNote} variant="primary">
                Save note
              </Button>
            </div>
          </section>
        )}
        <fieldset className="rounded-2xl bg-[#efefeb] p-3 sm:p-4">
          <legend className="sr-only">Note filters</legend>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl bg-white px-3.5 text-ink-muted shadow-[0_1px_2px_rgba(0,0,0,.03)]">
              <SearchIcon />
              <span className="sr-only">Search notes</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes"
                className="w-full bg-transparent text-sm text-[#20211f] outline-none placeholder:text-[#a3a59f]"
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3.5 type-label-ui text-ink-muted">
              Sort<span className="sr-only">Sort notes</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-transparent font-medium text-[#20211f] outline-none"
              >
                <option>Newest first</option>
                <option>Oldest first</option>
                <option>A-Z</option>
              </select>
            </label>
          </div>
          <div
            className="mt-3 flex gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label="Filter by tag"
          >
            {allTags.map((tag) => (
              <button
                key={tag}
                aria-pressed={activeTag === tag}
                onClick={() => setActiveTag(tag)}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 type-meta font-medium transition ${activeTag === tag ? 'bg-[#b35a35] text-white' : 'bg-white text-ink-muted hover:text-[#20211f]'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mb-5 mt-9 flex items-center justify-between">
          <h2 className="font-display type-display-section">Recent notes</h2>
          <span className="type-meta">{filteredNotes.length} shown</span>
        </div>

        {error && <p className="mb-4 text-sm text-red-600 font-medium">{error}</p>}

        {loading ? (
          <div className="py-14 text-center text-ink-muted text-sm">Loading notes...</div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <div key={note.id}>
                {editingNoteId === note.id ? (
                  <section className="overflow-hidden rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.06),0_1px_2px_rgba(0,0,0,.04)]">
                    <label className="sr-only" htmlFor={`edit-title-${note.id}`}>
                      Note title
                    </label>
                    <input
                      id={`edit-title-${note.id}`}
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Give this note a title"
                      className="w-full border-0 bg-transparent font-display text-display-section outline-none placeholder:text-[#b9bbb5]"
                    />
                    <label className="sr-only" htmlFor={`edit-content-${note.id}`}>
                      Note content
                    </label>
                    <RichTextEditor
                      id={`edit-content-${note.id}`}
                      value={editContent}
                      onChange={setEditContent}
                      placeholder="Start writing..."
                      className="mt-4"
                    />
                    <label className="sr-only" htmlFor={`edit-tags-${note.id}`}>
                      Tags
                    </label>
                    <input
                      id={`edit-tags-${note.id}`}
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tags (comma separated, e.g. Ideas, Reading)"
                      className="mt-4 w-full border-b border-[#e7e8e3] bg-transparent pb-2 text-xs outline-none placeholder:text-[#b9bbb5]"
                    />
                    <div className="flex justify-end gap-3 pt-4">
                      <Button onClick={() => setEditingNoteId(null)} variant="ghost">
                        Cancel
                      </Button>
                      <Button onClick={() => updateNote(note.id)} variant="primary">
                        Save changes
                      </Button>
                    </div>
                  </section>
                ) : (
                  <article className="note-stagger group relative rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.06),0_1px_2px_rgba(0,0,0,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(32,33,31,.08)]">
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {note.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-[#f5e8e1] px-2.5 py-1 text-[10px] font-medium text-accent-dark"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <h3 className="type-display-card">{note.title}</h3>
                        <div
                          className="mt-2 max-w-2xl type-body rich-note-content"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }}
                        />
                      </div>
                      <div className="relative shrink-0">
                        <Button
                          aria-label={`More options for ${note.title}`}
                          variant="ghost"
                          className="h-9 min-h-9 w-9 p-0 text-ink-faint hover:text-[#20211f]"
                          onClick={() => setOpenMenuId(openMenuId === note.id ? null : note.id)}
                        >
                          <MoreIcon />
                        </Button>
                        {openMenuId === note.id && (
                          <div className="absolute right-0 top-10 z-30 w-32 rounded-xl bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5">
                            <button
                              onClick={() => startEditing(note)}
                              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs hover:bg-[#f5f5f3] text-[#20211f]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-[#fff5f5]"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-5 type-meta">{formatDate(note.createdAt)}</p>
                  </article>
                )}
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-[0_1px_3px_rgba(0,0,0,.06)]">
                <p className="font-display type-display-section">Nothing here yet.</p>
                <p className="mt-2 type-label-ui text-ink-muted">
                  Try a different search or create a new note.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <Button
        aria-label="Create a new note"
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 h-14 w-14 min-h-14 rounded-full p-0 sm:hidden"
      >
        <PlusIcon />
      </Button>
    </main>
  );
}
