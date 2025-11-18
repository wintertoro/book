import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface Book {
  id: string;
  title: string;
  addedAt: string;
  sourceImage?: string;
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

export async function addBook(userId: string, title: string, sourceImage?: string): Promise<{ book: Book | null; isDuplicate: boolean }> {
  await ensureDataDir();
  
  const books = await getAllBooks(userId);
  
  // Check for duplicates
  if (isDuplicate(title, books)) {
    return { book: null, isDuplicate: true };
  }
  
  const newBook: Book = {
    id: uuidv4(),
    title: title.trim(),
    addedAt: new Date().toISOString(),
    sourceImage,
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

export async function addToWishList(userId: string, title: string, sourceImage?: string): Promise<{ book: Book | null; isDuplicate: boolean }> {
  await ensureDataDir();
  
  const wishList = await getAllWishList(userId);
  
  // Check for duplicates in wish list
  if (isDuplicate(title, wishList)) {
    return { book: null, isDuplicate: true };
  }
  
  const newBook: Book = {
    id: uuidv4(),
    title: title.trim(),
    addedAt: new Date().toISOString(),
    sourceImage,
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
  
  // Add to library
  const result = await addBook(userId, book.title, book.sourceImage);
  
  // Remove from wish list
  if (result.book) {
    await deleteFromWishList(userId, wishListId);
  }
  
  return result;
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
  
  // Add to wish list
  const result = await addToWishList(userId, book.title, book.sourceImage);
  
  // Remove from library
  if (result.book) {
    await deleteBook(userId, bookId);
  }
  
  return result;
}

