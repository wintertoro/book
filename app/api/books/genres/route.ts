import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { backfillGenres, updateBookGenres, getAllBooks } from '@/lib/storage';

// Backfill genres for all books
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { action, bookId, genres } = await request.json();
    
    if (action === 'backfill') {
      const result = await backfillGenres(session.user.id);
      return NextResponse.json({
        success: true,
        ...result,
      });
    }
    
    if (action === 'update' && bookId && genres) {
      const success = await updateBookGenres(session.user.id, bookId, genres);
      if (!success) {
        return NextResponse.json(
          { error: 'Book not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating genres:', error);
    return NextResponse.json(
      { error: 'Failed to update genres' },
      { status: 500 }
    );
  }
}

// Get all unique genres from user's books
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const books = await getAllBooks(session.user.id);
    const genresSet = new Set<string>();
    
    books.forEach(book => {
      if (book.genres) {
        book.genres.forEach(genre => genresSet.add(genre));
      }
    });
    
    const genres = Array.from(genresSet).sort();
    
    return NextResponse.json({ genres });
  } catch (error) {
    console.error('Error fetching genres:', error);
    return NextResponse.json(
      { error: 'Failed to fetch genres' },
      { status: 500 }
    );
  }
}

