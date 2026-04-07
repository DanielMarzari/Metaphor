import { NextRequest, NextResponse } from 'next/server';
import { getVerseById, getAnnotationsForVerse } from '@/lib/queries';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const verse = getVerseById(parseInt(id, 10));
    if (!verse) return NextResponse.json({ error: 'Verse not found' }, { status: 404 });
    const annotations = getAnnotationsForVerse(parseInt(id, 10));
    return NextResponse.json({ ...verse, annotations });
  } catch (error) {
    console.error('Verse error:', error);
    return NextResponse.json({ error: 'Failed to fetch verse' }, { status: 500 });
  }
}
