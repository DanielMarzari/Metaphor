import { NextRequest, NextResponse } from 'next/server';
import { getAnnotationsForVerse, getAnnotationsForMetaphor, createAnnotation } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const verseId = searchParams.get('verse_id');
  const metaphorId = searchParams.get('metaphor_id');

  try {
    if (metaphorId) {
      const annotations = getAnnotationsForMetaphor(parseInt(metaphorId, 10));
      return NextResponse.json(annotations);
    }
    if (verseId) {
      const annotations = getAnnotationsForVerse(parseInt(verseId, 10));
      return NextResponse.json(annotations);
    }
    return NextResponse.json({ error: 'verse_id or metaphor_id required' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.verse_id || !body.metaphor_id) {
      return NextResponse.json({ error: 'verse_id and metaphor_id are required' }, { status: 400 });
    }
    const result = createAnnotation(body);
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error('Create annotation error:', error);
    return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 });
  }
}
