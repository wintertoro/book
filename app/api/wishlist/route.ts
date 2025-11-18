import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllWishList, deleteFromWishList, addToWishList, moveToLibrary, moveToWishList } from '@/lib/storage';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const wishList = await getAllWishList(session.user.id);
    return NextResponse.json({ wishList });
  } catch (error) {
    console.error('Error fetching wish list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wish list' },
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
    
    const { title, action, id } = await request.json();
    
    if (action === 'add') {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return NextResponse.json(
          { error: 'Book title is required' },
          { status: 400 }
        );
      }
      
      const result = await addToWishList(session.user.id, title.trim());
      
      return NextResponse.json({
        success: true,
        book: result.book,
        isDuplicate: result.isDuplicate,
      });
    } else if (action === 'move-to-library') {
      if (!id) {
        return NextResponse.json(
          { error: 'Book ID is required' },
          { status: 400 }
        );
      }
      
      const result = await moveToLibrary(session.user.id, id);
      
      return NextResponse.json({
        success: true,
        book: result.book,
        isDuplicate: result.isDuplicate,
      });
    } else if (action === 'move-from-library') {
      if (!id) {
        return NextResponse.json(
          { error: 'Book ID is required' },
          { status: 400 }
        );
      }
      
      const result = await moveToWishList(session.user.id, id);
      
      return NextResponse.json({
        success: true,
        book: result.book,
        isDuplicate: result.isDuplicate,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing wish list request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
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
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }
    
    const success = await deleteFromWishList(session.user.id, id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting from wish list:', error);
    return NextResponse.json(
      { error: 'Failed to delete from wish list' },
      { status: 500 }
    );
  }
}

