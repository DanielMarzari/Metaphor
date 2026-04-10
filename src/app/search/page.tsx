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
  semantic_domain: string;
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
  const [query, setQuery] = useState(initialQ);
  const [mode, setMode] = useState<'text' | 'word'>('word');
  const [verseResults, setVerseResults] = useState<any[]>([]);
  const [wordResults, setWordResults] = useState<any[]>([]);
  const [expandedLemma, setExpandedLemma] = useState<string | null>(null);
  const [lemmaVerses, setLemmaVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Word annotation state
  const [wordAnnotations, setWordAnnotations] = useState<Map<string, WordAnnotation>>(new Map());
  const [annotatingLemma, setAnnotatingLemma] = useState<string | null>(null);
  const [annotForm, setAnnotForm] = useState({ gloss: '', notes: '', semantic_domain: '' });

  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, [initialQ]);

  // Load all existing word annotations
  async function loadWordAnnotations() {
    try {
      const res = await fetch('/api/word-annotations');
      const data: WordAnnotation[] = await res.json();
      const map = new Map<string, WordAnnotation>();
      for (const wa of data) map.set(wa.lemma + ':' + wa.language, wa);
      setWordAnnotations(map);
    } catch {}
  }

  useEffect(() => { loadWordAnnotations(); }, []);

  async function doSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setExpandedLemma(null);
    setLemmaVerses([]);
    setAnnotatingLemma(null);
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

  async function handleAnnotateSave(lemma: string, language: string, strongs?: string) {
    const key = lemma + ':' + language;
    const existing = wordAnnotations.get(key);
    const payload = { gloss: annotForm.gloss, notes: annotForm.notes, semantic_domain: annotForm.semantic_domain };
    if (existing) {
      await fetch(`/api/word-annotations/${existing.id}`, {
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
    setAnnotatingLemma(null);
  }

  async function handleAnnotateDelete(lemma: string, language: string) {
    const key = lemma + ':' + language;
    const existing = wordAnnotations.get(key);
    if (!existing) return;
    if (!confirm('Delete this word annotation?')) return;
    await fetch(`/api/word-annotations/${existing.id}`, { method: 'DELETE' });
    await loadWordAnnotations();
    setAnnotatingLemma(null);
  }

  function startAnnotating(lemma: string, language: string) {
    const key = lemma + ':' + language;
    const existing = wordAnnotations.get(key);
    setAnnotatingLemma(lemma);
    setAnnotForm({
      gloss: existing?.gloss || '',
      notes: existing?.notes || '',
      semantic_domain: existing?.semantic_domain || '',
    });
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
                const existingAnnotation = wordAnnotations.get(waKey);
                const isAnnotating = annotatingLemma === w.lemma;
                const isHebrew = w.language === 'hebrew';
                const morphDecoded = w.sample_morph ? decodeMorph(w.sample_morph, w.language) : '';

                return (
                <div key={idx}>
                  <div className="rounded-xl border overflow-hidden transition-shadow hover:shadow-sm"
                    style={{
                      backgroundColor: 'var(--verse-bg)',
                      borderColor: isAnnotating ? 'var(--primary)' : existingAnnotation ? 'var(--provisional)' : 'var(--border)',
                      borderLeftWidth: existingAnnotation ? '4px' : undefined,
                      borderLeftColor: existingAnnotation ? 'var(--provisional)' : undefined,
                    }}>

                    {/* Word header: big text + metadata */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: word + linguistic info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-2xl font-semibold ${isHebrew ? 'hebrew-text' : 'greek-text'}`}>
                              {w.sample_text}
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                              {w.occurrence_count}×
                            </span>
                          </div>

                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {morphDecoded && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{
                                backgroundColor: 'var(--surface-2)', color: 'var(--muted)',
                              }}>
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
                            <span className="text-[11px] px-1.5 py-0.5 rounded" style={{
                              backgroundColor: 'var(--surface-2)', color: 'var(--muted)',
                            }}>
                              {isHebrew ? 'Hebrew' : 'Greek'}
                            </span>
                            {isHebrew && w.lemma && (
                              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                                Lemma: {w.lemma}
                              </span>
                            )}
                            {!isHebrew && w.lemma && (
                              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                                Lemma: <span className="greek-text">{w.lemma}</span>
                              </span>
                            )}
                            {w.root_consonants && (
                              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                                Root: <span className="hebrew-text" style={{ fontSize: '0.85rem' }}>{w.root_consonants}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 pt-1">
                          {existingAnnotation?.gloss && !isAnnotating && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                              backgroundColor: 'color-mix(in srgb, var(--provisional) 12%, transparent)',
                              color: 'var(--provisional)',
                            }}>
                              {existingAnnotation.gloss}
                            </span>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); isAnnotating ? setAnnotatingLemma(null) : startAnnotating(w.lemma, w.language); }}
                            className="p-1.5 rounded-lg border hover:shadow-sm transition-all"
                            style={{
                              borderColor: isAnnotating ? 'var(--primary)' : existingAnnotation ? 'var(--provisional)' : 'var(--border)',
                              color: isAnnotating ? 'var(--primary)' : existingAnnotation ? 'var(--provisional)' : 'var(--muted)',
                              backgroundColor: isAnnotating ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : undefined,
                            }}
                            title={isAnnotating ? 'Close form' : existingAnnotation ? 'Edit annotation' : 'Annotate this word'}>
                            {isAnnotating ? <X className="w-3.5 h-3.5" /> : existingAnnotation ? <Edit2 className="w-3.5 h-3.5" /> : <Tag className="w-3.5 h-3.5" />}
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

                    {/* Existing annotation display (when not editing) */}
                    {existingAnnotation && !isAnnotating && (existingAnnotation.gloss || existingAnnotation.notes || existingAnnotation.semantic_domain) && (
                      <div className="px-4 pb-3 -mt-1">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {existingAnnotation.semantic_domain && (
                            <span className="text-xs" style={{ color: 'var(--accent)' }}>
                              <span className="font-medium">Domain:</span> {existingAnnotation.semantic_domain}
                            </span>
                          )}
                          {existingAnnotation.notes && (
                            <p className="text-xs" style={{ color: 'var(--muted)' }}>
                              {existingAnnotation.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Full annotation form */}
                    {isAnnotating && (
                      <div className="px-4 pb-4 pt-1">
                        <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--border)' }}>
                          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--provisional)' }}>
                            Word Annotation
                          </div>

                          {/* Row 1: Gloss + Semantic Domain */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--muted)' }}>Gloss</label>
                              <input type="text" value={annotForm.gloss}
                                onChange={e => setAnnotForm(f => ({ ...f, gloss: e.target.value }))}
                                placeholder="English meaning..."
                                className="w-full p-2 border rounded-lg text-sm"
                                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                autoFocus />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--muted)' }}>Semantic Domain</label>
                              <input type="text" value={annotForm.semantic_domain}
                                onChange={e => setAnnotForm(f => ({ ...f, semantic_domain: e.target.value }))}
                                placeholder="e.g. Creation, Kingship, Body, Motion..."
                                className="w-full p-2 border rounded-lg text-sm"
                                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                            </div>
                          </div>

                          {/* Row 2: Notes (full-width textarea) */}
                          <div>
                            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--muted)' }}>Notes</label>
                            <textarea value={annotForm.notes}
                              onChange={e => setAnnotForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="Semantic range, usage patterns, etymological notes, cognitive metaphor relevance..."
                              rows={5}
                              className="w-full p-2 border rounded-lg text-sm resize-y"
                              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', minHeight: '100px' }} />
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            <button onClick={() => handleAnnotateSave(w.lemma, w.language, w.strongs)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
                              style={{ backgroundColor: 'var(--primary)' }}>
                              <Save className="w-3.5 h-3.5" /> {existingAnnotation ? 'Update' : 'Save'}
                            </button>
                            <button onClick={() => setAnnotatingLemma(null)}
                              className="px-4 py-2 rounded-lg text-sm border"
                              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                              Cancel
                            </button>
                            {existingAnnotation && (
                              <button onClick={() => handleAnnotateDelete(w.lemma, w.language)}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm ml-auto"
                                style={{ color: 'var(--disputed)' }}>
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
