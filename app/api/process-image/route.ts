import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCoordinator } from '@/lib/agents/coordinator';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use OCR Agent to process the image
    const coordinator = getCoordinator();
    const context = coordinator.createContext(session);

    const result = await coordinator.processImage(context, buffer);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to process image' },
        { status: 500 }
      );
    }

    // Format results for frontend
    const results = result.data.titles.map(title => ({
      title,
      added: false,
      isDuplicate: false, // Will be checked when user adds to library
    }));

    return NextResponse.json({
      success: true,
      ocrText: result.data.rawText,
      results,
      totalFound: result.data.titles.length,
      totalAdded: 0,
      totalDuplicates: 0,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

