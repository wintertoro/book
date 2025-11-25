'use client';

import { useState, useEffect } from 'react';
import PhotoUpload from '@/components/PhotoUpload';
import BookList from '@/components/BookList';
import WishList from '@/components/WishList';
import ManualBookEntry from '@/components/ManualBookEntry';
import ThemeToggle from '@/components/ThemeToggle';
import AuthButton from '@/components/AuthButton';
import QuoteSearch from '@/components/QuoteSearch';
import ReadingStats from '@/components/ReadingStats';
import type { Book } from '@/lib/storage';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [wishList, setWishList] = useState<Book[]>([]);
  const [pendingBooks, setPendingBooks] = useState<Array<{ title: string; ocrText?: string; confidence?: number; author?: string; selected?: boolean }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadBooks();
    loadWishList();
  }, []);

  const loadBooks = async () => {
    try {
      const response = await fetch('/api/books');
      if (!response.ok) throw new Error('Failed to load books');
      const data = await response.json();
      setBooks(data.books || []);
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const loadWishList = async () => {
    try {
      const response = await fetch('/api/wishlist');
      if (!response.ok) throw new Error('Failed to load wish list');
      const data = await response.json();
      setWishList(data.wishList || []);
    } catch (error) {
      console.error('Error loading wish list:', error);
    }
  };

  const handleUpload = async (file: File) => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process image');
      }

      const data = await response.json();

      // Set pending books for review with OCR text and confidence
      const titles = data.results.map((r: { title: string; confidence?: number }) => ({
        title: r.title,
        ocrText: data.ocrText, // Store OCR text for author extraction
        confidence: r.confidence,
        author: data.author,
      }));
      if (titles.length > 0) {
        setPendingBooks(prev => [...prev, ...titles]);
        setMessage({
          type: 'success',
          text: `Found ${titles.length} book${titles.length !== 1 ? 's' : ''}. Please review below.`,
        });
      } else {
        setMessage({
          type: 'error',
          text: 'No books found in the image.',
        });
      }

      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error processing image:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to process image.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualAdd = async (title: string) => {
    setPendingBooks(prev => [...prev, { title, confidence: 1.0 }]); // Manual entries have high confidence
    setMessage({
      type: 'success',
      text: `"${title}" added to review list.`,
    });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddToLibrary = async (title: string, ocrText?: string) => {
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ocrText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add book');
      }

      const data = await response.json();

      if (data.isDuplicate) {
        setMessage({
          type: 'error',
          text: `"${title}" is already in your library.`,
        });
      } else {
        await loadBooks();
        setMessage({
          type: 'success',
          text: `"${title}" added to library.`,
        });
        // Remove from pending
        setPendingBooks(prev => prev.filter(b => b.title !== title));
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error adding book:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add book',
      });
    }
  };

  const handleAddToWishList = async (title: string) => {
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (res.ok) {
        await loadWishList();
        setMessage({
          type: 'success',
          text: `"${title}" added to wish list.`,
        });
        // Remove from pending
        setPendingBooks(prev => prev.filter(b => b.title !== title));
      } else {
        throw new Error('Failed to add to wish list');
      }
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({
        type: 'error',
        text: 'Failed to add to wish list',
      });
    }
  };

  const handleDiscardPending = (title: string) => {
    setPendingBooks(prev => prev.filter(b => b.title !== title));
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/books?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete book');
      await loadBooks();
      await loadWishList();
    } catch (error) {
      console.error('Error deleting book:', error);
      throw error;
    }
  };

  const handleWishListDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/wishlist?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete from wish list');
      await loadWishList();
      setMessage({ type: 'success', text: 'Book removed from wish list.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting from wish list:', error);
      setMessage({ type: 'error', text: 'Failed to delete from wish list.' });
    }
  };

  const handleMoveToLibrary = async (id: string) => {
    try {
      const book = wishList.find(b => b.id === id);
      if (!book) return;

      const addRes = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: book.title }),
      });

      if (addRes.ok) {
        await fetch(`/api/wishlist?id=${id}`, { method: 'DELETE' });
        await loadBooks();
        await loadWishList();
        setMessage({ type: 'success', text: 'Moved to library' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to move book to library' });
    }
  };

  const handleMoveToWishList = async (id: string) => {
    try {
      const book = books.find(b => b.id === id);
      if (!book) return;

      const addRes = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: book.title }),
      });

      if (addRes.ok) {
        await fetch(`/api/books?id=${id}`, { method: 'DELETE' });
        await loadBooks();
        await loadWishList();
        setMessage({ type: 'success', text: 'Moved to wish list' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to move book' });
    }
  };

  const handleExport = (format: 'csv' | 'json' | 'goodreads') => {
    fetch(`/api/export?format=${format}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to export');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `book-library.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage({ type: 'success', text: `Exported library as ${format.toUpperCase()}` });
      })
      .catch((error) => {
        console.error('Export error:', error);
        setMessage({ type: 'error', text: 'Failed to export library' });
      });
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-black/20 dark:selection:bg-white/20">
      {/* Header - Minimalist */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg sm:text-xl font-light tracking-wide text-[var(--color-foreground)]">
              Library
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content - Minimalist */}
      <main className="pt-16 sm:pt-20 lg:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 sm:space-y-16 lg:space-y-20">

        {/* Hero Section - Minimalist */}
        <section className="text-center space-y-8 sm:space-y-12 animate-fade-in pt-4 sm:pt-8">
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-balance leading-[1.2] text-[var(--color-foreground)]">
              Your Personal<br className="hidden sm:block" />
              <span className="sm:hidden"> </span>Digital Library
            </h2>

            <p className="text-sm sm:text-base lg:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-balance font-light leading-relaxed px-4">
              Scan your bookshelf. Organize your collection.
            </p>
          </div>
        </section>

        {/* Primary Actions Section - Most Important */}
        <section className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          <PhotoUpload onUpload={handleUpload} isProcessing={isProcessing} />
          <div className="flex items-center justify-center gap-4 px-4">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
            <span className="text-xs text-gray-400 dark:text-gray-600 font-light uppercase tracking-wide">or</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
          </div>
          <div className="flex justify-center px-4">
            <ManualBookEntry onAdd={handleManualAdd} />
          </div>
        </section>

        {/* Pending Review Section - Improved Prominence */}
        {pendingBooks.length > 0 && (
          <section className="max-w-3xl mx-auto animate-fade-in px-4">
            <div className="border-2 border-[var(--color-foreground)] overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-foreground)] flex justify-between items-center bg-[var(--color-foreground)] text-white dark:text-black dark:bg-white">
                <div>
                  <h3 className="font-light text-sm uppercase tracking-wide mb-0.5">
                    Review Detected Books
                </h3>
                  <p className="text-xs font-light opacity-90">
                    {pendingBooks.length} {pendingBooks.length === 1 ? 'book' : 'books'} found
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = pendingBooks.every(b => b.selected);
                      setPendingBooks(prev => prev.map(b => ({ ...b, selected: !allSelected })));
                    }}
                    className="text-xs font-light uppercase tracking-wide px-3 py-1.5 border border-white/30 dark:border-black/30 hover:bg-white/20 dark:hover:bg-black/20 transition-all"
                  >
                    {pendingBooks.every(b => b.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                  {pendingBooks.some(b => b.selected) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const selected = pendingBooks.filter(b => b.selected);
                        for (const book of selected) {
                          await handleAddToLibrary(book.title, book.ocrText);
                        }
                        setPendingBooks(prev => prev.filter(b => !b.selected));
                      }}
                      className="text-xs font-light uppercase tracking-wide px-3 py-1.5 bg-white/20 dark:bg-black/20 border border-white/30 dark:border-black/30 hover:bg-white/30 dark:hover:bg-black/30 transition-all"
                    >
                      Add Selected ({pendingBooks.filter(b => b.selected).length})
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-black">
                {pendingBooks.map((book, index) => {
                  const lowConfidence = book.confidence !== undefined && book.confidence < 0.5;
                  
                  return (
                    <div key={`${book.title}-${index}`} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={book.selected || false}
                          onChange={(e) => {
                            const updated = [...pendingBooks];
                            updated[index] = { ...updated[index], selected: e.target.checked };
                            setPendingBooks(updated);
                          }}
                          className="mt-1 w-4 h-4 border-gray-300 dark:border-gray-700 text-black dark:text-white focus:ring-[var(--color-foreground)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <input
                              type="text"
                              value={book.title}
                              onChange={(e) => {
                                const updated = [...pendingBooks];
                                updated[index] = { ...updated[index], title: e.target.value };
                                setPendingBooks(updated);
                              }}
                              className="flex-1 px-2 py-1 text-sm font-light bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-[var(--color-foreground)]"
                              placeholder="Edit title..."
                            />
                            {lowConfidence && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-600 font-light uppercase tracking-wide whitespace-nowrap">
                                Low confidence
                              </span>
                            )}
                          </div>
                          {book.author && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-light">
                              Author: {book.author}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
                      <button
                          type="button"
                        onClick={() => handleAddToLibrary(book.title, book.ocrText)}
                          className="px-4 py-2 text-xs font-light text-white bg-black dark:bg-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 transition-all duration-200 border border-black dark:border-white uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)] focus:ring-offset-2 flex-1 sm:flex-none"
                          aria-label={`Add ${book.title} to library`}
                      >
                        Add to Library
                      </button>
                      <button
                          type="button"
                        onClick={() => handleAddToWishList(book.title)}
                          className="px-4 py-2 text-xs font-light text-[var(--color-foreground)] bg-transparent border border-gray-300 dark:border-gray-700 hover:border-[var(--color-foreground)] transition-all duration-200 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)] focus:ring-offset-2 flex-1 sm:flex-none"
                          aria-label={`Add ${book.title} to wish list`}
                      >
                        Wish List
                      </button>
                      <button
                          type="button"
                        onClick={() => handleDiscardPending(book.title)}
                          className="p-2 text-gray-400 hover:text-[var(--color-foreground)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)] focus:ring-offset-2"
                          aria-label={`Discard ${book.title}`}
                        title="Discard"
                      >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Content Grid - Improved Hierarchy */}
        <div className="space-y-12 sm:space-y-16">
          {/* Main Library Section - Primary Content */}
          <section className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-base sm:text-lg font-light tracking-wide text-[var(--color-foreground)] uppercase mb-1">
                  My Library
              </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-light">
                  {books.length} {books.length === 1 ? 'book' : 'books'} in your collection
                </p>
              </div>
              {books.length > 0 && (
                <div className="flex items-center gap-2">
              <button
                    type="button"
                onClick={() => handleExport('csv')}
                    className="text-xs font-light px-4 py-2 text-[var(--color-foreground)] bg-transparent border border-gray-300 dark:border-gray-700 hover:border-[var(--color-foreground)] transition-all duration-200 uppercase tracking-wide whitespace-nowrap"
                    aria-label="Export library as CSV"
              >
                Export CSV
              </button>
                  <button
                    type="button"
                    onClick={() => handleExport('goodreads')}
                    className="text-xs font-light px-4 py-2 text-[var(--color-foreground)] bg-transparent border border-gray-300 dark:border-gray-700 hover:border-[var(--color-foreground)] transition-all duration-200 uppercase tracking-wide whitespace-nowrap"
                    aria-label="Export to Goodreads"
                  >
                    Goodreads
                  </button>
                </div>
              )}
            </div>
            
            {/* Reading Stats */}
            <ReadingStats books={books} />
            
            <BookList
              books={books}
              onDelete={handleDelete}
              onMoveToWishList={handleMoveToWishList}
              onBooksUpdated={loadBooks}
            />
          </section>

          {/* Wishlist Section - Secondary Content */}
          <section className="space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-base sm:text-lg font-light tracking-wide text-[var(--color-foreground)] uppercase mb-1">
                  Wish List
              </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-light">
                  {wishList.length} {wishList.length === 1 ? 'book' : 'books'} you want to read
                </p>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-gray-800">
              <WishList
                wishList={wishList}
                onDelete={handleWishListDelete}
                onMoveToLibrary={handleMoveToLibrary}
              />
            </div>
          </section>

          {/* Quote Search Section - Tertiary Feature */}
          <section className="max-w-2xl mx-auto">
            <div className="border border-gray-200 dark:border-gray-800 p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-sm sm:text-base font-light tracking-wide text-[var(--color-foreground)] uppercase mb-1">
                  Search Quotes
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-light">
                  Find quotes across your library
                </p>
              </div>
              <QuoteSearch />
            </div>
          </section>
        </div>

        {/* Message Toast - Improved UX */}
        {message && (
          <div 
            className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-full max-w-md px-4"
            role="alert"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className={`
              px-4 sm:px-6 py-3 sm:py-4 border flex items-start gap-3 bg-white dark:bg-black shadow-lg
              ${message.type === 'success'
                ? 'border-gray-300 dark:border-gray-700 text-[var(--color-foreground)]'
                : 'border-gray-800 dark:border-gray-200 text-[var(--color-foreground)]'
              }
            `}>
              {message.type === 'success' ? (
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-light text-sm sm:text-base flex-1">{message.text}</span>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="text-gray-400 hover:text-[var(--color-foreground)] transition-colors p-1 -mt-1 -mr-1"
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
