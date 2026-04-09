import { NextRequest, NextResponse } from 'next/server';
import { getWordsForVerse, getWordsForVerses } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const verseId = searchParams.get('verse_id');
  const verseIds = searchParams.get('verse_ids');

  try {
    if (verseIds) {
      const ids = verseIds.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      const words = getWordsForVerses(ids);
      return NextResponse.json(words);
    }
    if (verseId) {
      const words = getWordsForVerse(parseInt(verseId, 10));
      return NextResponse.json(words);
    }
    return NextResponse.json({ error: 'verse_id or verse_ids required' }, { status: 400 });
  } catch (error) {
    console.error('Words error:', error);
    return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
  }
}
