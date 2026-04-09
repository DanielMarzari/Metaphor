import { NextRequest, NextResponse } from 'next/server';
import { addMetaphorNesting, removeMetaphorNesting, getMetaphorChildren, getMetaphorParents } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parentId = searchParams.get('parent_id');
  const childId = searchParams.get('child_id');
  try {
    if (parentId) return NextResponse.json(getMetaphorChildren(parseInt(parentId, 10)));
    if (childId) return NextResponse.json(getMetaphorParents(parseInt(childId, 10)));
    return NextResponse.json({ error: 'parent_id or child_id required' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch nesting' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.parent_id || !body.child_id) {
      return NextResponse.json({ error: 'parent_id and child_id required' }, { status: 400 });
    }
    if (body.parent_id === body.child_id) {
      return NextResponse.json({ error: 'Cannot nest a metaphor under itself' }, { status: 400 });
    }
    addMetaphorNesting(body.parent_id, body.child_id, body.sort_order || 0);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create nesting' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    removeMetaphorNesting(body.parent_id, body.child_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove nesting' }, { status: 500 });
  }
}
