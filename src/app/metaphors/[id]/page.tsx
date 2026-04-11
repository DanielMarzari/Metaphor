'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Tag, Edit3, Save, Trash2, X, Plus, GitBranch, Box } from 'lucide-react';

interface DomainClass { id: number; name: string; }

export default function MetaphorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [metaphor, setMetaphor] = useState<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [allMetaphors, setAllMetaphors] = useState<any[]>([]);
  const [allDomains, setAllDomains] = useState<DomainClass[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [metaphorType, setMetaphorType] = useState('conceptual');

  // Nesting
  const [addChildId, setAddChildId] = useState<number | null>(null);

  // Domain links
  const [sourceDomainId, setSourceDomainId] = useState<number | null>(null);
  const [targetDomainId, setTargetDomainId] = useState<number | null>(null);

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    const [mRes, aRes, allMRes, dcRes] = await Promise.all([
      fetch(`/api/metaphors/${id}`),
      fetch(`/api/verse-metaphors?metaphor_id=${id}`),
      fetch('/api/metaphors'),
      fetch('/api/domain-classes'),
    ]);
    if (mRes.ok) {
      const m = await mRes.json();
      setMetaphor(m);
      setName(m.name); setDescription(m.description || ''); setCategory(m.category || '');
      setMetaphorType(m.metaphor_type || 'conceptual');
      setSourceDomainId(m.domains?.source_domain_id || null);
      setTargetDomainId(m.domains?.target_domain_id || null);
    }
    if (aRes.ok) setAnnotations(await aRes.json());
    if (allMRes.ok) setAllMetaphors(await allMRes.json());
    if (dcRes.ok) setAllDomains(await dcRes.json());
  }

  async function handleSave() {
    await fetch(`/api/metaphors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, description, category, metaphor_type: metaphorType,
        source_domain_id: sourceDomainId, target_domain_id: targetDomainId,
      }),
    });
    setEditing(false);
    loadData();
  }

  async function handleDelete() {
    const msg = annotations.length > 0
      ? `This metaphor has ${annotations.length} annotation(s). Delete all?`
      : 'Delete this metaphor?';
    if (!confirm(msg)) return;
    for (const a of annotations) {
      await fetch(`/api/verse-metaphors/${a.id}`, { method: 'DELETE' });
    }
    const res = await fetch(`/api/metaphors/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/metaphors');
    else { const data = await res.json(); alert(data.error || 'Failed to delete'); }
  }

  async function handleAddChild() {
    if (!addChildId) return;
    await fetch('/api/metaphor-nesting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_id: parseInt(id), child_id: addChildId }),
    });
    setAddChildId(null);
    loadData();
  }

  async function handleRemoveChild(childId: number) {
    await fetch('/api/metaphor-nesting', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_id: parseInt(id), child_id: childId }),
    });
    loadData();
  }

  if (!metaphor) return <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>Loading...</div>;

  const existingChildIds = new Set((metaphor.children || []).map((c: any) => c.id));
  const availableChildren = allMetaphors.filter(m => m.id !== parseInt(id) && !existingChildIds.has(m.id));

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-4">
          <Link href="/metaphors" className="hover:opacity-70"><ChevronLeft className="w-5 h-5" /></Link>
          <Tag className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h1 className="text-lg font-bold">{metaphor.name}</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-medium"
            style={{
              backgroundColor: metaphor.metaphor_type === 'lexical' ? 'color-mix(in srgb, var(--active) 15%, transparent)' : 'var(--surface-2)',
              color: metaphor.metaphor_type === 'lexical' ? 'var(--active)' : 'var(--muted)',
            }}>
            {metaphor.metaphor_type || 'conceptual'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            {editing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </button>
          <button onClick={handleDelete} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--rejected)' }}>
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

            {/* Domain class links */}
            <h3 className="text-xs font-semibold mb-2 mt-4" style={{ color: 'var(--muted)' }}>Domain Class Mapping</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Source Domain Class</label>
                <select value={sourceDomainId || ''} onChange={e => setSourceDomainId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full p-2 border rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                  <option value="">— None —</option>
                  {allDomains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Target Domain Class</label>
                <select value={targetDomainId || ''} onChange={e => setTargetDomainId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full p-2 border rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                  <option value="">— None —</option>
                  {allDomains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        ) : (
          <div className="mb-8">
            {metaphor.description && <p className="mb-2" style={{ color: 'var(--muted)' }}>{metaphor.description}</p>}
            <div className="flex flex-wrap items-center gap-2">
              {metaphor.category && <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>{metaphor.category}</span>}
              {metaphor.domains?.source_domain_name && (
                <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}>
                  <Box className="w-3 h-3" />{metaphor.domains.source_domain_name} → {metaphor.domains.target_domain_name || '?'}
                </span>
              )}
            </div>

            {/* Parent metaphors */}
            {metaphor.parents?.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Part of:</span>
                {metaphor.parents.map((p: any) => (
                  <Link key={p.id} href={`/metaphors/${p.id}`}
                    className="text-xs px-2 py-1 rounded-full hover:underline"
                    style={{ backgroundColor: 'var(--surface-2)', color: 'var(--accent)' }}>
                    {p.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Child Metaphors */}
        <div className="mb-8">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            Child Metaphors ({(metaphor.children || []).length})
          </h2>
          <div className="space-y-2">
            {(metaphor.children || []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border"
                style={{ backgroundColor: 'var(--verse-bg)', borderColor: 'var(--border)' }}>
                <Link href={`/metaphors/${c.id}`} className="font-medium text-sm hover:underline" style={{ color: 'var(--accent)' }}>
                  {c.name}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{c.usage_count} uses</span>
                  <button onClick={() => handleRemoveChild(c.id)}
                    className="text-xs hover:opacity-70" style={{ color: 'var(--rejected)' }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add child */}
          <div className="flex items-center gap-2 mt-3">
            <select value={addChildId || ''} onChange={e => setAddChildId(e.target.value ? parseInt(e.target.value) : null)}
              className="flex-1 p-2 border rounded-lg text-sm"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <option value="">— Add child metaphor —</option>
              {availableChildren.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={handleAddChild} disabled={!addChildId}
              className="p-2 rounded-lg text-white disabled:opacity-40" style={{ backgroundColor: 'var(--primary)' }}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tagged Verses */}
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
                <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{a.source_domain} → {a.target_domain}</p>
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
