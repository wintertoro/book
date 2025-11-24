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
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 flex items-center justify-center text-white dark:text-black font-bold shadow-lg ring-2 ring-gray-200/50 dark:ring-gray-700/50">
              L
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Library
            </h1>
            {process.env.NEXT_PUBLIC_DEV_MODE === 'true' && (
              <span className="text-xs px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg font-semibold border border-amber-200 dark:border-amber-800/50">
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
        <section className="text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            AI-Powered Organization
          </div>

          <div className="space-y-4">
            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-balance leading-[1.1]">
              Your Personal <br />
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                Digital Library
              </span>
            </h2>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-balance font-light leading-relaxed">
              Scan your bookshelf in seconds. Organize your collection effortlessly with our intelligent recognition system.
            </p>
          </div>
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
          <div className="glass rounded-2xl p-6 sm:p-8 space-y-5 border border-gray-200/50 dark:border-gray-800/50 shadow-lg">
            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <span className="text-2xl">🔍</span> 
              <span>Search Quotes</span>
            </h3>
            <QuoteSearch />
          </div>
        </section>

        {/* Pending Review Section */}
        {pendingBooks.length > 0 && (
          <section className="max-w-3xl mx-auto animate-fade-in">
            <div className="glass rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <span className="text-2xl">✨</span> 
                  <span>Review Detected Books</span>
                </h3>
                <span className="text-xs font-bold px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 shadow-sm">
                  {pendingBooks.length} found
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {pendingBooks.map((book, index) => (
                  <div key={`${book.title}-${index}`} className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{book.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAddToLibrary(book.title, book.ocrText)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 dark:from-white dark:to-gray-100 dark:text-black dark:hover:from-gray-200 dark:hover:to-gray-300 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        Add to Library
                      </button>
                      <button
                        onClick={() => handleAddToWishList(book.title)}
                        className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 border border-gray-200 dark:border-gray-700"
                      >
                        Wish List
                      </button>
                      <button
                        onClick={() => handleDiscardPending(book.title)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
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
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-800/50">
              <h3 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-gray-100">
                <span className="text-3xl">📚</span> 
                <span>My Library</span>
                <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-1">({books.length})</span>
              </h3>
              <button
                onClick={() => handleExport('csv')}
                className="text-sm font-semibold px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 shadow-sm border border-gray-200 dark:border-gray-700"
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
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-800/50">
              <h3 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-gray-100">
                <span className="text-3xl">✨</span> 
                <span>Wish List</span>
                <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-1">({wishList.length})</span>
              </h3>
            </div>
            <div className="glass rounded-2xl p-1 border border-gray-200/50 dark:border-gray-800/50 shadow-lg">
              <WishList
                wishList={wishList}
                onDelete={handleWishListDelete}
                onMoveToLibrary={handleMoveToLibrary}
              />
            </div>

            <div className="glass rounded-xl p-5 border border-gray-200/50 dark:border-gray-800/50 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-sm">💡</span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Quick Tip</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pl-10">
                You can move books between your library and wish list by clicking the arrow icon on any book card.
              </p>
            </div>
          </div>

        </div>

        {/* Message Toast */}
        {message && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-full max-w-md px-4">
            <div className={`
              px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3
              ${message.type === 'success'
                ? 'bg-emerald-50/90 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50/90 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300'
              }
            `}>
              {message.type === 'success' ? (
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-semibold text-sm truncate">{message.text}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
