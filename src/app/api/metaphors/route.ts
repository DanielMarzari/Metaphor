import { NextRequest, NextResponse } from 'next/server';
import { getMetaphors, createMetaphor } from '@/lib/queries';

export async function GET() {
  try {
    const metaphors = getMetaphors();
    return NextResponse.json(metaphors);
  } catch (error) {
    console.error('Metaphors error:', error);
    return NextResponse.json({ error: 'Failed to fetch metaphors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const result = createMetaphor(body.name.trim().toUpperCase(), body.description, body.category);
    return NextResponse.json({ id: result.lastInsertRowid, name: body.name.trim().toUpperCase() }, { status: 201 });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'A metaphor with this name already exists' }, { status: 409 });
    }
    console.error('Create metaphor error:', error);
    return NextResponse.json({ error: 'Failed to create metaphor' }, { status: 500 });
  }
}
