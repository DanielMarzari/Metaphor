import { NextRequest, NextResponse } from 'next/server';
import { getVersesByChapter, searchVerses } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bookId = searchParams.get('book_id');
  const chapter = searchParams.get('chapter');
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    if (q) {
      const results = searchVerses(q, limit);
      return NextResponse.json(results);
    }
    if (bookId && chapter) {
      const verses = getVersesByChapter(parseInt(bookId, 10), parseInt(chapter, 10));
      return NextResponse.json(verses);
    }
    return NextResponse.json({ error: 'Provide book_id+chapter or q parameter' }, { status: 400 });
  } catch (error) {
    console.error('Verses error:', error);
    return NextResponse.json({ error: 'Failed to fetch verses' }, { status: 500 });
  }
}
