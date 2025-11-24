import { BaseAgent } from './base-agent';
import type { AgentContext, AgentResult, WishlistOperationParams, BookOperationResult, DeduplicationParams } from './types';
import {
  getAllWishList,
  addToWishList as storageAddToWishList,
  deleteFromWishList as storageDeleteFromWishList,
  moveToLibrary as storageMoveToLibrary,
  moveToWishList as storageMoveToWishList,
} from '@/lib/storage';
import type { Book } from '@/lib/storage';
import type { AgentCoordinator } from './coordinator';
import { getCoordinator } from './coordinator';

/**
 * Wishlist Agent
 * Handles all wishlist operations: add, delete, move books
 */
export class WishlistAgent extends BaseAgent {
  name = 'WishlistAgent';
  private coordinator?: AgentCoordinator;

  constructor(coordinator?: AgentCoordinator) {
    super();
    this.coordinator = coordinator;
  }

  async execute(
    context: AgentContext,
    params: WishlistOperationParams | { action: 'get' | 'delete' | 'move-to-library' | 'move-from-library'; id?: string; title?: string }
  ): Promise<AgentResult<Book[] | BookOperationResult | boolean>> {
    this.log('executing', context, { action: params.action });

    if (!this.validateContext(context)) {
      return this.error('Invalid context: userId required');
    }

    try {
      switch (params.action) {
        case 'get':
          return await this.getAllWishList(context);
        case 'add':
          if (!params.title) {
            return this.error('Book title is required');
          }
          return await this.addToWishList(context, params as WishlistOperationParams);
        case 'delete':
          if (!params.id) {
            return this.error('Book ID is required');
          }
          return await this.deleteFromWishList(context, { id: params.id });
        case 'move-to-library':
          if (!params.id) {
            return this.error('Book ID is required');
          }
          return await this.moveToLibrary(context, { id: params.id });
        case 'move-from-library':
          if (!params.id) {
            return this.error('Book ID is required');
          }
          return await this.moveToWishList(context, { id: params.id });
        default:
          return this.error(`Unknown action: ${(params as { action: string }).action}`);
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

      // Use deduplication agent via coordinator to check for duplicates
      const coordinator = this.coordinator || getCoordinator();
      const dedupResult = await coordinator.executeAgent<{ isDuplicate: boolean; similarity?: number; matchedBook?: Book }>(
        'deduplication',
        context,
        {
          newTitle: params.title,
          existingBooks: existingWishList,
        } as DeduplicationParams
      );

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

