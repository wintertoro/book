import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult, DeduplicationParams, DeduplicationResult } from './types';
import { Book } from '@/lib/storage';

/**
 * Deduplication Agent
 * Handles intelligent duplicate detection using fuzzy matching algorithms
 */
export class DeduplicationAgent extends BaseAgent {
  name = 'DeduplicationAgent';

  async execute(
    context: AgentContext,
    params: DeduplicationParams
  ): Promise<AgentResult<any>> {
    this.log('checking-duplicate', context, { title: params.newTitle });

    if (!this.validateContext(context)) {
      return this.error('Invalid context: userId required');
    }

    try {
      const isDuplicate = this.isDuplicate(params.newTitle, params.existingBooks);
      const result: DeduplicationResult = {
        isDuplicate,
      };

      if (isDuplicate) {
        // Find the matched book for reference
        const matched = this.findMatch(params.newTitle, params.existingBooks);
        if (matched) {
          result.matchedBook = matched.book;
          result.similarity = matched.similarity;
        }
      }

      return this.success(result);
    } catch (error) {
      return this.error(
        `Deduplication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Check if a book is a duplicate
   */
  private isDuplicate(newTitle: string, existingBooks: Book[]): boolean {
    const normalizedNew = this.normalizeTitle(newTitle);

    if (normalizedNew.length < 3) return false; // Too short to be a valid title

    return existingBooks.some(book => {
      const normalizedExisting = this.normalizeTitle(book.title);

      // Exact match
      if (normalizedNew === normalizedExisting) return true;

      // Check if one title contains the other (for partial matches)
      if (normalizedNew.length > 10 && normalizedExisting.length > 10) {
        const wordsNew = normalizedNew.split(/\s+/);
        const wordsExisting = normalizedExisting.split(/\s+/);

        // If one title's words are mostly contained in the other
        if (wordsNew.length > 2 && wordsExisting.length > 2) {
          const overlap = wordsNew.filter(word =>
            wordsExisting.some(existingWord =>
              existingWord.includes(word) || word.includes(existingWord)
            )
          ).length;

          const minWords = Math.min(wordsNew.length, wordsExisting.length);
          if (overlap >= Math.ceil(minWords * 0.7)) {
            return true;
          }
        }

        // Simple substring check for longer titles
        if (normalizedNew.includes(normalizedExisting) ||
          normalizedExisting.includes(normalizedNew)) {
          const minLength = Math.min(normalizedNew.length, normalizedExisting.length);
          if (minLength > 15) {
            return true;
          }
        }
      }

      // Check similarity using Levenshtein distance
      const similarity = this.calculateSimilarity(normalizedNew, normalizedExisting);
      if (similarity > 0.85) return true;

      // For shorter titles, use a higher threshold
      if (normalizedNew.length < 30 && normalizedExisting.length < 30 && similarity > 0.75) {
        return true;
      }

      return false;
    });
  }

  /**
   * Find the best matching book and return similarity score
   */
  private findMatch(newTitle: string, existingBooks: Book[]): { book: Book; similarity: number } | null {
    const normalizedNew = this.normalizeTitle(newTitle);
    let bestMatch: { book: Book; similarity: number } | null = null;
    let bestSimilarity = 0;

    for (const book of existingBooks) {
      const normalizedExisting = this.normalizeTitle(book.title);
      const similarity = this.calculateSimilarity(normalizedNew, normalizedExisting);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = { book, similarity };
      }
    }

    return bestMatch && bestSimilarity > 0.75 ? bestMatch : null;
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

