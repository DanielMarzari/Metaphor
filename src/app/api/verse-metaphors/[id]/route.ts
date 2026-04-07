import { NextRequest, NextResponse } from 'next/server';
import { updateAnnotation, deleteAnnotation } from '@/lib/queries';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    updateAnnotation(parseInt(id, 10), body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update annotation' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deleteAnnotation(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete annotation' }, { status: 500 });
  }
}
