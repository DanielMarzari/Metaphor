import { NextRequest, NextResponse } from 'next/server';
import { getDomainClasses, createDomainClass } from '@/lib/queries';

export async function GET() {
  try {
    return NextResponse.json(getDomainClasses());
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch domain classes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const result = createDomainClass(body.name.trim().toUpperCase(), body.parent_id, body.description);
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'A domain class with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create domain class' }, { status: 500 });
  }
}
