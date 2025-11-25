'use client';

import type { Book } from '@/lib/storage';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface ShelfViewProps {
  books: Book[];
  onBookClick?: (book: Book) => void;
}

export default function ShelfView({ books, onBookClick }: ShelfViewProps) {
  const router = useRouter();

  const handleBookClick = (book: Book) => {
    if (onBookClick) {
      onBookClick(book);
    } else {
      router.push(`/books/${book.id}`);
    }
  };

  const getCoverImage = (book: Book): string | null => {
    return book.metadata?.coverImageUrl || 
           book.metadata?.thumbnailUrl || 
           null;
  };

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'reading':
        return 'border-blue-500';
      case 'completed':
        return 'border-green-500';
      case 'dnf':
        return 'border-red-500';
      case 'lent':
        return 'border-yellow-500';
      default:
        return 'border-gray-300 dark:border-gray-700';
    }
  };

  if (books.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-600">
        <p className="text-sm font-light uppercase tracking-wide">No books to display</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {books.map((book) => {
        const coverImage = getCoverImage(book);
        const status = book.readingProgress?.status || 'unread';
        
        return (
          <div
            key={book.id}
            onClick={() => handleBookClick(book)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleBookClick(book);
              }
            }}
            role="button"
            tabIndex={0}
            className="group cursor-pointer"
          >
            <div className={`
              relative aspect-[2/3] border-2 ${getStatusColor(status)}
              bg-gray-100 dark:bg-gray-900
              hover:border-[var(--color-foreground)] transition-all duration-200
              overflow-hidden
            `}>
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-3">
                  <div className="text-center">
                    <div className="text-2xl mb-2 opacity-50">📖</div>
                    <p className="text-xs font-light text-gray-500 dark:text-gray-400 line-clamp-3 leading-tight">
                      {book.title}
                    </p>
                    {book.author && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 line-clamp-1">
                        {book.author}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Status indicator */}
              {status !== 'unread' && (
                <div className="absolute top-1 right-1">
                  <div className={`
                    w-2 h-2 rounded-full
                    ${status === 'reading' ? 'bg-blue-500' : ''}
                    ${status === 'completed' ? 'bg-green-500' : ''}
                    ${status === 'dnf' ? 'bg-red-500' : ''}
                    ${status === 'lent' ? 'bg-yellow-500' : ''}
                  `} />
                </div>
              )}
              
              {/* Progress bar for reading status */}
              {status === 'reading' && book.readingProgress?.currentPage && book.metadata?.pageCount && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${(book.readingProgress.currentPage / book.metadata.pageCount) * 100}%`
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Book info below cover */}
            <div className="mt-2 text-center">
              <p className="text-xs font-light text-[var(--color-foreground)] line-clamp-2 leading-tight">
                {book.title}
              </p>
              {book.author && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                  {book.author}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

