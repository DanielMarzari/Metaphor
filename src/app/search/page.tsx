'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronLeft, Tag } from 'lucide-react';

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
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, [initialQ]);

  async function doSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/verses?q=${encodeURIComponent(q)}&limit=100`);
      setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
    // Update URL
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
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search Hebrew or Greek text..." autoFocus
              className="w-full pl-12 pr-4 py-3 rounded-xl border text-lg"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
          </div>
        </form>

        {loading && <p style={{ color: 'var(--muted)' }}>Searching...</p>}

        {!loading && results.length > 0 && (
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{results.length} results</p>
        )}

        <div className="space-y-3">
          {results.map((v: any) => (
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

        {!loading && query && results.length === 0 && (
          <p className="text-center py-12" style={{ color: 'var(--muted)' }}>No results found for &quot;{query}&quot;</p>
        )}
      </main>
    </div>
  );
}
