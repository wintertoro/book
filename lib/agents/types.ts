import { Book } from '@/lib/storage';

/**
 * Base agent interface that all agents must implement
 */
export interface Agent {
  name: string;
  execute(context: AgentContext, params: any): Promise<AgentResult<any>>;
}

/**
 * Context passed to all agents containing user and request information
 */
export interface AgentContext {
  userId: string;
  session?: any;
  metadata?: Record<string, any>;
}

/**
 * Standard result structure returned by agents
 */
export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * OCR Agent specific types
 */
export interface OCRParams {
  imageBuffer: Buffer;
  imageFile?: File;
}

export interface OCRResult {
  titles: string[];
  rawText: string;
  author?: string;
  confidence?: number;
}

/**
 * Book Management Agent specific types
 */
export interface AddBookParams {
  title: string;
  author?: string;
  sourceImage?: string;
}

export interface BookOperationResult {
  book: Book | null;
  isDuplicate: boolean;
}

/**
 * Wishlist Agent specific types
 */
export interface WishlistOperationParams {
  title?: string;
  id?: string;
  action: 'add' | 'move-to-library' | 'move-from-library';
}

/**
 * Export Agent specific types
 */
export interface ExportParams {
  format: 'csv' | 'json';
}

export interface ExportResult {
  content: string | object;
  mimeType: string;
  filename: string;
}

/**
 * Deduplication Agent specific types
 */
export interface DeduplicationParams {
  newTitle: string;
  existingBooks: Book[];
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  similarity?: number;
  matchedBook?: Book;
}

