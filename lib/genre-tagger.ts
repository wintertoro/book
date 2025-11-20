/**
 * Genre tagging service using Open Library API
 * Automatically tags books with genres based on their title and author (when available)
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
export async function getBookGenres(title: string, author?: string): Promise<string[]> {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Search for the book - include author if available for better matching
      let searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=5`;
      if (author) {
        searchUrl += `&author=${encodeURIComponent(author)}`;
      }
      
      // Increase timeout for fetch requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let searchResponse;
      try {
        searchResponse = await fetch(searchUrl, {
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      
      if (!searchResponse.ok) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }
        console.warn(`Open Library search failed for "${title}"`);
        return [];
      }
    
      let searchData: OpenLibrarySearchResult;
      try {
        searchData = await searchResponse.json();
      } catch (error) {
        console.warn(`Failed to parse search response for "${title}"`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        return [];
      }
    
      if (!searchData.docs || searchData.docs.length === 0) {
        return [];
      }
    
      // If author was provided, try to find the best match
      let book = searchData.docs[0];
      if (author) {
        const authorLower = author.toLowerCase();
        const bestMatch = searchData.docs.find(doc => 
          doc.author_name?.some(a => a.toLowerCase().includes(authorLower) || authorLower.includes(a.toLowerCase()))
        );
        if (bestMatch) {
          book = bestMatch;
        }
      }
    
      // Get detailed work information
      if (book.key) {
        const workKey = book.key.startsWith('/works/') 
          ? book.key 
          : `/works/${book.key}`;
        
        const workUrl = `https://openlibrary.org${workKey}.json`;
        const workController = new AbortController();
        const workTimeoutId = setTimeout(() => workController.abort(), 30000);
        
        try {
          const workResponse = await fetch(workUrl, {
            signal: workController.signal,
          });
          
          if (workResponse.ok) {
            try {
              const workData: OpenLibraryWork = await workResponse.json();
            
              if (workData.subjects && workData.subjects.length > 0) {
                clearTimeout(workTimeoutId);
                return extractGenres(workData.subjects);
              }
            } catch (error) {
              console.warn(`Failed to parse work data for "${title}"`);
              // Fall through to use search result subjects
            }
          }
        } catch (error) {
          // If work fetch fails, fall through to use search result subjects
          console.warn(`Failed to fetch work details for "${title}", using search result subjects`);
        } finally {
          clearTimeout(workTimeoutId);
        }
      }
    
      // Fallback to subjects from search result
      if (book.subject && book.subject.length > 0) {
        return extractGenres(book.subject);
      }
    
      return [];
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`Attempt ${attempt} failed for "${title}", retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }
      console.error(`Error fetching genres for "${title}" after ${maxRetries} attempts:`, error);
      return [];
    }
  }
  
  return [];
}

/**
 * Tag a book with genres (with caching to avoid repeated API calls)
 */
const genreCache = new Map<string, { genres: string[]; timestamp: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function tagBookWithGenres(title: string, author?: string): Promise<string[]> {
  // Normalize author - treat empty strings as undefined
  const normalizedAuthor = author?.trim() || undefined;
  
  // Include author in cache key for better accuracy
  const cacheKey = normalizedAuthor 
    ? `${title.toLowerCase().trim()}|${normalizedAuthor.toLowerCase().trim()}`
    : title.toLowerCase().trim();
  const cached = genreCache.get(cacheKey);
  
  // Check cache
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.genres;
  }
  
  // Fetch genres
  const genres = await getBookGenres(title, normalizedAuthor);
  
  // Cache the result
  genreCache.set(cacheKey, {
    genres,
    timestamp: Date.now(),
  });
  
  return genres;
}

