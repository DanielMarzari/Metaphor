import { NextRequest, NextResponse } from 'next/server';
import {
  getWordsForVerse, getWordsForVerses, searchWords,
  searchWordsByStrongs, searchWordsByConsonants, searchWordsByGreekLemma,
  getVersesContainingLemma, getVersesContainingStrongs,
} from '@/lib/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const verseId = searchParams.get('verse_id');
  const verseIds = searchParams.get('verse_ids');
  const q = searchParams.get('q');
  const strongs = searchParams.get('strongs');
  const consonants = searchParams.get('consonants');
  const greekLemma = searchParams.get('greek_lemma');
  const lemma = searchParams.get('lemma');
  const language = searchParams.get('language');
  const versesFor = searchParams.get('verses_for'); // 'lemma' or 'strongs'
  const limit = parseInt(searchParams.get('limit') || '200', 10);

  try {
    // Verse lookup for a specific lemma or Strong's number
    if (versesFor === 'strongs' && strongs) {
      return NextResponse.json(getVersesContainingStrongs(strongs, limit));
    }
    if (versesFor === 'lemma' && lemma && language) {
      return NextResponse.json(getVersesContainingLemma(lemma, language, limit));
    }

    // Word search modes
    if (q) {
      return NextResponse.json(searchWords(q, limit));
    }
    if (strongs) {
      return NextResponse.json(searchWordsByStrongs(strongs, limit));
    }
    if (consonants) {
      return NextResponse.json(searchWordsByConsonants(consonants, limit));
    }
    if (greekLemma) {
      return NextResponse.json(searchWordsByGreekLemma(greekLemma, limit));
    }

    // Original verse word lookup
    if (verseIds) {
      const ids = verseIds.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      const words = getWordsForVerses(ids);
      return NextResponse.json(words);
    }
    if (verseId) {
      const words = getWordsForVerse(parseInt(verseId, 10));
      return NextResponse.json(words);
    }
    return NextResponse.json({ error: 'verse_id, verse_ids, q, strongs, consonants, or greek_lemma required' }, { status: 400 });
  } catch (error) {
    console.error('Words error:', error);
    return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
  }
}
