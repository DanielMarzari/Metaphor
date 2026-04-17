import { NextRequest, NextResponse } from 'next/server';
import { getLemmaSolution, upsertLemmaSolution } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const strongs = request.nextUrl.searchParams.get('strongs');
  if (!strongs) return NextResponse.json({ error: 'strongs required' }, { status: 400 });
  try {
    return NextResponse.json(getLemmaSolution(strongs));
  } catch (error) {
    console.error('Lemma solutions GET error:', error);
    return NextResponse.json({ error: 'Failed to load solution' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const strongs = String(body.strongs || '').trim();
    if (!strongs) return NextResponse.json({ error: 'strongs required' }, { status: 400 });
    return NextResponse.json(upsertLemmaSolution(strongs, body.content ?? ''));
  } catch (error) {
    console.error('Lemma solutions PUT error:', error);
    return NextResponse.json({ error: 'Failed to save solution' }, { status: 500 });
  }
}
