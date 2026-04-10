'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronDown, ChevronRight, Tag, BookOpen, Hash, Edit2, Save, Trash2, Plus, X } from 'lucide-react';
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
  const [confidence, setConfidence] = useState('draft');
  const [linguisticEvidence, setLinguisticEvidence] = useState('');

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
    setConfidence('draft');
    setLinguisticEvidence('');
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
    setConfidence(annotation.confidence || 'draft');
    setLinguisticEvidence(annotation.linguistic_evidence || '');
  }

  async function handleSave(lemma: string, language: string, strongs?: string) {
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
      linguistic_evidence: linguisticEvidence,
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

      <main className="max-w-4xl mx-auto px-6 py-8">
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
                      borderColor: isAnnotating ? 'var(--primary)' : annotations.length > 0 ? 'var(--provisional)' : 'var(--border)',
                      borderLeftWidth: annotations.length > 0 ? '4px' : undefined,
                      borderLeftColor: annotations.length > 0 ? 'var(--provisional)' : undefined,
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
                                backgroundColor: 'color-mix(in srgb, var(--provisional) 15%, transparent)',
                                color: 'var(--provisional)',
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
                            style={{ borderColor: 'color-mix(in srgb, var(--' + (a.confidence || 'draft') + ') 30%, transparent)', backgroundColor: 'color-mix(in srgb, var(--' + (a.confidence || 'draft') + ') 5%, transparent)' }}>
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
                                style={{ backgroundColor: `var(--${a.confidence || 'draft'})`, color: '#fff' }}>
                                {(a.confidence || 'draft').slice(0, 4)}
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

                          {/* Row 2: Mapping + Evidence + Confidence */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Mapping</label>
                              <input type="text" value={mapping} onChange={e => setMapping(e.target.value)}
                                placeholder="throne → authority, crown → sovereignty"
                                className="w-full p-1.5 border rounded-lg text-sm"
                                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Evidence</label>
                              <input type="text" value={linguisticEvidence} onChange={e => setLinguisticEvidence(e.target.value)}
                                placeholder="Specific words..." className="w-full p-1.5 border rounded-lg text-sm"
                                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Confidence</label>
                              <div className="flex flex-wrap gap-1">
                                {['draft', 'provisional', 'confirmed', 'disputed'].map(c => (
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
                          </div>

                          {/* Notes + Pseudocode side by side */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 pt-1">
                            <button onClick={() => handleSave(w.lemma, w.language, w.strongs)}
                              className="flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-white text-sm"
                              style={{ backgroundColor: 'var(--primary)' }}>
                              <Save className="w-4 h-4" /> {editingAnnotation ? 'Update' : 'Save'}
                            </button>
                            <button onClick={closeAnnotationForm}
                              className="px-4 py-2 rounded-lg text-sm border"
                              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                              Cancel
                            </button>
                            {editingAnnotation && (
                              <button onClick={() => handleDelete(editingAnnotation.id)}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm ml-auto"
                                style={{ color: 'var(--disputed)', borderColor: 'color-mix(in srgb, var(--disputed) 30%, transparent)', border: '1px solid' }}>
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
    </div>
  );
}
