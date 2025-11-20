import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import { auth } from '@/lib/auth';

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
    const x = parseFloat(formData.get('x') as string);
    const y = parseFloat(formData.get('y') as string);
    const width = parseFloat(formData.get('width') as string);
    const height = parseFloat(formData.get('height') as string);

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initialize Tesseract worker
    const worker = await createWorker('eng');

    // If bounding box is provided, we'll need to crop the image
    // For now, we'll do OCR on the full image and extract the relevant text
    // In a production app, you'd want to crop the image first using a library like sharp
    const { data: { text } } = await worker.recognize(buffer);

    // Clean up worker
    await worker.terminate();

    // Extract page number if present (look for patterns like "Page 123" or "p. 123")
    const pageMatch = text.match(/(?:page|p\.?)\s*(\d+)/i);
    const pageNumber = pageMatch ? parseInt(pageMatch[1]) : undefined;

    // Clean up the text
    const cleanedText = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return NextResponse.json({
      success: true,
      text: cleanedText,
      pageNumber,
      fullText: text,
    });
  } catch (error) {
    console.error('Error extracting quote:', error);
    return NextResponse.json(
      { error: 'Failed to extract quote', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

