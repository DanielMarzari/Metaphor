import { NextRequest, NextResponse } from 'next/server';
import { getExportData, getBooks } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') || 'json';
  const bookId = searchParams.get('book_id') ? parseInt(searchParams.get('book_id')!, 10) : undefined;
  const metaphorId = searchParams.get('metaphor_id') ? parseInt(searchParams.get('metaphor_id')!, 10) : undefined;
  const confidence = searchParams.get('confidence') || undefined;

  try {
    const data = getExportData({ book_id: bookId, metaphor_id: metaphorId, confidence });

    if (format === 'csv' || format === 'tsv') {
      const sep = format === 'csv' ? ',' : '\t';
      const headers = ['Book', 'Abbreviation', 'Chapter', 'Verse', 'Metaphor', 'Category', 'Source Domain', 'Target Domain', 'Confidence', 'Notes', 'Linguistic Evidence', 'Created', 'Updated'];
      const rows = (data as any[]).map(r =>
        [r.book, r.abbreviation, r.chapter, r.verse, r.metaphor, r.category || '', r.source_domain || '', r.target_domain || '', r.confidence, (r.notes || '').replace(/[\n\r\t]/g, ' '), (r.linguistic_evidence || '').replace(/[\n\r\t]/g, ' '), r.created_at, r.updated_at]
          .map(v => format === 'csv' ? `"${String(v).replace(/"/g, '""')}"` : String(v))
          .join(sep)
      );
      const content = [headers.join(sep), ...rows].join('\n');
      return new NextResponse(content, {
        headers: {
          'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'text/tab-separated-values; charset=utf-8',
          'Content-Disposition': `attachment; filename="metaphor-export.${format}"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
