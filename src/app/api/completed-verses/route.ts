import { NextRequest, NextResponse } from 'next/server';
import { markVerseComplete, unmarkVerseComplete, getCompletedVersesForChapter, isVerseComplete } from '@/lib/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verseId = searchParams.get('verse_id');
    const bookId = searchParams.get('book_id');
    const chapter = searchParams.get('chapter');

    if (verseId) {
      const complete = isVerseComplete(parseInt(verseId, 10));
      return NextResponse.json({ verse_id: parseInt(verseId, 10), complete });
    }

    if (bookId && chapter) {
      const completed = getCompletedVersesForChapter(parseInt(bookId, 10), parseInt(chapter, 10));
      return NextResponse.json(completed.map((r: any) => r.verse_id));
    }

    return NextResponse.json({ error: 'Provide verse_id or book_id+chapter' }, { status: 400 });
  } catch (error) {
    console.error('Completed verses GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch completed verses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.verse_id) {
      return NextResponse.json({ error: 'verse_id required' }, { status: 400 });
    }
    markVerseComplete(body.verse_id);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Mark verse complete error:', error);
    return NextResponse.json({ error: 'Failed to mark verse complete' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.verse_id) {
      return NextResponse.json({ error: 'verse_id required' }, { status: 400 });
    }
    unmarkVerseComplete(body.verse_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unmark verse complete error:', error);
    return NextResponse.json({ error: 'Failed to unmark verse' }, { status: 500 });
  }
}
