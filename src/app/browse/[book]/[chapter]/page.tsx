'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, X, Tag, MessageSquare, Save, Trash2 } from 'lucide-react';

interface Verse {
  id: number; book_id: number; chapter: number; verse: number;
  original_text: string; language: string; abbreviation: string; book_name: string;
}

interface Annotation {
  id: number; verse_id: number; metaphor_id: number; metaphor_name: string;
  source_domain: string; target_domain: string; notes: string;
  confidence: string; linguistic_evidence: string; metaphor_category: string;
}

interface Metaphor {
  id: number; name: string; description: string; category: string; usage_count: number;
}

export default function ChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book: bookAbbr, chapter: chapterStr } = use(params);
  const chapter = parseInt(chapterStr, 10);

  const [bookInfo, setBookInfo] = useState<any>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [annotations, setAnnotations] = useState<Map<number, Annotation[]>>(new Map());
  const [activeVerse, setActiveVerse] = useState<Verse | null>(null);
  const [metaphors, setMetaphors] = useState<Metaphor[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  // Annotation form state
  const [selectedMetaphor, setSelectedMetaphor] = useState<number | null>(null);
  const [newMetaphorName, setNewMetaphorName] = useState('');
  const [sourceDomain, setSourceDomain] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [notes, setNotes] = useState('');
  const [confidence, setConfidence] = useState('draft');
  const [linguisticEvidence, setLinguisticEvidence] = useState('');
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);

  useEffect(() => {
    fetch('/api/books').then(r => r.json()).then((books: any[]) => {
      const found = books.find((b: any) => b.abbreviation.toLowerCase() === bookAbbr.toLowerCase());
      if (found) {
        setBookInfo(found);
        loadVerses(found.id, chapter);
      }
    });
    fetch('/api/metaphors').then(r => r.json()).then(setMetaphors);
  }, [bookAbbr, chapter]);

  async function loadVerses(bookId: number, ch: number) {
    const res = await fetch(`/api/verses?book_id=${bookId}&chapter=${ch}`);
    const data = await res.json();
    setVerses(data);
    // Load annotations for all verses
    const annotMap = new Map<number, Annotation[]>();
    for (const v of data) {
      const aRes = await fetch(`/api/verse-metaphors?verse_id=${v.id}`);
      const aData = await aRes.json();
      if (aData.length > 0) annotMap.set(v.id, aData);
    }
    setAnnotations(annotMap);
  }

  function openAnnotatePanel(verse: Verse, annotation?: Annotation) {
    setActiveVerse(verse);
    setShowPanel(true);
    if (annotation) {
      setEditingAnnotation(annotation);
      setSelectedMetaphor(annotation.metaphor_id);
      setSourceDomain(annotation.source_domain || '');
      setTargetDomain(annotation.target_domain || '');
      setNotes(annotation.notes || '');
      setConfidence(annotation.confidence);
      setLinguisticEvidence(annotation.linguistic_evidence || '');
    } else {
      resetForm();
    }
  }

  function resetForm() {
    setEditingAnnotation(null);
    setSelectedMetaphor(null);
    setNewMetaphorName('');
    setSourceDomain('');
    setTargetDomain('');
    setNotes('');
    setConfidence('draft');
    setLinguisticEvidence('');
  }

  function closePanel() {
    setShowPanel(false);
    setActiveVerse(null);
    resetForm();
  }

  async function handleSave() {
    if (!activeVerse) return;

    let metaphorId = selectedMetaphor;

    // Create new metaphor if needed
    if (!metaphorId && newMetaphorName.trim()) {
      const res = await fetch('/api/metaphors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMetaphorName.trim() }),
      });
      if (!res.ok) { alert('Failed to create metaphor'); return; }
      const data = await res.json();
      metaphorId = data.id;
      // Refresh metaphors list
      const mRes = await fetch('/api/metaphors');
      setMetaphors(await mRes.json());
    }

    if (!metaphorId) { alert('Select or create a metaphor'); return; }

    const payload = {
      verse_id: activeVerse.id,
      metaphor_id: metaphorId,
      source_domain: sourceDomain || undefined,
      target_domain: targetDomain || undefined,
      notes: notes || undefined,
      confidence,
      linguistic_evidence: linguisticEvidence || undefined,
    };

    if (editingAnnotation) {
      await fetch(`/api/verse-metaphors/${editingAnnotation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/verse-metaphors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    // Reload annotations for this verse
    const aRes = await fetch(`/api/verse-metaphors?verse_id=${activeVerse.id}`);
    const aData = await aRes.json();
    setAnnotations(prev => new Map(prev).set(activeVerse.id, aData));
    closePanel();
  }

  async function handleDelete(annotationId: number, verseId: number) {
    if (!confirm('Delete this annotation?')) return;
    await fetch(`/api/verse-metaphors/${annotationId}`, { method: 'DELETE' });
    const aRes = await fetch(`/api/verse-metaphors?verse_id=${verseId}`);
    const aData = await aRes.json();
    setAnnotations(prev => {
      const next = new Map(prev);
      if (aData.length > 0) next.set(verseId, aData);
      else next.delete(verseId);
      return next;
    });
  }

  if (!bookInfo) return <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>Loading...</div>;

  const isHebrew = bookInfo.language === 'hebrew';
  const prevChapter = chapter > 1 ? chapter - 1 : null;
  const nextChapter = chapter < bookInfo.chapter_count ? chapter + 1 : null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <Link href={`/browse/${bookAbbr.toLowerCase()}`} className="hover:opacity-70"><ChevronLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-bold">{bookInfo.name} {chapter}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
            {isHebrew ? 'Hebrew' : 'Greek'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {prevChapter && (
            <Link href={`/browse/${bookAbbr.toLowerCase()}/${prevChapter}`} className="p-2 rounded-lg border hover:shadow-sm" style={{ borderColor: 'var(--border)' }}>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          )}
          {nextChapter && (
            <Link href={`/browse/${bookAbbr.toLowerCase()}/${nextChapter}`} className="p-2 rounded-lg border hover:shadow-sm" style={{ borderColor: 'var(--border)' }}>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* Verses */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        <div className="space-y-4">
          {verses.map(verse => {
            const verseAnnotations = annotations.get(verse.id) || [];
            return (
              <div key={verse.id} className="group rounded-lg p-4 border transition-all hover:shadow-sm"
                style={{ backgroundColor: 'var(--verse-bg)', borderColor: 'var(--border)' }}>
                {/* Verse text */}
                <div className={isHebrew ? 'hebrew-text' : 'greek-text'}>
                  <span className="verse-number">{verse.verse}</span>
                  {verse.original_text}
                </div>

                {/* Annotations */}
                {verseAnnotations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3" style={{ direction: 'ltr' }}>
                    {verseAnnotations.map(a => (
                      <button key={a.id} onClick={() => openAnnotatePanel(verse, a)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--${a.confidence}) 15%, transparent)`,
                          color: `var(--${a.confidence})`,
                          border: `1px solid color-mix(in srgb, var(--${a.confidence}) 30%, transparent)`,
                        }}>
                        <Tag className="w-3 h-3" />
                        {a.metaphor_name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Add annotation button */}
                <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ direction: 'ltr' }}>
                  <button onClick={() => openAnnotatePanel(verse)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:opacity-80"
                    style={{ color: 'var(--primary)' }}>
                    <Plus className="w-3 h-3" /> Annotate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Annotation Panel (slide-out) */}
      {showPanel && activeVerse && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closePanel} />
          <div className="relative w-full max-w-md h-full overflow-y-auto shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="sticky top-0 border-b px-5 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <h2 className="font-semibold">
                {editingAnnotation ? 'Edit Annotation' : 'New Annotation'}
              </h2>
              <button onClick={closePanel} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Verse reference */}
              <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--surface-2)' }}>
                <span className="font-medium">{activeVerse.book_name} {activeVerse.chapter}:{activeVerse.verse}</span>
                <div className={`mt-2 text-xs ${isHebrew ? 'hebrew-text' : 'greek-text'}`} style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
                  {activeVerse.original_text}
                </div>
              </div>

              {/* Metaphor selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Metaphor</label>
                <select value={selectedMetaphor || ''} onChange={e => { setSelectedMetaphor(e.target.value ? parseInt(e.target.value) : null); setNewMetaphorName(''); }}
                  className="w-full p-2 border rounded-lg text-sm" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                  <option value="">— Select or create new —</option>
                  {metaphors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {!selectedMetaphor && (
                  <input type="text" value={newMetaphorName} onChange={e => setNewMetaphorName(e.target.value)}
                    placeholder="Or type a new metaphor name (e.g. GOD IS KING)"
                    className="w-full p-2 border rounded-lg text-sm mt-2"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                )}
              </div>

              {/* Source / Target domains */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Source Domain</label>
                  <input type="text" value={sourceDomain} onChange={e => setSourceDomain(e.target.value)}
                    placeholder="e.g. KING" className="w-full p-2 border rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Target Domain</label>
                  <input type="text" value={targetDomain} onChange={e => setTargetDomain(e.target.value)}
                    placeholder="e.g. GOD" className="w-full p-2 border rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                </div>
              </div>

              {/* Linguistic evidence */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Linguistic Evidence</label>
                <input type="text" value={linguisticEvidence} onChange={e => setLinguisticEvidence(e.target.value)}
                  placeholder="Specific Hebrew/Greek words..." className="w-full p-2 border rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Your analysis and observations..."
                  className="w-full p-2 border rounded-lg text-sm resize-y"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
              </div>

              {/* Confidence */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Confidence</label>
                <div className="flex gap-2">
                  {['draft', 'confirmed', 'disputed'].map(c => (
                    <button key={c} onClick={() => setConfidence(c)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor: confidence === c ? `var(--${c})` : `color-mix(in srgb, var(--${c}) 10%, transparent)`,
                        color: confidence === c ? '#fff' : `var(--${c})`,
                        border: `1px solid color-mix(in srgb, var(--${c}) 40%, transparent)`,
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white text-sm"
                  style={{ backgroundColor: 'var(--primary)' }}>
                  <Save className="w-4 h-4" /> {editingAnnotation ? 'Update' : 'Save'}
                </button>
                {editingAnnotation && (
                  <button onClick={() => { handleDelete(editingAnnotation.id, activeVerse.id); closePanel(); }}
                    className="px-4 py-2.5 rounded-lg text-sm border"
                    style={{ color: 'var(--disputed)', borderColor: 'color-mix(in srgb, var(--disputed) 30%, transparent)' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
