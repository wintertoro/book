import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getBookById, updateBookAuthor } from '@/lib/storage';
import { getBookAuthor } from '@/lib/author-search';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const book = await getBookById(session.user.id, id);
    
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // If book already has an author, return it
    if (book.author && book.author.trim().length > 0) {
      return NextResponse.json({ 
        success: true, 
        author: book.author,
        wasUpdated: false 
      });
    }

    // Search for author
    const author = await getBookAuthor(book.title);
    
    if (author) {
      // Update the book with the found author
      const updated = await updateBookAuthor(session.user.id, id, author);
      
      if (updated) {
        return NextResponse.json({ 
          success: true, 
          author,
          wasUpdated: true 
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to update book' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        author: null,
        wasUpdated: false,
        message: 'Author not found' 
      });
    }
  } catch (error) {
    console.error('Error searching for author:', error);
    return NextResponse.json(
      { error: 'Failed to search for author' },
      { status: 500 }
    );
  }
}

