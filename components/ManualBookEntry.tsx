'use client';

import { useState } from 'react';

interface ManualBookEntryProps {
  onAdd: (title: string) => Promise<void>;
}

export default function ManualBookEntry({ onAdd }: ManualBookEntryProps) {
  const [title, setTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsAdding(true);
    try {
      await onAdd(title.trim());
      setTitle('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding book:', error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="text-xs font-light text-[var(--color-foreground)] hover:opacity-70 transition-all flex items-center gap-1.5 uppercase tracking-wide"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Manually
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in w-full max-w-md mx-auto">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title or ISBN..."
          className="flex-1 min-w-0 px-4 py-2 bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-[var(--color-foreground)] transition-all text-sm font-light"
          disabled={isAdding}
        />
        <button
          type="submit"
          disabled={!title.trim() || isAdding}
          className="px-4 py-2 text-xs font-light text-white dark:text-black bg-black dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-100 transition-all border border-black dark:border-white uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isAdding ? 'Adding...' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setTitle('');
          }}
          className="px-2 py-2 text-gray-400 dark:text-gray-600 hover:text-[var(--color-foreground)] transition-colors"
          aria-label="Cancel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </form>
  );
}
