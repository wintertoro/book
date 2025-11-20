import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { addPagePhoto, getBookById } from '@/lib/storage';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Ensure uploads directory exists
async function ensureUploadsDir() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await mkdir(uploadsDir, { recursive: true });
  } catch {
    // Directory might already exist
  }
  return uploadsDir;
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

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const bookId = formData.get('bookId') as string;
    const pageNumber = formData.get('pageNumber') ? parseInt(formData.get('pageNumber') as string) : undefined;

    if (!file || !bookId) {
      return NextResponse.json(
        { error: 'Image file and bookId are required' },
        { status: 400 }
      );
    }

    // Verify book exists
    const book = await getBookById(session.user.id, bookId);
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Save file to public/uploads directory
    const uploadsDir = await ensureUploadsDir();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    // Create relative URL for the image
    const imageUrl = `/uploads/${fileName}`;

    // Add page photo to book
    const pagePhoto = await addPagePhoto(session.user.id, bookId, imageUrl, pageNumber);

    return NextResponse.json({ success: true, pagePhoto });
  } catch (error) {
    console.error('Error uploading page photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload page photo' },
      { status: 500 }
    );
  }
}

