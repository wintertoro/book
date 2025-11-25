interface GoogleBookVolumeInfo {
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[]; // genres
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
  industryIdentifiers?: Array<{
    type: string;
    identifier: string;
  }>;
}

export interface EnrichedBookData {
  title?: string;
  author?: string;
  description?: string;
  pageCount?: number;
  publisher?: string;
  publishedDate?: string;
  genres?: string[];
  coverUrl?: string;
  isbn?: string;
}

export async function searchGoogleBooks(query: string): Promise<EnrichedBookData | null> {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`);
    
    if (!res.ok) {
      console.error('Google Books API error:', res.statusText);
      return null;
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    const info = data.items[0].volumeInfo as GoogleBookVolumeInfo;
    
    // Get ISBN-13 if available, else ISBN-10
    const isbnObj = info.industryIdentifiers?.find(id => id.type === 'ISBN_13') 
      || info.industryIdentifiers?.find(id => id.type === 'ISBN_10');

    // Use high-res image if possible (Google API usually returns zoom=1, we can try zoom=0 for bigger)
    let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
    if (coverUrl) {
      coverUrl = coverUrl.replace('http:', 'https:');
    }

    return {
      title: info.title,
      author: info.authors?.[0], // Primary author
      description: info.description,
      pageCount: info.pageCount,
      publisher: info.publisher,
      publishedDate: info.publishedDate,
      genres: info.categories,
      coverUrl,
      isbn: isbnObj?.identifier
    };
  } catch (error) {
    console.error('Error searching Google Books:', error);
    return null;
  }
}

