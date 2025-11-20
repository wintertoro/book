import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult, AddBookParams, BookOperationResult } from './types';
import { Book, getAllBooks, addBook as storageAddBook, deleteBook as storageDeleteBook } from '@/lib/storage';
import { DeduplicationAgent } from './deduplication-agent';
import { getBookAuthor } from '@/lib/author-search';

/**
 * Book Management Agent
 * Handles all library operations: add, delete, retrieve books
 */
export class BookManagementAgent extends BaseAgent {
  name = 'BookManagementAgent';
  private deduplicationAgent: DeduplicationAgent;

  constructor() {
    super();
    this.deduplicationAgent = new DeduplicationAgent();
  }

  async execute(
    context: AgentContext,
    params: { action: 'get' | 'add' | 'delete'; title?: string; id?: string; sourceImage?: string; author?: string; ocrText?: string }
  ): Promise<AgentResult<any>> {
    this.log('executing', context, { action: params.action });

    if (!this.validateContext(context)) {
      return this.error('Invalid context: userId required');
    }

    try {
      switch (params.action) {
        case 'get':
          return await this.getAllBooks(context);
        case 'add':
          return await this.addBook(context, params);
        case 'delete':
          return await this.deleteBook(context, params);
        default:
          return this.error(`Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.error(
        `Book operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Get all books for a user
   */
  private async getAllBooks(context: AgentContext): Promise<AgentResult<Book[]>> {
    try {
      const books = await getAllBooks(context.userId);
      this.log('retrieved-books', context, { count: books.length });
      return this.success(books);
    } catch (error) {
      return this.error('Failed to retrieve books', { error });
    }
  }

  /**
   * Add a book to the library
   */
  private async addBook(
    context: AgentContext,
    params: { title: string; sourceImage?: string; author?: string; ocrText?: string }
  ): Promise<AgentResult<BookOperationResult>> {
    if (!params.title || !params.title.trim()) {
      return this.error('Book title is required');
    }

    try {
      // Get existing books for deduplication check
      const existingBooks = await getAllBooks(context.userId);

      // Use deduplication agent to check for duplicates
      const dedupResult = await this.deduplicationAgent.execute(context, {
        newTitle: params.title,
        existingBooks,
      });

      if (!dedupResult.success) {
        return this.error('Deduplication check failed');
      }

      if (dedupResult.data?.isDuplicate) {
        this.log('duplicate-detected', context, { title: params.title });
        return this.success({
          book: null,
          isDuplicate: true,
        });
      }

      // Get author: use provided author, or search if not found
      let author = params.author;
      if (!author && params.title) {
        // Search for author using title and OCR text if available
        author = await getBookAuthor(params.title, params.ocrText) || undefined;
        if (author) {
          this.log('author-found', context, { title: params.title, author });
        }
      }

      // Add the book
      const result = await storageAddBook(
        context.userId,
        params.title.trim(),
        params.sourceImage,
        author
      );

      this.log('book-added', context, {
        bookId: result.book?.id,
        isDuplicate: result.isDuplicate,
        hasAuthor: !!author,
      });

      return this.success(result);
    } catch (error) {
      return this.error('Failed to add book', { error });
    }
  }

  /**
   * Delete a book from the library
   */
  private async deleteBook(
    context: AgentContext,
    params: { id: string }
  ): Promise<AgentResult<boolean>> {
    if (!params.id) {
      return this.error('Book ID is required');
    }

    try {
      const success = await storageDeleteBook(context.userId, params.id);
      this.log('book-deleted', context, { bookId: params.id, success });
      return this.success(success);
    } catch (error) {
      return this.error('Failed to delete book', { error });
    }
  }
}

