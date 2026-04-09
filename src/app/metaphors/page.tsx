'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Tag, X, Trash2 } from 'lucide-react';

interface Metaphor {
  id: number; name: string; description: string; category: string;
  metaphor_type: string; usage_count: number; created_at: string;
}

export default function MetaphorsPage() {
  const [metaphors, setMetaphors] = useState<Metaphor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [metaphorType, setMetaphorType] = useState('conceptual');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadMetaphors();
  }, []);

  async function loadMetaphors() {
    const res = await fetch('/api/metaphors');
    setMetaphors(await res.json());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch('/api/metaphors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description, category, metaphor_type: metaphorType }),
    });
    if (res.ok) {
      setName(''); setDescription(''); setCategory(''); setMetaphorType('conceptual'); setShowForm(false);
      loadMetaphors();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to create');
    }
  }

  async function handleDelete(e: React.MouseEvent, m: Metaphor) {
    e.preventDefault();
    e.stopPropagation();
    const msg = m.usage_count > 0
      ? `"${m.name}" has ${m.usage_count} annotation(s). Delete the metaphor and all its annotations?`
      : `Delete "${m.name}"?`;
    if (!confirm(msg)) return;

    // If it has annotations, delete them first
    if (m.usage_count > 0) {
      const aRes = await fetch(`/api/verse-metaphors?metaphor_id=${m.id}`);
      if (aRes.ok) {
        const annotations = await aRes.json();
        for (const a of annotations) {
          await fetch(`/api/verse-metaphors/${a.id}`, { method: 'DELETE' });
        }
      }
    }
    const res = await fetch(`/api/metaphors/${m.id}`, { method: 'DELETE' });
    if (res.ok) {
      loadMetaphors();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete');
    }
  }

  const filtered = metaphors.filter(m =>
    !filter || m.name.toLowerCase().includes(filter.toLowerCase()) ||
    (m.category || '').toLowerCase().includes(filter.toLowerCase()) ||
    (m.metaphor_type || '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-70"><ChevronLeft className="w-5 h-5" /></Link>
          <Tag className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h1 className="text-lg font-bold">Metaphor Catalog</h1>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>({metaphors.length})</span>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--primary)' }}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New'}
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Create Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="mb-8 p-5 rounded-xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold mb-4">Create New Metaphor</h2>
            <div className="space-y-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="METAPHOR NAME (e.g. KNOWING IS SEEING)" required
                className="w-full p-2 border rounded-lg text-sm font-mono uppercase"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Description of this metaphor..." rows={2}
                className="w-full p-2 border rounded-lg text-sm"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                  placeholder="Category (e.g. Structural, Ontological)"
                  className="w-full p-2 border rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                <div>
                  <div className="flex gap-2">
                    {['conceptual', 'lexical'].map(t => (
                      <button key={t} type="button" onClick={() => setMetaphorType(t)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border"
                        style={{
                          backgroundColor: metaphorType === t ? 'var(--primary)' : 'var(--background)',
                          color: metaphorType === t ? '#fff' : 'var(--muted)',
                          borderColor: metaphorType === t ? 'var(--primary)' : 'var(--border)',
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
                Create Metaphor
              </button>
            </div>
          </form>
        )}

        {/* Filter */}
        <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Filter metaphors..." className="w-full p-2 border rounded-lg text-sm mb-4"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />

        {/* List */}
        {filtered.length === 0 ? (
          <p className="text-center py-12" style={{ color: 'var(--muted)' }}>
            {metaphors.length === 0 ? 'No metaphors yet. Create your first one!' : 'No matches.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <Link href={`/metaphors/${m.id}`}
                  className="flex-1 flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium" style={{ color: 'var(--accent)' }}>{m.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-medium"
                        style={{
                          backgroundColor: m.metaphor_type === 'lexical' ? 'color-mix(in srgb, var(--provisional) 15%, transparent)' : 'var(--surface-2)',
                          color: m.metaphor_type === 'lexical' ? 'var(--provisional)' : 'var(--muted)',
                        }}>
                        {m.metaphor_type || 'conceptual'}
                      </span>
                    </div>
                    {m.description && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{m.description}</p>}
                    {m.category && <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>{m.category}</span>}
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                    {m.usage_count} {m.usage_count === 1 ? 'verse' : 'verses'}
                  </span>
                </Link>
                <button onClick={(e) => handleDelete(e, m)}
                  className="p-2 rounded-lg border hover:shadow-sm transition-all shrink-0"
                  style={{ borderColor: 'var(--border)', color: 'var(--disputed)' }}
                  title="Delete metaphor">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
