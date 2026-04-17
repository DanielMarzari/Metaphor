'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronDown, ChevronRight, Tag, BookOpen, Hash, Edit2, Save, Trash2, Plus, X, Network } from 'lucide-react';
import { decodeMorph } from '@/lib/morph-decoder';

interface WordAnnotation {
  id: number;
  lemma: string;
  strongs: string;
  language: string;
  gloss: string;
  notes: string;
  metaphor_id: number | null;
  metaphor_name: string | null;
  metaphor_category: string | null;
  source_domain: string;
  target_domain: string;
  mapping: string;
  pseudocode: string;
  confidence: string;
  linguistic_evidence: string;
  reservations: string;
  status: string;
}

interface Metaphor {
  id: number;
  name: string;
  description: string;
  category: string;
  usage_count: number;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const editAnnotationId = searchParams.get('edit') ? parseInt(searchParams.get('edit')!) : null;
  const [query, setQuery] = useState(initialQ);
  const [mode, setMode] = useState<'text' | 'word'>('word');
  const [verseResults, setVerseResults] = useState<any[]>([]);
  const [wordResults, setWordResults] = useState<any[]>([]);
  const [expandedLemma, setExpandedLemma] = useState<string | null>(null);
  const [lemmaVerses, setLemmaVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editParamHandled, setEditParamHandled] = useState(false);

  // Word annotations (full metaphor data)
  const [wordAnnotations, setWordAnnotations] = useState<Map<string, WordAnnotation[]>>(new Map());
  const [metaphors, setMetaphors] = useState<Metaphor[]>([]);

  // Metaphor inline editing
  const [editingMetaphorId, setEditingMetaphorId] = useState<number | null>(null);
  const [editingMetaphorName, setEditingMetaphorName] = useState('');

  // Annotation form state
  const [annotatingLemma, setAnnotatingLemma] = useState<string | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<WordAnnotation | null>(null);
  const [selectedMetaphor, setSelectedMetaphor] = useState<number | null>(null);
  const [newMetaphorName, setNewMetaphorName] = useState('');
  const [sourceDomain, setSourceDomain] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [mapping, setMapping] = useState('');
  const [notes, setNotes] = useState('');
  const [pseudocode, setPseudocode] = useState('');
  const [saving, setSaving] = useState(false);
  const [confidence, setConfidence] = useState('hypothesis');
  const [reservations, setReservations] = useState('');
  const [status, setStatus] = useState('active');

  // Lemma equations state
  const [equationsLemma, setEquationsLemma] = useState<string | null>(null);
  const [equationEntries, setEquationEntries] = useState<any[]>([]);
  const [equationInputs, setEquationInputs] = useState<Record<number, string>>({});
  const [savingWordIds, setSavingWordIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, [initialQ]);

  // Handle edit= param: once annotations + word results are loaded, auto-open the edit form
  useEffect(() => {
    if (!editAnnotationId || editParamHandled || loading) return;
    // Find the annotation across all loaded word annotations
    for (const [, annots] of wordAnnotations) {
      const found = annots.find(a => a.id === editAnnotationId);
      if (found) {
        startEditing(found);
        setEditParamHandled(true);
        return;
      }
    }
  }, [editAnnotationId, wordAnnotations, loading, editParamHandled]);

  useEffect(() => { loadWordAnnotations(); loadMetaphors(); }, []);

  async function loadWordAnnotations() {
    try {
      const res = await fetch('/api/word-annotations');
      const data: WordAnnotation[] = await res.json();
      const map = new Map<string, WordAnnotation[]>();
      for (const wa of data) {
        const key = wa.lemma + ':' + wa.language;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(wa);
      }
      setWordAnnotations(map);
    } catch {}
  }

  async function loadMetaphors() {
    try {
      const res = await fetch('/api/metaphors');
      setMetaphors(await res.json());
    } catch {}
  }

