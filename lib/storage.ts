import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { tagBookWithGenres } from './genre-tagger';

export interface Quote {
  id: string;
  text: string;
  pagePhotoId: string;
  pageNumber?: number;
  createdAt: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PagePhoto {
  id: string;
  imageUrl: string;
  pageNumber?: number;
  uploadedAt: string;
  quotes: Quote[];
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  addedAt: string;
  sourceImage?: string;
  pagePhotos?: PagePhoto[];
  quotes?: Quote[];
  genres?: string[];
}

// Get file paths for a specific user
function getBooksFile(userId: string): string {
  return path.join(process.cwd(), 'data', `books-${userId}.json`);
}

function getWishListFile(userId: string): string {
  return path.join(process.cwd(), 'data', `wishlist-${userId}.json`);
}

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Convert title to Title Case (capitalize first letter of every word)
function toTitleCase(title: string): string {
  return title
    .trim()
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// Normalize title for comparison (lowercase, remove extra spaces, punctuation)
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Check if a book already exists (fuzzy matching)
function isDuplicate(newTitle: string, existingBooks: Book[]): boolean {
  const normalizedNew = normalizeTitle(newTitle);
  
  if (normalizedNew.length < 3) return false; // Too short to be a valid title
  
  return existingBooks.some(book => {
    const normalizedExisting = normalizeTitle(book.title);
    
    // Exact match
    if (normalizedNew === normalizedExisting) return true;
    
    // Check if one title contains the other (for partial matches)
    // This handles cases like "The Great Gatsby" vs "Great Gatsby"
    if (normalizedNew.length > 10 && normalizedExisting.length > 10) {
      // Check if one is a substring of the other (with word boundaries)
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
        // But make sure it's not just a common word match
        const minLength = Math.min(normalizedNew.length, normalizedExisting.length);
        if (minLength > 15) {
          return true;
        }
      }
    }
    
    // Check similarity using Levenshtein distance for all titles
    const similarity = calculateSimilarity(normalizedNew, normalizedExisting);
    if (similarity > 0.85) return true;
    
    // For shorter titles, use a higher threshold
    if (normalizedNew.length < 30 && normalizedExisting.length < 30 && similarity > 0.75) {
      return true;
    }
    
    return false;
  });
}

// Simple similarity calculation
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
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

export async function getAllBooks(userId: string): Promise<Book[]> {
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(getBooksFile(userId), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function addBook(userId: string, title: string, sourceImage?: string, author?: string): Promise<{ book: Book | null; isDuplicate: boolean }> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  
  // Check for duplicates
  if (isDuplicate(title, books)) {
    return { book: null, isDuplicate: true };
  }
  
  // Auto-tag with genres (async, don't block) - use author if available for better matching
  const genres = await tagBookWithGenres(title.trim(), author?.trim()).catch(() => []);
  
  const newBook: Book = {
    id: uuidv4(),
    title: toTitleCase(title),
    author: author?.trim() || undefined,
    addedAt: new Date().toISOString(),
    sourceImage,
    genres: genres.length > 0 ? genres : undefined,
  };
  
  books.push(newBook);
  await fs.writeFile(getBooksFile(userId), JSON.stringify(books, null, 2));
  
  return { book: newBook, isDuplicate: false };
}

export async function deleteBook(userId: string, id: string): Promise<boolean> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  const filtered = books.filter(book => book.id !== id);
  
  if (filtered.length === books.length) {
    return false; // Book not found
  }
  
  await fs.writeFile(getBooksFile(userId), JSON.stringify(filtered, null, 2));
  return true;
}

// Wish list functions
export async function getAllWishList(userId: string): Promise<Book[]> {
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(getWishListFile(userId), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function addToWishList(userId: string, title: string, sourceImage?: string, genres?: string[]): Promise<{ book: Book | null; isDuplicate: boolean }> {
  await ensureDataDir();
  
  const wishList = await getAllWishList(userId);
  
  // Check for duplicates in wish list
  if (isDuplicate(title, wishList)) {
    return { book: null, isDuplicate: true };
  }
  
  // Auto-tag with genres if not provided
  let bookGenres = genres;
  if (!bookGenres || bookGenres.length === 0) {
    bookGenres = await tagBookWithGenres(title.trim()).catch(() => []);
  }
  
  const newBook: Book = {
    id: uuidv4(),
    title: toTitleCase(title),
    addedAt: new Date().toISOString(),
    sourceImage,
    genres: bookGenres.length > 0 ? bookGenres : undefined,
  };
  
  wishList.push(newBook);
  await fs.writeFile(getWishListFile(userId), JSON.stringify(wishList, null, 2));
  
  return { book: newBook, isDuplicate: false };
}

export async function deleteFromWishList(userId: string, id: string): Promise<boolean> {
  await ensureDataDir();
  
  const wishList = await getAllWishList(userId);
  const filtered = wishList.filter(book => book.id !== id);
  
  if (filtered.length === wishList.length) {
    return false; // Book not found
  }
  
  await fs.writeFile(getWishListFile(userId), JSON.stringify(filtered, null, 2));
  return true;
}

export async function moveToLibrary(userId: string, wishListId: string): Promise<{ book: Book | null; isDuplicate: boolean }> {
  await ensureDataDir();
  
  const wishList = await getAllWishList(userId);
  const book = wishList.find(b => b.id === wishListId);
  
  if (!book) {
    return { book: null, isDuplicate: false };
  }
  
  // Check if already in library
  const books = await getAllBooks(userId);
  if (isDuplicate(book.title, books)) {
    return { book: null, isDuplicate: true };
  }
  
  // Add to library (preserve genres if they exist)
  const booksList = await getAllBooks(userId);
  if (isDuplicate(book.title, booksList)) {
    return { book: null, isDuplicate: true };
  }
  
  // Create book with preserved genres - use author if available for better matching
  const genres = book.genres && book.genres.length > 0 
    ? book.genres 
    : await tagBookWithGenres(book.title, book.author).catch(() => []);
  
  const newBook: Book = {
    id: uuidv4(),
    title: toTitleCase(book.title),
    addedAt: new Date().toISOString(),
    sourceImage: book.sourceImage,
    genres: genres.length > 0 ? genres : undefined,
  };
  
  booksList.push(newBook);
  await fs.writeFile(getBooksFile(userId), JSON.stringify(booksList, null, 2));
  
  // Remove from wish list
  await deleteFromWishList(userId, wishListId);
  
  return { book: newBook, isDuplicate: false };
}

export async function moveToWishList(userId: string, bookId: string): Promise<{ book: Book | null; isDuplicate: boolean }> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  const book = books.find(b => b.id === bookId);
  
  if (!book) {
    return { book: null, isDuplicate: false };
  }
  
  // Check if already in wish list
  const wishList = await getAllWishList(userId);
  if (isDuplicate(book.title, wishList)) {
    return { book: null, isDuplicate: true };
  }
  
  // Add to wish list (preserve genres)
  const result = await addToWishList(userId, book.title, book.sourceImage, book.genres);
  
  // Remove from library
  if (result.book) {
    await deleteBook(userId, bookId);
  }
  
  return result;
}

// Update book genres
export async function updateBookGenres(userId: string, bookId: string, genres: string[]): Promise<boolean> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  const bookIndex = books.findIndex(b => b.id === bookId);
  
  if (bookIndex === -1) {
    return false;
  }
  
  books[bookIndex].genres = genres.length > 0 ? genres : undefined;
  await fs.writeFile(getBooksFile(userId), JSON.stringify(books, null, 2));
  
  return true;
}

// Backfill genres for all books without genres
export async function backfillGenres(userId: string): Promise<{ updated: number; failed: number }> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  let updated = 0;
  let failed = 0;
  
