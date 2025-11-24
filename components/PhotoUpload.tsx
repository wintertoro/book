'use client';

import { useState, useRef, useEffect } from 'react';

interface PhotoUploadProps {
  onUpload: (file: File) => Promise<void>;
  isProcessing: boolean;
}

export default function PhotoUpload({ onUpload, isProcessing }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [wasProcessing, setWasProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Clear preview when processing completes
  useEffect(() => {
    if (wasProcessing && !isProcessing) {
      // Processing just finished, clear preview after a short delay
      const timer = setTimeout(() => {
        setPreview(null);
        // Reset file inputs
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        if (cameraInputRef.current) {
          cameraInputRef.current.value = '';
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    setWasProcessing(isProcessing);
  }, [isProcessing, wasProcessing]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    onUpload(file).catch(() => {
      // On error, don't clear preview so user can retry
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
          className={`
          relative overflow-hidden border p-12 text-center cursor-pointer transition-all duration-200
          ${isDragging
            ? 'bg-gray-50 dark:bg-gray-900 border-[var(--color-foreground)]'
            : 'bg-white dark:bg-black border-gray-200 dark:border-gray-800 hover:border-[var(--color-foreground)]/30'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >

        {preview ? (
          <div className="space-y-6 animate-fade-in relative z-10">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 mx-auto w-auto object-contain border border-gray-200 dark:border-gray-800"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 dark:bg-white/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="relative">
                    <div className="w-8 h-8 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black animate-spin"></div>
                  </div>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="space-y-3 max-w-xs mx-auto">
                <div className="text-xs font-light text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[var(--color-foreground)] animate-pulse"></span>
                  Analyzing book spines...
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 h-px overflow-hidden">
                  <div className="bg-[var(--color-foreground)] h-full animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '50%' }}></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 py-8 relative z-10">
            <div className={`w-16 h-16 mx-auto flex items-center justify-center transition-all duration-200 ${isDragging ? 'bg-gray-100 dark:bg-gray-900' : 'bg-transparent'}`}>
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-light text-[var(--foreground)] mb-1 uppercase tracking-wide">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-light max-w-sm mx-auto">
                Take a photo of your bookshelf. We'll automatically detect and extract book titles.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-4 justify-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerCameraInput();
          }}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-3 text-xs font-light text-white dark:text-black bg-black dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-100 transition-all border border-black dark:border-white uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Use Camera
        </button>

        {preview && !isProcessing && (
          <button
            onClick={() => setPreview(null)}
            className="px-6 py-3 text-xs font-light text-[var(--foreground)] bg-transparent border border-gray-300 dark:border-gray-700 hover:border-[var(--color-foreground)] transition-all uppercase tracking-wide"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

