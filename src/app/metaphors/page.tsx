'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Tag, X } from 'lucide-react';

interface Metaphor {
  id: number; name: string; description: string; category: string;
  usage_count: number; created_at: string;
}

export default function MetaphorsPage() {
  const [metaphors, setMetaphors] = useState<Metaphor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
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
      body: JSON.stringify({ name: name.trim(), description, category }),
    });
    if (res.ok) {
      setName(''); setDescription(''); setCategory(''); setShowForm(false);
      loadMetaphors();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to create');
    }
  }

  const filtered = metaphors.filter(m =>
    !filter || m.name.toLowerCase().includes(filter.toLowerCase()) ||
    (m.category || '').toLowerCase().includes(filter.toLowerCase())
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
                placeholder="Description of this conceptual metaphor..." rows={2}
                className="w-full p-2 border rounded-lg text-sm"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
              <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                placeholder="Category (e.g. Structural, Ontological, Orientational)"
                className="w-full p-2 border rounded-lg text-sm"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
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
              <Link key={m.id} href={`/metaphors/${m.id}`}
                className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div>
                  <p className="font-medium" style={{ color: 'var(--accent)' }}>{m.name}</p>
                  {m.description && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{m.description}</p>}
                  {m.category && <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>{m.category}</span>}
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                  {m.usage_count} {m.usage_count === 1 ? 'verse' : 'verses'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
