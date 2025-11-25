'use client';

import type { Book } from '@/lib/storage';
import { useMemo } from 'react';

interface ReadingStatsProps {
  books: Book[];
}

export default function ReadingStats({ books }: ReadingStatsProps) {
  const stats = useMemo(() => {
    const totalBooks = books.length;
    const readBooks = books.filter(b => b.readingProgress?.status === 'completed').length;
    const readingBooks = books.filter(b => b.readingProgress?.status === 'reading').length;
    const toReadBooks = books.filter(b => !b.readingProgress?.status || b.readingProgress?.status === 'unread').length;
    
    const totalPages = books.reduce((sum, book) => sum + (book.metadata?.pageCount || 0), 0);
    const readPages = books.reduce((sum, book) => {
      if (book.readingProgress?.status === 'completed') {
        return sum + (book.metadata?.pageCount || 0);
      }
      if (book.readingProgress?.status === 'reading' && book.readingProgress?.currentPage) {
        return sum + book.readingProgress.currentPage;
      }
      return sum;
    }, 0);

    return {
      totalBooks,
      readBooks,
      readingBooks,
      toReadBooks,
      totalPages,
      readPages,
      completionRate: totalBooks > 0 ? Math.round((readBooks / totalBooks) * 100) : 0
    };
  }, [books]);

  if (books.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
      <div className="border border-gray-200 dark:border-gray-800 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Total Books</span>
        <span className="text-2xl font-light">{stats.totalBooks}</span>
      </div>
      
      <div className="border border-gray-200 dark:border-gray-800 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Reading Now</span>
        <span className="text-2xl font-light text-blue-600 dark:text-blue-400">{stats.readingBooks}</span>
      </div>
      
      <div className="border border-gray-200 dark:border-gray-800 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Completed</span>
        <span className="text-2xl font-light text-green-600 dark:text-green-400">{stats.readBooks}</span>
      </div>
      
      <div className="border border-gray-200 dark:border-gray-800 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Pages Read</span>
        <span className="text-2xl font-light">{stats.readPages.toLocaleString()}</span>
      </div>
    </div>
  );
}

