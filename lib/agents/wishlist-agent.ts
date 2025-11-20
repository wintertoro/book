import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult, WishlistOperationParams, BookOperationResult } from './types';
import {
  Book,
  getAllWishList,
  addToWishList as storageAddToWishList,
  deleteFromWishList as storageDeleteFromWishList,
  moveToLibrary as storageMoveToLibrary,
  moveToWishList as storageMoveToWishList,
} from '@/lib/storage';
import { DeduplicationAgent } from './deduplication-agent';

/**
 * Wishlist Agent
 * Handles all wishlist operations: add, delete, move books
 */
export class WishlistAgent extends BaseAgent {
  name = 'WishlistAgent';
  private deduplicationAgent: DeduplicationAgent;

  constructor() {
    super();
    this.deduplicationAgent = new DeduplicationAgent();
  }

  async execute(
    context: AgentContext,
    params: WishlistOperationParams | { action: 'get' | 'delete'; id?: string }
  ): Promise<AgentResult<any>> {
    this.log('executing', context, { action: params.action });

    if (!this.validateContext(context)) {
      return this.error('Invalid context: userId required');
    }

    try {
      switch (params.action) {
        case 'get':
          return await this.getAllWishList(context);
        case 'add':
          return await this.addToWishList(context, params as WishlistOperationParams);
        case 'delete':
          return await this.deleteFromWishList(context, params as { id: string });
        case 'move-to-library':
          return await this.moveToLibrary(context, params as { id: string });
        case 'move-from-library':
          return await this.moveToWishList(context, params as { id: string });
        default:
          return this.error(`Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.error(
        `Wishlist operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Get all wishlist items for a user
   */
  private async getAllWishList(context: AgentContext): Promise<AgentResult<Book[]>> {
    try {
      const wishList = await getAllWishList(context.userId);
      this.log('retrieved-wishlist', context, { count: wishList.length });
      return this.success(wishList);
    } catch (error) {
      return this.error('Failed to retrieve wishlist', { error });
    }
  }

  /**
   * Add a book to the wishlist
   */
  private async addToWishList(
    context: AgentContext,
    params: WishlistOperationParams
  ): Promise<AgentResult<BookOperationResult>> {
    if (!params.title || !params.title.trim()) {
      return this.error('Book title is required');
    }

    try {
      // Get existing wishlist for deduplication check
      const existingWishList = await getAllWishList(context.userId);

      // Use deduplication agent to check for duplicates
      const dedupResult = await this.deduplicationAgent.execute(context, {
        newTitle: params.title,
        existingBooks: existingWishList,
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

      // Add to wishlist
      const result = await storageAddToWishList(context.userId, params.title.trim());

      this.log('wishlist-added', context, {
        bookId: result.book?.id,
        isDuplicate: result.isDuplicate,
      });

      return this.success(result);
    } catch (error) {
      return this.error('Failed to add to wishlist', { error });
    }
  }

  /**
   * Delete a book from the wishlist
   */
  private async deleteFromWishList(
    context: AgentContext,
    params: { id: string }
  ): Promise<AgentResult<boolean>> {
    if (!params.id) {
      return this.error('Book ID is required');
    }

    try {
      const success = await storageDeleteFromWishList(context.userId, params.id);
      this.log('wishlist-deleted', context, { bookId: params.id, success });
      return this.success(success);
    } catch (error) {
      return this.error('Failed to delete from wishlist', { error });
    }
  }

  /**
   * Move a book from wishlist to library
   */
  private async moveToLibrary(
    context: AgentContext,
    params: { id: string }
  ): Promise<AgentResult<BookOperationResult>> {
    if (!params.id) {
      return this.error('Book ID is required');
    }

    try {
      const result = await storageMoveToLibrary(context.userId, params.id);
      this.log('moved-to-library', context, {
        bookId: params.id,
        success: !!result.book,
      });
      return this.success(result);
    } catch (error) {
      return this.error('Failed to move to library', { error });
    }
  }

  /**
   * Move a book from library to wishlist
   */
  private async moveToWishList(
    context: AgentContext,
    params: { id: string }
  ): Promise<AgentResult<BookOperationResult>> {
    if (!params.id) {
      return this.error('Book ID is required');
    }

    try {
      const result = await storageMoveToWishList(context.userId, params.id);
      this.log('moved-to-wishlist', context, {
        bookId: params.id,
        success: !!result.book,
      });
      return this.success(result);
    } catch (error) {
      return this.error('Failed to move to wishlist', { error });
    }
  }
}

