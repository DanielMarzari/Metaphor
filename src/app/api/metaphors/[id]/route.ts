import { NextRequest, NextResponse } from 'next/server';
import { getMetaphorById, updateMetaphor, deleteMetaphor } from '@/lib/queries';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const metaphor = getMetaphorById(parseInt(id, 10));
    if (!metaphor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(metaphor);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metaphor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (body.name) body.name = body.name.trim().toUpperCase();
    updateMetaphor(parseInt(id, 10), body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update metaphor' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deleteMetaphor(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message?.includes('FOREIGN KEY')) {
      return NextResponse.json({ error: 'Cannot delete: metaphor has annotations' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete metaphor' }, { status: 500 });
  }
}
