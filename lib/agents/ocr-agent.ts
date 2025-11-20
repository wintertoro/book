import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult, OCRParams, OCRResult } from './types';
import { createWorker } from 'tesseract.js';
import { extractAuthorFromText } from '@/lib/author-search';

/**
 * OCR Agent
 * Handles image processing and text extraction using Tesseract.js
 */
export class OCRAgent extends BaseAgent {
  name = 'OCRAgent';

  async execute(
    context: AgentContext,
    params: OCRParams
  ): Promise<AgentResult<any>> {
    this.log('processing-image', context);

    if (!this.validateContext(context)) {
      return this.error('Invalid context: userId required');
    }

    if (!params.imageBuffer) {
      return this.error('Image buffer is required');
    }

    try {
      // Initialize Tesseract worker
      const worker = await createWorker('eng');

      // Perform OCR
      const { data: { text } } = await worker.recognize(params.imageBuffer);

      // Clean up worker
      await worker.terminate();

      // Extract and filter book titles
      const titles = this.extractBookTitles(text);
      
      // Extract author from OCR text
      const author = extractAuthorFromText(text);

      const result: OCRResult = {
        titles,
        rawText: text,
        author: author || undefined,
        confidence: 0.8, // Could be enhanced with actual confidence scores
      };

      this.log('ocr-complete', context, { titlesFound: titles.length });

      return this.success(result);
    } catch (error) {
      this.log('ocr-error', context, { error });
      return this.error(
        `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Extract book titles from OCR text with intelligent filtering
   */
  private extractBookTitles(text: string): string[] {
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Filter for potential book titles
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

    return potentialTitles;
  }
}

