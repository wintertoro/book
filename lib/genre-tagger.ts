/**
 * Genre tagging service using Open Library API
 * Automatically tags books with genres based on their title
 */

interface OpenLibraryWork {
  key: string;
  title: string;
  subjects?: string[];
  subject_places?: string[];
  subject_people?: string[];
  subject_times?: string[];
}

interface OpenLibrarySearchResult {
  docs: Array<{
    key: string;
    title: string;
    author_name?: string[];
    first_publish_year?: number;
    subject?: string[];
  }>;
}

// Common genre mappings from Open Library subjects to standard genres
const GENRE_MAPPINGS: Record<string, string> = {
  'fiction': 'Fiction',
  'nonfiction': 'Non-Fiction',
  'science fiction': 'Science Fiction',
  'fantasy': 'Fantasy',
  'mystery': 'Mystery',
  'thriller': 'Thriller',
  'romance': 'Romance',
  'horror': 'Horror',
  'biography': 'Biography',
  'autobiography': 'Autobiography',
  'history': 'History',
  'philosophy': 'Philosophy',
  'psychology': 'Psychology',
  'self-help': 'Self-Help',
  'business': 'Business',
  'economics': 'Economics',
  'science': 'Science',
  'technology': 'Technology',
  'art': 'Art',
  'poetry': 'Poetry',
  'drama': 'Drama',
  'comedy': 'Comedy',
  'adventure': 'Adventure',
  'crime': 'Crime',
  'young adult': 'Young Adult',
  'children': "Children's",
  'cooking': 'Cooking',
  'travel': 'Travel',
  'religion': 'Religion',
  'spirituality': 'Spirituality',
  'health': 'Health',
  'fitness': 'Fitness',
  'education': 'Education',
  'reference': 'Reference',
};

// Normalize genre names
function normalizeGenre(genre: string): string {
  const lower = genre.toLowerCase().trim();
  return GENRE_MAPPINGS[lower] || genre.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

// Extract genres from Open Library subjects
function extractGenres(subjects: string[]): string[] {
  if (!subjects || subjects.length === 0) return [];
  
  const genres: Set<string> = new Set();
  
  for (const subject of subjects) {
    const lower = subject.toLowerCase();
    
    // Skip non-genre subjects (places, people, times, etc.)
    if (
      lower.includes('fiction') ||
      lower.includes('nonfiction') ||
      lower.includes('novel') ||
      lower.includes('story') ||
      lower.includes('tale') ||
      GENRE_MAPPINGS[lower] ||
      // Check if it's a known genre
      Object.keys(GENRE_MAPPINGS).some(key => lower.includes(key))
    ) {
      const normalized = normalizeGenre(subject);
      if (normalized && normalized.length > 0) {
        genres.add(normalized);
      }
    }
  }
  
  // If no genres found, try to infer from subjects
  if (genres.size === 0) {
    for (const subject of subjects.slice(0, 3)) {
      const normalized = normalizeGenre(subject);
      if (normalized && normalized.length < 30) { // Avoid very long subjects
        genres.add(normalized);
      }
    }
  }
  
  return Array.from(genres).slice(0, 5); // Limit to 5 genres
}

/**
 * Search for a book in Open Library and return its genres
 */
export async function getBookGenres(title: string): Promise<string[]> {
  try {
    // Search for the book
    const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`;
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      console.warn(`Open Library search failed for "${title}"`);
      return [];
    }
    
    const searchData: OpenLibrarySearchResult = await searchResponse.json();
    
    if (!searchData.docs || searchData.docs.length === 0) {
      return [];
    }
    
    const book = searchData.docs[0];
    
    // Get detailed work information
    if (book.key) {
      const workKey = book.key.startsWith('/works/') 
        ? book.key 
        : `/works/${book.key}`;
      
      const workUrl = `https://openlibrary.org${workKey}.json`;
      const workResponse = await fetch(workUrl);
      
      if (workResponse.ok) {
        const workData: OpenLibraryWork = await workResponse.json();
        
        if (workData.subjects && workData.subjects.length > 0) {
          return extractGenres(workData.subjects);
        }
      }
    }
    
    // Fallback to subjects from search result
    if (book.subject && book.subject.length > 0) {
      return extractGenres(book.subject);
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching genres for "${title}":`, error);
    return [];
  }
}

/**
 * Tag a book with genres (with caching to avoid repeated API calls)
 */
const genreCache = new Map<string, { genres: string[]; timestamp: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function tagBookWithGenres(title: string): Promise<string[]> {
  const cacheKey = title.toLowerCase().trim();
  const cached = genreCache.get(cacheKey);
  
  // Check cache
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.genres;
  }
  
  // Fetch genres
  const genres = await getBookGenres(title);
  
  // Cache the result
  genreCache.set(cacheKey, {
    genres,
    timestamp: Date.now(),
  });
  
  return genres;
}

