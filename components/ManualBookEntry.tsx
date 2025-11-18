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
        className="px-3 sm:px-4 py-1.5 text-xs font-light text-gray-600 dark:text-gray-400 hover:text-[var(--foreground)] transition-colors border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 whitespace-nowrap"
      >
        Add Manually
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Book title..."
          className="flex-1 min-w-0 px-0 py-2 bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors text-sm font-light placeholder-gray-400 dark:placeholder-gray-500"
          disabled={isAdding}
          autoFocus
        />
        <button
          type="submit"
          disabled={!title.trim() || isAdding}
          className="px-3 sm:px-4 py-1.5 text-xs font-light text-gray-600 hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-gray-200 hover:border-gray-300 whitespace-nowrap"
        >
          {isAdding ? 'Adding...' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setTitle('');
          }}
          className="px-3 sm:px-4 py-1.5 text-xs font-light text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors whitespace-nowrap"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}






