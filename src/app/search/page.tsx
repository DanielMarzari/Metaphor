'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronDown, ChevronRight, Tag, BookOpen, Hash } from 'lucide-react';

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

  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, [initialQ]);

  async function doSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setExpandedLemma(null);
    setLemmaVerses([]);
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

  async function expandLemma(lemma: string, language: string, strongs?: string) {
    if (expandedLemma === lemma) {
      setExpandedLemma(null);
      setLemmaVerses([]);
      return;
    }
    setExpandedLemma(lemma);
    // Prefer strongs search for Hebrew since lemma is just a number
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
            <div className="space-y-2">
              {wordResults.map((w: any, idx: number) => (
                <div key={idx}>
                  <button onClick={() => expandLemma(w.lemma, w.language, w.strongs)}
                    className="w-full text-left p-4 rounded-lg border hover:shadow-sm transition-shadow flex items-center justify-between"
                    style={{ backgroundColor: 'var(--verse-bg)', borderColor: expandedLemma === w.lemma ? 'var(--primary)' : 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xl font-semibold ${w.language === 'hebrew' ? 'hebrew-text' : 'greek-text'}`}>
                        {w.sample_text}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {w.strongs && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: 'color-mix(in srgb, var(--provisional) 15%, transparent)', color: 'var(--provisional)' }}>
                            {w.strongs}
                          </span>
                        )}
                        {w.language === 'greek' && (
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>lemma: {w.lemma}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                        {w.occurrence_count}x
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                        {w.language === 'hebrew' ? 'Heb' : 'Grk'}
                      </span>
                      {expandedLemma === w.lemma ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted)' }} /> : <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} />}
                    </div>
                  </button>

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
              ))}
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
