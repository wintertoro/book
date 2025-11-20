import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCoordinator } from '@/lib/agents/coordinator';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const coordinator = getCoordinator();
    const context = coordinator.createContext(session);
    
    const result = await coordinator.executeAgent('wishlist', context, {
      action: 'get',
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch wish list' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ wishList: result.data || [] });
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
    
    // Default to 'add' if no action is provided but title is present
    const resolvedAction = action || (title ? 'add' : undefined);
    
    const coordinator = getCoordinator();
    const context = coordinator.createContext(session);
    
    if (resolvedAction === 'add') {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return NextResponse.json(
          { error: 'Book title is required' },
          { status: 400 }
        );
      }
      
      const result = await coordinator.executeAgent('wishlist', context, {
        action: 'add',
        title: title.trim(),
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to add to wishlist' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        book: result.data?.book || null,
        isDuplicate: result.data?.isDuplicate || false,
      });
    } else if (resolvedAction === 'move-to-library') {
      if (!id) {
        return NextResponse.json(
          { error: 'Book ID is required' },
          { status: 400 }
        );
      }
      
      const result = await coordinator.executeAgent('wishlist', context, {
        action: 'move-to-library',
        id,
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to move to library' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        book: result.data?.book || null,
        isDuplicate: result.data?.isDuplicate || false,
      });
    } else if (resolvedAction === 'move-from-library') {
      if (!id) {
        return NextResponse.json(
          { error: 'Book ID is required' },
          { status: 400 }
        );
      }
      
      const result = await coordinator.executeAgent('wishlist', context, {
        action: 'move-from-library',
        id,
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to move to wishlist' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        book: result.data?.book || null,
        isDuplicate: result.data?.isDuplicate || false,
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
    
    const coordinator = getCoordinator();
    const context = coordinator.createContext(session);
    
    const result = await coordinator.executeAgent('wishlist', context, {
      action: 'delete',
      id,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete from wish list' },
        { status: 500 }
      );
    }
    
    if (!result.data) {
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

