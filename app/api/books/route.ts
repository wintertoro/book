import { NextRequest, NextResponse } from 'next/server';
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
    
    const result = await coordinator.executeAgent('book', context, {
      action: 'get',
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch books' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ books: result.data || [] });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
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
    
    const { title, sourceImage, author, ocrText } = await request.json();
    
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Book title is required' },
        { status: 400 }
      );
    }
    
    const coordinator = getCoordinator();
    const context = coordinator.createContext(session);
    
    const result = await coordinator.executeAgent('book', context, {
      action: 'add',
      title: title.trim(),
      sourceImage,
      author,
      ocrText,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add book' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      book: result.data?.book || null,
      isDuplicate: result.data?.isDuplicate || false,
    });
  } catch (error) {
    console.error('Error adding book:', error);
    return NextResponse.json(
      { error: 'Failed to add book' },
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
    
    const result = await coordinator.executeAgent('book', context, {
      action: 'delete',
      id,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete book' },
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
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    );
  }
}
