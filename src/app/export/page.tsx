'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Download } from 'lucide-react';

export default function ExportPage() {
  const [format, setFormat] = useState('csv');
  const [books, setBooks] = useState<any[]>([]);
  const [metaphors, setMetaphors] = useState<any[]>([]);
  const [bookId, setBookId] = useState('');
  const [metaphorId, setMetaphorId] = useState('');
  const [confidence, setConfidence] = useState('');
  const [preview, setPreview] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/books').then(r => r.json()).then(setBooks);
    fetch('/api/metaphors').then(r => r.json()).then(setMetaphors);
    loadPreview();
  }, []);

  async function loadPreview() {
    const params = new URLSearchParams({ format: 'json' });
    if (bookId) params.set('book_id', bookId);
    if (metaphorId) params.set('metaphor_id', metaphorId);
    if (confidence) params.set('confidence', confidence);
    const res = await fetch(`/api/export?${params}`);
    const data = await res.json();
    setPreview(Array.isArray(data) ? data.slice(0, 10) : []);
  }

  useEffect(() => { loadPreview(); }, [bookId, metaphorId, confidence]);

  function handleExport() {
    const params = new URLSearchParams({ format });
    if (bookId) params.set('book_id', bookId);
    if (metaphorId) params.set('metaphor_id', metaphorId);
    if (confidence) params.set('confidence', confidence);
    window.open(`/api/export?${params}`, '_blank');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <Link href="/" className="hover:opacity-70"><ChevronLeft className="w-5 h-5" /></Link>
        <Download className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <h1 className="text-lg font-bold">Export Research Data</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)} className="w-full p-2 border rounded-lg text-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <option value="csv">CSV</option>
                <option value="tsv">TSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Filter by Book</label>
              <select value={bookId} onChange={e => setBookId(e.target.value)} className="w-full p-2 border rounded-lg text-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <option value="">All books</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Filter by Metaphor</label>
              <select value={metaphorId} onChange={e => setMetaphorId(e.target.value)} className="w-full p-2 border rounded-lg text-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <option value="">All metaphors</option>
                {metaphors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Filter by Confidence</label>
              <select value={confidence} onChange={e => setConfidence(e.target.value)} className="w-full p-2 border rounded-lg text-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
            <button onClick={handleExport}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white"
              style={{ backgroundColor: 'var(--primary)' }}>
              <Download className="w-4 h-4" /> Export ({preview.length}+ records)
            </button>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--muted)' }}>Preview (first 10)</h3>
            {preview.length > 0 ? (
              <div className="space-y-2 text-xs">
                {preview.map((row: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <p className="font-medium">{row.book} {row.chapter}:{row.verse}</p>
                    <p style={{ color: 'var(--accent)' }}>{row.metaphor}</p>
                    {row.source_domain && <p style={{ color: 'var(--muted)' }}>{row.source_domain} → {row.target_domain}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No annotations to export yet.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
