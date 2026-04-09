import { NextRequest, NextResponse } from 'next/server';
import { getDomainProperties, getInheritedProperties, createDomainProperty } from '@/lib/queries';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const own = getDomainProperties(parseInt(id, 10));
    const inherited = getInheritedProperties(parseInt(id, 10));
    return NextResponse.json({ own, inherited });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const result = createDomainProperty(parseInt(id, 10), body.name.trim(), body.description);
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Property already exists on this class' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 });
  }
}
