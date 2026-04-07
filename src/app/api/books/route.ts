import { NextResponse } from 'next/server';
import { getBooks } from '@/lib/queries';

export async function GET() {
  try {
    const books = getBooks();
    return NextResponse.json(books);
  } catch (error) {
    console.error('Books error:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}
