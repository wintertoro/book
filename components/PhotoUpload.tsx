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
          relative overflow-hidden rounded-2xl p-8 text-center cursor-pointer transition-all duration-500
          ${isDragging
            ? 'bg-gray-100 dark:bg-gray-800 border-black dark:border-white scale-[1.02] shadow-[0_0_40px_-10px_rgba(0,0,0,0.3)] dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)]'
            : 'glass hover:bg-white/80 dark:hover:bg-black/80 border-transparent hover:border-gray-300 dark:hover:border-gray-700'
          }
          border-2
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        {/* Animated Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br from-gray-200/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 transition-opacity duration-500 ${isDragging ? 'opacity-100' : 'opacity-0'}`} />

        {preview ? (
          <div className="space-y-6 animate-fade-in relative z-10">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 rounded-xl shadow-2xl mx-auto w-auto object-contain ring-1 ring-black/5 dark:ring-white/10"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px] rounded-xl flex items-center justify-center">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="space-y-3 max-w-xs mx-auto">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center animate-pulse flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce"></span>
                  Analyzing book spines...
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-600 to-gray-400 dark:from-gray-400 dark:to-gray-600 h-full rounded-full animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '50%' }}></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-8 relative z-10">
            <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center transition-all duration-500 ${isDragging ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 scale-110 rotate-3' : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 group-hover:scale-110 group-hover:-rotate-3'}`}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)] mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-slate-500">
                Take a photo of your book shelf
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
          className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Use Camera
        </button>

        {preview && !isProcessing && (
          <button
            onClick={() => setPreview(null)}
            className="px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[var(--foreground)] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

