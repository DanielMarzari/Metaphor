'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, X, Tag, Save, Trash2, BookOpen } from 'lucide-react';

interface Verse {
  id: number; book_id: number; chapter: number; verse: number;
  original_text: string; language: string; abbreviation: string; book_name: string;
}

interface Word {
  id: number; verse_id: number; word_order: number; word_group: number;
  text: string; lemma: string; morph: string;
}

interface Annotation {
  id: number; verse_id: number; metaphor_id: number; metaphor_name: string;
  source_domain: string; target_domain: string; notes: string;
  confidence: string; linguistic_evidence: string; metaphor_category: string;
  word_ids: number[];
}

interface Metaphor {
  id: number; name: string; description: string; category: string; usage_count: number;
}

// --- Morph decoder (client-side) ---

const HEB_VERB_STEM: Record<string, string> = {
  q: 'Qal', N: 'Niphal', p: 'Piel', P: 'Pual', h: 'Hiphil',
  H: 'Hophal', t: 'Hithpael', o: 'Polel', O: 'Polal', r: 'Hithpolel',
  m: 'Poel', M: 'Poal', k: 'Palel', K: 'Pulal', Q: 'Qal Passive',
  l: 'Pilpel', L: 'Polpal', f: 'Hithpalpel', D: 'Nithpael',
};
const HEB_VERB_TYPE: Record<string, string> = {
  p: 'Perf', q: 'Seq Perf', i: 'Impf', w: 'Seq Impf',
  h: 'Cohort', j: 'Juss', v: 'Impv',
  r: 'Ptcp Act', s: 'Ptcp Pass', a: 'Inf Abs', c: 'Inf Cst',
};
const HEB_PERSON: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd' };
const HEB_GENDER: Record<string, string> = { m: 'Masc', f: 'Fem', c: 'Com', b: 'Both' };
const HEB_NUMBER: Record<string, string> = { s: 'Sg', p: 'Pl', d: 'Du' };
const HEB_STATE: Record<string, string> = { a: 'Abs', c: 'Cst', d: 'Det' };
const HEB_NOUN_TYPE: Record<string, string> = { c: 'Common', p: 'Proper' };
const HEB_PARTICLE_TYPE: Record<string, string> = {
  a: 'Affirm', d: 'Article', e: 'Exhort', i: 'Interrog',
  j: 'Interj', m: 'Demonstr', n: 'Neg', o: 'Obj Marker', r: 'Relative',
};
const HEB_POS_SHORT: Record<string, string> = {
  A: 'Adj', C: 'Conj', D: 'Adv', N: 'Noun', P: 'Pron', R: 'Prep', S: 'Suf', T: 'Part', V: 'Verb',
};
const HEB_PRONOUN_TYPE: Record<string, string> = { d: 'Dem', f: 'Indef', i: 'Interrog', p: 'Pers', r: 'Rel' };
const HEB_SUFFIX_TYPE: Record<string, string> = { d: 'Dir He', h: 'Parag He', n: 'Parag Nun', p: 'Pronom' };

function decodeHebrew(morph: string): string {
  if (!morph) return '';
  let code = morph;
  let lang = '';
  if (code.startsWith('H')) code = code.slice(1);
  else if (code.startsWith('A')) { lang = 'Aram '; code = code.slice(1); }
  const pos = code[0];
  const rest = code.slice(1);
  if (pos === 'V') {
    return [lang + 'Verb', HEB_VERB_STEM[rest[0]] || rest[0], HEB_VERB_TYPE[rest[1]] || rest[1],
      HEB_PERSON[rest[2]] || '', HEB_GENDER[rest[3]] || '', HEB_NUMBER[rest[4]] || ''].filter(Boolean).join(' ');
  }
  if (pos === 'N') {
    return [lang + 'Noun', HEB_NOUN_TYPE[rest[0]] || '', HEB_GENDER[rest[1]] || '',
      HEB_NUMBER[rest[2]] || '', HEB_STATE[rest[3]] || ''].filter(Boolean).join(' ');
  }
  if (pos === 'T') return [lang + 'Part', HEB_PARTICLE_TYPE[rest[0]] || ''].filter(Boolean).join(' ');
  if (pos === 'P') return [lang + 'Pron', HEB_PRONOUN_TYPE[rest[0]] || '', HEB_PERSON[rest[1]] || '',
    HEB_GENDER[rest[2]] || '', HEB_NUMBER[rest[3]] || ''].filter(Boolean).join(' ');
  if (pos === 'S') return [lang + 'Suf', HEB_SUFFIX_TYPE[rest[0]] || '', HEB_PERSON[rest[1]] || '',
    HEB_GENDER[rest[2]] || '', HEB_NUMBER[rest[3]] || ''].filter(Boolean).join(' ');
  if (pos === 'A') return [lang + 'Adj', HEB_GENDER[rest[1]] || '', HEB_NUMBER[rest[2]] || '',
    HEB_STATE[rest[3]] || ''].filter(Boolean).join(' ');
  return lang + (HEB_POS_SHORT[pos] || morph);
}

