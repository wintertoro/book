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
      <div className="text-center py-12 text-gray-400 glass rounded-2xl border-dashed border-gray-200 dark:border-gray-800">
        <div className="text-3xl mb-3 opacity-50">✨</div>
        <p className="text-sm font-medium mb-1 text-[var(--foreground)]">Your wish list is empty</p>
        <p className="text-xs text-gray-500">Add books you want to read later</p>
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
          className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:border-black dark:focus:border-white transition-all text-sm shadow-sm"
        />
      </div>

      <div className="space-y-3">
        {filteredWishList.map((book) => (
          <div
            key={book.id}
            className="group relative glass glass-hover rounded-xl p-4 transition-all duration-300"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="min-w-[32px] h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-sm shadow-sm border border-gray-200 dark:border-gray-700">
                    ✨
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)] leading-tight line-clamp-2 mb-1 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                      Added {new Date(book.addedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
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
                  onClick={() => handleMoveToLibrary(book.id)}
                  disabled={movingId === book.id || deletingId === book.id}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  title="Move to library"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
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

            {(movingId === book.id || deletingId === book.id) && (
              <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center rounded-xl z-10">
                <div className="text-[10px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-black px-3 py-1.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-800 animate-pulse">
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

