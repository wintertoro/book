'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuoteHighlight from '@/components/QuoteHighlight';
import { Book, Quote, PagePhoto } from '@/lib/storage';

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
  }, [bookId]);

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
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Library</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 sm:pt-32 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
        {/* Book Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl font-bold">{book.title}</h1>
              {book.author && (
                <div className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                  <span className="font-medium">by {book.author}</span>
                </div>
              )}
              {book.genres && book.genres.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <span className="font-medium">Genres: </span>
                  <span>{book.genres.join(', ')}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleMoveToWishlist}
              disabled={movingToWishlist}
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-black text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
              title="Move to wish list"
            >
              {movingToWishlist ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  Moving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  Move to Wish List
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
              <span>• {book.quotes.length} quote{book.quotes.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Upload Page Photo Section */}
        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="text-2xl">📷</span> Upload Page Photo
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Page Number (optional)
              </label>
              <input
                type="number"
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                placeholder="e.g., 42"
                className="w-full px-4 py-2 bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploadingPhoto ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload Photo
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Page Photos and Quotes */}
        {book.pagePhotos && book.pagePhotos.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">📄</span> Page Photos
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {book.pagePhotos.map((pagePhoto) => (
                <div key={pagePhoto.id} className="glass rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {pagePhoto.pageNumber ? `Page ${pagePhoto.pageNumber}` : 'Page Photo'}
                    </h3>
                    <button
                      onClick={() => setSelectedPagePhoto(pagePhoto)}
                      className="px-3 py-1 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                    >
                      {selectedPagePhoto?.id === pagePhoto.id ? 'Selected' : 'Select to Highlight'}
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
                    <div className="space-y-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Quotes from this page:
                      </h4>
                      {pagePhoto.quotes.map((quote) => (
                        <div
                          key={quote.id}
                          className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 relative group"
                        >
                          <p className="text-sm text-gray-800 dark:text-gray-200 italic">
                            "{quote.text}"
                          </p>
                          <button
                            onClick={() => handleDeleteQuote(quote.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                            title="Delete quote"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">💬</span> All Quotes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {book.quotes.map((quote) => {
                const pagePhoto = book.pagePhotos?.find(p => p.id === quote.pagePhotoId);
                return (
                  <div
                    key={quote.id}
                    className="glass rounded-xl p-5 space-y-2 group relative"
                  >
                    <p className="text-base text-gray-800 dark:text-gray-200 italic leading-relaxed">
                      "{quote.text}"
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {quote.pageNumber && (
                        <span>Page {quote.pageNumber}</span>
                      )}
                      {pagePhoto && !quote.pageNumber && pagePhoto.pageNumber && (
                        <span>Page {pagePhoto.pageNumber}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteQuote(quote.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete quote"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
              px-6 py-3 rounded-full shadow-2xl backdrop-blur-xl border flex items-center gap-3
              ${message.type === 'success'
                ? 'bg-gray-50/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                : 'bg-gray-100/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
              }
            `}>
              {message.type === 'success' ? (
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-medium text-sm truncate">{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="ml-auto p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

