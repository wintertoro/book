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
        onClick={() => setShowForm(true)}
        className="text-xs font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] hover:text-[var(--color-foreground)] transition-colors flex items-center gap-1"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Manually
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter book title..."
          className="flex-1 min-w-0 px-3 py-1.5 bg-white dark:bg-[var(--color-gray-800)] border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/20 focus:border-[var(--color-foreground)] transition-all text-sm"
          disabled={isAdding}
          autoFocus
        />
        <button
          type="submit"
          disabled={!title.trim() || isAdding}
          className="px-3 py-1.5 text-xs font-medium text-white dark:text-[var(--color-foreground)] bg-[var(--color-foreground)] dark:bg-[var(--color-background)] hover:bg-[var(--color-gray-800)] dark:hover:bg-[var(--color-gray-200)] rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isAdding ? 'Adding...' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setTitle('');
          }}
          className="px-2 py-1.5 text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] dark:hover:text-[var(--color-gray-300)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </form>
  );
}