  async function doSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setExpandedLemma(null);
    setLemmaVerses([]);
    closeAnnotationForm();
    try {
      if (mode === 'text') {
        const res = await fetch(`/api/verses?q=${encodeURIComponent(q)}&limit=100`);
        setVerseResults(await res.json());
        setWordResults([]);
      } else {
        const res = await fetch(`/api/words/search?q=${encodeURIComponent(q)}&limit=100`);
        setWordResults(await res.json());
        setVerseResults([]);
      }
    } finally {
      setLoading(false);
    }
  }

  function closeAnnotationForm() {
    setAnnotatingLemma(null);
    setEditingAnnotation(null);
    resetForm();
  }

  function resetForm() {
    setSelectedMetaphor(null);
    setNewMetaphorName('');
    setSourceDomain('');
    setTargetDomain('');
    setMapping('');
    setNotes('');
    setPseudocode('');
    setConfidence('hypothesis');
    setReservations('');
    setStatus('active');
  }

  function startAnnotating(lemma: string) {
    setAnnotatingLemma(lemma);
    setEditingAnnotation(null);
    resetForm();
  }

  function startEditing(annotation: WordAnnotation) {
    setAnnotatingLemma(annotation.lemma);
    setEditingAnnotation(annotation);
    setSelectedMetaphor(annotation.metaphor_id);
    setNewMetaphorName('');
    setSourceDomain(annotation.source_domain || '');
    setTargetDomain(annotation.target_domain || '');
    setMapping(annotation.mapping || '');
    setNotes(annotation.notes || '');
    setPseudocode(annotation.pseudocode || '');
    setConfidence(annotation.confidence || 'hypothesis');
    setReservations(annotation.reservations || '');
    setStatus(annotation.status || 'active');
  }

  async function handleSave(lemma: string, language: string, strongs?: string) {
    if (saving) return;
    setSaving(true);
    try {
    let metaphorId = selectedMetaphor;

    // Create new metaphor if needed
    if (!metaphorId && newMetaphorName.trim()) {
      const res = await fetch('/api/metaphors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMetaphorName.trim() }),
      });
      const data = await res.json();
      metaphorId = data.id;
      await loadMetaphors();
    }

    const payload = {
      metaphor_id: metaphorId,
      source_domain: sourceDomain,
      target_domain: targetDomain,
      mapping,
      notes,
      pseudocode,
      confidence,
      reservations,
      status,
    };

    if (editingAnnotation) {
      await fetch(`/api/word-annotations/${editingAnnotation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/word-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lemma, language, strongs: strongs || '', ...payload }),
      });
    }

    await loadWordAnnotations();
    closeAnnotationForm();
    } finally { setSaving(false); }
  }

  async function handleMetaphorRename() {
    if (!editingMetaphorId || !editingMetaphorName.trim()) return;
    const res = await fetch(`/api/metaphors/${editingMetaphorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingMetaphorName.trim() }),
    });
    if (res.ok) {
      await loadMetaphors();
      await loadWordAnnotations();
      setEditingMetaphorId(null);
      setEditingMetaphorName('');
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to rename');
    }
  }

  async function handleDelete(annotationId: number) {
    if (!confirm('Delete this annotation?')) return;
    await fetch(`/api/word-annotations/${annotationId}`, { method: 'DELETE' });
    await loadWordAnnotations();
    closeAnnotationForm();
  }

  async function toggleEquations(lemma: string, language: string, strongs?: string) {
    if (equationsLemma === lemma) {
      setEquationsLemma(null);
      setEquationEntries([]);
      setEquationInputs({});
      return;
    }
    setEquationsLemma(lemma);
    const param = strongs ? `strongs=${encodeURIComponent(strongs)}` : `lemma=${encodeURIComponent(lemma)}&language=${language}`;
    const res = await fetch(`/api/lemma-equations?${param}`);
    const data: any[] = await res.json();
    setEquationEntries(data);
    const inputs: Record<number, string> = {};
    for (const e of data) inputs[e.word_id] = e.modifier || '';
    setEquationInputs(inputs);
  }

  async function saveEquationEntry(word_id: number, modifier: string) {
    setSavingWordIds(prev => { const next = new Set(prev); next.add(word_id); return next; });
    try {
      await fetch('/api/lemma-equations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id, modifier }),
      });
      setEquationEntries(prev => prev.map(e => e.word_id === word_id ? { ...e, modifier } : e));
    } finally {
      setSavingWordIds(prev => { const next = new Set(prev); next.delete(word_id); return next; });
    }
  }

  async function expandLemma(lemma: string, language: string, strongs?: string) {
    if (expandedLemma === lemma) {
      setExpandedLemma(null);
      setLemmaVerses([]);
      return;
    }
    setExpandedLemma(lemma);
    const param = strongs ? `strongs=${encodeURIComponent(strongs)}` : `lemma=${encodeURIComponent(lemma)}&language=${language}`;
    const res = await fetch(`/api/words/search?${param}&limit=50`);
    setLemmaVerses(await res.json());
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
    window.history.replaceState({}, '', `/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <Link href="/" className="hover:opacity-70"><ChevronLeft className="w-5 h-5" /></Link>
        <Search className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <h1 className="text-lg font-bold">Search</h1>
      </header>

      <main className="px-6 py-8">
        {/* Mode Toggle */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg inline-flex" style={{ backgroundColor: 'var(--surface-2)' }}>
          {[
            { key: 'word' as const, label: 'Word / Lemma', icon: <Hash className="w-3.5 h-3.5" /> },
            { key: 'text' as const, label: 'Verse Text', icon: <BookOpen className="w-3.5 h-3.5" /> },
          ].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: mode === m.key ? 'var(--surface)' : 'transparent',
                color: mode === m.key ? 'var(--primary)' : 'var(--muted)',
                boxShadow: mode === m.key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={mode === 'text'
                ? 'Search original verse text...'
                : "Strong's# (H1234), Hebrew root (\u05D1\u05E8\u05D0), or Greek lemma (\u03BB\u03CC\u03B3\u03BF\u03C2)..."}
              autoFocus
              className="w-full pl-12 pr-4 py-3 rounded-xl border text-lg"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
          </div>
        </form>

        {loading && <p style={{ color: 'var(--muted)' }}>Searching...</p>}

        {/* Verse Text Results */}
        {mode === 'text' && !loading && verseResults.length > 0 && (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{verseResults.length} results</p>
            <div className="space-y-3">
              {verseResults.map((v: any) => (
                <Link key={v.id} href={`/browse/${v.abbreviation.toLowerCase()}/${v.chapter}`}
                  className="block p-4 rounded-lg border hover:shadow-sm transition-shadow"
                  style={{ backgroundColor: 'var(--verse-bg)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm" style={{ color: 'var(--primary)' }}>
                      {v.book_name} {v.chapter}:{v.verse}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                      {v.language === 'hebrew' ? 'Hebrew' : 'Greek'}
                    </span>
                  </div>
                  <p className={v.language === 'hebrew' ? 'hebrew-text' : 'greek-text'} style={{ fontSize: '1.1rem' }}>
                    {v.original_text}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Word / Lemma Results */}
        {mode === 'word' && !loading && wordResults.length > 0 && (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{wordResults.length} unique lemmas found</p>
            <div className="space-y-3">
              {wordResults.map((w: any, idx: number) => {
                const waKey = w.lemma + ':' + w.language;
                const annotations = wordAnnotations.get(waKey) || [];
                const isAnnotating = annotatingLemma === w.lemma;
                const isHebrew = w.language === 'hebrew';
                const morphDecoded = w.sample_morph ? decodeMorph(w.sample_morph, w.language) : '';

                return (
                <div key={idx}>
                  <div className="rounded-xl border overflow-hidden transition-shadow hover:shadow-sm"
                    style={{
                      backgroundColor: 'var(--verse-bg)',
                      borderColor: isAnnotating ? 'var(--primary)' : annotations.length > 0 ? 'var(--hypothesis)' : 'var(--border)',
                      borderLeftWidth: annotations.length > 0 ? '4px' : undefined,
                      borderLeftColor: annotations.length > 0 ? 'var(--hypothesis)' : undefined,
                    }}>

                    {/* Word header: big text + metadata */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-2xl font-semibold ${isHebrew ? 'hebrew-text' : 'greek-text'}`}>
                              {w.sample_text}
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                              {w.occurrence_count}×
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {morphDecoded && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                                {morphDecoded}
                              </span>
                            )}
                            {w.strongs && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded font-mono" style={{
                                backgroundColor: 'color-mix(in srgb, var(--hypothesis) 15%, transparent)',
                                color: 'var(--hypothesis)',
                              }}>
                                {w.strongs}
                              </span>
                            )}
                            <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                              {isHebrew ? 'Hebrew' : 'Greek'}
                            </span>
                            {isHebrew && w.lemma && (
                              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Lemma: {w.lemma}</span>
                            )}
                            {!isHebrew && w.lemma && (
                              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Lemma: <span className="greek-text">{w.lemma}</span></span>
                            )}
                            {w.root_consonants && (
                              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                                Root: <span className="hebrew-text" style={{ fontSize: '0.85rem' }}>{w.root_consonants}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pt-1">
                          <button onClick={() => toggleEquations(w.lemma, w.language, w.strongs)}
                            className="p-1.5 rounded-lg border hover:shadow-sm transition-all"
                            style={{
                              borderColor: equationsLemma === w.lemma ? 'var(--accent)' : 'var(--border)',
                              color: equationsLemma === w.lemma ? 'var(--accent)' : 'var(--muted)',
                              backgroundColor: equationsLemma === w.lemma ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : undefined,
                            }}
                            title="Equations">
                            <Network className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => expandLemma(w.lemma, w.language, w.strongs)}
                            className="p-1.5 rounded-lg border hover:shadow-sm transition-all"
                            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                            title="Show verses">
                            {expandedLemma === w.lemma ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Existing annotations list */}
                    {annotations.length > 0 && !isAnnotating && (
                      <div className="px-4 pb-2 space-y-2">
                        {annotations.map(a => (
                          <div key={a.id} className="flex items-start gap-2 p-2.5 rounded-lg border"
                            style={{ borderColor: 'color-mix(in srgb, var(--' + (a.confidence || 'hypothesis') + ') 30%, transparent)', backgroundColor: 'color-mix(in srgb, var(--' + (a.confidence || 'hypothesis') + ') 5%, transparent)' }}>
                            <div className="flex-1 min-w-0">
                              {a.metaphor_name && (
                                <div className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>{a.metaphor_name}</div>
                              )}
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                                {a.source_domain && <span><b>Source:</b> {a.source_domain}</span>}
                                {a.target_domain && <span><b>Target:</b> {a.target_domain}</span>}
                                {a.mapping && <span><b>Mapping:</b> {a.mapping}</span>}
                              </div>
                              {a.notes && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{a.notes.substring(0, 120)}{a.notes.length > 120 ? '...' : ''}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: `var(--${a.confidence || 'hypothesis'})`, color: '#fff' }}>
                                {(a.confidence || 'hypothesis').slice(0, 4)}
                              </span>
                              <button onClick={() => startEditing(a)}
                                className="p-1 rounded hover:opacity-70" style={{ color: 'var(--primary)' }}>
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* + Annotate button */}
                    {!isAnnotating && (
                      <div className="px-4 pb-3">
                        <button onClick={() => startAnnotating(w.lemma)}
                          className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--accent)' }}>
                          <Plus className="w-3 h-3" /> Annotate
                        </button>
                      </div>
                    )}

                    {/* Full annotation form (bottom drawer style, inline) */}
                    {isAnnotating && (
                      <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                              {editingAnnotation ? 'Edit Annotation' : 'New Annotation'}
                            </span>
                            <button onClick={closeAnnotationForm} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--muted)' }}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Row 1: Metaphor + Source + Target */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Metaphor</label>
                              <div className="flex gap-1.5">
                                <select value={selectedMetaphor || ''} onChange={e => { setSelectedMetaphor(e.target.value ? parseInt(e.target.value) : null); setNewMetaphorName(''); setEditingMetaphorId(null); }}
                                  className="flex-1 p-1.5 border rounded-lg text-sm" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                                  <option value="">— Select or create new —</option>
                                  {metaphors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                {selectedMetaphor && (
                                  <button onClick={() => {
                                    const m = metaphors.find(m => m.id === selectedMetaphor);
                                    if (m) { setEditingMetaphorId(m.id); setEditingMetaphorName(m.name); }
                                  }}
                                    className="p-1.5 rounded-lg border hover:shadow-sm shrink-0"
                                    style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
                                    title="Edit metaphor name">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              {editingMetaphorId && (
                                <div className="flex gap-1.5 mt-1.5">
                                  <input type="text" value={editingMetaphorName} onChange={e => setEditingMetaphorName(e.target.value)}
                                    className="flex-1 p-1.5 border rounded-lg text-sm"
                                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--primary)' }}
                                    onKeyDown={e => { if (e.key === 'Enter') handleMetaphorRename(); if (e.key === 'Escape') setEditingMetaphorId(null); }} />
                                  <button onClick={handleMetaphorRename}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                                    style={{ backgroundColor: 'var(--primary)' }}>Rename</button>
                                  <button onClick={() => setEditingMetaphorId(null)}
                                    className="px-2 py-1 rounded-lg text-xs border"
                                    style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancel</button>
                                </div>
                              )}
                              {!selectedMetaphor && !editingMetaphorId && (
                                <input type="text" value={newMetaphorName} onChange={e => setNewMetaphorName(e.target.value)}
                                  placeholder="New metaphor name (e.g. GOD IS KING)"
                                  className="w-full p-1.5 border rounded-lg text-sm mt-1.5"
                                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Source</label>
                              <input type="text" value={sourceDomain} onChange={e => setSourceDomain(e.target.value)}
                                placeholder="KING" className="w-full p-1.5 border rounded-lg text-sm"
                                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Target</label>
                              <input type="text" value={targetDomain} onChange={e => setTargetDomain(e.target.value)}
                                placeholder="GOD" className="w-full p-1.5 border rounded-lg text-sm"
                                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                            </div>
                          </div>

                          {/* Row 2: Mapping + Confidence + Status */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Mapping</label>
                              <input type="text" value={mapping} onChange={e => setMapping(e.target.value)}
                                placeholder="throne → authority, crown → sovereignty"
                                className="w-full p-1.5 border rounded-lg text-sm"
                                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Confidence</label>
                              <div className="flex flex-wrap gap-1">
                                {['hypothesis', 'confirmed', 'rejected'].map(c => (
                                  <button key={c} onClick={() => setConfidence(c)}
                                    className="px-2 py-1 rounded-full text-[10px] font-medium transition-all"
                                    style={{
                                      backgroundColor: confidence === c ? `var(--${c})` : `color-mix(in srgb, var(--${c}) 10%, transparent)`,
                                      color: confidence === c ? '#fff' : `var(--${c})`,
                                      border: `1px solid color-mix(in srgb, var(--${c}) 40%, transparent)`,
                                    }}>
                                    {c.slice(0, 4)}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Status</label>
                              <div className="flex gap-1">
                                {['active', 'frozen'].map(s => (
                                  <button key={s} onClick={() => setStatus(s)}
                                    className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                                    style={{
                                      backgroundColor: status === s ? `var(--${s})` : `color-mix(in srgb, var(--${s}) 10%, transparent)`,
                                      color: status === s ? '#fff' : `var(--${s})`,
                                      border: `1px solid color-mix(in srgb, var(--${s}) 40%, transparent)`,
                                    }}>
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Notes + Pseudocode + Reservations */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Notes</label>
                              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={10}
                                placeholder="Analysis, observations, cross-references..."
                                className="w-full p-2 border rounded-lg text-sm resize-y"
                                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', minHeight: '200px' }} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Pseudocode</label>
                              <textarea value={pseudocode} onChange={e => setPseudocode(e.target.value)} rows={10}
                                placeholder={"class TEMPORAL_CONTAINER extends CONTAINER\n  .originRegion = HEAD\n  בְּרֵאשִׁית instanceof TEMPORAL_CONTAINER"}
                                className="w-full p-2 border rounded-lg text-xs resize-y font-mono"
                                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', minHeight: '200px', lineHeight: '1.6' }} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Reservations / Questions</label>
                              <textarea value={reservations} onChange={e => setReservations(e.target.value)} rows={10}
                                placeholder="Open questions, counterarguments, alternative interpretations..."
                                className="w-full p-2 border rounded-lg text-sm resize-y"
                                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', minHeight: '200px' }} />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 pt-1">
                            <button onClick={() => handleSave(w.lemma, w.language, w.strongs)}
                              disabled={saving}
                              className="flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: 'var(--primary)' }}>
                              <Save className="w-4 h-4" /> {saving ? 'Saving…' : editingAnnotation ? 'Update' : 'Save'}
                            </button>
                            <button onClick={closeAnnotationForm}
                              className="px-4 py-2 rounded-lg text-sm border"
                              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                              Cancel
                            </button>
                            {editingAnnotation && (
                              <button onClick={() => handleDelete(editingAnnotation.id)}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm ml-auto"
                                style={{ color: 'var(--rejected)', borderColor: 'color-mix(in srgb, var(--rejected) 30%, transparent)', border: '1px solid' }}>
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded: verses containing this lemma */}
                  {expandedLemma === w.lemma && lemmaVerses.length > 0 && (
                    <div className="ml-4 mt-1 mb-2 space-y-1 border-l-2 pl-4" style={{ borderColor: 'var(--primary)' }}>
                      {lemmaVerses.map((v: any) => (
                        <Link key={v.id} href={`/browse/${v.abbreviation.toLowerCase()}/${v.chapter}`}
                          className="block p-3 rounded-lg border hover:shadow-sm transition-shadow text-sm"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                          <span className="font-medium" style={{ color: 'var(--primary)' }}>
                            {v.book_name} {v.chapter}:{v.verse}
                          </span>
                          <span className="ml-2" style={{ color: 'var(--muted)' }}>
                            {v.original_text.substring(0, 80)}{v.original_text.length > 80 ? '...' : ''}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                </div>
                );
              })}
            </div>
          </>
        )}

        {mode === 'text' && !loading && query && verseResults.length === 0 && (
          <p className="text-center py-12" style={{ color: 'var(--muted)' }}>No results found for &quot;{query}&quot;</p>
        )}
        {mode === 'word' && !loading && query && wordResults.length === 0 && (
          <p className="text-center py-12" style={{ color: 'var(--muted)' }}>No word matches found for &quot;{query}&quot;</p>
        )}
      </main>

      {/* Equations modal */}
      {equationsLemma && (() => {
        const w = wordResults.find((r: any) => r.lemma === equationsLemma);
        if (!w) return null;
        return (
          <EquationsModal
            lemma={w.sample_text || w.lemma}
            isHebrew={w.language === 'hebrew'}
            entries={equationEntries}
            inputs={equationInputs}
            setInputs={setEquationInputs}
            savingWordIds={savingWordIds}
            onSave={saveEquationEntry}
            onClose={() => { setEquationsLemma(null); setEquationEntries([]); setEquationInputs({}); }}
          />
        );
      })()}
    </div>
  );
}

interface EquationEntry {
  word_id: number;
  text: string;
  lemma: string;
  verse_id: number;
  book_name: string;
  abbreviation: string;
  chapter: number;
  verse: number;
  language: string;
  prefixes: { id: number; text: string; lemma: string; morph: string; word_order: number }[];
  modifier: string;
}

// Strip Hebrew vowel points and cantillation (U+0591–U+05C7) so בְּ, בָּ, בַּ → ב
function stripNiqqud(text: string): string {
  return (text || '').normalize('NFKD').replace(/[\u0591-\u05C7]/g, '');
}

function EquationsModal({
  lemma, isHebrew, entries, inputs, setInputs, savingWordIds, onSave, onClose,
}: {
  lemma: string;
  isHebrew: boolean;
  entries: EquationEntry[];
  inputs: Record<number, string>;
  setInputs: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  savingWordIds: Set<number>;
  onSave: (word_id: number, modifier: string) => Promise<void>;
  onClose: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const prefixRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const modifierRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const lemmaRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<{ key: string; d: string; kind: 'prefix' | 'modifier' }[]>([]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Aggregate prefixes by their consonantal (vowel-less) form
  const prefixList = (() => {
    const map = new Map<string, { text: string; count: number }>();
    for (const e of entries) {
      for (const p of e.prefixes) {
        const raw = p.text || p.lemma || '';
        const key = stripNiqqud(raw);
        if (!key) continue;
        const existing = map.get(key);
        if (existing) existing.count++;
        else map.set(key, { text: key, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  })();

  const recomputeLines = useCallback(() => {
    const body = bodyRef.current;
    const scroll = scrollRef.current;
    const lemmaEl = lemmaRef.current;
    if (!body || !lemmaEl) return;
    const bRect = body.getBoundingClientRect();
    const sRect = scroll ? scroll.getBoundingClientRect() : bRect;
    const lRect = lemmaEl.getBoundingClientRect();
    const lemmaLeft = { x: lRect.left - bRect.left, y: lRect.top + lRect.height / 2 - bRect.top };
    const lemmaRight = { x: lRect.right - bRect.left, y: lRect.top + lRect.height / 2 - bRect.top };

    const next: { key: string; d: string; kind: 'prefix' | 'modifier' }[] = [];

    prefixRefs.current.forEach((el, key) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x1 = r.right - bRect.left;
      const y1 = r.top + r.height / 2 - bRect.top;
      const x2 = lemmaLeft.x;
      const y2 = lemmaLeft.y;
      const cx = (x1 + x2) / 2;
      next.push({ key: 'p-' + key, kind: 'prefix', d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}` });
    });

    modifierRefs.current.forEach((el, id) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Only draw if within visible vertical range of the scrollable modifiers area
      if (r.bottom < sRect.top - 10 || r.top > sRect.bottom + 10) return;
      const x1 = lemmaRight.x;
      const y1 = lemmaRight.y;
      const x2 = r.left - bRect.left;
      const y2 = r.top + r.height / 2 - bRect.top;
      const cx = (x1 + x2) / 2;
      next.push({ key: 'm-' + id, kind: 'modifier', d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}` });
    });

    setLines(next);
  }, []);

  useLayoutEffect(() => {
    recomputeLines();
    const ro = new ResizeObserver(recomputeLines);
    if (bodyRef.current) ro.observe(bodyRef.current);
    window.addEventListener('resize', recomputeLines);
    return () => { ro.disconnect(); window.removeEventListener('resize', recomputeLines); };
  }, [recomputeLines, entries, prefixList.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', recomputeLines, { passive: true });
    return () => el.removeEventListener('scroll', recomputeLines);
  }, [recomputeLines]);

  const textClass = isHebrew ? 'hebrew-text' : 'greek-text';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Equations
            </span>
            <span className="text-sm ml-2" style={{ color: 'var(--muted)' }}>
              {entries.length} occurrence{entries.length === 1 ? '' : 's'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {entries.length === 0 ? (
          <div className="p-6 text-sm" style={{ color: 'var(--muted)' }}>No occurrences found.</div>
        ) : (
          <div ref={bodyRef} className="relative flex-1 flex min-h-0">
            {/* SVG line overlay — spans the whole modal body */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
              {lines.map(l => (
                <path key={l.key} d={l.d}
                  stroke="currentColor" fill="none" strokeWidth={1.5}
                  style={{ color: 'var(--accent)', opacity: 0.6 }} />
              ))}
            </svg>

            {/* Prefixes column (fixed, vertically centered) */}
            <div className="flex flex-col gap-3 justify-center items-end p-6 min-w-[110px]">
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Prefixes</div>
              {prefixList.length === 0 ? (
                <div className="text-xs italic" style={{ color: 'var(--muted)' }}>(none)</div>
              ) : (
                prefixList.map(p => (
                  <div key={p.text}
                    ref={el => { prefixRefs.current.set(p.text, el); }}
                    className="flex items-center gap-2 justify-end px-3 py-1.5 rounded-lg border"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                    <span className={`text-2xl font-semibold ${textClass}`}>{p.text}</span>
                    {p.count > 1 && (
                      <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                        ×{p.count}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Lemma (trunk) */}
            <div className="flex items-center justify-center px-6">
              <div ref={lemmaRef}
                className="px-5 py-4 rounded-xl border-2"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--primary)' }}>
                <span className={`text-3xl font-bold ${textClass}`} style={{ color: 'var(--primary)' }}>
                  {lemma}
                </span>
              </div>
            </div>

            {/* Modifiers (branches) — scrollable */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
              <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Modifies / Connects to</div>
              <div className="flex flex-col gap-2">
                {entries.map(e => {
                  const saving = savingWordIds.has(e.word_id);
                  const value = inputs[e.word_id] ?? '';
                  const original = e.modifier || '';
                  const dirty = value !== original;
                  return (
                    <div key={e.word_id}
                      ref={el => { modifierRefs.current.set(e.word_id, el); }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                      style={{ backgroundColor: 'var(--background)', borderColor: dirty ? 'var(--accent)' : 'var(--border)' }}>
                      <input
                        type="text"
                        value={value}
                        placeholder="modifies / connects to…"
                        onChange={ev => setInputs(prev => ({ ...prev, [e.word_id]: ev.target.value }))}
                        onBlur={() => { if (dirty) onSave(e.word_id, value); }}
                        onKeyDown={ev => { if (ev.key === 'Enter') { (ev.target as HTMLInputElement).blur(); } }}
                        className="flex-1 min-w-0 px-2 py-1 border rounded text-sm bg-transparent"
                        style={{ borderColor: 'transparent' }}
                      />
                      <Link href={`/browse/${e.abbreviation.toLowerCase()}/${e.chapter}`}
                        className="text-xs font-medium shrink-0 hover:underline"
                        style={{ color: 'var(--primary)' }}>
                        {e.book_name} {e.chapter}:{e.verse}
                      </Link>
                      {saving && (
                        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>saving…</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
