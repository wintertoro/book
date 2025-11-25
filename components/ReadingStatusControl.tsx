'use client';

import type { Book, ReadingStatus } from '@/lib/storage';
import { useState } from 'react';

interface ReadingStatusControlProps {
  book: Book;
  onUpdate: (book: Book) => void;
}

export default function ReadingStatusControl({ book, onUpdate }: ReadingStatusControlProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const currentStatus = book.readingProgress?.status || 'unread';

  const statusOptions: Array<{ value: ReadingStatus; label: string; icon: string }> = [
    { value: 'unread', label: 'Unread', icon: '📚' },
    { value: 'reading', label: 'Reading', icon: '📖' },
    { value: 'completed', label: 'Completed', icon: '✓' },
    { value: 'dnf', label: 'Did Not Finish', icon: '✗' },
    { value: 'lent', label: 'Lent Out', icon: '📤' },
  ];

  const handleStatusChange = async (newStatus: ReadingStatus) => {
    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/books/${book.id}/reading-progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          // If starting to read, set current page to 1 if not set
          currentPage: newStatus === 'reading' && !book.readingProgress?.currentPage 
            ? 1 
            : book.readingProgress?.currentPage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update reading status');
      }

      const data = await response.json();
      onUpdate(data.book);
    } catch (error) {
      console.error('Error updating reading status:', error);
      alert('Failed to update reading status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePageUpdate = async (page: number) => {
    if (page === book.readingProgress?.currentPage) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/books/${book.id}/reading-progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: currentStatus,
          currentPage: page,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update page');
      }

      const data = await response.json();
      onUpdate(data.book);
    } catch (error) {
      console.error('Error updating page:', error);
      alert('Failed to update page');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Status selector */}
      <div>
        <span className="text-xs font-light uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
          Reading Status
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Reading Status">
          {statusOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={isUpdating}
              className={`
                px-3 py-1.5 text-xs font-light border transition-all
                ${currentStatus === option.value
                  ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                  : 'bg-transparent text-[var(--color-foreground)] border-gray-300 dark:border-gray-700 hover:border-[var(--color-foreground)]'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <span className="mr-1.5">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page progress (only show if reading) */}
      {currentStatus === 'reading' && book.metadata?.pageCount && (
        <div>
          <label htmlFor="page-progress" className="text-xs font-light uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
            Progress
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                id="page-progress"
                type="number"
                min="0"
                max={book.metadata.pageCount}
                value={book.readingProgress?.currentPage || 0}
                onChange={(e) => {
                  const page = parseInt(e.target.value) || 0;
                  const maxPage = book.metadata?.pageCount || page;
                  handlePageUpdate(Math.min(page, maxPage));
                }}
                disabled={isUpdating}
                className="w-20 px-2 py-1.5 text-sm font-light bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-[var(--color-foreground)] disabled:opacity-50"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                / {book.metadata.pageCount} pages
              </span>
            </div>
            {book.readingProgress?.currentPage && (
              <div className="w-full h-1 bg-gray-200 dark:bg-gray-800">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{
                    width: `${(book.readingProgress.currentPage / book.metadata.pageCount) * 100}%`
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rating (only show if completed) */}
      {currentStatus === 'completed' && (
        <div>
          <span className="text-xs font-light uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
            Rating
          </span>
          <div className="flex gap-1" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                type="button"
                key={rating}
                aria-label={`Rate ${rating} stars`}
                onClick={async () => {
                  setIsUpdating(true);
                  try {
                    const response = await fetch(`/api/books/${book.id}/reading-progress`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        status: currentStatus,
                        rating: book.readingProgress?.rating === rating ? undefined : rating,
                      }),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      onUpdate(data.book);
                    }
                  } catch (error) {
                    console.error('Error updating rating:', error);
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating}
                className={`
                  text-lg transition-all
                  ${book.readingProgress?.rating && book.readingProgress.rating >= rating
                    ? 'text-yellow-500'
                    : 'text-gray-300 dark:text-gray-700'
                  }
                  hover:scale-110 disabled:opacity-50
                `}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

