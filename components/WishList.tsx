'use client';

import { Book } from '@/lib/storage';
import { useState } from 'react';

interface WishListProps {
  wishList: Book[];
  onDelete: (id: string) => Promise<void>;
  onMoveToLibrary: (id: string) => Promise<void>;
}

export default function WishList({ wishList, onDelete, onMoveToLibrary }: WishListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWishList = wishList.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this book from your wish list?')) {
      return;
    }

    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Error deleting from wish list:', error);
      alert('Failed to delete from wish list');
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveToLibrary = async (id: string) => {
    setMovingId(id);
    try {
      await onMoveToLibrary(id);
    } catch (error) {
      console.error('Error moving to library:', error);
      alert('Failed to move to library');
    } finally {
      setMovingId(null);
    }
  };

  if (wishList.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-gray-800">
        <p className="text-xs font-light mb-1 text-[var(--color-foreground)] uppercase tracking-wide">Your wish list is empty</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-light">Add books you want to read later</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search wish list..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-[var(--color-foreground)] transition-all text-sm font-light"
        />
      </div>

      <div className="space-y-3">
        {filteredWishList.map((book) => (
          <div
            key={book.id}
            className="group relative border border-gray-200 dark:border-gray-800 p-4 hover:border-[var(--color-foreground)]/30 transition-all duration-200"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="min-w-[28px] h-9 bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-xs border border-gray-200 dark:border-gray-800">
                    ✨
                  </div>
                  <div>
                    <h3 className="text-xs font-light text-[var(--color-foreground)] leading-tight line-clamp-2 mb-1">
                      {book.title}
                    </h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 font-light uppercase tracking-wider">
                      Added {new Date(book.addedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handleMoveToLibrary(book.id)}
                  disabled={movingId === book.id || deletingId === book.id}
                  className="px-3 py-1.5 text-xs font-light text-white dark:text-black bg-black dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-100 transition-all border border-black dark:border-white uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)] focus:ring-offset-2"
                  aria-label={`Move ${book.title} to library`}
                  title="Move to library"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span>To Library</span>
                </button>
                <div className="flex gap-1">
                  <a
                    href={`https://www.amazon.com/s?k=${encodeURIComponent(book.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    title="Buy on Amazon"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </a>
                  <button
                    onClick={() => handleDelete(book.id)}
                    disabled={deletingId === book.id || movingId === book.id}
                    className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    title="Remove from wish list"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {(movingId === book.id || deletingId === book.id) && (
              <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-[10px] font-light text-[var(--color-foreground)] bg-white dark:bg-black px-3 py-1.5 border border-gray-200 dark:border-gray-800">
                  {movingId === book.id ? 'Moving...' : 'Removing...'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredWishList.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-xs">No results for "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}

