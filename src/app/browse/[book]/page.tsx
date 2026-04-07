'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ChevronLeft, BookOpen } from 'lucide-react';

export default function BookChaptersPage({ params }: { params: Promise<{ book: string }> }) {
  const { book: bookAbbr } = use(params);
  const [bookInfo, setBookInfo] = useState<any>(null);

  useEffect(() => {
    fetch('/api/books').then(r => r.json()).then((books: any[]) => {
      const found = books.find((b: any) => b.abbreviation.toLowerCase() === bookAbbr.toLowerCase());
      if (found) setBookInfo(found);
    });
  }, [bookAbbr]);

  if (!bookInfo) return <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>Loading...</div>;

  const chapters = Array.from({ length: bookInfo.chapter_count }, (_, i) => i + 1);

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <Link href="/browse" className="hover:opacity-70"><ChevronLeft className="w-5 h-5" /></Link>
        <BookOpen className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <h1 className="text-lg font-bold">{bookInfo.name}</h1>
        <span className="text-sm px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
          {bookInfo.language === 'hebrew' ? 'Hebrew' : 'Greek'}
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--muted)' }}>
          Select a chapter ({bookInfo.chapter_count} chapters)
        </h2>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {chapters.map(ch => (
            <Link key={ch} href={`/browse/${bookAbbr.toLowerCase()}/${ch}`}
              className="flex items-center justify-center p-3 rounded-lg border font-medium hover:shadow-md transition-all"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              {ch}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
