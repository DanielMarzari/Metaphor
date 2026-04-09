import { NextRequest, NextResponse } from 'next/server';
import {
  getDomainClassById, updateDomainClass, deleteDomainClass,
  getDomainClassChildren, getDomainClassAncestors,
  getMetaphorDomains, setMetaphorDomains, getPropertyMappings
} from '@/lib/queries';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const dc = getDomainClassById(parseInt(id, 10));
    if (!dc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const children = getDomainClassChildren(parseInt(id, 10));
    const ancestors = getDomainClassAncestors(parseInt(id, 10));
    return NextResponse.json({ ...dc, children, ancestors });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch domain class' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (body.name) body.name = body.name.trim().toUpperCase();
    updateDomainClass(parseInt(id, 10), body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update domain class' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deleteDomainClass(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete domain class' }, { status: 500 });
  }
}
