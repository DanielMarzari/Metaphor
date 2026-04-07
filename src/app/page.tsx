'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Tag, FileText, TrendingUp, Clock, Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Check if it's a reference pattern like "Gen 1:1" or "Matt 5"
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

  const confidence = stats?.byConfidence?.reduce((acc: any, c: any) => ({ ...acc, [c.confidence]: c.count }), {}) || {};

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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<BookOpen className="w-5 h-5" />} label="Verses" value={stats?.totalVerses?.toLocaleString() || '—'} />
          <StatCard icon={<Tag className="w-5 h-5" />} label="Metaphors" value={stats?.totalMetaphors || '0'} />
          <StatCard icon={<FileText className="w-5 h-5" />} label="Annotations" value={stats?.totalAnnotations || '0'} />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Confirmed" value={confidence.confirmed || '0'} color="var(--confirmed)" />
        </div>

        {/* Confidence Breakdown */}
        {stats?.totalAnnotations > 0 && (
          <div className="flex gap-3 mb-8">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--draft) 15%, transparent)', color: 'var(--draft)' }}>
              {confidence.draft || 0} draft
            </span>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--confirmed) 15%, transparent)', color: 'var(--confirmed)' }}>
              {confidence.confirmed || 0} confirmed
            </span>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--disputed) 15%, transparent)', color: 'var(--disputed)' }}>
              {confidence.disputed || 0} disputed
            </span>
          </div>
        )}

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
