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
      <div className="text-center py-20 text-gray-400">
        <p className="text-sm font-light mb-1">Your wish list is empty</p>
        <p className="text-xs font-light">Add books you want to read</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-200 focus:outline-none focus:border-gray-400 transition-colors text-sm font-light placeholder-gray-400"
        />
        {searchTerm && (
          <p className="text-xs text-gray-400 mt-2 font-light">
            {filteredWishList.length} of {wishList.length}
          </p>
        )}
      </div>

      <div className="space-y-1">
        {filteredWishList.map((book) => (
          <div
            key={book.id}
            className="group flex items-center justify-between py-3 px-0 border-b border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-light text-[var(--foreground)] truncate">
                {book.title}
              </h3>
              <p className="text-xs text-gray-400 font-light mt-0.5">
                {new Date(book.addedAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <div className="ml-4 flex gap-2 sm:gap-3 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleMoveToLibrary(book.id)}
                disabled={movingId === book.id || deletingId === book.id}
                className="text-xs font-light text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors"
                title="Move to library"
              >
                {movingId === book.id ? 'Moving...' : '→ Library'}
              </button>
              <button
                onClick={() => handleDelete(book.id)}
                disabled={deletingId === book.id || movingId === book.id}
                className="text-xs font-light text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors"
                title="Remove from wish list"
              >
                {deletingId === book.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredWishList.length === 0 && searchTerm && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-xs font-light">No results for "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}