  for (const book of books) {
    // Skip if already has genres
    if (book.genres && book.genres.length > 0) {
      continue;
    }
    
    try {
      // Use author if available for better genre matching
      const genres = await tagBookWithGenres(book.title, book.author);
      if (genres.length > 0) {
        book.genres = genres;
        updated++;
      } else {
        failed++;
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to tag genres for "${book.title}":`, error);
      failed++;
    }
  }
  
  // Save updated books
  if (updated > 0) {
    await fs.writeFile(getBooksFile(userId), JSON.stringify(books, null, 2));
  }
  
  return { updated, failed };
}

// Update book author
export async function updateBookAuthor(userId: string, bookId: string, author: string): Promise<boolean> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  const bookIndex = books.findIndex(b => b.id === bookId);
  
  if (bookIndex === -1) {
    return false;
  }
  
  books[bookIndex].author = author.trim() || undefined;
  await fs.writeFile(getBooksFile(userId), JSON.stringify(books, null, 2));
  
  return true;
}

// Backfill authors for all books without authors
export async function backfillAuthors(userId: string): Promise<{ updated: number; failed: number }> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  let updated = 0;
  let failed = 0;
  
  const { getBookAuthor } = await import('@/lib/author-search');
  
  for (const book of books) {
    // Skip if already has author
    if (book.author && book.author.trim().length > 0) {
      continue;
    }
    
    try {
      const author = await getBookAuthor(book.title);
      if (author) {
        book.author = author;
        updated++;
      } else {
        failed++;
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to find author for "${book.title}":`, error);
      failed++;
    }
  }
  
