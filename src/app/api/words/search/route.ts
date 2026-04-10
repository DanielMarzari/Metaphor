import { NextRequest, NextResponse } from 'next/server';
import { searchWords, getVersesContainingLemma, getVersesContainingStrongs } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q');
  const lemma = searchParams.get('lemma');
  const language = searchParams.get('language');
  const strongs = searchParams.get('strongs');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    if (lemma && language) {
      // Get verses containing a specific lemma
      const verses = getVersesContainingLemma(lemma, language, limit);
      return NextResponse.json(verses);
    }
    if (strongs) {
      const verses = getVersesContainingStrongs(strongs, limit);
      return NextResponse.json(verses);
    }
    if (q) {
      const results = searchWords(q, limit);
      return NextResponse.json(results);
    }
    return NextResponse.json({ error: 'Provide q, lemma+language, or strongs parameter' }, { status: 400 });
  } catch (error) {
    console.error('Word search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
