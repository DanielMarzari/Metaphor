import { NextRequest, NextResponse } from 'next/server';
import { getLemmaEquationEntries, upsertLemmaEquation } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const strongs = searchParams.get('strongs') || undefined;
  const lemma = searchParams.get('lemma') || undefined;
  const language = searchParams.get('language') || undefined;
  const limit = parseInt(searchParams.get('limit') || '500', 10);

  try {
    const entries = getLemmaEquationEntries({ strongs, lemma, language }, limit);
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Lemma equations GET error:', error);
    return NextResponse.json({ error: 'Failed to load lemma equations' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const word_id = Number(body.word_id);
    if (!Number.isFinite(word_id) || word_id <= 0) {
      return NextResponse.json({ error: 'word_id required' }, { status: 400 });
    }
    const result = upsertLemmaEquation(word_id, body.modifier ?? '');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Lemma equations PUT error:', error);
    return NextResponse.json({ error: 'Failed to save equation' }, { status: 500 });
  }
}
