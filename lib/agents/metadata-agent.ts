import { BaseAgent } from './base-agent';
import type { AgentContext, AgentResult } from './types';

export interface BookMetadataResult {
  isbn?: string;
  isbn13?: string;
  title: string;
  author?: string;
  description?: string;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
  language?: string;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  coverImageUrl?: string;
  thumbnailUrl?: string;
}

export interface MetadataAgentParams {
  title: string;
  author?: string;
  isbn?: string;
}

/**
 * Metadata Agent
 * Fetches rich book metadata from Google Books API
 */
export class MetadataAgent extends BaseAgent {
  name = 'MetadataAgent';
  private readonly GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

  async execute(
    _context: AgentContext,
    params: unknown
  ): Promise<AgentResult<BookMetadataResult | null>> {
    try {
      const { title, author, isbn } = params as MetadataAgentParams;

      if (!title || title.trim().length === 0) {
        return this.error('Title is required');
      }

      // Try to fetch metadata
      const metadata = await this.fetchBookMetadata(title, author, isbn);

      if (!metadata) {
        return this.success(null, { message: 'No metadata found' });
      }

      return this.success(metadata);
    } catch (error) {
      return this.error(
        `Failed to fetch book metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Fetch book metadata from Google Books API
   */
  private async fetchBookMetadata(
    title: string,
    author?: string,
    isbn?: string
  ): Promise<BookMetadataResult | null> {
    try {
      // Build search query
      let query = title.trim();
      if (isbn) {
        query = `isbn:${isbn}`;
      } else if (author) {
        query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
      } else {
        query = encodeURIComponent(title);
      }

      const url = `${this.GOOGLE_BOOKS_API}?q=${query}&maxResults=1&fields=items(volumeInfo,industryIdentifiers)`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return null;
      }

      const volume = data.items[0];
      const volumeInfo = volume.volumeInfo;
      const industryIdentifiers = volume.industryIdentifiers || [];

      // Extract ISBNs
      let isbn10: string | undefined;
      let isbn13: string | undefined;
      
      for (const identifier of industryIdentifiers) {
        if (identifier.type === 'ISBN_10') {
          isbn10 = identifier.identifier;
        } else if (identifier.type === 'ISBN_13') {
          isbn13 = identifier.identifier;
        }
      }

      // Get best cover image
      const coverImageUrl = volumeInfo.imageLinks?.large || 
                           volumeInfo.imageLinks?.medium || 
                           volumeInfo.imageLinks?.small ||
                           volumeInfo.imageLinks?.thumbnail ||
                           volumeInfo.imageLinks?.smallThumbnail;
      
      const thumbnailUrl = volumeInfo.imageLinks?.thumbnail || 
                          volumeInfo.imageLinks?.smallThumbnail;

      return {
        isbn: isbn10,
        isbn13: isbn13,
        title: volumeInfo.title || title,
        author: volumeInfo.authors?.[0] || author,
        description: volumeInfo.description,
        pageCount: volumeInfo.pageCount,
        publishedDate: volumeInfo.publishedDate,
        publisher: volumeInfo.publisher,
        language: volumeInfo.language,
        categories: volumeInfo.categories,
        averageRating: volumeInfo.averageRating,
        ratingsCount: volumeInfo.ratingsCount,
        coverImageUrl,
        thumbnailUrl,
      };
    } catch (error) {
      console.error('Error fetching book metadata:', error);
      return null;
    }
  }

  /**
   * Batch fetch metadata for multiple books
   */
  async fetchBatchMetadata(
    context: AgentContext,
    books: Array<{ title: string; author?: string; isbn?: string }>
  ): Promise<Array<{ index: number; metadata: BookMetadataResult | null }>> {
    const results: Array<{ index: number; metadata: BookMetadataResult | null }> = [];
    
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (book, batchIndex) => {
          const result = await this.execute(context, book);
          return {
            index: i + batchIndex,
            metadata: result.success ? (result.data as BookMetadataResult | null) : null,
          };
        })
      );
      
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < books.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}
