'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronLeft } from 'lucide-react';

interface Book {
  id: number; name: string; abbreviation: string; testament: string;
  language: string; book_order: number; chapter_count: number;
}

export default function BrowsePage() {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    fetch('/api/verses?_books=1').catch(() => {});
    // Fetch books from a simple endpoint or use inline data
    fetch('/api/stats').then(r => r.json()).then(() => {
      // We need a books endpoint. Let's fetch all via the DB directly.
    });
    // Use a dedicated fetch
    fetchBooks();
  }, []);

  async function fetchBooks() {
    const res = await fetch('/api/books');
    if (res.ok) setBooks(await res.json());
  }

  const otBooks = books.filter(b => b.testament === 'OT');
  const ntBooks = books.filter(b => b.testament === 'NT');

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <Link href="/" className="hover:opacity-70"><ChevronLeft className="w-5 h-5" /></Link>
        <BookOpen className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <h1 className="text-lg font-bold">Browse Bible</h1>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Old Testament */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            Old Testament <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>(Hebrew)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {otBooks.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>

        {/* New Testament */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
            New Testament <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>(Greek)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {ntBooks.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/browse/${book.abbreviation.toLowerCase()}`}
      className="p-3 rounded-lg border hover:shadow-md transition-all group"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="font-medium text-sm group-hover:underline">{book.name}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
        {book.chapter_count} ch
      </p>
    </Link>
  );
}
