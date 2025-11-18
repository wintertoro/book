'use client';

import { useState, useEffect } from 'react';
import PhotoUpload from '@/components/PhotoUpload';
import BookList from '@/components/BookList';
import ManualBookEntry from '@/components/ManualBookEntry';
import { Book } from '@/lib/storage';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const response = await fetch('/api/books');
      const data = await response.json();
      setBooks(data.books || []);
    } catch (error) {
      console.error('Error loading books:', error);
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process image');
      }

      // Reload books to get updated list
      await loadBooks();

      // Show success message
      setMessage({
        type: 'success',
        text: `Found ${data.totalFound} potential book${data.totalFound !== 1 ? 's' : ''}. Added ${data.totalAdded} new book${data.totalAdded !== 1 ? 's' : ''}${data.totalDuplicates > 0 ? ` (${data.totalDuplicates} duplicate${data.totalDuplicates !== 1 ? 's' : ''} skipped)` : ''}.`,
      });

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error processing image:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to process image. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/books?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete book');
      }

      // Reload books
      await loadBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      throw error;
    }
  };

  const handleManualAdd = async (title: string) => {
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add book');
      }

      if (data.isDuplicate) {
        setMessage({
          type: 'error',
          text: `"${title}" is already in your library.`,
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        await loadBooks();
        setMessage({
          type: 'success',
          text: `"${title}" has been added to your library.`,
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error adding book:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add book',
      });
      setTimeout(() => setMessage(null), 5000);
      throw error;
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/export?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `book-library.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting books:', error);
      setMessage({
        type: 'error',
        text: 'Failed to export books',
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="container mx-auto px-6 py-16 max-w-5xl">
        <header className="mb-16">
          <h1 className="text-3xl font-light tracking-tight mb-3 text-[var(--foreground)]">
            Book Library
          </h1>
          <p className="text-sm text-gray-500 font-light">
            Catalog your books with photo recognition
          </p>
        </header>

        {message && (
          <div
            className={`mb-8 px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'text-gray-700 bg-gray-50 border-l-2 border-gray-400'
                : 'text-gray-700 bg-gray-50 border-l-2 border-gray-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-normal text-[var(--foreground)] tracking-tight">
              Add Books
            </h2>
            <ManualBookEntry onAdd={handleManualAdd} />
          </div>
          <PhotoUpload onUpload={handleUpload} isProcessing={isProcessing} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-normal text-[var(--foreground)] tracking-tight">
              Library
              <span className="ml-2 text-sm font-light text-gray-400">
                ({books.length})
              </span>
            </h2>
            {books.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-4 py-1.5 text-xs font-light text-gray-600 hover:text-[var(--foreground)] transition-colors border border-gray-200 hover:border-gray-300"
                  title="Export as CSV"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="px-4 py-1.5 text-xs font-light text-gray-600 hover:text-[var(--foreground)] transition-colors border border-gray-200 hover:border-gray-300"
                  title="Export as JSON"
                >
                  JSON
                </button>
                <button
                  onClick={loadBooks}
                  className="px-4 py-1.5 text-xs font-light text-gray-600 hover:text-[var(--foreground)] transition-colors border border-gray-200 hover:border-gray-300"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
          <BookList books={books} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  );
}
