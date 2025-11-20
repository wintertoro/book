'use client';

import { Book } from '@/lib/storage';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

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

  // Extract all unique genres from books
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    books.forEach(book => {
      if (book.genres) {
        book.genres.forEach(genre => genreSet.add(genre));
      }
    });
    return Array.from(genreSet).sort();
  }, [books]);

  // Filter books by search term and selected genres
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      // Search filter (title and genres)
      const matchesSearch = searchTerm === '' || 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (book.genres && book.genres.some(genre => 
          genre.toLowerCase().includes(searchTerm.toLowerCase())
        ));
      
      // Genre filter
      const matchesGenres = selectedGenres.size === 0 ||
        (book.genres && book.genres.some(genre => selectedGenres.has(genre)));
      
      return matchesSearch && matchesGenres;
    });
  }, [books, searchTerm, selectedGenres]);

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

  if (books.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--color-gray-400)] glass rounded-2xl border-dashed border-[var(--color-gray-200)] dark:border-[var(--color-gray-800)]">
        <div className="text-5xl mb-4 opacity-50">📚</div>
        <p className="text-lg font-medium mb-2 text-[var(--color-foreground)]">Your library is empty</p>
        <p className="text-sm text-[var(--color-gray-500)]">Upload a photo or add manually to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Search and Filter Bar */}
      <div className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-[var(--color-gray-400)] group-focus-within:text-[var(--color-foreground)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by title or genre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-[var(--color-background)]/50 backdrop-blur-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/20 focus:border-[var(--color-foreground)] transition-all text-base shadow-sm"
          />
          {searchTerm && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <span className="text-xs text-[var(--color-gray-500)] font-medium bg-[var(--color-gray-100)] dark:bg-[var(--color-gray-800)] px-2.5 py-1 rounded-full">
                {filteredBooks.length} results
              </span>
            </div>
          )}
        </div>

        {/* Genre Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowGenreFilter(!showGenreFilter)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-lg hover:bg-[var(--color-gray-100)] dark:hover:bg-[var(--color-gray-800)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter by Genre
            {selectedGenres.size > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-black dark:bg-white text-white dark:text-black rounded-full">
                {selectedGenres.size}
              </span>
            )}
          </button>

          {booksWithoutGenres > 0 && (
            <button
              onClick={handleBackfillGenres}
              disabled={isBackfilling}
              className="px-4 py-2 text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-lg hover:bg-[var(--color-gray-100)] dark:hover:bg-[var(--color-gray-800)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBackfilling ? 'Tagging...' : `Tag Genres (${booksWithoutGenres} books)`}
            </button>
          )}

          {selectedGenres.size > 0 && (
            <button
              onClick={() => setSelectedGenres(new Set())}
              className="px-3 py-2 text-xs font-medium text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] dark:hover:text-[var(--color-gray-300)]"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Genre Filter Pills */}
        {showGenreFilter && allGenres.length > 0 && (
          <div className="flex flex-wrap gap-2 p-4 bg-white/30 dark:bg-black/30 backdrop-blur-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-xl">
            {allGenres.map(genre => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  selectedGenres.has(genre)
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-white/50 dark:bg-black/50 text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] hover:bg-[var(--color-gray-100)] dark:hover:bg-[var(--color-gray-800)]'
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
            <span className="text-xs text-[var(--color-gray-500)] font-medium">Active filters:</span>
            {Array.from(selectedGenres).map(genre => (
              <span
                key={genre}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-full"
              >
                {genre}
                <button
                  onClick={() => toggleGenre(genre)}
                  className="hover:opacity-70"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBooks.map((book) => (
          <div
            key={book.id}
            className="group relative glass glass-hover rounded-2xl p-5 flex flex-col justify-between h-full"
          >
            <div className="flex items-start gap-4">
              <div className="min-w-[40px] h-14 bg-[var(--color-gray-100)] dark:bg-[var(--color-gray-800)] rounded-lg flex items-center justify-center text-xl shadow-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]">
                📖
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => router.push(`/books/${book.id}`)}
                  className="text-left w-full"
                >
                  <h3 className="text-base font-semibold text-[var(--color-foreground)] leading-tight line-clamp-2 mb-2 group-hover:text-[var(--color-gray-600)] dark:group-hover:text-[var(--color-gray-400)] transition-colors hover:underline">
                    {book.title}
                  </h3>
                </button>
                {book.genres && book.genres.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-medium">
                      Genres: {book.genres.join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-[var(--color-gray-400)] font-medium uppercase tracking-wider">
                  <span>
                    Added: {(() => {
                      const addedDate = new Date(book.addedAt);
                      const now = new Date();
                      const diffMs = now.getTime() - addedDate.getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);
                      
                      if (diffHours < 1) return 'Just now';
                      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                      return addedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: addedDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                      });
                    })()}
                  </span>
                  {book.quotes && book.quotes.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        {book.quotes.length} quote{book.quotes.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-800)] flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <button
                onClick={() => router.push(`/books/${book.id}`)}
                className="px-3 py-1.5 text-xs font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] bg-[var(--color-gray-100)] dark:bg-[var(--color-gray-800)] hover:bg-[var(--color-gray-200)] dark:hover:bg-[var(--color-gray-700)] rounded-lg transition-colors flex items-center gap-1.5"
                title="View book details"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Details
              </button>
              <div className="flex gap-2">
              {onMoveToWishList && (
                <button
                  onClick={() => handleMoveToWishList(book.id)}
                  disabled={movingId === book.id || deletingId === book.id}
                  className="p-2 text-[var(--color-gray-400)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-gray-100)] dark:hover:bg-[var(--color-gray-800)] rounded-lg transition-colors"
                  title="Move to wish list"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => handleDelete(book.id)}
                disabled={deletingId === book.id || movingId === book.id}
                className="p-2 text-[var(--color-gray-400)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-gray-100)] dark:hover:bg-[var(--color-gray-800)] rounded-lg transition-colors"
                title="Delete book"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {(movingId === book.id || deletingId === book.id) && (
              <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl z-10">
                <div className="text-xs font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] bg-white dark:bg-[var(--color-background)] px-4 py-2 rounded-full shadow-lg border border-[var(--color-gray-200)] dark:border-[var(--color-gray-800)] animate-pulse">
                  {movingId === book.id ? 'Moving...' : 'Deleting...'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredBooks.length === 0 && (searchTerm || selectedGenres.size > 0) && (
        <div className="text-center py-16 text-[var(--color-gray-400)]">
          <p className="text-base">
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

