'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Tag, Edit3, Save, Trash2, X } from 'lucide-react';

export default function MetaphorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [metaphor, setMetaphor] = useState<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [metaphorType, setMetaphorType] = useState('conceptual');

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const mRes = await fetch(`/api/metaphors/${id}`);
    if (mRes.ok) {
      const m = await mRes.json();
      setMetaphor(m);
      setName(m.name); setDescription(m.description || ''); setCategory(m.category || '');
      setMetaphorType(m.metaphor_type || 'conceptual');
    }
    const aRes = await fetch(`/api/verse-metaphors?metaphor_id=${id}`);
    if (aRes.ok) setAnnotations(await aRes.json());
  }

  async function handleSave() {
    await fetch(`/api/metaphors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, category, metaphor_type: metaphorType }),
    });
    setEditing(false);
    loadData();
  }

  async function handleDelete() {
    const msg = annotations.length > 0
      ? `This metaphor has ${annotations.length} annotation(s). Delete the metaphor and all annotations?`
      : 'Delete this metaphor?';
    if (!confirm(msg)) return;

    // Delete all annotations first
    for (const a of annotations) {
      await fetch(`/api/verse-metaphors/${a.id}`, { method: 'DELETE' });
    }
    const res = await fetch(`/api/metaphors/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/metaphors');
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete');
    }
  }

  if (!metaphor) return <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>Loading...</div>;

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-4">
          <Link href="/metaphors" className="hover:opacity-70"><ChevronLeft className="w-5 h-5" /></Link>
          <Tag className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h1 className="text-lg font-bold">{metaphor.name}</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-medium"
            style={{
              backgroundColor: metaphor.metaphor_type === 'lexical' ? 'color-mix(in srgb, var(--provisional) 15%, transparent)' : 'var(--surface-2)',
              color: metaphor.metaphor_type === 'lexical' ? 'var(--provisional)' : 'var(--muted)',
            }}>
            {metaphor.metaphor_type || 'conceptual'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            {editing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </button>
          <button onClick={handleDelete} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--disputed)' }}
            title="Delete metaphor">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {editing ? (
          <div className="p-5 rounded-xl border mb-8" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm font-mono uppercase mb-3"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Description..."
              className="w-full p-2 border rounded-lg text-sm mb-3"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input value={category} onChange={e => setCategory(e.target.value)}
                placeholder="Category..."
                className="w-full p-2 border rounded-lg text-sm"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
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
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        ) : (
          <div className="mb-8">
            {metaphor.description && <p className="mb-2" style={{ color: 'var(--muted)' }}>{metaphor.description}</p>}
            {metaphor.category && <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>{metaphor.category}</span>}
          </div>
        )}

        <h2 className="font-semibold mb-4">Tagged Verses ({annotations.length})</h2>
        <div className="space-y-3">
          {annotations.map((a: any) => (
            <Link key={a.id} href={`/browse/${a.abbreviation?.toLowerCase()}/${a.chapter}`}
              className="block p-4 rounded-lg border hover:shadow-sm" style={{ backgroundColor: 'var(--verse-bg)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm" style={{ color: 'var(--primary)' }}>
                  {a.book_name} {a.chapter}:{a.verse}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                  backgroundColor: `color-mix(in srgb, var(--${a.confidence}) 15%, transparent)`,
                  color: `var(--${a.confidence})`
                }}>{a.confidence}</span>
              </div>
              <p className={`text-sm ${a.language === 'hebrew' ? 'hebrew-text' : 'greek-text'}`} style={{ fontSize: '1rem' }}>
                {a.original_text}
              </p>
              {a.source_domain && a.target_domain && (
                <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                  {a.source_domain} → {a.target_domain}
                </p>
              )}
              {a.mapping && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Mapping: {a.mapping}</p>}
              {a.notes && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{a.notes}</p>}
            </Link>
          ))}
          {annotations.length === 0 && (
            <p className="text-center py-8" style={{ color: 'var(--muted)' }}>No verses tagged with this metaphor yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
