import { NextRequest, NextResponse } from 'next/server';
import {
  getMetaphorById, updateMetaphor, deleteMetaphor,
  getMetaphorChildren, getMetaphorParents,
  getMetaphorDomains, setMetaphorDomains, getPropertyMappings,
  createPropertyMapping, deletePropertyMapping
} from '@/lib/queries';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const metaphor = getMetaphorById(parseInt(id, 10));
    if (!metaphor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const children = getMetaphorChildren(parseInt(id, 10));
    const parents = getMetaphorParents(parseInt(id, 10));
    const domains = getMetaphorDomains(parseInt(id, 10));
    const propertyMappings = getPropertyMappings(parseInt(id, 10));
    return NextResponse.json({ ...metaphor, children, parents, domains, propertyMappings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metaphor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (body.name) body.name = body.name.trim().toUpperCase();

    // Handle domain links
    if (body.source_domain_id !== undefined || body.target_domain_id !== undefined) {
      setMetaphorDomains(parseInt(id, 10), body.source_domain_id, body.target_domain_id);
    }

    // Handle property mappings
    if (body.add_property_mapping) {
      const pm = body.add_property_mapping;
      createPropertyMapping(parseInt(id, 10), pm.source_property_id, pm.target_property_id, pm.description);
    }
    if (body.remove_property_mapping_id) {
      deletePropertyMapping(body.remove_property_mapping_id);
    }

    // Update core metaphor fields
    const { source_domain_id, target_domain_id, add_property_mapping, remove_property_mapping_id, children, parents, domains, propertyMappings, ...metaphorData } = body;
    if (Object.keys(metaphorData).length > 0) {
      updateMetaphor(parseInt(id, 10), metaphorData);
    }

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
