import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateBook, getBookById } from '@/lib/storage';
import type { ReadingProgress } from '@/lib/storage';

/**
 * PUT /api/books/[id]/reading-progress
 * Update reading progress for a book
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId } = await params;
    const body = await request.json();
    const { status, currentPage, rating, notes, lentTo } = body;

    // Validate status
    const validStatuses = ['unread', 'reading', 'completed', 'dnf', 'lent'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Get current book
    const book = await getBookById(session.user.id, bookId);
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Build reading progress update
    const readingProgress: ReadingProgress = {
      ...book.readingProgress,
      status: status || book.readingProgress?.status || 'unread',
      currentPage: currentPage !== undefined ? currentPage : book.readingProgress?.currentPage,
      rating: rating !== undefined ? rating : book.readingProgress?.rating,
      notes: notes !== undefined ? notes : book.readingProgress?.notes,
      lentTo: lentTo !== undefined ? lentTo : book.readingProgress?.lentTo,
    };

    // Set timestamps based on status
    if (status === 'reading' && !readingProgress.startedAt) {
      readingProgress.startedAt = new Date().toISOString();
    }
    if (status === 'completed' && !readingProgress.completedAt) {
      readingProgress.completedAt = new Date().toISOString();
    }

    // Update book
    const updatedBook = await updateBook(session.user.id, bookId, {
      readingProgress,
    });

    if (!updatedBook) {
      return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
    }

    return NextResponse.json({ book: updatedBook });
  } catch (error) {
    console.error('Error updating reading progress:', error);
    return NextResponse.json(
      { error: 'Failed to update reading progress' },
      { status: 500 }
    );
  }
}