const GK_POS: Record<string, string> = {
  'N-': 'Noun', 'V-': 'Verb', 'RA': 'Art', 'C-': 'Conj', 'RP': 'Pers Pron',
  'RR': 'Rel Pron', 'RD': 'Dem Pron', 'RI': 'Interrog Pron', 'RX': 'Indef Pron',
  'A-': 'Adj', 'D-': 'Adv', 'P-': 'Prep', 'X-': 'Part', 'I-': 'Interj',
};
const GK_TENSE: Record<string, string> = { P: 'Pres', I: 'Impf', F: 'Fut', A: 'Aor', X: 'Perf', Y: 'Plupf' };
const GK_VOICE: Record<string, string> = { A: 'Act', M: 'Mid', P: 'Pass' };
const GK_MOOD: Record<string, string> = { I: 'Ind', D: 'Impv', S: 'Subj', O: 'Opt', N: 'Inf', P: 'Ptcp' };
const GK_CASE: Record<string, string> = { N: 'Nom', G: 'Gen', D: 'Dat', A: 'Acc', V: 'Voc' };
const GK_NUMBER_MAP: Record<string, string> = { S: 'Sg', P: 'Pl' };
const GK_GENDER_MAP: Record<string, string> = { M: 'Masc', F: 'Fem', N: 'Neut' };

function decodeGreek(morph: string): string {
  if (!morph) return '';
  const [pos, parsing] = morph.split('|');
  const posName = GK_POS[pos] || pos;
  if (pos === 'V-' && parsing) {
    const mood = GK_MOOD[parsing[3]] || '';
    if (mood === 'Ptcp') return ['Verb', GK_TENSE[parsing[1]] || '', GK_VOICE[parsing[2]] || '', mood,
      GK_CASE[parsing[4]] || '', GK_NUMBER_MAP[parsing[5]] || '', GK_GENDER_MAP[parsing[6]] || ''].filter(Boolean).join(' ');
    if (mood === 'Inf') return ['Verb', GK_TENSE[parsing[1]] || '', GK_VOICE[parsing[2]] || '', mood].filter(Boolean).join(' ');
    return ['Verb', GK_TENSE[parsing[1]] || '', GK_VOICE[parsing[2]] || '', mood,
      HEB_PERSON[parsing[0]] || '', GK_NUMBER_MAP[parsing[5]] || ''].filter(Boolean).join(' ');
  }
  if (parsing) {
    return [posName, GK_CASE[parsing[4]] || '', GK_NUMBER_MAP[parsing[5]] || '',
      GK_GENDER_MAP[parsing[6]] || ''].filter(Boolean).join(' ');
  }
  return posName;
}

function decodeMorph(morph: string, language: string): string {
  return language === 'hebrew' ? decodeHebrew(morph) : decodeGreek(morph);
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
  }

  function clearSelection() {
    setSelectedWordIds(new Set());
    setSelectionVerseId(null);
  }

  function openAnnotatePanel(verseId: number, annotation?: Annotation) {
    setShowPanel(true);
    if (annotation) {
      setEditingAnnotation(annotation);
      setSelectedMetaphor(annotation.metaphor_id);
      setSourceDomain(annotation.source_domain || '');
      setTargetDomain(annotation.target_domain || '');
      setNotes(annotation.notes || '');
      setConfidence(annotation.confidence);
      setLinguisticEvidence(annotation.linguistic_evidence || '');
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
    setNotes('');
    setConfidence('draft');
    setLinguisticEvidence('');
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
      notes: notes || undefined,
      confidence,
      linguistic_evidence: linguisticEvidence || undefined,
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

            return (
              <div key={verse.id}
                className="group rounded-lg p-4 border transition-all hover:shadow-sm"
                style={{
                  backgroundColor: 'var(--verse-bg)',
                  borderColor: hasSelection ? 'var(--primary)' : 'var(--border)',
                  boxShadow: hasSelection ? '0 0 0 1px var(--primary)' : undefined,
                }}>
                {/* Verse text — segments rendered individually, spaces between word groups */}
                <div className={isHebrew ? 'hebrew-text' : 'greek-text'}>
                  <span className="verse-number">{verse.verse}</span>
                  {words.length > 0 ? (
                    words.map((word, idx) => {
                      const isSelected = selectedWordIds.has(word.id);
                      const highlightConf = highlightMap.get(word.id);
                      const nextWord = words[idx + 1];
                      // Add space between word groups, not between segments within a group
                      const needsSpace = nextWord && nextWord.word_group !== word.word_group;
                      return (
                        <span key={word.id}>
                          <span
                            onClick={(e) => handleWordClick(word, e)}
                            onMouseEnter={(e) => handleWordHover(word, e)}
                            onMouseLeave={handleWordLeave}
                            className="word-token"
                            style={{
                              cursor: 'pointer',
                              borderRadius: '3px',
                              padding: '1px 2px',
                              display: 'inline',
                              transition: 'all 0.15s',
                              backgroundColor: isSelected
                                ? 'color-mix(in srgb, var(--primary) 25%, transparent)'
                                : highlightConf
                                  ? `color-mix(in srgb, var(--${highlightConf}) 12%, transparent)`
                                  : 'transparent',
                              outline: isSelected ? '2px solid var(--primary)' : 'none',
                              outlineOffset: '1px',
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
                  <button onClick={() => openAnnotatePanel(verse.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-80"
                    style={{ color: 'var(--primary)' }}>
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

      {/* Annotation Panel — bottom drawer */}
      {showPanel && selectionVerseId && selectionVerse && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closePanel} />
          <div className="relative w-full max-h-[75vh] overflow-y-auto shadow-2xl rounded-t-2xl"
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

              {/* Two-column layout for compact form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Metaphor selection */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Metaphor</label>
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

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Linguistic Evidence</label>
                  <input type="text" value={linguisticEvidence} onChange={e => setLinguisticEvidence(e.target.value)}
                    placeholder="Specific words..." className="w-full p-2 border rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Confidence</label>
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="Your analysis and observations..."
                    className="w-full p-2 border rounded-lg text-sm resize-y"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
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
