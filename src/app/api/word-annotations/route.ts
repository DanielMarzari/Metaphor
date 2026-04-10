import { NextRequest, NextResponse } from 'next/server';
import { getWordAnnotations, createWordAnnotation, getAnnotatedLemmasForChapter } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bookId = searchParams.get('book_id');
  const chapter = searchParams.get('chapter');

  try {
    if (bookId && chapter) {
      // Get annotated lemmas for a specific chapter
      return NextResponse.json(getAnnotatedLemmasForChapter(parseInt(bookId), parseInt(chapter)));
    }
    return NextResponse.json(getWordAnnotations());
  } catch (error) {
    console.error('Word annotations error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.lemma || !data.language) {
      return NextResponse.json({ error: 'lemma and language required' }, { status: 400 });
    }
    const result = createWordAnnotation(data);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Create word annotation error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
