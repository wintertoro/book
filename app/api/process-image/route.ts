import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import { auth } from '@/lib/auth';
import { addBook } from '@/lib/storage';

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
    
    // Initialize Tesseract worker
    const worker = await createWorker('eng');
    
    // Perform OCR
    const { data: { text } } = await worker.recognize(buffer);
    
    // Clean up worker
    await worker.terminate();
    
    // Extract book titles from OCR text with improved filtering
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Improved filtering for book titles
    const potentialTitles = lines
      .filter(line => {
        const length = line.length;
        const hasLetters = /[a-zA-Z]/.test(line);
        const notAllCaps = line !== line.toUpperCase() || length < 10;
        const notTooShort = length >= 3;
        const notTooLong = length < 200;
        const notMostlyNumbers = (line.match(/\d/g) || []).length / length < 0.5;
        
        // Filter out common OCR artifacts and non-title text
        const isNotCommonNoise = !/^(page|chapter|table of contents|index|copyright|isbn|©|®|™)/i.test(line);
        const hasReasonableWordCount = line.split(/\s+/).length >= 1 && line.split(/\s+/).length <= 15;
        const notJustPunctuation = /[a-zA-Z]/.test(line.replace(/[^\w\s]/g, ''));
        
        // Filter out lines that look like page numbers, dates, or metadata
        const notPageNumber = !/^(\d+|[ivxlcdm]+)$/i.test(line);
        const notDate = !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(line);
        const notISBN = !/^(isbn|issn)[\s:]*[\d\-x]+$/i.test(line);
        
        return hasLetters && 
               notAllCaps && 
               notTooShort && 
               notTooLong && 
               notMostlyNumbers &&
               isNotCommonNoise &&
               hasReasonableWordCount &&
               notJustPunctuation &&
               notPageNumber &&
               notDate &&
               notISBN;
      })
      .map(line => {
        // Clean up common OCR errors
        return line
          .replace(/\s+/g, ' ') // Multiple spaces to single
          .replace(/[|]/g, 'I') // Common OCR mistake
          .trim();
      })
      .filter((line, index, self) => {
        // Remove duplicates within the same OCR result
        return self.indexOf(line) === index;
      });
    
    // Process each potential title
    const results = [];
    const imageBase64 = buffer.toString('base64');
    
    for (const title of potentialTitles) {
      const result = await addBook(session.user.id, title, `data:image/jpeg;base64,${imageBase64}`);
      results.push({
        title,
        added: !result.isDuplicate,
        book: result.book,
        isDuplicate: result.isDuplicate,
      });
    }
    
    return NextResponse.json({
      success: true,
      ocrText: text,
      results,
      totalFound: potentialTitles.length,
      totalAdded: results.filter(r => r.added).length,
      totalDuplicates: results.filter(r => r.isDuplicate).length,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

