import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateBook } from '@/lib/storage';
import { ReadingStatus } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId, status, currentPage, rating } = await req.json();

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (status) updates.readingStatus = status as ReadingStatus;
    if (currentPage !== undefined) updates.currentPage = currentPage;
    if (rating !== undefined) updates.rating = rating;

    if (status === 'reading' && !updates.dateStarted) {
      updates.dateStarted = new Date().toISOString();
    } else if (status === 'completed' && !updates.dateFinished) {
      updates.dateFinished = new Date().toISOString();
    }

    const updatedBook = await updateBook(session.user.id, bookId, updates);

    if (!updatedBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({ book: updatedBook });
  } catch (error) {
    console.error('Error updating book status:', error);
    return NextResponse.json(
      { error: 'Failed to update book status' },
      { status: 500 }
    );
  }
}
