'use client';

import type { Book } from '@/lib/storage';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ShelfView from './ShelfView';

interface BookListProps {
  books: Book[];
  onDelete: (id: string) => Promise<void>;
  onMoveToWishList?: (id: string) => Promise<void>;
  onBooksUpdated?: () => void;
}

export default function BookList({ books, onDelete, onMoveToWishList, onBooksUpdated }: BookListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'shelf'>('list');
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'dateAdded' | 'status'>('dateAdded');
  // Status filter removed for now - can be added later if needed
  const statusFilter = new Set<string>();
  const searchedAuthorIdsRef = useRef<Set<string>>(new Set());

  // Extract all unique genres from books
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    for (const book of books) {
      if (book.genres) {
        for (const genre of book.genres) {
          genreSet.add(genre);
        }
      }
    }
    return Array.from(genreSet).sort();
  }, [books]);

  // Filter and sort books
  const filteredAndSortedBooks = useMemo(() => {
    const filtered = books.filter(book => {
      // Search filter (title, author, and genres)
      const matchesSearch = searchTerm === '' || 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (book.genres && book.genres.some(genre => 
          genre.toLowerCase().includes(searchTerm.toLowerCase())
        ));
      
      // Genre filter
      const matchesGenres = selectedGenres.size === 0 ||
        (book.genres && book.genres.some(genre => selectedGenres.has(genre)));
      
      // Status filter
      const bookStatus = book.readingProgress?.status || 'unread';
      const matchesStatus = statusFilter.size === 0 || statusFilter.has(bookStatus);
      
      return matchesSearch && matchesGenres && matchesStatus;
    });

    // Sort books
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title': {
          return a.title.localeCompare(b.title);
        }
        case 'author': {
          return (a.author || '').localeCompare(b.author || '');
        }
        case 'dateAdded': {
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        }
        case 'status': {
          const statusA = a.readingProgress?.status || 'unread';
          const statusB = b.readingProgress?.status || 'unread';
          const statusOrder = { 'reading': 0, 'unread': 1, 'completed': 2, 'dnf': 3, 'lent': 4 };
          return (statusOrder[statusA as keyof typeof statusOrder] || 99) - 
                 (statusOrder[statusB as keyof typeof statusOrder] || 99);
        }
        default: {
          return 0;
        }
      }
    });

    return filtered;
  }, [books, searchTerm, selectedGenres, statusFilter, sortBy]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this book from your library?')) {
      return;
    }

    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Failed to delete book');
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveToWishList = async (id: string) => {
    if (!onMoveToWishList) return;

    setMovingId(id);
    try {
      await onMoveToWishList(id);
    } catch (error) {
      console.error('Error moving to wish list:', error);
      alert('Failed to move to wish list');
    } finally {
      setMovingId(null);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      const next = new Set(prev);
      if (next.has(genre)) {
        next.delete(genre);
      } else {
        next.add(genre);
      }
      return next;
    });
  };

  const handleBackfillGenres = async () => {
    if (!confirm('This will fetch genres for all books without genres. This may take a few minutes. Continue?')) {
      return;
    }

    setIsBackfilling(true);
    try {
      const response = await fetch('/api/books/genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backfill' }),
      });

      if (!response.ok) {
        throw new Error('Failed to backfill genres');
      }

      const data = await response.json();
      alert(`Genres updated for ${data.updated} books. ${data.failed} failed.`);
      
      if (onBooksUpdated) {
        onBooksUpdated();
      }
    } catch (error) {
      console.error('Error backfilling genres:', error);
      alert('Failed to backfill genres');
    } finally {
      setIsBackfilling(false);
    }
  };

  const booksWithoutGenres = books.filter(book => !book.genres || book.genres.length === 0).length;

  // Automatically search for authors when books without authors are loaded
  useEffect(() => {
    const searchForMissingAuthors = async () => {
      const booksWithoutAuthors = books.filter(
        book => !book.author && !searchedAuthorIdsRef.current.has(book.id)
      );

      if (booksWithoutAuthors.length === 0) {
        return;
      }

      // Search for authors one at a time to avoid rate limiting
      for (const book of booksWithoutAuthors.slice(0, 5)) { // Limit to 5 at a time
        searchedAuthorIdsRef.current.add(book.id);
        
        try {
          const response = await fetch(`/api/books/${book.id}/author`, {
            method: 'POST',
          });

          if (response.ok) {
            const data = await response.json();
            if (data.wasUpdated && onBooksUpdated) {
              // Small delay before refreshing to allow multiple updates to batch
              setTimeout(() => {
                onBooksUpdated();
              }, 1000);
            }
          }
        } catch (error) {
          console.error(`Error searching for author for "${book.title}":`, error);
        } finally {
          // Add delay between searches to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };

    // Only search if there are books without authors
    if (books.length > 0) {
      searchForMissingAuthors();
    }
  }, [books, onBooksUpdated]);

  if (books.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-gray-800">
        <div className="max-w-md mx-auto space-y-4">
          <div className="text-6xl mb-4 opacity-30">📚</div>
          <p className="text-sm font-light mb-2 text-[var(--color-foreground)] uppercase tracking-wide">Your library is empty</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-light mb-4">
            Upload a photo of your bookshelf or add books manually to get started
          </p>
          <div className="text-xs text-gray-400 dark:text-gray-600 font-light space-y-1">
            <p className="uppercase tracking-wide mb-2">Tips for best results:</p>
            <ul className="space-y-1 text-left max-w-xs mx-auto">
              <li>• Hold phone parallel to book spines</li>
              <li>• Ensure good lighting</li>
              <li>• Keep camera steady</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Search and Filter Bar */}
      <div className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-[var(--color-gray-400)] group-focus-within:text-[var(--color-foreground)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by title, author, or genre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-transparent border-b border-[var(--color-gray-300)] dark:border-[var(--color-gray-700)] focus:outline-none focus:border-[var(--color-foreground)] transition-all text-sm font-light"
          />
          {searchTerm && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-light">
                {filteredAndSortedBooks.length}
              </span>
            </div>
          )}
        </div>

        {/* View and Filter Controls */}
        <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowGenreFilter(!showGenreFilter)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-light text-[var(--color-foreground)] bg-transparent border border-[var(--color-gray-300)] dark:border-[var(--color-gray-700)] hover:border-[var(--color-foreground)] transition-all uppercase tracking-wide"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter by Genre
            {selectedGenres.size > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-black dark:bg-white text-white dark:text-black">
                {selectedGenres.size}
              </span>
            )}
          </button>

          {booksWithoutGenres > 0 && (
            <button
              type="button"
              onClick={handleBackfillGenres}
              disabled={isBackfilling}
                className="px-4 py-2 text-xs font-light text-[var(--color-foreground)] bg-transparent border border-[var(--color-gray-300)] dark:border-[var(--color-gray-700)] hover:border-[var(--color-foreground)] transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBackfilling ? 'Tagging...' : `Tag Genres (${booksWithoutGenres} books)`}
            </button>
          )}

          {selectedGenres.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedGenres(new Set())}
                className="px-3 py-2 text-xs font-light text-gray-500 dark:text-gray-400 hover:text-[var(--color-foreground)] uppercase tracking-wide"
              >
                Clear
              </button>
            )}
          </div>

          {/* View Toggle and Sort */}
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 text-xs font-light bg-transparent border border-[var(--color-gray-300)] dark:border-[var(--color-gray-700)] hover:border-[var(--color-foreground)] transition-all uppercase tracking-wide focus:outline-none focus:border-[var(--color-foreground)]"
            >
              <option value="dateAdded">Date Added</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="status">Status</option>
            </select>
            
            <div className="flex border border-[var(--color-gray-300)] dark:border-[var(--color-gray-700)] rounded-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-transparent text-[var(--color-foreground)] hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                title="List View"
                aria-label="List View"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('shelf')}
                className={`p-2 ${viewMode === 'shelf' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-transparent text-[var(--color-foreground)] hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                title="Shelf View"
                aria-label="Shelf View"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Genre Filter Pills */}
        {showGenreFilter && allGenres.length > 0 && (
          <div className="flex flex-wrap gap-2 p-4 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-800)]">
            {allGenres.map(genre => (
              <button
                type="button"
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`px-3 py-1.5 text-xs font-light transition-all ${
                  selectedGenres.has(genre)
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-transparent text-[var(--color-foreground)] border border-[var(--color-gray-300)] dark:border-[var(--color-gray-700)] hover:border-[var(--color-foreground)]'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}

        {/* Active Filters Display */}
        {selectedGenres.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-light uppercase tracking-wide">Active:</span>
            {Array.from(selectedGenres).map(genre => (
              <span
                key={genre}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-light bg-black dark:bg-white text-white dark:text-black"
              >
                {genre}
                <button
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className="hover:opacity-70"
                  aria-label={`Remove ${genre} filter`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'shelf' ? (
        <ShelfView 
          books={filteredAndSortedBooks}
          onBookClick={(book) => router.push(`/books/${book.id}`)}
        />
      ) : (
        // List View
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedBooks.map((book) => {
            const coverImage = book.metadata?.coverImageUrl || book.metadata?.thumbnailUrl;
            const readingStatus = book.readingProgress?.status || 'unread';
            
            return (
            <div
              key={book.id}
              className="group relative border border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between h-full hover:border-[var(--color-foreground)]/30 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="min-w-[48px] w-12 h-16 bg-gray-100 dark:bg-gray-900 flex-shrink-0 overflow-hidden border border-gray-200 dark:border-gray-800 relative">
                  {coverImage ? (
                    <Image src={coverImage} alt={book.title} fill className="object-cover" sizes="48px" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">📖</div>
                  )}
              </div>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => router.push(`/books/${book.id}`)}
                    className="text-left w-full group/title"
                    aria-label={`View details for ${book.title}`}
                >
                    <h3 className="text-sm font-light text-[var(--color-foreground)] leading-tight line-clamp-2 mb-1.5 group-hover/title:underline transition-all">
                    {book.title}
                  </h3>
                </button>
                {book.author && (
                    <div className="mb-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-light">
                        {book.author}
                    </span>
                  </div>
                )}
                  {readingStatus !== 'unread' && (
                  <div className="mb-2">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] uppercase tracking-wider border ${
                        readingStatus === 'completed' 
                          ? 'border-green-200 text-green-700 dark:border-green-900 dark:text-green-400'
                          : readingStatus === 'reading'
                          ? 'border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-400'
                          : 'border-gray-200 text-gray-500'
                      }`}>
                        {readingStatus}
                    </span>
                  </div>
                )}
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-600 font-light uppercase tracking-wider">
                  <span>
                      Added: {new Date(book.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {book.quotes && book.quotes.length > 0 && (
                    <>
                      <span>•</span>
                        <span>{book.quotes.length} quotes</span>
                    </>
                  )}
                </div>
              </div>
            </div>

              {/* Actions - Always visible for better mobile UX */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-wrap justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/books/${book.id}`)}
                  className="px-3 py-1.5 text-xs font-light text-[var(--color-foreground)] bg-transparent border border-gray-300 dark:border-gray-700 hover:border-[var(--color-foreground)] transition-all uppercase tracking-wide flex items-center gap-1.5"
                  aria-label={`View details for ${book.title}`}
                >
                  View
              </button>
              <div className="flex gap-2">
              {onMoveToWishList && (
                <button
                  type="button"
                  onClick={() => handleMoveToWishList(book.id)}
                  disabled={movingId === book.id || deletingId === book.id}
                    className="p-2 text-gray-400 dark:text-gray-600 hover:text-[var(--color-foreground)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)] focus:ring-offset-2"
                    aria-label={`Move ${book.title} to wish list`}
                  title="Move to wish list"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(book.id)}
                disabled={deletingId === book.id || movingId === book.id}
                  className="p-2 text-gray-400 dark:text-gray-600 hover:text-[var(--color-foreground)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)] focus:ring-offset-2"
                  aria-label={`Delete ${book.title}`}
                title="Delete book"
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {filteredAndSortedBooks.length === 0 && (searchTerm || selectedGenres.size > 0 || statusFilter.size > 0) && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-sm font-light">
            {searchTerm && selectedGenres.size > 0
              ? `No books found matching "${searchTerm}" with selected genres`
              : searchTerm
              ? `No books found matching "${searchTerm}"`
              : 'No books found with selected genres'}
          </p>
        </div>
      )}
    </div>
  );
}
