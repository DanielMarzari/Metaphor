'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, X, Tag, Save, Trash2, BookOpen, CheckCircle, Circle, Edit2 } from 'lucide-react';
import { decodeMorph } from '@/lib/morph-decoder';

interface Verse {
  id: number; book_id: number; chapter: number; verse: number;
  original_text: string; language: string; abbreviation: string; book_name: string;
}

interface Word {
  id: number; verse_id: number; word_order: number; word_group: number;
  text: string; lemma: string; morph: string; strongs: string; root_consonants: string;
}

interface Annotation {
  id: number; verse_id: number; metaphor_id: number; metaphor_name: string;
  source_domain: string; target_domain: string; mapping: string; notes: string;
  pseudocode: string; confidence: string; linguistic_evidence: string;
  reservations: string; status: string;
  metaphor_category: string; word_ids: number[];
}

interface Metaphor {
  id: number; name: string; description: string; category: string; usage_count: number;
}

interface WordAnnotationData {
  annotation_id: number; lemma: string; gloss: string; notes: string; strongs: string;
  metaphor_id: number | null; metaphor_name: string | null; source_domain: string;
  target_domain: string; mapping: string; pseudocode: string; confidence: string;
  linguistic_evidence: string; reservations: string; status: string;
}

// --- Component ---

