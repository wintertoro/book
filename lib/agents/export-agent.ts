import { BaseAgent } from './base-agent';
import type { AgentContext, AgentResult, ExportParams, ExportResult } from './types';
import { getAllBooks } from '@/lib/storage';
import type { Book } from '@/lib/storage';

/**
 * Export Agent
 * Handles data export in various formats (CSV, JSON)
 */
export class ExportAgent extends BaseAgent {
  name = 'ExportAgent';

  async execute(
    context: AgentContext,
    params: ExportParams
  ): Promise<AgentResult<ExportResult>> {
    this.log('exporting', context, { format: params.format });

    if (!this.validateContext(context)) {
      return this.error('Invalid context: userId required');
    }

    try {
      const books = await getAllBooks(context.userId);

      switch (params.format) {
        case 'csv':
          return this.exportCSV(books);
        case 'json':
          return this.exportJSON(books);
        case 'goodreads':
          return this.exportGoodreads(books);
        default:
          return this.error(`Unsupported export format: ${params.format}`);
      }
    } catch (error) {
      return this.error(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Export books as CSV
   */
  private exportCSV(books: Book[]): AgentResult<ExportResult> {
    const headers = ['Title', 'Author', 'Added Date'];
    const rows = books.map(book => [
      `"${book.title.replace(/"/g, '""')}"`,
      book.author ? `"${book.author.replace(/"/g, '""')}"` : '',
      new Date(book.addedAt).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return this.success({
      content: csv,
      mimeType: 'text/csv',
      filename: 'book-library.csv',
    });
  }

  /**
   * Export books as JSON
   */
  private exportJSON(books: Book[]): AgentResult<ExportResult> {
    return this.success({
      content: { books },
      mimeType: 'application/json',
      filename: 'book-library.json',
    });
  }

  /**
   * Export books in Goodreads CSV format
   * Goodreads requires: Title, Author, ISBN, My Rating, Average Rating, Publisher, Binding, Year Published, Original Publication Year, Date Read, Date Added, Bookshelves, My Review
   */
  private exportGoodreads(books: Book[]): AgentResult<ExportResult> {
    const headers = [
      'Title',
      'Author',
      'ISBN',
      'ISBN13',
      'My Rating',
      'Average Rating',
      'Publisher',
      'Binding',
      'Year Published',
      'Original Publication Year',
      'Date Read',
      'Date Added',
      'Bookshelves',
      'My Review',
      'Spoiler',
      'Private Notes',
      'Read Count',
      'Recommended For',
      'Recommended By',
      'Owned Copies',
      'Original Purchase Date',
      'Original Purchase Location',
      'Condition',
      'Condition Description',
      'BCID'
    ];

    const rows = books.map(book => {
      const metadata = book.metadata;
      const readingProgress = book.readingProgress;
      
      // Format dates (Goodreads format: M/d/yyyy)
      const addedDate = new Date(book.addedAt);
      const dateAdded = `${addedDate.getMonth() + 1}/${addedDate.getDate()}/${addedDate.getFullYear()}`;
      
      const dateRead = readingProgress?.completedAt 
        ? (() => {
            const completedDate = new Date(readingProgress.completedAt);
            return `${completedDate.getMonth() + 1}/${completedDate.getDate()}/${completedDate.getFullYear()}`;
          })()
        : '';

      // Determine bookshelf based on reading status
      let bookshelf = '';
      if (readingProgress?.status === 'completed') {
        bookshelf = 'read';
      } else if (readingProgress?.status === 'reading') {
        bookshelf = 'currently-reading';
      } else if (readingProgress?.status === 'dnf') {
        bookshelf = 'did-not-finish';
      } else {
        bookshelf = 'to-read';
      }

      // Convert rating (1-5) to Goodreads format
      const myRating = readingProgress?.rating ? readingProgress.rating.toString() : '';
      const averageRating = metadata?.averageRating ? metadata.averageRating.toString() : '';

      // Extract year from published date
      const yearPublished = metadata?.publishedDate 
        ? new Date(metadata.publishedDate).getFullYear().toString()
        : '';

      return [
        `"${book.title.replace(/"/g, '""')}"`,
        book.author ? `"${book.author.replace(/"/g, '""')}"` : '',
        metadata?.isbn || '',
        metadata?.isbn13 || '',
        myRating,
        averageRating,
        metadata?.publisher ? `"${metadata.publisher.replace(/"/g, '""')}"` : '',
        '', // Binding - not available
        yearPublished,
        yearPublished, // Original Publication Year - same as Year Published
        dateRead,
        dateAdded,
        bookshelf,
        readingProgress?.notes ? `"${readingProgress.notes.replace(/"/g, '""')}"` : '',
        '', // Spoiler
        '', // Private Notes
        readingProgress?.status === 'completed' ? '1' : '',
        '', // Recommended For
        '', // Recommended By
        '1', // Owned Copies
        '', // Original Purchase Date
        '', // Original Purchase Location
        '', // Condition
        '', // Condition Description
        '' // BCID
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return this.success({
      content: csv,
      mimeType: 'text/csv',
      filename: 'goodreads-import.csv',
    });
  }
}

