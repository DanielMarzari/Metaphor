'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Tag, FileText, TrendingUp, Clock, Search, ChevronRight, StickyNote, Pin, Plus, X, Edit3, Save, Hash } from 'lucide-react';
import Link from 'next/link';

interface ProjectNote {
  id: number;
  title: string;
  content: string;
  note_type: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}

const NOTE_TYPES = ['general', 'methodology', 'philosophy', 'todo'] as const;

const NOTE_TYPE_COLORS: Record<string, string> = {
  general: 'var(--muted)',
  methodology: 'var(--active)',
  philosophy: 'var(--accent)',
  todo: 'var(--hypothesis)',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', note_type: 'general' as string });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ title: '', content: '', note_type: 'general' as string });

  const fetchNotes = useCallback(() => {
    fetch('/api/project-notes').then(r => r.json()).then(setNotes);
  }, []);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
    fetchNotes();
  }, [fetchNotes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const refMatch = searchQuery.match(/^(\d?\s?[A-Za-z]+)\s+(\d+)(?::(\d+))?$/);
      if (refMatch) {
        const book = refMatch[1].trim().toLowerCase().replace(/\s+/g, '');
        const chapter = refMatch[2];
        window.location.href = `/browse/${book}/${chapter}`;
      } else {
        window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
      }
    }
  };

  const handleAddNote = async () => {
    if (!newNote.title.trim() && !newNote.content.trim()) return;
    await fetch('/api/project-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote),
    });
    setNewNote({ title: '', content: '', note_type: 'general' });
    setShowAddNote(false);
    fetchNotes();
  };

  const handleDeleteNote = async (id: number) => {
    await fetch(`/api/project-notes/${id}`, { method: 'DELETE' });
    fetchNotes();
  };

  const handleTogglePin = async (note: ProjectNote) => {
    await fetch(`/api/project-notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    fetchNotes();
  };

  const startEditing = (note: ProjectNote) => {
    setEditingId(note.id);
    setEditData({ title: note.title, content: note.content, note_type: note.note_type });
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    await fetch(`/api/project-notes/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    setEditingId(null);
    fetchNotes();
  };

  const confidence = stats?.byConfidence?.reduce((acc: any, c: any) => ({ ...acc, [c.confidence]: c.count }), {}) || {};

  const completionPct = stats?.totalVerses
    ? Math.round((stats.completedVerses / stats.totalVerses) * 10000) / 100
    : 0;

  const wordAnnotationPct = stats?.totalWords
    ? Math.round((stats.wordsWithAnnotatedLemma / stats.totalWords) * 10000) / 100
    : 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          <h1 className="text-xl font-bold">Metaphor</h1>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/browse" className="hover:underline" style={{ color: 'var(--primary)' }}>Browse</Link>
          <Link href="/search" className="hover:underline" style={{ color: 'var(--primary)' }}>Search</Link>
          <Link href="/metaphors" className="hover:underline" style={{ color: 'var(--primary)' }}>Metaphors</Link>
          <Link href="/domains" className="hover:underline" style={{ color: 'var(--primary)' }}>Domains</Link>
          <Link href="/export" className="hover:underline" style={{ color: 'var(--primary)' }}>Export</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search verses... (e.g. "Gen 1:1" or a Hebrew/Greek word)'
              className="w-full pl-12 pr-4 py-3 rounded-xl border text-lg"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            />
          </div>
        </form>

        {/* Bible Completion Progress */}
        {stats && (
          <div className="mb-8 p-5 rounded-xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold mb-3">Bible Completion</h2>
            <div className="w-full rounded-full h-5 overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{
                  width: `${Math.max(completionPct, completionPct > 0 ? 2 : 0)}%`,
                  backgroundColor: 'var(--confirmed)',
                }}
              >
                {completionPct >= 5 && (
                  <span className="text-xs font-bold text-white">{completionPct}%</span>
                )}
              </div>
            </div>
            {completionPct > 0 && completionPct < 5 && (
              <span className="text-xs font-bold mt-1 inline-block" style={{ color: 'var(--confirmed)' }}>{completionPct}%</span>
            )}
            <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
              {(stats.completedVerses || 0).toLocaleString()} of {stats.totalVerses?.toLocaleString()} verses completed ({completionPct}%)
              {' '}&middot;{' '}
              {(stats.completedWords || 0).toLocaleString()} of {(stats.totalWords || 0).toLocaleString()} words in completed verses
            </p>

            {/* Word Annotation Progress */}
            <h3 className="text-sm font-medium mt-4 mb-2" style={{ color: 'var(--muted)' }}>Word Annotations</h3>
            <div className="w-full rounded-full h-5 overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{
                  width: `${Math.max(wordAnnotationPct, wordAnnotationPct > 0 ? 2 : 0)}%`,
                  backgroundColor: 'var(--active)',
                }}
              >
                {wordAnnotationPct >= 5 && (
                  <span className="text-xs font-bold text-white">{wordAnnotationPct}%</span>
                )}
              </div>
            </div>
            {wordAnnotationPct > 0 && wordAnnotationPct < 5 && (
              <span className="text-xs font-bold mt-1 inline-block" style={{ color: 'var(--active)' }}>{wordAnnotationPct}%</span>
            )}
            <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
              {(stats.annotatedLemmas || 0).toLocaleString()} of {(stats.totalUniqueLemmas || 0).toLocaleString()} unique lemmas annotated
              {' '}&middot;{' '}
              {(stats.wordsWithAnnotatedLemma || 0).toLocaleString()} of {(stats.totalWords || 0).toLocaleString()} total word occurrences covered
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard icon={<BookOpen className="w-5 h-5" />} label="Verses" value={stats?.totalVerses?.toLocaleString() || '—'} />
          <StatCard icon={<Hash className="w-5 h-5" />} label="Lemmas" value={stats?.annotatedLemmas?.toLocaleString() || '0'} color="var(--active)" />
          <StatCard icon={<Tag className="w-5 h-5" />} label="Metaphors" value={stats?.totalMetaphors || '0'} />
          <StatCard icon={<FileText className="w-5 h-5" />} label="Annotations" value={stats?.totalAnnotations || '0'} />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Confirmed" value={confidence.confirmed || '0'} color="var(--confirmed)" />
        </div>

        {/* Confidence Breakdown */}
        {stats?.totalAnnotations > 0 && (
          <div className="flex gap-3 mb-8">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--hypothesis) 15%, transparent)', color: 'var(--hypothesis)' }}>
              {confidence.draft || 0} draft
            </span>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--confirmed) 15%, transparent)', color: 'var(--confirmed)' }}>
              {confidence.confirmed || 0} confirmed
            </span>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--rejected) 15%, transparent)', color: 'var(--rejected)' }}>
              {confidence.disputed || 0} disputed
            </span>
          </div>
        )}

        {/* Process Notes & Philosophy */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <StickyNote className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Process Notes &amp; Philosophy
            </h2>
            <button
              onClick={() => setShowAddNote(!showAddNote)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border hover:shadow-sm transition-shadow"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
            >
              {showAddNote ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddNote ? 'Cancel' : 'Add Note'}
            </button>
          </div>

          {/* Add Note Form */}
          {showAddNote && (
            <div className="p-4 rounded-xl border mb-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <input
                type="text"
                placeholder="Title"
                value={newNote.title}
                onChange={e => setNewNote(n => ({ ...n, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border mb-3 text-sm"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
              />
              <textarea
                placeholder="Write your note..."
                value={newNote.content}
                onChange={e => setNewNote(n => ({ ...n, content: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 rounded-lg border mb-3 text-sm resize-y"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
              />
              <div className="flex items-center gap-3">
                <select
                  value={newNote.note_type}
                  onChange={e => setNewNote(n => ({ ...n, note_type: e.target.value }))}
                  className="px-3 py-1.5 rounded-lg border text-sm"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                >
                  {NOTE_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddNote}
                  className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg font-medium text-white"
                  style={{ backgroundColor: 'var(--confirmed)' }}
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </div>
          )}

          {/* Notes List */}
          {notes.length > 0 ? (
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="p-3 rounded-lg border hover:shadow-sm transition-shadow" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                  {editingId === note.id ? (
                    /* Editing Mode */
                    <div>
                      <input
                        type="text"
                        value={editData.title}
                        onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                        className="w-full px-2 py-1 rounded border mb-2 text-sm font-medium"
                        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                      />
                      <textarea
                        value={editData.content}
                        onChange={e => setEditData(d => ({ ...d, content: e.target.value }))}
                        rows={4}
                        className="w-full px-2 py-1 rounded border mb-2 text-sm resize-y"
                        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={editData.note_type}
                          onChange={e => setEditData(d => ({ ...d, note_type: e.target.value }))}
                          className="px-2 py-1 rounded border text-xs"
                          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                        >
                          {NOTE_TYPES.map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center gap-1 text-xs px-3 py-1 rounded font-medium text-white"
                          style={{ backgroundColor: 'var(--confirmed)' }}
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ color: 'var(--muted)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {note.pinned ? <Pin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} /> : null}
                          <span className="font-medium text-sm truncate">{note.title || 'Untitled'}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${NOTE_TYPE_COLORS[note.note_type] || NOTE_TYPE_COLORS.general} 15%, transparent)`,
                              color: NOTE_TYPE_COLORS[note.note_type] || NOTE_TYPE_COLORS.general,
                            }}
                          >
                            {note.note_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleTogglePin(note)}
                            className="p-1 rounded hover:bg-black/5 transition-colors"
                            title={note.pinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin className="w-3.5 h-3.5" style={{ color: note.pinned ? 'var(--accent)' : 'var(--muted)' }} />
                          </button>
                          <button
                            onClick={() => startEditing(note)}
                            className="p-1 rounded hover:bg-black/5 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 rounded hover:bg-black/5 transition-colors"
                            title="Delete"
                          >
                            <X className="w-3.5 h-3.5" style={{ color: 'var(--rejected)' }} />
                          </button>
                        </div>
                      </div>
                      {note.content && (
                        <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>
                          {note.content}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm p-4 rounded-lg" style={{ color: 'var(--muted)', backgroundColor: 'var(--surface)' }}>
              No notes yet. Add process notes, methodology decisions, or philosophical frameworks.
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Quick Navigation */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Quick Browse
            </h2>
            <div className="space-y-2">
              <Link href="/browse" className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-shadow" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <span>Old Testament (Hebrew)</span>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              </Link>
              <Link href="/browse" className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-shadow" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <span>New Testament (Greek)</span>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              </Link>
            </div>
          </div>

          {/* Recent Annotations */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Recent Annotations
            </h2>
            {stats?.recentAnnotations?.length > 0 ? (
              <div className="space-y-2">
                {stats.recentAnnotations.map((a: any) => (
                  <Link key={a.id} href={`/browse/${a.abbreviation.toLowerCase()}/${a.chapter}`}
                    className="block p-3 rounded-lg border hover:shadow-sm transition-shadow"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{a.book_name} {a.chapter}:{a.verse}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--${a.confidence}) 15%, transparent)`,
                          color: `var(--${a.confidence})`
                        }}>
                        {a.confidence}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--accent)' }}>{a.metaphor_name}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm p-4 rounded-lg" style={{ color: 'var(--muted)', backgroundColor: 'var(--surface)' }}>
                No annotations yet. Start browsing and annotating verses to see them here.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: color || 'var(--primary)' }}>
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: color || 'var(--foreground)' }}>{value}</p>
    </div>
  );
}
