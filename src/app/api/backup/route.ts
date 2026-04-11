import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    const metaphors = db.prepare('SELECT * FROM metaphors ORDER BY id').all();
    const verse_metaphors = db.prepare('SELECT * FROM verse_metaphors ORDER BY id').all();
    const annotation_words = db.prepare('SELECT * FROM annotation_words ORDER BY id').all();
    const word_annotations = db.prepare('SELECT * FROM word_annotations ORDER BY id').all();
    const domain_classes = db.prepare('SELECT * FROM domain_classes ORDER BY id').all();
    const domain_properties = db.prepare('SELECT * FROM domain_properties ORDER BY id').all();
    const metaphor_domains = db.prepare('SELECT * FROM metaphor_domains ORDER BY id').all();
    const property_mappings = db.prepare('SELECT * FROM property_mappings ORDER BY id').all();
    const metaphor_nesting = db.prepare('SELECT * FROM metaphor_nesting ORDER BY id').all();
    const project_notes = db.prepare('SELECT * FROM project_notes ORDER BY id').all();
    const completed_verses = db.prepare('SELECT * FROM completed_verses ORDER BY id').all();

    const backup = {
      version: 1,
      exported_at: new Date().toISOString(),
      data: {
        metaphors,
        verse_metaphors,
        annotation_words,
        word_annotations,
        domain_classes,
        domain_properties,
        metaphor_domains,
        property_mappings,
        metaphor_nesting,
        project_notes,
        completed_verses,
      },
    };

    const json = JSON.stringify(backup, null, 2);

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="metaphor-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}
