'use client';

import { useState, useEffect } from 'react';
import PhotoUpload from '@/components/PhotoUpload';
import BookList from '@/components/BookList';
import WishList from '@/components/WishList';
import ManualBookEntry from '@/components/ManualBookEntry';
import ThemeToggle from '@/components/ThemeToggle';
import AuthButton from '@/components/AuthButton';
import QuoteSearch from '@/components/QuoteSearch';
import { Book } from '@/lib/storage';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [wishList, setWishList] = useState<Book[]>([]);
  const [pendingBooks, setPendingBooks] = useState<Array<{ title: string; ocrText?: string }>>([]);
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

      // Set pending books for review with OCR text
      const titles = data.results.map((r: any) => ({
        title: r.title,
        ocrText: data.ocrText, // Store OCR text for author extraction
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
    setPendingBooks(prev => [...prev, { title }]);
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to move book' });
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold shadow-lg">
              L
            </div>
            <h1 className="text-xl font-bold tracking-tight">Library</h1>
            {process.env.NEXT_PUBLIC_DEV_MODE === 'true' && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md font-medium border border-gray-300 dark:border-gray-700">
                DEV MODE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 sm:pt-32 px-4 sm:px-6 max-w-7xl mx-auto space-y-12 sm:space-y-16">

        {/* Hero Section */}
        <section className="text-center space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-300 dark:border-gray-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-600 dark:bg-gray-400"></span>
            </span>
            AI-Powered Organization
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-balance">
            Your Personal <br />
            <span className="text-gradient">Digital Library</span>
          </h2>

          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-balance font-light">
            Scan your bookshelf in seconds. Organize your collection effortlessly with our intelligent recognition system.
          </p>
        </section>

        {/* Actions Section */}
        <section className="max-w-2xl mx-auto space-y-8">
          <PhotoUpload onUpload={handleUpload} isProcessing={isProcessing} />
          <div className="flex justify-center">
            <ManualBookEntry onAdd={handleManualAdd} />
          </div>
        </section>

        {/* Quote Search Section */}
        <section className="max-w-2xl mx-auto">
          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">🔍</span> Search Quotes
            </h3>
            <QuoteSearch />
          </div>
        </section>

        {/* Pending Review Section */}
        {pendingBooks.length > 0 && (
          <section className="max-w-3xl mx-auto animate-fade-in">
            <div className="bg-white dark:bg-black rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="text-xl">✨</span> Review Detected Books
                </h3>
                <span className="text-xs font-medium px-2.5 py-1 bg-white dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {pendingBooks.length} found
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {pendingBooks.map((book, index) => (
                  <div key={`${book.title}-${index}`} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{book.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAddToLibrary(book.title, book.ocrText)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-lg transition-colors shadow-sm"
                      >
                        Add to Library
                      </button>
                      <button
                        onClick={() => handleAddToWishList(book.title)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Wish List
                      </button>
                      <button
                        onClick={() => handleDiscardPending(book.title)}
                        className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Discard"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Main Library Column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">📚</span> My Library
                <span className="text-sm font-normal text-gray-400 ml-2">({books.length})</span>
              </h3>
              <button
                onClick={() => handleExport('csv')}
                className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              >
                Export CSV
              </button>
            </div>
            <BookList
              books={books}
              onDelete={handleDelete}
              onMoveToWishList={handleMoveToWishList}
              onBooksUpdated={loadBooks}
            />
          </div>

          {/* Sidebar / Wishlist Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">✨</span> Wish List
                <span className="text-sm font-normal text-gray-400 ml-2">({wishList.length})</span>
              </h3>
            </div>
            <div className="bg-white/50 dark:bg-slate-900/50 rounded-2xl p-1 border border-white/20 shadow-sm">
              <WishList
                wishList={wishList}
                onDelete={handleWishListDelete}
                onMoveToLibrary={handleMoveToLibrary}
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quick Tip</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                You can move books between your library and wish list by clicking the arrow icon on any book card.
              </p>
            </div>
          </div>

        </div>

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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
