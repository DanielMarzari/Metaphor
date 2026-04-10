import { NextRequest, NextResponse } from 'next/server';
import { getProjectNotes, createProjectNote } from '@/lib/queries';

export async function GET() {
  try {
    const notes = getProjectNotes();
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Project notes error:', error);
    return NextResponse.json({ error: 'Failed to fetch project notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title && !body.content) {
      return NextResponse.json({ error: 'Title or content required' }, { status: 400 });
    }
    const result = createProjectNote({
      title: body.title || '',
      content: body.content || '',
      note_type: body.note_type,
      pinned: body.pinned,
    });
    return NextResponse.json({ id: result.lastInsertRowid, success: true }, { status: 201 });
  } catch (error) {
    console.error('Create project note error:', error);
    return NextResponse.json({ error: 'Failed to create project note' }, { status: 500 });
  }
}
