'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Quote } from '@/lib/storage';

interface QuoteSearchResult {
  book: Book;
  quote: Quote;
}

export default function QuoteSearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<QuoteSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/quotes?q=${encodeURIComponent(term)}`);
      if (!response.ok) throw new Error('Failed to search quotes');
      const data = await response.json();
      setResults(data.results || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching quotes:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    handleSearch(value);
  };

  return (
    <div className="relative w-full">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search quotes..."
          value={searchTerm}
          onChange={handleInputChange}
          className="w-full pl-12 pr-12 py-4 bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:border-black dark:focus:border-white transition-all text-base shadow-sm"
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {!isSearching && searchTerm && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <span className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {showResults && searchTerm && (
        <div className="absolute z-50 w-full mt-2 glass rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">No quotes found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {results.map((result) => {
                const pagePhoto = result.book.pagePhotos?.find(p => p.id === result.quote.pagePhotoId);
                return (
                  <button
                    key={result.quote.id}
                    onClick={() => {
                      router.push(`/books/${result.book.id}`);
                      setShowResults(false);
                    }}
                    className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="space-y-2">
                      <p className="text-sm text-gray-800 dark:text-gray-200 italic line-clamp-2">
                        "{result.quote.text}"
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">{result.book.title}</span>
                        {result.quote.pageNumber && (
                          <>
                            <span>•</span>
                            <span>Page {result.quote.pageNumber}</span>
                          </>
                        )}
                        {!result.quote.pageNumber && pagePhoto?.pageNumber && (
                          <>
                            <span>•</span>
                            <span>Page {pagePhoto.pageNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