export default function ChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book: bookAbbr, chapter: chapterStr } = use(params);
  const chapter = parseInt(chapterStr, 10);

  const [bookInfo, setBookInfo] = useState<any>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [wordsByVerse, setWordsByVerse] = useState<Map<number, Word[]>>(new Map());
  const [annotations, setAnnotations] = useState<Map<number, Annotation[]>>(new Map());
  const [metaphors, setMetaphors] = useState<Metaphor[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  // Word selection
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());
  const [selectionVerseId, setSelectionVerseId] = useState<number | null>(null);

  // Hover tooltip
  const [hoverWord, setHoverWord] = useState<{ word: Word; x: number; y: number } | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Annotation form state
  const [selectedMetaphor, setSelectedMetaphor] = useState<number | null>(null);
  const [newMetaphorName, setNewMetaphorName] = useState('');
  const [sourceDomain, setSourceDomain] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [mapping, setMapping] = useState('');
  const [notes, setNotes] = useState('');
  const [pseudocode, setPseudocode] = useState('');
  const [confidence, setConfidence] = useState('hypothesis');
  const [reservations, setReservations] = useState('');
  const [status, setStatus] = useState('active');
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);

  // Metaphor inline editing
  const [editingMetaphorId, setEditingMetaphorId] = useState<number | null>(null);
  const [editingMetaphorName, setEditingMetaphorName] = useState('');

  // Verse completion
  const [completedVerses, setCompletedVerses] = useState<Set<number>>(new Set());

  // Word annotations (lemma-level) — multiple per lemma
  const [annotatedLemmas, setAnnotatedLemmas] = useState<Map<string, WordAnnotationData[]>>(new Map());
  const [wordInfoWord, setWordInfoWord] = useState<{ word: Word; x: number; y: number } | null>(null);
  const [wordAnnotationForm, setWordAnnotationForm] = useState<{ gloss: string; notes: string } | null>(null);
  const wordInfoRef = useRef<HTMLDivElement>(null);

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

  // Keyboard shortcut: Option+A to annotate
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        if (showPanel) {
          closePanel();
        } else if (selectionVerseId) {
          openAnnotatePanel(selectionVerseId);
        }
      }
      if (e.key === 'Escape' && wordInfoWord) {
        setWordInfoWord(null);
        setWordAnnotationForm(null);
      }
      if (e.key === 'Escape' && showPanel) {
        closePanel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Close word info popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wordInfoRef.current && !wordInfoRef.current.contains(e.target as Node)) {
        setWordInfoWord(null);
        setWordAnnotationForm(null);
      }
    }
    if (wordInfoWord) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [wordInfoWord]);

  async function loadVerses(bookId: number, ch: number) {
    const res = await fetch(`/api/verses?book_id=${bookId}&chapter=${ch}`);
    const data: Verse[] = await res.json();
    setVerses(data);

    const verseIds = data.map(v => v.id);
    if (verseIds.length > 0) {
      const wRes = await fetch(`/api/words?verse_ids=${verseIds.join(',')}`);
      const allWords: Word[] = await wRes.json();
      const wMap = new Map<number, Word[]>();
      for (const w of allWords) {
        if (!wMap.has(w.verse_id)) wMap.set(w.verse_id, []);
        wMap.get(w.verse_id)!.push(w);
      }
      setWordsByVerse(wMap);
    }

    const annotMap = new Map<number, Annotation[]>();
    for (const v of data) {
      const aRes = await fetch(`/api/verse-metaphors?verse_id=${v.id}`);
      const aData = await aRes.json();
      if (aData.length > 0) annotMap.set(v.id, aData);
    }
    setAnnotations(annotMap);

    // Fetch completed verses
    try {
      const cRes = await fetch(`/api/completed-verses?book_id=${bookId}&chapter=${ch}`);
      const cData = await cRes.json();
      setCompletedVerses(new Set(cData.map((c: any) => c.verse_id)));
    } catch { setCompletedVerses(new Set()); }

    // Fetch annotated lemmas for this chapter
    try {
      const waRes = await fetch(`/api/word-annotations?book_id=${bookId}&chapter=${ch}`);
      const annotatedLemmaData: WordAnnotationData[] = await waRes.json();
      const annotatedLemmaMap = new Map<string, WordAnnotationData[]>();
      for (const al of annotatedLemmaData) {
        if (!annotatedLemmaMap.has(al.lemma)) annotatedLemmaMap.set(al.lemma, []);
        annotatedLemmaMap.get(al.lemma)!.push(al);
      }
      setAnnotatedLemmas(annotatedLemmaMap);
    } catch { setAnnotatedLemmas(new Map()); }
  }

  async function toggleVerseCompletion(verseId: number) {
    const isComplete = completedVerses.has(verseId);
    if (isComplete) {
      await fetch('/api/completed-verses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verse_id: verseId }),
      });
      setCompletedVerses(prev => { const next = new Set(prev); next.delete(verseId); return next; });
    } else {
      await fetch('/api/completed-verses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verse_id: verseId }),
      });
      setCompletedVerses(prev => new Set(prev).add(verseId));
    }
  }

  function clearSelection() {
    setSelectedWordIds(new Set());
    setSelectionVerseId(null);
  }

  function openAnnotatePanel(verseId: number, annotation?: Annotation) {
    setShowPanel(true);
    setWordInfoWord(null);
    setWordAnnotationForm(null);
    if (annotation) {
      setEditingAnnotation(annotation);
      setSelectedMetaphor(annotation.metaphor_id);
      setSourceDomain(annotation.source_domain || '');
      setTargetDomain(annotation.target_domain || '');
      setMapping(annotation.mapping || '');
      setNotes(annotation.notes || '');
      setPseudocode(annotation.pseudocode || '');
      setConfidence(annotation.confidence || 'hypothesis');
      setReservations(annotation.reservations || '');
      setStatus(annotation.status || 'active');
      setSelectedWordIds(new Set(annotation.word_ids || []));
      setSelectionVerseId(annotation.verse_id);
    } else {
      if (selectionVerseId !== verseId) {
        setSelectedWordIds(new Set());
      }
      setSelectionVerseId(verseId);
      resetFormFields();
    }
  }

  function resetFormFields() {
    setEditingAnnotation(null);
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

  function closePanel() {
    setShowPanel(false);
    resetFormFields();
    clearSelection();
  }

  function handleWordClick(word: Word, e: React.MouseEvent) {
    e.stopPropagation();
    if (selectionVerseId !== null && selectionVerseId !== word.verse_id) {
      setSelectedWordIds(new Set([word.id]));
      setSelectionVerseId(word.verse_id);
      return;
    }
    setSelectionVerseId(word.verse_id);
    setSelectedWordIds(prev => {
      const next = new Set(prev);
      if (next.has(word.id)) next.delete(word.id);
      else next.add(word.id);
      if (next.size === 0) setSelectionVerseId(null);
      return next;
    });

    // Show word info popover
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setWordInfoWord({ word, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    setWordAnnotationForm(null);
  }

  function handleWordHover(word: Word, e: React.MouseEvent) {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    hoverTimeout.current = setTimeout(() => {
      setHoverWord({ word, x: rect.left + rect.width / 2, y: rect.bottom + 4 });
    }, 400);
  }

  function handleWordLeave() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHoverWord(null);
  }

  async function handleMetaphorRename() {
    if (!editingMetaphorId || !editingMetaphorName.trim()) return;
    const res = await fetch(`/api/metaphors/${editingMetaphorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingMetaphorName.trim() }),
    });
    if (res.ok) {
      const mRes = await fetch('/api/metaphors');
      setMetaphors(await mRes.json());
      // Refresh annotations to show updated name
      if (selectionVerseId) {
        const aRes = await fetch(`/api/verse-metaphors?verse_id=${selectionVerseId}`);
        const aData = await aRes.json();
        setAnnotations(prev => new Map(prev).set(selectionVerseId!, aData));
      }
      setEditingMetaphorId(null);
      setEditingMetaphorName('');
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to rename');
    }
  }

  async function handleSave() {
    if (!selectionVerseId) return;
    let metaphorId = selectedMetaphor;
    if (!metaphorId && newMetaphorName.trim()) {
      const res = await fetch('/api/metaphors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMetaphorName.trim() }),
      });
      if (!res.ok) { alert('Failed to create metaphor'); return; }
      const data = await res.json();
      metaphorId = data.id;
      const mRes = await fetch('/api/metaphors');
      setMetaphors(await mRes.json());
    }
    if (!metaphorId) { alert('Select or create a metaphor'); return; }
    const payload = {
      verse_id: selectionVerseId,
      metaphor_id: metaphorId,
      source_domain: sourceDomain || undefined,
      target_domain: targetDomain || undefined,
      mapping: mapping || undefined,
      notes: notes || undefined,
      pseudocode: pseudocode || undefined,
      confidence,
      reservations: reservations || undefined,
      status,
      word_ids: Array.from(selectedWordIds),
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
    const aRes = await fetch(`/api/verse-metaphors?verse_id=${selectionVerseId}`);
    const aData = await aRes.json();
    setAnnotations(prev => new Map(prev).set(selectionVerseId!, aData));
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

  async function refreshAnnotatedLemmas() {
    if (!bookInfo) return;
    try {
      const waRes = await fetch(`/api/word-annotations?book_id=${bookInfo.id}&chapter=${chapter}`);
      const data: WordAnnotationData[] = await waRes.json();
      const map = new Map<string, WordAnnotationData[]>();
      for (const al of data) {
        if (!map.has(al.lemma)) map.set(al.lemma, []);
        map.get(al.lemma)!.push(al);
      }
      setAnnotatedLemmas(map);
    } catch {}
  }

  async function handleWordAnnotationSave(word: Word) {
    if (!wordAnnotationForm || !word.lemma) return;
    // Always create new (word annotations are now multiple per lemma, managed from search page)
    await fetch('/api/word-annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lemma: word.lemma,
        language: bookInfo.language,
        strongs: word.strongs || '',
        gloss: wordAnnotationForm.gloss,
        notes: wordAnnotationForm.notes,
      }),
    });
    await refreshAnnotatedLemmas();
    setWordAnnotationForm(null);
    setWordInfoWord(null);
  }

  async function handleWordAnnotationDelete(annotationId: number) {
    if (!confirm('Delete this word annotation?')) return;
    await fetch(`/api/word-annotations/${annotationId}`, { method: 'DELETE' });
    await refreshAnnotatedLemmas();
    setWordAnnotationForm(null);
    setWordInfoWord(null);
  }

  if (!bookInfo) return <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>Loading...</div>;

  const isHebrew = bookInfo.language === 'hebrew';
  const prevChapter = chapter > 1 ? chapter - 1 : null;
  const nextChapter = chapter < bookInfo.chapter_count ? chapter + 1 : null;

  function getHighlightedWordIds(verseId: number): Map<number, string> {
    const map = new Map<number, string>();
    const annots = annotations.get(verseId) || [];
    for (const a of annots) {
      for (const wid of (a.word_ids || [])) {
        map.set(wid, a.confidence);
      }
    }
    return map;
  }

  const selectionVerse = selectionVerseId ? verses.find(v => v.id === selectionVerseId) : null;

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
          {isHebrew && (
            <a href="https://uhg.readthedocs.io/en/latest/front.html" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs hover:shadow-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              title="Hebrew Grammar Reference (UHG)">
              <BookOpen className="w-3.5 h-3.5" />
              UHG
            </a>
          )}
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
            const words = wordsByVerse.get(verse.id) || [];
            const highlightMap = getHighlightedWordIds(verse.id);
            const hasSelection = selectionVerseId === verse.id && selectedWordIds.size > 0;
            const isVerseComplete = completedVerses.has(verse.id);

            return (
              <div key={verse.id}
                className="group rounded-lg p-4 border transition-all hover:shadow-sm"
                style={{
                  backgroundColor: 'var(--verse-bg)',
                  borderColor: hasSelection ? 'var(--primary)' : 'var(--border)',
                  boxShadow: hasSelection ? '0 0 0 1px var(--primary)' : undefined,
                  borderLeft: isVerseComplete ? '3px solid var(--confirmed)' : undefined,
                }}>
                {/* Verse text — segments rendered individually, spaces between word groups */}
                <div className={isHebrew ? 'hebrew-text' : 'greek-text'}>
                  <span className="verse-number">{verse.verse}</span>
                  {words.length > 0 ? (
                    words.map((word, idx) => {
                      const isSelected = selectedWordIds.has(word.id);
                      const highlightConf = highlightMap.get(word.id);
                      const prevWord = words[idx - 1];
                      const nextWord = words[idx + 1];
                      const sameGroupPrev = prevWord && prevWord.word_group === word.word_group;
                      const sameGroupNext = nextWord && nextWord.word_group === word.word_group;
                      // Space only between different word groups
                      const needsSpace = nextWord && nextWord.word_group !== word.word_group;
                      // Rounded corners: round outer edges, flat inner edges within a group
                      const borderRadius = sameGroupPrev && sameGroupNext ? '0'
                        : sameGroupPrev ? (isHebrew ? '3px 0 0 3px' : '0 3px 3px 0')
                        : sameGroupNext ? (isHebrew ? '0 3px 3px 0' : '3px 0 0 3px')
                        : '3px';
                      return (
                        <span key={word.id}>
                          <span
                            onClick={(e) => handleWordClick(word, e)}
                            onMouseEnter={(e) => handleWordHover(word, e)}
                            onMouseLeave={handleWordLeave}
                            className="word-token"
                            style={{
                              cursor: 'pointer',
                              borderRadius,
                              padding: '1px 1px',
                              display: 'inline',
                              transition: 'all 0.15s',
                              backgroundColor: isSelected
                                ? 'color-mix(in srgb, var(--primary) 25%, transparent)'
                                : highlightConf
                                  ? `color-mix(in srgb, var(--${highlightConf}) 12%, transparent)`
                                  : 'transparent',
                              outline: isSelected ? '2px solid var(--primary)' : 'none',
                              outlineOffset: '0px',
                              textDecoration: highlightConf && !isSelected ? 'underline' : 'none',
                              textDecorationColor: highlightConf ? `var(--${highlightConf})` : undefined,
                              textUnderlineOffset: '4px',
                            }}
                          >{word.text}</span>
                          {needsSpace && ' '}
                        </span>
                      );
                    })
                  ) : (
                    <span>{verse.original_text}</span>
                  )}
                </div>

                {/* Annotations + Annotate button */}
                <div className="flex flex-wrap items-center gap-2 mt-3" style={{ direction: 'ltr' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVerseCompletion(verse.id); }}
                    className="p-0.5 rounded hover:opacity-70 transition-opacity"
                    title={isVerseComplete ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {isVerseComplete ? (
                      <CheckCircle className="w-4 h-4" style={{ color: 'var(--confirmed)' }} />
                    ) : (
                      <Circle className="w-4 h-4 opacity-40" style={{ color: 'var(--muted)' }} />
                    )}
                  </button>
                  {verseAnnotations.map(a => (
                    <button key={a.id} onClick={() => openAnnotatePanel(verse.id, a)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--${a.confidence}) 15%, transparent)`,
                        color: `var(--${a.confidence})`,
                        border: `1px solid color-mix(in srgb, var(--${a.confidence}) 30%, transparent)`,
                      }}>
                      <Tag className="w-3 h-3" />
                      {a.metaphor_name}
                      {a.word_ids?.length > 0 && (
                        <span className="opacity-60">({a.word_ids.length}w)</span>
                      )}
                    </button>
                  ))}
                  {/* Word-level annotations as pills */}
                  {(() => {
                    const seen = new Set<number>();
                    const wordAnnots: WordAnnotationData[] = [];
                    for (const w of words) {
                      const lemmaAnnots = annotatedLemmas.get(w.lemma);
                      if (lemmaAnnots) {
                        for (const wa of lemmaAnnots) {
                          if (!seen.has(wa.annotation_id)) {
                            seen.add(wa.annotation_id);
                            wordAnnots.push(wa);
                          }
                        }
                      }
                    }
                    return wordAnnots.map(wa => (
                      <Link key={`wa-${wa.annotation_id}`}
                        href={`/search?q=${wa.strongs || wa.lemma}&edit=${wa.annotation_id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--${wa.confidence || 'hypothesis'}) 15%, transparent)`,
                          color: `var(--${wa.confidence || 'hypothesis'})`,
                          border: `1px solid color-mix(in srgb, var(--${wa.confidence || 'hypothesis'}) 30%, transparent)`,
                        }}>
                        <BookOpen className="w-3 h-3" />
                        {wa.metaphor_name || wa.gloss || wa.strongs || wa.lemma}
                      </Link>
                    ));
                  })()}
                  <button onClick={() => openAnnotatePanel(verse.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-80"
                    style={{ color: 'var(--primary)' }}
                    title="Annotate (⌥A)">
                    <Plus className="w-3 h-3" /> Annotate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Hover parsing tooltip */}
      {hoverWord && (
        <div
          className="fixed z-[60] rounded-lg shadow-xl border p-3 max-w-xs pointer-events-none"
          style={{
            left: `${Math.min(Math.max(hoverWord.x - 120, 8), window.innerWidth - 260)}px`,
            top: `${hoverWord.y}px`,
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className={`text-lg mb-1 font-semibold ${isHebrew ? 'hebrew-text' : 'greek-text'}`}
            style={{ fontSize: '1.3rem' }}>
            {hoverWord.word.text}
          </div>
          <div className="text-xs px-1.5 py-0.5 rounded inline-block" style={{
            backgroundColor: 'var(--surface-2)', color: 'var(--muted)',
          }}>
            {decodeMorph(hoverWord.word.morph, bookInfo.language)}
          </div>
          {hoverWord.word.lemma && (
            <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Lemma: {hoverWord.word.lemma}
            </div>
          )}
        </div>
      )}

      {/* Word Info Popover */}
      {wordInfoWord && !showPanel && (
        <div
          ref={wordInfoRef}
          className="fixed z-[55] rounded-xl shadow-2xl border p-4 w-72"
          style={{
            left: `${Math.min(Math.max(wordInfoWord.x - 144, 8), typeof window !== 'undefined' ? window.innerWidth - 296 : 500)}px`,
            top: `${wordInfoWord.y}px`,
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button onClick={() => { setWordInfoWord(null); setWordAnnotationForm(null); }}
            className="absolute top-2 right-2 p-0.5 rounded hover:opacity-70"
            style={{ color: 'var(--muted)' }}>
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Word display */}
          <div className={`text-xl font-semibold mb-2 ${isHebrew ? 'hebrew-text' : 'greek-text'}`}>
            {wordInfoWord.word.text}
          </div>

          {/* Morphological parsing */}
          <div className="text-xs px-1.5 py-0.5 rounded inline-block mb-2" style={{
            backgroundColor: 'var(--surface-2)', color: 'var(--muted)',
          }}>
            {decodeMorph(wordInfoWord.word.morph, bookInfo.language)}
          </div>

          {/* Lemma */}
          {wordInfoWord.word.lemma && (
            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
              <span className="font-medium">Lemma:</span>{' '}
              <span className={isHebrew ? 'hebrew-text' : 'greek-text'} style={{ fontSize: '0.85rem' }}>
                {wordInfoWord.word.lemma}
              </span>
            </div>
          )}

          {/* Strong's number */}
          {wordInfoWord.word.strongs && (
            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
              <span className="font-medium">Strong&apos;s:</span> {wordInfoWord.word.strongs}
            </div>
          )}

          {/* Root consonants */}
          {wordInfoWord.word.root_consonants && (
            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
              <span className="font-medium">Root:</span>{' '}
              <span className={isHebrew ? 'hebrew-text' : 'greek-text'} style={{ fontSize: '0.85rem' }}>
                {wordInfoWord.word.root_consonants}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t my-2.5" style={{ borderColor: 'var(--border)' }} />

          {/* Existing word annotations + annotate link */}
          {(() => {
            const existingList = wordInfoWord.word.lemma ? (annotatedLemmas.get(wordInfoWord.word.lemma) || []) : [];
            const searchQ = wordInfoWord.word.strongs || wordInfoWord.word.lemma;
            return (
              <div className="space-y-1.5">
                {existingList.map(wa => (
                  <Link key={wa.annotation_id}
                    href={`/search?q=${searchQ}&edit=${wa.annotation_id}`}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity border"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--${wa.confidence || 'hypothesis'}) 8%, transparent)`,
                      borderColor: `color-mix(in srgb, var(--${wa.confidence || 'hypothesis'}) 30%, transparent)`,
                      color: `var(--${wa.confidence || 'hypothesis'})`,
                    }}>
                    <Tag className="w-3 h-3 shrink-0" />
                    <span className="font-medium truncate">{wa.metaphor_name || wa.gloss || 'Annotation'}</span>
                  </Link>
                ))}
                {wordInfoWord.word.lemma && (
                  <Link href={`/search?q=${searchQ}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium w-full justify-center hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                      color: 'var(--primary)',
                      border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                    }}>
                    <Plus className="w-3 h-3" /> Annotate in Lemma View
                  </Link>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Annotation Panel — bottom drawer */}
      {showPanel && selectionVerseId && selectionVerse && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closePanel} />
          <div className="relative w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-t-2xl"
            style={{ backgroundColor: 'var(--surface)' }}>
            {/* Drag handle + header */}
            <div className="sticky top-0 rounded-t-2xl border-b px-5 pt-3 pb-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ backgroundColor: 'var(--border)' }} />
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  {editingAnnotation ? 'Edit Annotation' : 'New Annotation'}
                  <span className="font-normal text-sm ml-2" style={{ color: 'var(--muted)' }}>
                    {selectionVerse.book_name} {selectionVerse.chapter}:{selectionVerse.verse}
                  </span>
                </h2>
                <button onClick={closePanel} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Selected words */}
              {selectedWordIds.size > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const verseWords = wordsByVerse.get(selectionVerseId) || [];
                    return verseWords
                      .filter(w => selectedWordIds.has(w.id))
                      .map(w => (
                        <span key={w.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm border cursor-pointer hover:opacity-70"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                            color: 'var(--primary)',
                          }}
                          onClick={() => {
                            setSelectedWordIds(prev => { const next = new Set(prev); next.delete(w.id); return next; });
                          }}
                        >
                          <span className={isHebrew ? 'hebrew-text' : 'greek-text'} style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>
                            {w.text}
                          </span>
                          <span className="text-[10px] opacity-60">{decodeMorph(w.morph, bookInfo.language)}</span>
                          <X className="w-3 h-3 opacity-50" />
                        </span>
                      ));
                  })()}
                </div>
              )}

              {/* Compact top row: metaphor + domains + confidence */}
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

              {/* Second compact row: mapping + confidence + status */}
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
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={14}
                    placeholder="Analysis, observations, cross-references..."
                    className="w-full p-2 border rounded-lg text-sm resize-y"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', minHeight: '300px' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Pseudocode</label>
                  <textarea value={pseudocode} onChange={e => setPseudocode(e.target.value)} rows={14}
                    placeholder={"class TEMPORAL_CONTAINER extends CONTAINER\n  .originRegion = HEAD\n  בְּרֵאשִׁית instanceof TEMPORAL_CONTAINER\n  HEAD_IS_ORIGIN → .originRegion"}
                    className="w-full p-2 border rounded-lg text-xs resize-y font-mono"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', minHeight: '300px', lineHeight: '1.6' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Reservations / Questions</label>
                  <textarea value={reservations} onChange={e => setReservations(e.target.value)} rows={14}
                    placeholder="Open questions, counterarguments, alternative interpretations..."
                    className="w-full p-2 border rounded-lg text-sm resize-y"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', minHeight: '300px' }} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1 pb-2">
                <button onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white text-sm"
                  style={{ backgroundColor: 'var(--primary)' }}>
                  <Save className="w-4 h-4" /> {editingAnnotation ? 'Update' : 'Save'}
                </button>
                {editingAnnotation && (
                  <button onClick={() => { handleDelete(editingAnnotation.id, selectionVerseId!); closePanel(); }}
                    className="px-4 py-2.5 rounded-lg text-sm border"
                    style={{ color: 'var(--rejected)', borderColor: 'color-mix(in srgb, var(--rejected) 30%, transparent)' }}>
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
