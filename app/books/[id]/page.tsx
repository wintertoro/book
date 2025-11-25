'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuoteHighlight from '@/components/QuoteHighlight';
import type { Book, PagePhoto } from '@/lib/storage';
import ReadingStatusControl from '@/components/ReadingStatusControl';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;
  
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [extractingQuote, setExtractingQuote] = useState<string | null>(null);
  const [selectedPagePhoto, setSelectedPagePhoto] = useState<PagePhoto | null>(null);
  const [pageNumber, setPageNumber] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [movingToWishlist, setMovingToWishlist] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSearchedAuthorRef = useRef(false);

  const loadBook = useCallback(async () => {
    try {
      const response = await fetch(`/api/books/${bookId}`);
      if (!response.ok) throw new Error('Failed to load book');
      const data = await response.json();
      setBook(data.book);
    } catch (error) {
      console.error('Error loading book:', error);
      setMessage({ type: 'error', text: 'Failed to load book' });
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  // Automatically search for author if book doesn't have one
  useEffect(() => {
    const searchForAuthor = async () => {
      if (book && !book.author && !hasSearchedAuthorRef.current) {
        hasSearchedAuthorRef.current = true;
        try {
          const response = await fetch(`/api/books/${bookId}/author`, {
            method: 'POST',
          });

          if (response.ok) {
            const data = await response.json();
            if (data.wasUpdated && data.author) {
              // Reload the book to get the updated author
              await loadBook();
            }
          }
        } catch (error) {
          console.error('Error searching for author:', error);
          // Silently fail - don't show error to user
        }
      }
    };

    if (book) {
      searchForAuthor();
    }
  }, [book, bookId, loadBook]);

  // Reset the search flag when bookId changes
  useEffect(() => {
    hasSearchedAuthorRef.current = false;
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('bookId', bookId);
      if (pageNumber) {
        formData.append('pageNumber', pageNumber);
      }

      const response = await fetch('/api/page-photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      const data = await response.json();
      await loadBook();
      setSelectedPagePhoto(data.pagePhoto);
      setPageNumber('');
      setMessage({ type: 'success', text: 'Page photo uploaded successfully' });
    } catch (error) {
      console.error('Error uploading photo:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload photo',
      });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleQuoteSelect = async (
    boundingBox: { x: number; y: number; width: number; height: number },
    imageFile: File
  ) => {
    if (!selectedPagePhoto) return;

    setExtractingQuote(selectedPagePhoto.id);
    setMessage(null);

    try {
      // First, extract text using OCR
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('x', boundingBox.x.toString());
      formData.append('y', boundingBox.y.toString());
      formData.append('width', boundingBox.width.toString());
      formData.append('height', boundingBox.height.toString());

      const ocrResponse = await fetch('/api/extract-quote', {
        method: 'POST',
        body: formData,
      });

      if (!ocrResponse.ok) {
        throw new Error('Failed to extract quote text');
      }

      const ocrData = await ocrResponse.json();

      // Then save the quote
      const quoteResponse = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          pagePhotoId: selectedPagePhoto.id,
          text: ocrData.text,
          pageNumber: ocrData.pageNumber || selectedPagePhoto.pageNumber,
          boundingBox,
        }),
      });

      if (!quoteResponse.ok) {
        throw new Error('Failed to save quote');
      }

      await loadBook();
      setMessage({ type: 'success', text: 'Quote saved successfully' });
    } catch (error) {
      console.error('Error extracting quote:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to extract quote',
      });
    } finally {
      setExtractingQuote(null);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;

    try {
      const response = await fetch(`/api/quotes?bookId=${bookId}&quoteId=${quoteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete quote');
      await loadBook();
      setMessage({ type: 'success', text: 'Quote deleted' });
    } catch (error) {
      console.error('Error deleting quote:', error);
      setMessage({ type: 'error', text: 'Failed to delete quote' });
    }
  };

  const handleMoveToWishlist = async () => {
    if (!confirm('Move this book to your wish list?')) return;

    setMovingToWishlist(true);
    setMessage(null);

    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move-from-library',
          id: bookId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to move to wish list');
      }

      const data = await response.json();
      
      if (data.isDuplicate) {
        setMessage({ type: 'error', text: 'This book is already in your wish list' });
      } else {
        setMessage({ type: 'success', text: 'Moved to wish list' });
        // Redirect to home page after a short delay
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    } catch (error) {
      console.error('Error moving to wish list:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to move to wish list',
      });
    } finally {
      setMovingToWishlist(false);
    }
  };

  // Fetch metadata if missing
  const handleFetchMetadata = async () => {
    if (!book) return;
    
    try {
      const response = await fetch(`/api/books/${bookId}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBook(data.book);
        setMessage({ type: 'success', text: 'Book metadata updated' });
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setMessage({ type: 'error', text: 'Failed to fetch metadata' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-black dark:border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading book...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-4">Book not found</p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-light text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors uppercase tracking-wide"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Library
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 sm:pt-24 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        {/* Book Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Cover Image */}
          <div className="aspect-[2/3] w-full max-w-sm mx-auto md:max-w-none relative border border-gray-200 dark:border-gray-800 shadow-sm">
            {book.metadata?.coverImageUrl || book.metadata?.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={book.metadata.coverImageUrl || book.metadata.thumbnailUrl} 
                alt={`Cover of ${book.title}`} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-8 text-center">
                <div className="text-4xl mb-4 opacity-20">📖</div>
                <p className="text-lg font-serif text-gray-400 dark:text-gray-500 line-clamp-3">{book.title}</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="md:col-span-2 space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight text-[var(--color-foreground)]">
                {book.title}
              </h1>
              {book.author && (
                <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 font-light">
                  by {book.author}
                </p>
              )}
            </div>

            {/* Reading Status Controls */}
            <ReadingStatusControl 
              book={book} 
              onUpdate={(updatedBook) => {
                setBook(updatedBook);
                setMessage({ type: 'success', text: 'Reading status updated' });
              }}
            />

            {/* Description */}
            {book.metadata?.description && (
              <div className="space-y-2">
                <h3 className="text-xs font-light uppercase tracking-wide text-gray-400 dark:text-gray-600">Synopsis</h3>
                <p className="text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-300 font-light">
                  {book.metadata.description.replace(/<[^>]*>?/gm, '')}
                </p>
              </div>
            )}

            {/* Details Grid */}
            {book.metadata && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                {book.metadata.pageCount && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-600 mb-1">Pages</h4>
                    <p className="text-sm font-light">{book.metadata.pageCount}</p>
                  </div>
                )}
                {book.metadata.publishedDate && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-600 mb-1">Published</h4>
                    <p className="text-sm font-light">{new Date(book.metadata.publishedDate).getFullYear()}</p>
                  </div>
                )}
                {book.metadata.publisher && (
                  <div className="col-span-2 sm:col-span-1">
                    <h4 className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-600 mb-1">Publisher</h4>
                    <p className="text-sm font-light truncate" title={book.metadata.publisher}>{book.metadata.publisher}</p>
                  </div>
                )}
                {(book.metadata.isbn || book.metadata.isbn13) && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-600 mb-1">ISBN</h4>
                    <p className="text-sm font-light font-mono text-xs pt-0.5">{book.metadata.isbn13 || book.metadata.isbn}</p>
                  </div>
                )}
                {book.metadata.averageRating && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-600 mb-1">Rating</h4>
                    <p className="text-sm font-light">{book.metadata.averageRating.toFixed(1)} ⭐</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-6 flex flex-wrap gap-4">
              {!book.metadata && (
                <button
                  type="button"
                  onClick={handleFetchMetadata}
                  className="px-6 py-3 text-xs font-light bg-transparent border border-gray-300 dark:border-gray-700 text-[var(--color-foreground)] hover:border-[var(--color-foreground)] transition-all uppercase tracking-wide flex items-center gap-2"
                >
                  Fetch Book Details
                </button>
              )}
              <button
                type="button"
                onClick={handleMoveToWishlist}
                disabled={movingToWishlist}
                className="px-6 py-3 text-xs font-light bg-transparent border border-gray-300 dark:border-gray-700 text-[var(--color-foreground)] hover:border-[var(--color-foreground)] transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {movingToWishlist ? 'Moving...' : 'Move to Wish List'}
              </button>
            </div>
          </div>
        </div>

        {/* Upload Page Photo Section */}
        <section className="border border-gray-200 dark:border-gray-800 p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-light uppercase tracking-wide text-[var(--color-foreground)] flex items-center gap-3">
            <span className="text-xl opacity-50">📷</span> Upload Page Photo
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label htmlFor="page-number" className="block text-xs font-light text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Page Number (optional)
              </label>
              <input
                id="page-number"
                type="number"
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                placeholder="e.g., 42"
                className="w-full px-4 py-2 bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-[var(--color-foreground)] transition-all font-light"
              />
            </div>
            <div className="w-full sm:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full sm:w-auto px-6 py-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs uppercase tracking-wide border border-black dark:border-white"
              >
                {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </div>
        </section>

        {/* Page Photos and Quotes */}
        {book.pagePhotos && book.pagePhotos.length > 0 && (
          <section className="space-y-8">
            <h2 className="text-lg font-light uppercase tracking-wide text-[var(--color-foreground)] flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-4">
              <span className="text-xl opacity-50">📄</span> Page Photos
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {book.pagePhotos.map((pagePhoto) => (
                <div key={pagePhoto.id} className="border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-light text-sm">
                      {pagePhoto.pageNumber ? `Page ${pagePhoto.pageNumber}` : 'Page Photo'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedPagePhoto(pagePhoto)}
                      className={`px-3 py-1 text-[10px] uppercase tracking-wide border transition-all ${
                        selectedPagePhoto?.id === pagePhoto.id
                          ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                          : 'bg-transparent text-gray-500 border-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {selectedPagePhoto?.id === pagePhoto.id ? 'Selected' : 'Highlight Text'}
                    </button>
                  </div>
                  
                  {selectedPagePhoto?.id === pagePhoto.id && (
                    <QuoteHighlight
                      imageUrl={pagePhoto.imageUrl}
                      onSelect={handleQuoteSelect}
                      isProcessing={extractingQuote === pagePhoto.id}
                    />
                  )}

                  {pagePhoto.quotes && pagePhoto.quotes.length > 0 && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <h4 className="text-xs font-light uppercase tracking-wide text-gray-500">
                        Quotes from this page
                      </h4>
                      {pagePhoto.quotes.map((quote) => (
                        <div
                          key={quote.id}
                          className="bg-gray-50 dark:bg-gray-900/50 p-4 relative group border-l-2 border-gray-300 dark:border-gray-700"
                        >
                          <p className="text-sm text-gray-800 dark:text-gray-200 italic font-serif leading-relaxed">
                            &ldquo;{quote.text}&rdquo;
                          </p>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuote(quote.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[var(--color-foreground)] transition-all"
                            title="Delete quote"
                            aria-label="Delete quote"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Quotes Section */}
        {book.quotes && book.quotes.length > 0 && (
          <section className="space-y-8">
            <h2 className="text-lg font-light uppercase tracking-wide text-[var(--color-foreground)] flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-4">
              <span className="text-xl opacity-50">💬</span> All Quotes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {book.quotes.map((quote) => {
                const pagePhoto = book.pagePhotos?.find(p => p.id === quote.pagePhotoId);
                return (
                  <div
                    key={quote.id}
                    className="border border-gray-200 dark:border-gray-800 p-6 space-y-4 group relative hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                  >
                    <p className="text-base text-gray-800 dark:text-gray-200 italic font-serif leading-relaxed">
                      &ldquo;{quote.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600 font-light uppercase tracking-wide pt-2 border-t border-gray-100 dark:border-gray-800/50">
                      {quote.pageNumber && (
                        <span>Page {quote.pageNumber}</span>
                      )}
                      {pagePhoto && !quote.pageNumber && pagePhoto.pageNumber && (
                        <span>Page {pagePhoto.pageNumber}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuote(quote.id)}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[var(--color-foreground)] transition-all"
                      title="Delete quote"
                      aria-label="Delete quote"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Message Toast */}
        {message && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-full max-w-md px-4">
            <div className={`
              px-6 py-4 border flex items-center gap-3 bg-white dark:bg-black shadow-lg
              ${message.type === 'success'
                ? 'border-gray-300 dark:border-gray-700 text-[var(--color-foreground)]'
                : 'border-gray-800 dark:border-gray-200 text-[var(--color-foreground)]'
              }
            `}>
              {message.type === 'success' ? (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-light text-sm truncate">{message.text}</span>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="ml-auto p-1 hover:opacity-50"
                aria-label="Dismiss message"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
