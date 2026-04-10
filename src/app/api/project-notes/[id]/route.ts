import { NextRequest, NextResponse } from 'next/server';
import { getProjectNoteById, updateProjectNote, deleteProjectNote } from '@/lib/queries';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const note = getProjectNoteById(parseInt(id, 10));
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    updateProjectNote(parseInt(id, 10), {
      title: body.title,
      content: body.content,
      note_type: body.note_type,
      pinned: body.pinned,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update project note error:', error);
    return NextResponse.json({ error: 'Failed to update project note' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deleteProjectNote(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete project note error:', error);
    return NextResponse.json({ error: 'Failed to delete project note' }, { status: 500 });
  }
}
