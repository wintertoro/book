import { NextRequest, NextResponse } from 'next/server';
import { getAllBooks } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
    const books = await getAllBooks();
    
    if (format === 'csv') {
      // Generate CSV
      const headers = ['Title', 'Added Date'];
      const rows = books.map(book => [
        `"${book.title.replace(/"/g, '""')}"`,
        new Date(book.addedAt).toLocaleDateString(),
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="book-library.csv"',
        },
      });
    } else {
      // Generate JSON
      return NextResponse.json(
        { books },
        {
          headers: {
            'Content-Disposition': 'attachment; filename="book-library.json"',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error exporting books:', error);
    return NextResponse.json(
      { error: 'Failed to export books' },
      { status: 500 }
    );
  }
}






