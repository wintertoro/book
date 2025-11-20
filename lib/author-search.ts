/**
 * Author Search Utility
 * Searches for book author information when not found in OCR text
 */

/**
 * Search for author using Open Library API
 * Open Library is free and doesn't require an API key
 */
export async function searchAuthorByTitle(title: string): Promise<string | null> {
  try {
    // Clean the title for search
    const searchTitle = title.trim();
    
    // Use Open Library Search API
    const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(searchTitle)}&limit=1`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Open Library API returned ${response.status} for title: ${searchTitle}`);
      return null;
    }

    const data = await response.json();
    
    if (data.docs && data.docs.length > 0) {
      const book = data.docs[0];
      
      // Extract author name
      if (book.author_name && book.author_name.length > 0) {
        // Return the first author (most common case)
        return book.author_name[0];
      }
      
      // Fallback: try to get from author_key if available
      if (book.author_key && book.author_key.length > 0) {
        // We could fetch author details, but for simplicity, return null
        // and let the title-based search handle it
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for author:', error);
    return null;
  }
}

/**
 * Extract author from OCR text using common patterns
 */
export function extractAuthorFromText(text: string): string | null {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Common patterns for author extraction
  const patterns = [
    /^by\s+(.+)$/i,                    // "by Author Name"
    /^author[:\s]+(.+)$/i,              // "Author: Name" or "Author Name"
    /^written by\s+(.+)$/i,             // "Written by Author Name"
    /^(.+)\s+by\s+(.+)$/i,              // "Title by Author" (capture second group)
  ];
  
  for (const line of lines) {
    // Pattern 1: "by Author Name"
    const byMatch = line.match(/^by\s+(.+)$/i);
    if (byMatch && byMatch[1]) {
      const author = byMatch[1].trim();
      // Filter out common false positives
      if (author.length > 2 && author.length < 100 && !/^(page|chapter|table|index|copyright)/i.test(author)) {
        return author;
      }
    }
    
    // Pattern 2: "Author: Name" or "Author Name"
    const authorMatch = line.match(/^author[:\s]+(.+)$/i);
    if (authorMatch && authorMatch[1]) {
      const author = authorMatch[1].trim();
      if (author.length > 2 && author.length < 100) {
        return author;
      }
    }
    
    // Pattern 3: "Written by Author Name"
    const writtenMatch = line.match(/^written by\s+(.+)$/i);
    if (writtenMatch && writtenMatch[1]) {
      const author = writtenMatch[1].trim();
      if (author.length > 2 && author.length < 100) {
        return author;
      }
    }
  }
  
  // Look for common book cover patterns: Title on one line, Author on next
  // This is heuristic - look for a line that could be an author name
  // (typically shorter, might have common name patterns)
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];
    
    // If current line looks like a title (longer, title-case) and next line looks like author
    if (currentLine.length > 10 && nextLine.length > 2 && nextLine.length < 50) {
      // Check if next line has name-like patterns (capitalized words, not all caps)
      if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(nextLine) && 
          nextLine !== nextLine.toUpperCase() &&
          !/^(page|chapter|table|index|copyright|isbn)/i.test(nextLine)) {
        return nextLine;
      }
    }
  }
  
  return null;
}

/**
 * Get author for a book: first try OCR extraction, then internet search
 */
export async function getBookAuthor(title: string, ocrText?: string): Promise<string | null> {
  // First, try to extract from OCR text if available
  if (ocrText) {
    const extractedAuthor = extractAuthorFromText(ocrText);
    if (extractedAuthor) {
      return extractedAuthor;
    }
  }
  
  // If not found in OCR, search the internet
  const searchedAuthor = await searchAuthorByTitle(title);
  return searchedAuthor;
}

