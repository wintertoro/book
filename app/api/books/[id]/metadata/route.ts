import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCoordinator } from '@/lib/agents/coordinator';
import { updateBook } from '@/lib/storage';
import type { BookMetadata } from '@/lib/storage';

/**
 * POST /api/books/[id]/metadata
 * Fetch and update book metadata from Google Books API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const coordinator = getCoordinator();
    const context = coordinator.createContext(session);
    const bookId = id;

    // Get book title and author from request body
    const body = await request.json();
    const { title, author } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Fetch metadata
    const metadataResult = await coordinator.executeAgent(
      'metadata',
      context,
      { title, author }
    );

    if (!metadataResult.success || !metadataResult.data) {
      return NextResponse.json(
        { error: 'Failed to fetch metadata', metadata: null },
        { status: 404 }
      );
    }

    const metadataData = metadataResult.data as {
      isbn?: string;
      isbn13?: string;
      description?: string;
      pageCount?: number;
      publishedDate?: string;
      publisher?: string;
      language?: string;
      categories?: string[];
      averageRating?: number;
      ratingsCount?: number;
      coverImageUrl?: string;
      thumbnailUrl?: string;
    };

    // Convert to BookMetadata format
    const bookMetadata: BookMetadata = {
      isbn: metadataData.isbn,
      isbn13: metadataData.isbn13,
      description: metadataData.description,
      pageCount: metadataData.pageCount,
      publishedDate: metadataData.publishedDate,
      publisher: metadataData.publisher,
      language: metadataData.language,
      categories: metadataData.categories,
      averageRating: metadataData.averageRating,
      ratingsCount: metadataData.ratingsCount,
      coverImageUrl: metadataData.coverImageUrl,
      thumbnailUrl: metadataData.thumbnailUrl,
    };

    // Update book with metadata
    const updatedBook = await updateBook(session.user.id, bookId, {
      metadata: bookMetadata,
      // Note: author is stored separately on Book, not in metadata
    });

    if (!updatedBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({ book: updatedBook, metadata: bookMetadata });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

