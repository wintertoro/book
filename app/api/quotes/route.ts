import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchQuotes, addQuote, deleteQuote, getBookById } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('q');

    if (!searchTerm) {
      return NextResponse.json(
        { error: 'Search term is required' },
        { status: 400 }
      );
    }

    const results = await searchQuotes(session.user.id, searchTerm);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to search quotes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bookId, pagePhotoId, text, pageNumber, boundingBox } = body;

    if (!bookId || !pagePhotoId || !text) {
      return NextResponse.json(
        { error: 'bookId, pagePhotoId, and text are required' },
        { status: 400 }
      );
    }

    const quote = await addQuote(
      session.user.id,
      bookId,
      pagePhotoId,
      text,
      pageNumber,
      boundingBox
    );

    return NextResponse.json({ success: true, quote });
  } catch (error) {
    console.error('Error adding quote:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add quote' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const quoteId = searchParams.get('quoteId');

    if (!bookId || !quoteId) {
      return NextResponse.json(
        { error: 'bookId and quoteId are required' },
        { status: 400 }
      );
    }

    const success = await deleteQuote(session.user.id, bookId, quoteId);
    if (!success) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    );
  }
}

