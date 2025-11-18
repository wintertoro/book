'use client';

import { Book } from '@/lib/storage';
import { useState } from 'react';

interface BookListProps {
  books: Book[];
  onDelete: (id: string) => Promise<void>;
}

export default function BookList({ books, onDelete }: BookListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (books.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-sm font-light mb-1">Your library is empty</p>
        <p className="text-xs font-light">Upload a photo to get started</p>
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
            {filteredBooks.length} of {books.length}
          </p>
        )}
      </div>

      <div className="space-y-1">
        {filteredBooks.map((book) => (
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
            <button
              onClick={() => handleDelete(book.id)}
              disabled={deletingId === book.id}
              className="ml-4 text-gray-300 hover:text-gray-500 disabled:opacity-30 text-xs font-light transition-colors opacity-0 group-hover:opacity-100"
              title="Delete book"
            >
              {deletingId === book.id ? 'Removing...' : 'Remove'}
            </button>
          </div>
        ))}
      </div>

      {filteredBooks.length === 0 && searchTerm && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-xs font-light">No results for "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}