  // Save updated books
  if (updated > 0) {
    await fs.writeFile(getBooksFile(userId), JSON.stringify(books, null, 2));
  }
  
  return { updated, failed };
}

// Quote and page photo functions
export async function getBookById(userId: string, bookId: string): Promise<Book | null> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  return books.find(book => book.id === bookId) || null;
}

export async function addPagePhoto(userId: string, bookId: string, imageUrl: string, pageNumber?: number): Promise<PagePhoto> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  const book = books.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error('Book not found');
  }
  
  if (!book.pagePhotos) {
    book.pagePhotos = [];
  }
  
  const newPagePhoto: PagePhoto = {
    id: uuidv4(),
    imageUrl,
    pageNumber,
    uploadedAt: new Date().toISOString(),
    quotes: [],
  };
  
  book.pagePhotos.push(newPagePhoto);
  await fs.writeFile(getBooksFile(userId), JSON.stringify(books, null, 2));
  
  return newPagePhoto;
}

export async function addQuote(
  userId: string,
  bookId: string,
  pagePhotoId: string,
  text: string,
  pageNumber?: number,
  boundingBox?: { x: number; y: number; width: number; height: number }
): Promise<Quote> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  const book = books.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error('Book not found');
  }
  
  if (!book.pagePhotos) {
    book.pagePhotos = [];
  }
  
  const pagePhoto = book.pagePhotos.find(p => p.id === pagePhotoId);
  if (!pagePhoto) {
    throw new Error('Page photo not found');
  }
  
  const newQuote: Quote = {
    id: uuidv4(),
    text: text.trim(),
    pagePhotoId,
    pageNumber,
    createdAt: new Date().toISOString(),
    boundingBox,
  };
  
  pagePhoto.quotes.push(newQuote);
  
  // Also add to book's quotes array for easy searching
  if (!book.quotes) {
    book.quotes = [];
  }
  book.quotes.push(newQuote);
  
  await fs.writeFile(getBooksFile(userId), JSON.stringify(books, null, 2));
  
  return newQuote;
}

export async function deleteQuote(userId: string, bookId: string, quoteId: string): Promise<boolean> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  const book = books.find(b => b.id === bookId);
  
  if (!book || !book.pagePhotos) {
    return false;
  }
  
  let found = false;
  for (const pagePhoto of book.pagePhotos) {
    const index = pagePhoto.quotes.findIndex(q => q.id === quoteId);
    if (index !== -1) {
      pagePhoto.quotes.splice(index, 1);
      found = true;
      break;
    }
  }
  
  if (found && book.quotes) {
    const quoteIndex = book.quotes.findIndex(q => q.id === quoteId);
    if (quoteIndex !== -1) {
      book.quotes.splice(quoteIndex, 1);
    }
    await fs.writeFile(getBooksFile(userId), JSON.stringify(books, null, 2));
  }
  
  return found;
}

export async function searchQuotes(userId: string, searchTerm: string): Promise<Array<{ book: Book; quote: Quote }>> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  const results: Array<{ book: Book; quote: Quote }> = [];
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  for (const book of books) {
    if (book.quotes) {
      for (const quote of book.quotes) {
        if (quote.text.toLowerCase().includes(lowerSearchTerm)) {
          results.push({ book, quote });
        }
      }
    }
  }
  
  return results;
}

